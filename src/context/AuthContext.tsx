import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseIsGeconfigureerd } from "../lib/supabase";
import { db } from "../db/db";
import { nieuweId } from "../lib/id";
import { pincodeIsIngeschakeld, controleerPincode } from "../lib/pin";
import { haalOrganisatieEnProfielOp, verstuurOrganisatieEnProfiel } from "../lib/orgSync";
import type { Organisatie, Profiel } from "../types/domain";

interface BedrijfsgegevensInvoer {
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  kvkNummer: string;
  contactpersoon: string;
  telefoon: string;
  email: string;
}

interface AuthState {
  klaar: boolean;
  /** "lokaal": geen Supabase-project gekoppeld — demo/ontwikkelmodus zonder login. */
  modus: "lokaal" | "supabase";
  sessie: Session | null;
  organisatie: Organisatie | null;
  profiel: Profiel | null;
  vergrendeldDoorPincode: boolean;

  logIn: (email: string, wachtwoord: string) => Promise<{ fout?: string }>;
  meldAan: (email: string, wachtwoord: string) => Promise<{ fout?: string }>;
  logUit: () => Promise<void>;
  verstuurResetLink: (email: string) => Promise<{ fout?: string }>;
  stelNieuwWachtwoordIn: (nieuwWachtwoord: string) => Promise<{ fout?: string }>;

  richtOrganisatieIn: (gegevens: BedrijfsgegevensInvoer) => Promise<void>;
  werkOrganisatieBij: (gegevens: BedrijfsgegevensInvoer) => Promise<void>;

  ontgrendelMetPincode: (pincode: string) => Promise<boolean>;
  /** Ontgrendelt zonder pincode — voor het wachtwoord-noodpad op het pincodescherm. */
  ontgrendel: () => void;
  vergrendel: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * Regelt zowel de Supabase-sessie (account/wachtwoord — beveiligt het
 * archief) als de lokale pincode-vergrendeling (gemak-slot voor dagelijks
 * gebruik op het tablet). In "lokale modus" (geen Supabase gekoppeld, zie
 * Fase 2 van het plan) wordt er een vast lokaal profiel gebruikt zodat de
 * checklist-schermen zonder enige server te testen zijn.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [klaar, setKlaar] = useState(false);
  const [sessie, setSessie] = useState<Session | null>(null);
  const [organisatie, setOrganisatie] = useState<Organisatie | null>(null);
  const [profiel, setProfiel] = useState<Profiel | null>(null);
  const [vergrendeldDoorPincode, setVergrendeldDoorPincode] = useState(true);

  useEffect(() => {
    (async () => {
      const heeftLokaleOrganisatie = await laadLokaleOrganisatieEnProfiel();

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        setSessie(data.session);
        if (data.session && !heeftLokaleOrganisatie) {
          const opgehaald = await haalOrganisatieEnProfielOp(data.session.user.id);
          if (opgehaald) {
            setOrganisatie(opgehaald.organisatie);
            setProfiel(opgehaald.profiel);
          }
        }

        supabase.auth.onAuthStateChange((_gebeurtenis, nieuweSessie) => {
          setSessie(nieuweSessie);
        });
      }

      const pincodeAan = await pincodeIsIngeschakeld();
      setVergrendeldDoorPincode(pincodeAan);

      setKlaar(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function laadLokaleOrganisatieEnProfiel(): Promise<boolean> {
    const org = await db.organisaties.toCollection().first();
    const prof = await db.profielen.toCollection().first();
    if (org) setOrganisatie(org);
    if (prof) setProfiel(prof);
    return !!org;
  }

  const logIn: AuthState["logIn"] = async (email, wachtwoord) => {
    if (!supabase) return { fout: "Geen Supabase-project gekoppeld." };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });
    if (error) return { fout: vertaalAuthFout(error.message) };
    setSessie(data.session);
    const opgehaald = await haalOrganisatieEnProfielOp(data.user.id);
    if (opgehaald) {
      setOrganisatie(opgehaald.organisatie);
      setProfiel(opgehaald.profiel);
    }
    return {};
  };

  const meldAan: AuthState["meldAan"] = async (email, wachtwoord) => {
    if (!supabase) return { fout: "Geen Supabase-project gekoppeld." };
    const { data, error } = await supabase.auth.signUp({ email, password: wachtwoord });
    if (error) return { fout: vertaalAuthFout(error.message) };
    if (data.session) setSessie(data.session);
    return {};
  };

  const logUit: AuthState["logUit"] = async () => {
    if (supabase) await supabase.auth.signOut();
    setSessie(null);
  };

  const verstuurResetLink: AuthState["verstuurResetLink"] = async (email) => {
    if (!supabase) return { fout: "Geen Supabase-project gekoppeld." };
    // HashRouter (zie App.tsx) — zo werkt de link zonder serverconfiguratie
    // voor client-side routing, wat op standaard cPanel-hosting niet vanzelf werkt.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/#/nieuw-wachtwoord`,
    });
    if (error) return { fout: vertaalAuthFout(error.message) };
    return {};
  };

  const stelNieuwWachtwoordIn: AuthState["stelNieuwWachtwoordIn"] = async (nieuwWachtwoord) => {
    if (!supabase) return { fout: "Geen Supabase-project gekoppeld." };
    const { error } = await supabase.auth.updateUser({ password: nieuwWachtwoord });
    if (error) return { fout: vertaalAuthFout(error.message) };
    return {};
  };

  const richtOrganisatieIn: AuthState["richtOrganisatieIn"] = async (gegevens) => {
    const gebruikerId = sessie?.user.id ?? `lokaal-${nieuweId()}`;
    const organisatieId = nieuweId();
    const nieuweOrganisatie: Organisatie = {
      id: organisatieId,
      ...gegevens,
      bijgewerktOp: new Date().toISOString(),
    };
    const nieuwProfiel: Profiel = {
      id: gebruikerId,
      organisatieId,
      naam: gegevens.contactpersoon || "Eigenaar",
      rol: "eigenaar",
    };
    await db.organisaties.put(nieuweOrganisatie);
    await db.profielen.put(nieuwProfiel);
    setOrganisatie(nieuweOrganisatie);
    setProfiel(nieuwProfiel);
    await verstuurOrganisatieEnProfiel(nieuweOrganisatie, nieuwProfiel);
  };

  const werkOrganisatieBij: AuthState["werkOrganisatieBij"] = async (gegevens) => {
    if (!organisatie || !profiel) return;
    const bijgewerkt: Organisatie = { ...organisatie, ...gegevens, bijgewerktOp: new Date().toISOString() };
    await db.organisaties.put(bijgewerkt);
    setOrganisatie(bijgewerkt);
    await verstuurOrganisatieEnProfiel(bijgewerkt, profiel);
  };

  const ontgrendelMetPincode: AuthState["ontgrendelMetPincode"] = async (pincode) => {
    const juist = await controleerPincode(pincode);
    if (juist) setVergrendeldDoorPincode(false);
    return juist;
  };

  const ontgrendel = () => setVergrendeldDoorPincode(false);
  const vergrendel = () => setVergrendeldDoorPincode(true);

  const waarde: AuthState = {
    klaar,
    modus: supabaseIsGeconfigureerd ? "supabase" : "lokaal",
    sessie,
    organisatie,
    profiel,
    vergrendeldDoorPincode,
    logIn,
    meldAan,
    logUit,
    verstuurResetLink,
    stelNieuwWachtwoordIn,
    richtOrganisatieIn,
    werkOrganisatieBij,
    ontgrendelMetPincode,
    ontgrendel,
    vergrendel,
  };

  return <AuthContext.Provider value={waarde}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth moet binnen AuthProvider gebruikt worden");
  return context;
}

function vertaalAuthFout(bericht: string): string {
  if (/invalid login credentials/i.test(bericht)) return "E-mailadres of wachtwoord onjuist.";
  if (/already registered/i.test(bericht)) return "Dit e-mailadres heeft al een account.";
  if (/password/i.test(bericht) && /short|weak/i.test(bericht)) return "Wachtwoord is te kort (minimaal 6 tekens).";
  return bericht;
}

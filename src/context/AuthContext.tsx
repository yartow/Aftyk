import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, supabaseIsGeconfigureerd } from "../lib/supabase";
import { db } from "../db/db";
import { nieuweId } from "../lib/id";
import { isDemo } from "../lib/modus";
import { t } from "../i18n";
import { pincodeIsIngeschakeld, controleerPincode, zetPincode, wisPincode } from "../lib/pin";
import { MAX_POGINGEN, haalPogingen, resetPogingen, verhoogPogingen } from "../lib/pogingen";
import { inrichtingIsOvergeslagen, zetInrichtingOvergeslagen } from "../lib/inrichting";
import { koppelLocatiesAanOrganisatie } from "../lib/locaties";
import { zorgVoorEigenLokaleData } from "../lib/gebruikerWissel";
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
  postAdres: string;
  postPostcode: string;
  postPlaats: string;
}

interface AuthState {
  klaar: boolean;
  /** "lokaal": geen Supabase-project gekoppeld — demo/ontwikkelmodus zonder login. */
  modus: "lokaal" | "supabase";
  sessie: Session | null;
  organisatie: Organisatie | null;
  profiel: Profiel | null;
  vergrendeldDoorPincode: boolean;
  /** Er is op dit apparaat een pincode ingesteld (verplicht om de app te gebruiken). */
  pincodeIngesteld: boolean;
  /** De gebruiker koos "Later invullen" bij de bedrijfsgegevens. */
  inrichtingOvergeslagen: boolean;
  slaInrichtingOver: () => Promise<void>;
  /** Stelt de (verplichte) pincode van dit apparaat in en ontgrendelt. */
  stelPincodeIn: (pincode: string) => Promise<void>;
  /** Ingelogd, maar het bedrijf kon niet van de server worden geladen (offline of serverfout). */
  accountLaadFout: boolean;
  probeerAccountOpnieuw: () => Promise<void>;

  /**
   * Na 10 mislukte wachtwoorden wordt niet meer geprobeerd (`geblokkeerd`); alleen de resetlink blijft.
   * `ontgrendel: false` laat de app vergrendeld (voor "pincode vergeten": daarna volgt een nieuwe pincode).
   */
  logIn: (email: string, wachtwoord: string, opties?: { ontgrendel?: boolean }) => Promise<{ fout?: string; pogingenOver?: number; geblokkeerd?: boolean }>;
  /** Account aanmaken met een persoonlijke toegangscode van 5 cijfers. `bevestigMail` = eerst nog de e-mail bevestigen. */
  meldAan: (email: string, wachtwoord: string, toegangscode: string) => Promise<{ fout?: string; bevestigMail?: boolean }>;
  logUit: () => Promise<void>;
  verstuurResetLink: (email: string) => Promise<{ fout?: string }>;
  stelNieuwWachtwoordIn: (nieuwWachtwoord: string) => Promise<{ fout?: string }>;

  richtOrganisatieIn: (gegevens: BedrijfsgegevensInvoer) => Promise<void>;
  werkOrganisatieBij: (gegevens: BedrijfsgegevensInvoer) => Promise<void>;

  /** Na 5 foute pincodes (met account) is het pincodeslot dicht en moet het wachtwoord worden gebruikt. */
  ontgrendelMetPincode: (pincode: string) => Promise<{ juist: boolean; pogingenOver: number; geblokkeerd: boolean }>;
  /** Pincode vergeten: wist de pincode zodat er een nieuwe gekozen moet worden. */
  vergeetPincode: () => Promise<void>;
  /** Ontgrendelt zonder pincode — voor het wachtwoord-noodpad op het pincodescherm. */
  ontgrendel: () => void;
  vergrendel: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

/**
 * De map waar de app draait (bijv. https://andrew-yong.com/aftyk/), zonder hash.
 * Bewust niet alleen `origin`: de app kan in een submap staan (base: "./").
 * Supabase negeert deze URL als hij niet op de lijst Redirect URLs staat.
 */
function appBasisUrl(): string {
  return new URL(".", window.location.href.split("#")[0]).href;
}

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
  const [pincodeIngesteld, setPincodeIngesteld] = useState(false);
  const [inrichtingOvergeslagen, setInrichtingOvergeslagen] = useState(false);
  const [accountLaadFout, setAccountLaadFout] = useState(false);

  useEffect(() => {
    (async () => {
      let heeftLokaleOrganisatie = false;

      if (supabase) {
        const { data } = await supabase.auth.getSession();
        // Eerst zorgen dat de lokale gegevens van déze gebruiker zijn (gedeeld apparaat), dan pas laden.
        if (data.session) await zorgVoorEigenLokaleData(data.session.user.id);
        heeftLokaleOrganisatie = await laadLokaleOrganisatieEnProfiel();
        setSessie(data.session);
        if (data.session && !heeftLokaleOrganisatie) {
          await laadBedrijfVanServer(data.session.user.id);
        }

        supabase.auth.onAuthStateChange((_gebeurtenis, nieuweSessie) => {
          void (async () => {
            if (nieuweSessie && (await zorgVoorEigenLokaleData(nieuweSessie.user.id))) {
              await laadLokaleOrganisatieEnProfiel();
              setInrichtingOvergeslagen(await inrichtingIsOvergeslagen());
            }
            setSessie(nieuweSessie);
          })();
        });
      } else {
        heeftLokaleOrganisatie = await laadLokaleOrganisatieEnProfiel();
      }

      const pincodeAan = await pincodeIsIngeschakeld();
      // Demo-modus heeft een eigen, lege database: daar geen verplichte pincode.
      setPincodeIngesteld(pincodeAan || isDemo());
      setVergrendeldDoorPincode(pincodeAan && !isDemo());
      setInrichtingOvergeslagen(await inrichtingIsOvergeslagen());

      setKlaar(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function laadLokaleOrganisatieEnProfiel(): Promise<boolean> {
    const org = await db.organisaties.toCollection().first();
    const prof = await db.profielen.toCollection().first();
    setOrganisatie(org ?? null);
    setProfiel(prof ?? null);
    return !!org;
  }

  /** Haalt het bedrijf op; bij een mislukte opvraag blijft de gebruiker NIET doorgestuurd naar de inrichting. */
  async function laadBedrijfVanServer(gebruikerId: string): Promise<void> {
    const uitkomst = await haalOrganisatieEnProfielOp(gebruikerId);
    if (uitkomst.soort === "gevonden") {
      setOrganisatie(uitkomst.organisatie);
      setProfiel(uitkomst.profiel);
    }
    setAccountLaadFout(uitkomst.soort === "fout");
  }

  const probeerAccountOpnieuw: AuthState["probeerAccountOpnieuw"] = async () => {
    const gebruikerId = sessie?.user.id;
    if (gebruikerId) await laadBedrijfVanServer(gebruikerId);
  };

  const logIn: AuthState["logIn"] = async (email, wachtwoord, opties) => {
    if (!supabase) return { fout: t.sync.geenProject };
    if ((await haalPogingen("wachtwoord")) >= MAX_POGINGEN.wachtwoord) return { fout: t.auth.geblokkeerd, pogingenOver: 0, geblokkeerd: true };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: wachtwoord });
    if (error) {
      // Alleen een echt onjuist wachtwoord telt; offline of een serverfout is geen poging.
      if (/invalid login credentials/i.test(error.message)) {
        const over = MAX_POGINGEN.wachtwoord - (await verhoogPogingen("wachtwoord"));
        return { fout: vertaalAuthFout(error.message), pogingenOver: over, geblokkeerd: over <= 0 };
      }
      return { fout: vertaalAuthFout(error.message) };
    }
    await resetPogingen("wachtwoord");
    await resetPogingen("pincode");
    await zorgVoorEigenLokaleData(data.user.id);
    await laadLokaleOrganisatieEnProfiel();
    setInrichtingOvergeslagen(await inrichtingIsOvergeslagen());
    setSessie(data.session);
    // Zojuist met het wachtwoord ingelogd: dat telt als ontgrendelen.
    if (opties?.ontgrendel !== false) setVergrendeldDoorPincode(false);
    await laadBedrijfVanServer(data.user.id);
    return {};
  };

  const meldAan: AuthState["meldAan"] = async (email, wachtwoord, toegangscode) => {
    if (!supabase) return { fout: t.sync.geenProject };
    // De code gaat mee als gebruikersgegeven; een database-trigger op auth.users controleert
    // en "verbruikt" hem in één stap (zie supabase/migrations/0003), zodat hij maar één keer werkt.
    const { data, error } = await supabase.auth.signUp({
      email,
      password: wachtwoord,
      options: { data: { toegangscode }, emailRedirectTo: appBasisUrl() },
    });
    if (error) return { fout: vertaalAuthFout(error.message) };
    if (data.session) {
      await zorgVoorEigenLokaleData(data.session.user.id);
      await laadLokaleOrganisatieEnProfiel();
      setInrichtingOvergeslagen(await inrichtingIsOvergeslagen());
      setSessie(data.session);
      setVergrendeldDoorPincode(false);
      return {};
    }
    return { bevestigMail: true };
  };

  const logUit: AuthState["logUit"] = async () => {
    if (supabase) await supabase.auth.signOut();
    setSessie(null);
    setAccountLaadFout(false);
    setVergrendeldDoorPincode(true);
  };

  const verstuurResetLink: AuthState["verstuurResetLink"] = async (email) => {
    if (!supabase) return { fout: t.sync.geenProject };
    // HashRouter (zie App.tsx) — zo werkt de link zonder serverconfiguratie
    // voor client-side routing, wat op standaard cPanel-hosting niet vanzelf werkt.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${appBasisUrl()}#/nieuw-wachtwoord`,
    });
    if (error) return { fout: vertaalAuthFout(error.message) };
    return {};
  };

  const stelNieuwWachtwoordIn: AuthState["stelNieuwWachtwoordIn"] = async (nieuwWachtwoord) => {
    if (!supabase) return { fout: t.sync.geenProject };
    const { error } = await supabase.auth.updateUser({ password: nieuwWachtwoord });
    if (error) return { fout: vertaalAuthFout(error.message) };
    await resetPogingen("wachtwoord");
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
    await koppelLocatiesAanOrganisatie(nieuweOrganisatie);
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
    // Zonder account (lokale modus) is er geen wachtwoord om op terug te vallen: daar geen limiet.
    const begrensd = supabaseIsGeconfigureerd;
    if (begrensd && (await haalPogingen("pincode")) >= MAX_POGINGEN.pincode) return { juist: false, pogingenOver: 0, geblokkeerd: true };
    const juist = await controleerPincode(pincode);
    if (juist) {
      await resetPogingen("pincode");
      setVergrendeldDoorPincode(false);
      return { juist: true, pogingenOver: MAX_POGINGEN.pincode, geblokkeerd: false };
    }
    if (!begrensd) return { juist: false, pogingenOver: MAX_POGINGEN.pincode, geblokkeerd: false };
    const over = MAX_POGINGEN.pincode - (await verhoogPogingen("pincode"));
    return { juist: false, pogingenOver: over, geblokkeerd: over <= 0 };
  };

  const vergeetPincode: AuthState["vergeetPincode"] = async () => {
    await wisPincode();
    await resetPogingen("pincode");
    setPincodeIngesteld(false); // de Poortwachter stuurt door naar "Kies een pincode"
  };

  const stelPincodeIn: AuthState["stelPincodeIn"] = async (pincode) => {
    await zetPincode(pincode);
    setPincodeIngesteld(true);
    setVergrendeldDoorPincode(false);
  };

  const slaInrichtingOver: AuthState["slaInrichtingOver"] = async () => {
    await zetInrichtingOvergeslagen();
    setInrichtingOvergeslagen(true);
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
    pincodeIngesteld,
    inrichtingOvergeslagen,
    slaInrichtingOver,
    stelPincodeIn,
    accountLaadFout,
    probeerAccountOpnieuw,
    logIn,
    meldAan,
    logUit,
    verstuurResetLink,
    stelNieuwWachtwoordIn,
    richtOrganisatieIn,
    werkOrganisatieBij,
    ontgrendelMetPincode,
    vergeetPincode,
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
  if (/invalid login credentials/i.test(bericht)) return t.auth.onjuist;
  if (/already registered/i.test(bericht)) return t.auth.alBestaand;
  if (/database error saving new user|toegangscode/i.test(bericht)) return t.auth.ongeldigeCode;
  if (/password/i.test(bericht) && /short|weak/i.test(bericht)) return t.auth.tekort;
  return bericht;
}

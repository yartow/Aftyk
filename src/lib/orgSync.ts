import { db } from "../db/db";
import { supabase } from "./supabase";
import type { Organisatie, Profiel } from "../types/domain";

/**
 * Bedrijfsgegevens en profiel zijn — anders dan registraties — gewoon te
 * bewerken (geen audit-log), dus dit is een normale upsert in plaats van de
 * append-only outbox-route in lib/sync.ts.
 */
export async function verstuurOrganisatieEnProfiel(organisatie: Organisatie, profiel: Profiel): Promise<string | null> {
  if (!supabase || !navigator.onLine) return null;

  const { error: orgFout } = await supabase.from("organisaties").upsert({
    id: organisatie.id,
    naam: organisatie.naam,
    adres: organisatie.adres,
    postcode: organisatie.postcode,
    plaats: organisatie.plaats,
    kvk_nummer: organisatie.kvkNummer,
    contactpersoon: organisatie.contactpersoon,
    telefoon: organisatie.telefoon,
    email: organisatie.email,
    post_adres: organisatie.postAdres,
    post_postcode: organisatie.postPostcode,
    post_plaats: organisatie.postPlaats,
  });
  if (orgFout) return orgFout.message;

  const { error: profielFout } = await supabase.from("profielen").upsert({
    id: profiel.id,
    organisatie_id: profiel.organisatieId,
    naam: profiel.naam,
    rol: profiel.rol,
  });
  return profielFout ? profielFout.message : null;
}

export type OphaalUitkomst =
  | { soort: "gevonden"; organisatie: Organisatie; profiel: Profiel }
  /** De server antwoordde, maar er is (nog) geen bedrijf: een nieuw account. */
  | { soort: "geen" }
  /** Offline of de server gaf een fout: we weten niet of er een bedrijf bestaat. */
  | { soort: "fout" };

/**
 * Haalt organisatie + profiel van de server op na inloggen op een nieuw apparaat.
 * Een mislukte opvraag is niet hetzelfde als "geen bedrijf": anders zou een bestaande
 * gebruiker met slecht bereik een tweede bedrijf aanmaken.
 */
export async function haalOrganisatieEnProfielOp(gebruikerId: string): Promise<OphaalUitkomst> {
  if (!supabase || !navigator.onLine) return { soort: "fout" };

  const { data: profielRij, error: profielFout } = await supabase.from("profielen").select("*").eq("id", gebruikerId).maybeSingle();
  if (profielFout) return { soort: "fout" };
  if (!profielRij) return { soort: "geen" };

  const { data: orgRij, error: orgFout } = await supabase
    .from("organisaties")
    .select("*")
    .eq("id", profielRij.organisatie_id)
    .maybeSingle();
  if (orgFout) return { soort: "fout" };
  // Profiel zonder zichtbaar bedrijf is een inconsistente staat, geen nieuw account.
  if (!orgRij) return { soort: "fout" };

  const organisatie: Organisatie = {
    id: orgRij.id,
    naam: orgRij.naam,
    adres: orgRij.adres,
    postcode: orgRij.postcode,
    plaats: orgRij.plaats,
    kvkNummer: orgRij.kvk_nummer,
    contactpersoon: orgRij.contactpersoon,
    telefoon: orgRij.telefoon,
    email: orgRij.email,
    postAdres: orgRij.post_adres ?? "",
    postPostcode: orgRij.post_postcode ?? "",
    postPlaats: orgRij.post_plaats ?? "",
    bijgewerktOp: orgRij.bijgewerkt_op ?? new Date().toISOString(),
  };
  const profiel: Profiel = {
    id: profielRij.id,
    organisatieId: profielRij.organisatie_id,
    naam: profielRij.naam,
    rol: profielRij.rol,
  };

  await db.organisaties.put(organisatie);
  await db.profielen.put(profiel);

  return { soort: "gevonden", organisatie, profiel };
}

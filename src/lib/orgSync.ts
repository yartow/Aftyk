import { db } from "../db/db";
import { supabase } from "./supabase";
import type { Organisatie, Profiel } from "../types/domain";

/**
 * Bedrijfsgegevens en profiel zijn — anders dan registraties — gewoon te
 * bewerken (geen audit-log), dus dit is een normale upsert in plaats van de
 * append-only outbox-route in lib/sync.ts.
 */
export async function verstuurOrganisatieEnProfiel(organisatie: Organisatie, profiel: Profiel): Promise<void> {
  if (!supabase || !navigator.onLine) return;

  await supabase.from("organisaties").upsert({
    id: organisatie.id,
    naam: organisatie.naam,
    adres: organisatie.adres,
    postcode: organisatie.postcode,
    plaats: organisatie.plaats,
    kvk_nummer: organisatie.kvkNummer,
    contactpersoon: organisatie.contactpersoon,
    telefoon: organisatie.telefoon,
    email: organisatie.email,
  });

  await supabase.from("profielen").upsert({
    id: profiel.id,
    organisatie_id: profiel.organisatieId,
    naam: profiel.naam,
    rol: profiel.rol,
  });
}

/** Haalt organisatie + profiel van de server op na inloggen op een nieuw apparaat. */
export async function haalOrganisatieEnProfielOp(gebruikerId: string): Promise<{ organisatie: Organisatie; profiel: Profiel } | null> {
  if (!supabase || !navigator.onLine) return null;

  const { data: profielRij } = await supabase.from("profielen").select("*").eq("id", gebruikerId).maybeSingle();
  if (!profielRij) return null;

  const { data: orgRij } = await supabase
    .from("organisaties")
    .select("*")
    .eq("id", profielRij.organisatie_id)
    .maybeSingle();
  if (!orgRij) return null;

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

  return { organisatie, profiel };
}

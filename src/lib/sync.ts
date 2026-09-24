import { db, zetInstelling, haalInstelling } from "../db/db";
import { verstuurOrganisatieEnProfiel } from "./orgSync";
import { supabase } from "./supabase";
import { t } from "../i18n";
import type { Document, Locatie } from "../types/domain";

const SLEUTEL_LAATSTE_SYNC = "laatste_sync_op";
export const SLEUTEL_GEPAUZEERD = "sync_gepauzeerd";

export interface SyncResultaat {
  gelukt: boolean;
  verstuurd: number;
  fouten: number;
  foutmelding?: string;
}

/**
 * Drain de lokale uitgaande wachtrij naar Supabase en haal documenten op die
 * elders (ander apparaat) recenter zijn bijgewerkt. Wordt aangeroepen bij
 * opstarten, wanneer `navigator.onLine` op true springt, en handmatig via de
 * "Nu synchroniseren"-knop in Instellingen.
 *
 * Belangrijk: dit blokkeert nooit het lokaal invullen van een formulier. Bij
 * elke fout (geen netwerk, server onbereikbaar, sessie verlopen) stopt de
 * synchronisatie stil en blijft alles in de lokale wachtrij staan voor de
 * volgende poging — er gaat nooit data verloren door een mislukte sync.
 *
 * Conflicten: de meest recente `bijgewerktOp` wint.
 */
export async function synchroniseerNu(handmatig = false): Promise<SyncResultaat> {
  // Na "Verwijder online data" staat automatische synchronisatie uit, anders zou
  // de lokale kopie meteen weer online komen. Handmatig synchroniseren start opnieuw.
  if ((await haalInstelling(SLEUTEL_GEPAUZEERD)) === "true") {
    if (!handmatig) return { gelukt: false, verstuurd: 0, fouten: 0, foutmelding: t.verwijderen.gepauzeerd };
    await zetInstelling(SLEUTEL_GEPAUZEERD, "false");
  }
  if (!supabase) {
    return { gelukt: false, verstuurd: 0, fouten: 0, foutmelding: t.sync.geenProject };
  }
  if (!navigator.onLine) {
    return { gelukt: false, verstuurd: 0, fouten: 0, foutmelding: t.sync.geenInternet };
  }

  const { data: sessieData } = await supabase.auth.getSession();
  if (!sessieData.session) {
    return { gelukt: false, verstuurd: 0, fouten: 0, foutmelding: t.sync.nietIngelogd };
  }

  const organisatie = await db.organisaties.toCollection().first();
  if (!organisatie) {
    return { gelukt: false, verstuurd: 0, fouten: 0, foutmelding: t.sync.geenBedrijfsgegevens };
  }

  // Bedrijf en profiel moeten online bestaan voordat documenten en locaties erheen kunnen
  // (relevant na een nieuwe start of nadat de online data is verwijderd).
  const profiel = await db.profielen.toCollection().first();
  if (profiel && profiel.id === sessieData.session.user.id) await verstuurOrganisatieEnProfiel(organisatie, profiel);

  let verstuurd = 0;
  let fouten = 0;

  // Locaties eerst: documenten verwijzen ernaar.
  try {
    await verstuurLocaties(organisatie.id);
    await haalLocatiesOp();
  } catch {
    fouten += 1;
  }

  const wachtrij = await db.uitgaand.orderBy("aangemaaktOp").toArray();
  for (const item of wachtrij) {
    try {
      const document = await db.documenten.get(item.id);
      if (!document) {
        await db.uitgaand.delete(item.id);
        continue;
      }
      await verstuurDocument(organisatie.id, document);
      // Alleen uit de wachtrij halen als het document sinds het versturen niet
      // opnieuw is aangepast; anders blijft de nieuwere wijziging staan.
      const huidig = await db.uitgaand.get(item.id);
      if (huidig && huidig.aangemaaktOp === item.aangemaaktOp) await db.uitgaand.delete(item.id);
      verstuurd += 1;
    } catch (fout) {
      fouten += 1;
      await db.uitgaand.update(item.id, {
        pogingen: item.pogingen + 1,
        laatsteFout: fout instanceof Error ? fout.message : (fout as { message?: string })?.message ?? String(fout),
      });
    }
  }

  try {
    await haalDocumentenOp();
  } catch {
    fouten += 1;
  }

  await zetInstelling(SLEUTEL_LAATSTE_SYNC, new Date().toISOString());
  return { gelukt: fouten === 0, verstuurd, fouten };
}

export async function laatsteSyncTijd(): Promise<Date | null> {
  const waarde = await haalInstelling(SLEUTEL_LAATSTE_SYNC);
  return waarde ? new Date(waarde) : null;
}

async function verstuurDocument(organisatieId: string, document: Document): Promise<void> {
  if (!supabase) return;

  // Nieuwste wint: sla over als de server al een recentere versie heeft.
  const { data: bestaand, error: leesFout } = await supabase
    .from("documenten")
    .select("bijgewerkt_op")
    .eq("id", document.id)
    .maybeSingle();
  if (leesFout) throw leesFout;
  if (bestaand && new Date(bestaand.bijgewerkt_op) > new Date(document.bijgewerktOp)) return;

  const { error } = await supabase.from("documenten").upsert(
    {
      id: document.id,
      organisatie_id: organisatieId,
      locatie_id: document.locatieId,
      soort: document.soort,
      sleutel: document.sleutel,
      inhoud: document.inhoud,
      bijgewerkt_op: document.bijgewerktOp,
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function verstuurLocaties(organisatieId: string): Promise<void> {
  if (!supabase) return;
  const lokaal = (await db.locaties.toArray()).filter((l) => !l.organisatieId || l.organisatieId === organisatieId);
  if (lokaal.length === 0) return;
  const { data: server, error: leesFout } = await supabase.from("locaties").select("id, bijgewerkt_op");
  if (leesFout) throw leesFout;
  const serverTijden = new Map((server ?? []).map((r) => [r.id as string, new Date(r.bijgewerkt_op as string)]));
  const teVersturen = lokaal.filter((l) => !serverTijden.has(l.id) || serverTijden.get(l.id)! < new Date(l.bijgewerktOp));
  if (teVersturen.length === 0) return;
  const { error } = await supabase.from("locaties").upsert(
    teVersturen.map((l) => ({
      id: l.id,
      organisatie_id: organisatieId,
      naam: l.naam,
      adres: l.adres,
      postcode: l.postcode,
      plaats: l.plaats,
      telefoon: l.telefoon,
      actief: l.actief,
      bijgewerkt_op: l.bijgewerktOp,
    })),
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function haalLocatiesOp(): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.from("locaties").select("*");
  if (error) throw error;
  for (const rij of (data ?? []) as Record<string, unknown>[]) {
    const lokaal = await db.locaties.get(rij.id as string);
    if (lokaal && new Date(lokaal.bijgewerktOp) >= new Date(rij.bijgewerkt_op as string)) continue;
    const locatie: Locatie = {
      id: rij.id as string,
      organisatieId: rij.organisatie_id as string,
      naam: rij.naam as string,
      adres: (rij.adres as string) ?? "",
      postcode: (rij.postcode as string) ?? "",
      plaats: (rij.plaats as string) ?? "",
      telefoon: (rij.telefoon as string) ?? "",
      actief: rij.actief as boolean,
      bijgewerktOp: rij.bijgewerkt_op as string,
    };
    await db.locaties.put(locatie);
  }
}

/** Haalt documenten op die recenter zijn dan de lokale kopie (bijv. na een tabletwissel). */
async function haalDocumentenOp(): Promise<void> {
  if (!supabase) return;
  const { data, error } = await supabase.from("documenten").select("*");
  if (error) throw error;
  for (const rij of (data ?? []) as Record<string, unknown>[]) {
    const id = rij.id as string;
    // Oudere rijen zonder locatie horen bij het vorige, niet-locatiegebonden formaat.
    if (!rij.locatie_id) continue;
    const lokaal = await db.documenten.get(id);
    const serverTijd = rij.bijgewerkt_op as string;
    if (lokaal && new Date(lokaal.bijgewerktOp) >= new Date(serverTijd)) continue;
    // Een lokale wijziging die nog in de wachtrij staat mag niet worden overschreven.
    if (await db.uitgaand.get(id)) continue;
    await db.documenten.put({
      id,
      locatieId: rij.locatie_id as string,
      soort: rij.soort as Document["soort"],
      sleutel: rij.sleutel as string,
      inhoud: rij.inhoud,
      bijgewerktOp: serverTijd,
    });
  }
}

/** Registreert automatische synchronisatie bij het terugkrijgen van wifi. */
export function registreerAutomatischeSync(opAfgerond?: (resultaat: SyncResultaat) => void): () => void {
  const handler = () => {
    synchroniseerNu().then((resultaat) => opAfgerond?.(resultaat));
  };
  window.addEventListener("online", handler);
  return () => window.removeEventListener("online", handler);
}

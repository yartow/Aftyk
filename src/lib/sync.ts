import { db, zetInstelling, haalInstelling } from "../db/db";
import { supabase } from "./supabase";
import type { Correctie, Registratie, Sjabloon, SjabloonItem } from "../types/domain";

const SLEUTEL_LAATSTE_SYNC = "laatste_sync_op";

export interface SyncResultaat {
  gelukt: boolean;
  verstuurd: number;
  fouten: number;
  foutmelding?: string;
}

/**
 * Drain de lokale uitgaande wachtrij naar Supabase. Wordt aangeroepen bij
 * opstarten, wanneer `navigator.onLine` op true springt, en handmatig via de
 * "Nu synchroniseren"-knop in Instellingen.
 *
 * Belangrijk: dit blokkeert nooit het lokaal invullen van een checklist.
 * Bij elke fout (geen netwerk, server onbereikbaar, sessie verlopen) stopt
 * de synchronisatie stil en blijft alles in de lokale wachtrij staan voor
 * de volgende poging — er gaat nooit data verloren door een mislukte sync.
 */
export async function synchroniseerNu(): Promise<SyncResultaat> {
  if (!supabase) {
    return { gelukt: false, verstuurd: 0, fouten: 0, foutmelding: "Geen Supabase-project gekoppeld." };
  }
  if (!navigator.onLine) {
    return { gelukt: false, verstuurd: 0, fouten: 0, foutmelding: "Geen internetverbinding." };
  }

  const { data: sessieData } = await supabase.auth.getSession();
  const sessie = sessieData.session;
  if (!sessie) {
    return { gelukt: false, verstuurd: 0, fouten: 0, foutmelding: "Niet ingelogd." };
  }

  await synchroniseerSjablonenNaarBeneden();

  let verstuurd = 0;
  let fouten = 0;

  // Op aangemaaktOp gesorteerd: registraties gaan voor hun eventuele
  // correcties, en de volgorde in het archief blijft logisch.
  const wachtrij = await db.uitgaand.orderBy("aangemaaktOp").toArray();

  for (const item of wachtrij) {
    try {
      if (item.soort === "registratie") {
        const registratie = await db.registraties.get(item.id);
        if (!registratie) {
          await db.uitgaand.delete(item.id);
          continue;
        }
        await verstuurRegistratie(registratie);
      } else {
        const correctie = await db.correcties.get(item.id);
        if (!correctie) {
          await db.uitgaand.delete(item.id);
          continue;
        }
        // Een correctie kan pas als de bijbehorende registratie al bestaat
        // op de server; sla anders over en probeer het bij de volgende sync.
        const geregistreerd = await bestaatOpServer(correctie.registratieId);
        if (!geregistreerd) continue;
        await verstuurCorrectie(correctie);
      }
      await db.uitgaand.delete(item.id);
      verstuurd += 1;
    } catch (fout) {
      fouten += 1;
      await db.uitgaand.update(item.id, {
        pogingen: item.pogingen + 1,
        laatsteFout: fout instanceof Error ? fout.message : String(fout),
      });
    }
  }

  await zetInstelling(SLEUTEL_LAATSTE_SYNC, new Date().toISOString());

  return { gelukt: fouten === 0, verstuurd, fouten };
}

export async function laatsteSyncTijd(): Promise<Date | null> {
  const waarde = await haalInstelling(SLEUTEL_LAATSTE_SYNC);
  return waarde ? new Date(waarde) : null;
}

async function bestaatOpServer(registratieId: string): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.from("registraties").select("id").eq("id", registratieId).maybeSingle();
  if (error) throw error;
  return !!data;
}

async function verstuurRegistratie(registratie: Registratie): Promise<void> {
  if (!supabase) return;

  // Idempotente upsert op de client-gegenereerde UUID: een sync die
  // halverwege afbreekt en opnieuw wordt geprobeerd, veroorzaakt nooit
  // dubbele registraties.
  const { error: registratieFout } = await supabase.from("registraties").upsert(
    {
      id: registratie.id,
      organisatie_id: registratie.organisatieId,
      sjabloon_id: registratie.sjabloonId,
      sjabloon_naam: registratie.sjabloonNaam,
      sjabloon_versie: registratie.sjabloonVersie,
      gebruiker_id: registratie.gebruikerId,
      gebruiker_naam: registratie.gebruikerNaam,
      werkdatum: registratie.werkdatum,
      apparaat_tijd: registratie.apparaatTijd,
      is_inhaalregistratie: registratie.isInhaalregistratie,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (registratieFout) throw registratieFout;

  const antwoordenRijen = registratie.antwoorden.map((antwoord) => ({
    id: `${registratie.id}:${antwoord.itemId}`,
    registratie_id: registratie.id,
    item_id: antwoord.itemId,
    item_tekst: antwoord.itemTekst,
    waarde_bool: antwoord.waardeBool ?? null,
    waarde_getal: antwoord.waardeGetal ?? null,
    waarde_tekst: antwoord.waardeTekst ?? null,
    opmerking: antwoord.opmerking ?? null,
  }));
  if (antwoordenRijen.length > 0) {
    const { error: antwoordenFout } = await supabase
      .from("antwoorden")
      .upsert(antwoordenRijen, { onConflict: "id", ignoreDuplicates: true });
    if (antwoordenFout) throw antwoordenFout;
  }

  // ontvangen_op wordt uitsluitend door de server gezet (kolomstandaard
  // now()) — de client mag dit veld niet meesturen of overschrijven.
  const { data: opgeslagen, error: leesFout } = await supabase
    .from("registraties")
    .select("ontvangen_op")
    .eq("id", registratie.id)
    .single();
  if (!leesFout && opgeslagen) {
    await db.registraties.update(registratie.id, { ontvangenOp: opgeslagen.ontvangen_op });
  }
}

async function verstuurCorrectie(correctie: Correctie): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from("correcties").upsert(
    {
      id: correctie.id,
      registratie_id: correctie.registratieId,
      gebruiker_id: correctie.gebruikerId,
      gebruiker_naam: correctie.gebruikerNaam,
      toelichting: correctie.toelichting,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

/** Haal (nieuwe versies van) sjablonen en items op en cache ze lokaal. */
async function synchroniseerSjablonenNaarBeneden(): Promise<void> {
  if (!supabase) return;

  const { data: sjablonen, error: sjabloonFout } = await supabase
    .from("sjablonen")
    .select("*")
    .eq("actief", true);
  if (sjabloonFout || !sjablonen) return;

  for (const rij of sjablonen as Record<string, unknown>[]) {
    const sjabloon: Sjabloon = {
      id: rij.id as string,
      organisatieId: (rij.organisatie_id as string | null) ?? null,
      naam: rij.naam as string,
      frequentie: rij.frequentie as Sjabloon["frequentie"],
      versie: rij.versie as number,
      actief: rij.actief as boolean,
    };
    await db.sjablonen.put(sjabloon);

    const { data: items } = await supabase
      .from("sjabloon_items")
      .select("*")
      .eq("sjabloon_id", sjabloon.id)
      .order("volgorde", { ascending: true });
    for (const itemRij of (items ?? []) as Record<string, unknown>[]) {
      const item: SjabloonItem = {
        id: itemRij.id as string,
        sjabloonId: itemRij.sjabloon_id as string,
        volgorde: itemRij.volgorde as number,
        tekst: itemRij.tekst as string,
        type: itemRij.type as SjabloonItem["type"],
        verplicht: itemRij.verplicht as boolean,
        hulptekst: (itemRij.hulptekst as string | undefined) ?? undefined,
      };
      await db.sjabloonItems.put(item);
    }
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

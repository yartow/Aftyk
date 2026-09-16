import { db } from "../db/db";
import { downloadBlob } from "./csv";
import type { Correctie, Organisatie, Profiel, Registratie, Sjabloon, SjabloonItem } from "../types/domain";

interface BackupBestand {
  versie: number;
  organisaties: Organisatie[];
  profielen: Profiel[];
  sjablonen: Sjabloon[];
  sjabloonItems: SjabloonItem[];
  registraties: Registratie[];
  correcties: Correctie[];
}

/**
 * Volledige lokale back-up als JSON-bestand — bedoeld als extra vangnet
 * (bijv. maandelijks op een USB-stick) naast de synchronisatie naar
 * Supabase, voor het geval een tablet kapotgaat of kwijtraakt vóórdat een
 * sync heeft plaatsgevonden.
 */
export async function maakBackupBestand(): Promise<void> {
  const data = {
    versie: 1,
    gemaaktOp: new Date().toISOString(),
    organisaties: await db.organisaties.toArray(),
    profielen: await db.profielen.toArray(),
    sjablonen: await db.sjablonen.toArray(),
    sjabloonItems: await db.sjabloonItems.toArray(),
    registraties: await db.registraties.toArray(),
    correcties: await db.correcties.toArray(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const datumStempel = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `hygienecode-backup-${datumStempel}.json`);
}

/**
 * Herstelt een eerder gemaakt back-upbestand — bedoeld voor het geval een
 * tablet is vervangen vóórdat er kon worden gesynchroniseerd met Supabase.
 * Voegt gegevens toe/overschrijft op id (put), verwijdert niets: bestaande
 * lokale registraties gaan hierdoor nooit verloren, ook niet bij een
 * back-up die ouder is dan de huidige stand.
 */
export async function herstelBackupBestand(bestand: File): Promise<{ aantalRegistraties: number }> {
  const tekst = await bestand.text();
  let data: BackupBestand;
  try {
    data = JSON.parse(tekst);
  } catch {
    throw new Error("Dit bestand is geen geldige back-up (kon het niet lezen als JSON).");
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.registraties)) {
    throw new Error("Dit bestand lijkt geen back-up van deze app te zijn.");
  }

  await db.transaction(
    "rw",
    [db.organisaties, db.profielen, db.sjablonen, db.sjabloonItems, db.registraties, db.correcties, db.uitgaand],
    async () => {
      if (data.organisaties?.length) await db.organisaties.bulkPut(data.organisaties);
      if (data.profielen?.length) await db.profielen.bulkPut(data.profielen);
      if (data.sjablonen?.length) await db.sjablonen.bulkPut(data.sjablonen);
      if (data.sjabloonItems?.length) await db.sjabloonItems.bulkPut(data.sjabloonItems);

      // Overschrijf nooit een lokale registratie die al een server-tijdstempel
      // heeft met een oudere back-upkopie zonder dat stempel — anders lijkt
      // een allang gesynchroniseerde registratie na herstel weer onverstuurd,
      // en wordt hij zelfs opnieuw in de wachtrij gezet (zie hieronder).
      const alGesynchroniseerd = new Set(
        (await db.registraties.toArray()).filter((r) => r.ontvangenOp).map((r) => r.id),
      );
      const teHerstellenRegistraties = data.registraties.filter((r) => !alGesynchroniseerd.has(r.id));
      if (teHerstellenRegistraties.length) await db.registraties.bulkPut(teHerstellenRegistraties);

      // Correcties die hier al staan zijn ofwel al gesynchroniseerd, ofwel
      // staan al in de wachtrij — alleen correcties die nieuw zijn op dit
      // apparaat (bijv. na een tabletwissel) hoeven opnieuw verstuurd te
      // worden. Anders veroorzaakt elk herstel nodeloos netwerkverkeer voor
      // de volledige correctiegeschiedenis.
      const bestaandeCorrectieIds = new Set((await db.correcties.toArray()).map((c) => c.id));
      const nieuweCorrecties = (data.correcties ?? []).filter((c) => !bestaandeCorrectieIds.has(c.id));
      if (data.correcties?.length) await db.correcties.bulkPut(data.correcties);

      // De back-up bevat geen wachtrij-status, dus zet voor de zekerheid
      // alles wat nog geen server-tijdstempel heeft opnieuw klaar voor
      // synchronisatie — dankzij de idempotente upsert in lib/sync.ts leidt
      // dat nooit tot dubbele rijen op de server.
      for (const registratie of teHerstellenRegistraties) {
        if (!registratie.ontvangenOp) {
          await db.uitgaand.put({ id: registratie.id, soort: "registratie", pogingen: 0, aangemaaktOp: registratie.apparaatTijd });
        }
      }
      for (const correctie of nieuweCorrecties) {
        await db.uitgaand.put({ id: correctie.id, soort: "correctie", pogingen: 0, aangemaaktOp: correctie.aangemaaktOp });
      }
    },
  );

  return { aantalRegistraties: data.registraties.length };
}

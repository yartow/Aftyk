import { db } from "../db/db";
import { downloadBlob } from "./deel";
import { t } from "../i18n";
import type { Document, Locatie, Organisatie, Profiel } from "../types/domain";

interface BackupBestand {
  versie: number;
  organisaties: Organisatie[];
  profielen: Profiel[];
  locaties?: Locatie[];
  documenten: Document[];
}

/**
 * Volledige lokale back-up als JSON-bestand — bedoeld als extra vangnet
 * (bijv. maandelijks op een USB-stick) naast de synchronisatie naar
 * Supabase, voor het geval een tablet kapotgaat of kwijtraakt vóórdat een
 * sync heeft plaatsgevonden.
 */
export async function maakBackupBestand(): Promise<void> {
  const data: BackupBestand & { gemaaktOp: string } = {
    versie: 3,
    gemaaktOp: new Date().toISOString(),
    organisaties: await db.organisaties.toArray(),
    profielen: await db.profielen.toArray(),
    locaties: await db.locaties.toArray(),
    documenten: await db.documenten.toArray(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const datumStempel = new Date().toISOString().slice(0, 10);
  downloadBlob(blob, `hygienecode-backup-${datumStempel}.json`);
}

/**
 * Herstelt een eerder gemaakt back-upbestand. Voegt toe/overschrijft op id,
 * maar alleen als de back-upkopie recenter is dan de lokale: bestaande
 * lokale gegevens gaan hierdoor nooit verloren.
 */
export async function herstelBackupBestand(bestand: File): Promise<{ aantalDocumenten: number }> {
  const tekst = await bestand.text();
  let data: BackupBestand;
  try {
    data = JSON.parse(tekst);
  } catch {
    throw new Error(t.instellingen.backupGeenJson);
  }
  if (!data || typeof data !== "object" || !Array.isArray(data.documenten)) {
    throw new Error(t.instellingen.backupGeenBackup);
  }

  await db.transaction("rw", [db.organisaties, db.profielen, db.locaties, db.documenten, db.uitgaand], async () => {
    // Net als bij documenten wint de meest recent bewerkte versie.
    for (const organisatie of data.organisaties ?? []) {
      const lokaal = await db.organisaties.get(organisatie.id);
      if (!lokaal || (lokaal.bijgewerktOp ?? "") < (organisatie.bijgewerktOp ?? "")) await db.organisaties.put(organisatie);
    }
    // Profielen hebben geen tijdstempel: alleen toevoegen wat er lokaal nog niet is.
    for (const profiel of data.profielen ?? []) {
      if (!(await db.profielen.get(profiel.id))) await db.profielen.put(profiel);
    }
    for (const locatie of data.locaties ?? []) {
      const lokaal = await db.locaties.get(locatie.id);
      if (!lokaal || lokaal.bijgewerktOp < locatie.bijgewerktOp) await db.locaties.put(locatie);
    }
    // Back-ups van vóór de locaties bevatten documenten zonder locatie: die horen bij de eerste locatie.
    const terugvalLocatie = (await db.locaties.toCollection().first())?.id;
    for (const origineel of data.documenten) {
      const document: Document =
        !origineel.locatieId && terugvalLocatie
          ? { ...origineel, locatieId: terugvalLocatie, id: `${origineel.soort}:${terugvalLocatie}:${origineel.sleutel}` }
          : origineel;
      const lokaal = await db.documenten.get(document.id);
      if (lokaal && lokaal.bijgewerktOp >= document.bijgewerktOp) continue;
      await db.documenten.put(document);
      await db.uitgaand.put({ id: document.id, pogingen: 0, aangemaaktOp: new Date().toISOString() });
    }
  });

  return { aantalDocumenten: data.documenten.length };
}

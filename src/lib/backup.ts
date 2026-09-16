import { db } from "../db/db";
import { downloadBlob } from "./csv";

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

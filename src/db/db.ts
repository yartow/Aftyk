import Dexie, { type Table } from "dexie";
import type {
  Correctie,
  Instelling,
  Organisatie,
  Profiel,
  Registratie,
  Sjabloon,
  SjabloonItem,
  UitgaandeSyncItem,
} from "../types/domain";

/**
 * Lokale database op het tablet (IndexedDB via Dexie). Dit is de bron van
 * waarheid tijdens het werken in de winkel — er wordt nooit gewacht op het
 * netwerk om een registratie op te slaan. Supabase is de back-up/archief
 * waar de lokale gegevens naartoe worden gesynchroniseerd zodra er wifi is.
 */
export class HygienecodeDatabase extends Dexie {
  organisaties!: Table<Organisatie, string>;
  profielen!: Table<Profiel, string>;
  sjablonen!: Table<Sjabloon, string>;
  sjabloonItems!: Table<SjabloonItem, string>;
  registraties!: Table<Registratie, string>;
  correcties!: Table<Correctie, string>;
  uitgaand!: Table<UitgaandeSyncItem, string>;
  instellingen!: Table<Instelling, string>;

  constructor() {
    super("hygienecode");
    this.version(1).stores({
      organisaties: "id",
      profielen: "id, organisatieId",
      sjablonen: "id, organisatieId, actief",
      sjabloonItems: "id, sjabloonId, volgorde",
      // werkdatum geïndexeerd voor het jaaroverzicht; sjabloonId voor "vandaag".
      registraties: "id, organisatieId, sjabloonId, werkdatum, gebruikerId",
      correcties: "id, registratieId",
      uitgaand: "id, soort, aangemaaktOp",
      instellingen: "sleutel",
    });
  }
}

export const db = new HygienecodeDatabase();

export async function haalInstelling(sleutel: string): Promise<string | undefined> {
  const rij = await db.instellingen.get(sleutel);
  return rij?.waarde;
}

export async function zetInstelling(sleutel: string, waarde: string): Promise<void> {
  await db.instellingen.put({ sleutel, waarde });
}

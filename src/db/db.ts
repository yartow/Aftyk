import Dexie, { type Table } from "dexie";
import { DB_NAAM_DEMO, DB_NAAM_ECHT, isDemo } from "../lib/modus";
import type { Document, Instelling, Locatie, Organisatie, Profiel, UitgaandeSyncItem } from "../types/domain";

/**
 * Lokale database op het tablet (IndexedDB via Dexie). Dit is de bron van
 * waarheid tijdens het werken in de winkel — er wordt nooit gewacht op het
 * netwerk om iets op te slaan. Supabase is de back-up/archief waar de
 * lokale gegevens naartoe worden gesynchroniseerd zodra er wifi is.
 */
export class HygienecodeDatabase extends Dexie {
  organisaties!: Table<Organisatie, string>;
  profielen!: Table<Profiel, string>;
  locaties!: Table<Locatie, string>;
  documenten!: Table<Document, string>;
  uitgaand!: Table<UitgaandeSyncItem, string>;
  instellingen!: Table<Instelling, string>;

  constructor(naam: string) {
    super(naam);
    this.version(1).stores({
      organisaties: "id",
      profielen: "id, organisatieId",
      sjablonen: "id, organisatieId, actief",
      sjabloonItems: "id, sjabloonId, volgorde",
      registraties: "id, organisatieId, sjabloonId, werkdatum, gebruikerId",
      correcties: "id, registratieId",
      uitgaand: "id, soort, aangemaaktOp",
      instellingen: "sleutel",
    });
    // v2: de placeholder-checklists zijn vervangen door de drie documenten.
    this.version(2).stores({
      sjablonen: null,
      sjabloonItems: null,
      registraties: null,
      correcties: null,
      documenten: "id, soort, sleutel",
    });
    // v3: meerdere locaties per bedrijf. Bestaande documenten verhuizen naar
    // één standaardlocatie, zodat er niets verloren gaat.
    this.version(3)
      .stores({
        locaties: "id, organisatieId",
        documenten: "id, soort, sleutel, locatieId",
      })
      .upgrade(async (tx) => {
        const organisaties = tx.table("organisaties");
        const documenten = tx.table("documenten");
        const uitgaand = tx.table("uitgaand");
        const org = (await organisaties.toCollection().first()) as Organisatie | undefined;
        if (org) {
          await organisaties.put({ ...org, postAdres: org.postAdres ?? "", postPostcode: org.postPostcode ?? "", postPlaats: org.postPlaats ?? "" });
        }
        const alleDocumenten = (await documenten.toArray()) as Array<Document & { locatieId?: string }>;
        if (!org && alleDocumenten.length === 0) return; // verse installatie: de app maakt zelf een locatie aan
        const locatieId = crypto.randomUUID();
        const nu = new Date().toISOString();
        await tx.table("locaties").put({
          id: locatieId,
          organisatieId: org?.id ?? "",
          naam: "Hoofdlocatie",
          adres: org?.adres ?? "",
          postcode: org?.postcode ?? "",
          plaats: org?.plaats ?? "",
          telefoon: org?.telefoon ?? "",
          actief: true,
          bijgewerktOp: nu,
        } satisfies Locatie);
        await tx.table("instellingen").put({ sleutel: "actieve_locatie", waarde: locatieId });
        for (const document of alleDocumenten) {
          const oudId = document.id;
          const nieuwId = `${document.soort}:${locatieId}:${document.sleutel}`;
          await documenten.delete(oudId);
          await documenten.put({ ...document, id: nieuwId, locatieId });
          // Alles opnieuw in de wachtrij: ook al gesynchroniseerde documenten staan online
          // nog onder het oude id (zonder locatie) en moeten onder het nieuwe id worden geüpload.
          await uitgaand.delete(oudId);
          await uitgaand.put({ id: nieuwId, pogingen: 0, aangemaaktOp: nu });
        }
      });
  }
}

export const db = new HygienecodeDatabase(isDemo() ? DB_NAAM_DEMO : DB_NAAM_ECHT);

export async function haalInstelling(sleutel: string): Promise<string | undefined> {
  const rij = await db.instellingen.get(sleutel);
  return rij?.waarde;
}

export async function zetInstelling(sleutel: string, waarde: string): Promise<void> {
  await db.instellingen.put({ sleutel, waarde });
}

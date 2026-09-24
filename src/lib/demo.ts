import { db } from "../db/db";
import { nieuweId } from "./id";
import { isDemo, zetDemoVlag } from "./modus";
import { standaardSchoonmaakConfig } from "./schoonmaakDefaults";
import { standaardWeekformulier } from "./weekformulierDefaults";
import { maandagVan, maandSleutel, verschuifWeek, weekSleutel } from "./kalender";
import { werkdatumVan } from "./format";
import { t } from "../i18n";
import type {
  DocumentSoort,
  Leverancier,
  LeverancierBeoordeling,
  LeveranciersConfig,
  LeveranciersMaand,
  Locatie,
  Organisatie,
  Profiel,
  SchoonmaakConfig,
  SchoonmaakMaand,
  SchoonmaakWeek,
  Weekformulier,
} from "../types/domain";

/**
 * Demo-modus: een aparte lokale database ("hygienecode-demo") met
 * voorbeeldgegevens, zonder enige verbinding met de online database (zie
 * supabase.ts). De echte database wordt niet aangeraakt.
 *
 * Aan- en uitzetten wisselt de database die db.ts bij het laden kiest, en
 * laadt de pagina daarom opnieuw.
 */

export function startDemo(): void {
  zetDemoVlag(true);
  window.location.hash = "#/";
  window.location.reload();
}

export function verlaatDemo(): void {
  zetDemoVlag(false);
  window.location.hash = "#/";
  window.location.reload();
}

/** Wist alleen de demo-database; bij de volgende start wordt hij opnieuw gevuld. */
export async function resetDemo(): Promise<void> {
  if (!isDemo()) return;
  await db.delete();
  window.location.hash = "#/";
  window.location.reload();
}

async function zetDocument(locatieId: string, soort: DocumentSoort, sleutel: string, inhoud: unknown): Promise<void> {
  await db.documenten.put({
    id: `${soort}:${locatieId}:${sleutel}`,
    locatieId,
    soort,
    sleutel,
    inhoud,
    bijgewerktOp: new Date().toISOString(),
  });
}

/** Vult de demo-database, maar alleen als die nog leeg is. */
export async function zaaiDemoData(): Promise<void> {
  if (!isDemo() || (await db.organisaties.count()) > 0) return;

  const nu = new Date();
  const iso = nu.toISOString();
  const organisatie: Organisatie = {
    id: nieuweId(),
    naam: t.demo.orgNaam,
    adres: "Havenstraat 12",
    postcode: "1011 AB",
    plaats: "Amsterdam",
    kvkNummer: "12345678",
    contactpersoon: "Sanne de Vries",
    telefoon: "020 123 4567",
    email: "info@voorbeeld.nl",
    postAdres: "Postbus 123",
    postPostcode: "1000 AA",
    postPlaats: "Amsterdam",
    bijgewerktOp: iso,
  };
  const profiel: Profiel = { id: `lokaal-${nieuweId()}`, organisatieId: organisatie.id, naam: organisatie.contactpersoon, rol: "eigenaar" };
  const locatie = (naam: string, adres: string, postcode: string): Locatie => ({
    id: nieuweId(),
    organisatieId: organisatie.id,
    naam,
    adres,
    postcode,
    plaats: "Amsterdam",
    telefoon: "020 123 4567",
    actief: true,
    bijgewerktOp: iso,
  });
  const centrum = locatie(t.demo.loc1, "Havenstraat 12", "1011 AB");
  const noord = locatie(t.demo.loc2, "Noorderpad 5", "1035 CC");

  await db.organisaties.put(organisatie);
  await db.profielen.put(profiel);
  await db.locaties.bulkPut([centrum, noord]);
  await db.instellingen.put({ sleutel: "actieve_locatie", waarde: centrum.id });

  const maandag = maandagVan(nu);
  const vandaagIndex = (nu.getDay() + 6) % 7; // 0 = maandag
  const config: SchoonmaakConfig = standaardSchoonmaakConfig();
  config.middelen = config.middelen.map((m) => ({
    ...m,
    dosering: m.code === 3 ? "1:100" : "1:50",
    inwerktijd: m.code === 3 ? "5 min" : "2 min",
    naspoelen: m.code === 2 ? "–" : "✓",
  }));

  const dagenVoor = (frequentie: string, deel: number): boolean[] =>
    Array.from({ length: 7 }, (_, i) => (frequentie === "D" ? i < vandaagIndex + (deel === 0 ? 0 : 7) : frequentie === "W" ? i === 2 && vandaagIndex >= 2 : i % 2 === 0 && i < vandaagIndex));

  const maakWeek = (deel: number): SchoonmaakWeek => ({
    dagen: Object.fromEntries(
      config.objecten.filter((o) => o.frequentie && o.frequentie !== "M").map((o) => [o.id, dagenVoor(o.frequentie!, deel)]),
    ),
  });
  const maand: SchoonmaakMaand = { datums: { "obj-1": werkdatumVan(new Date(nu.getFullYear(), nu.getMonth(), 3)), "obj-2": werkdatumVan(new Date(nu.getFullYear(), nu.getMonth(), 3)) } };

  const weekformulier: Weekformulier = {
    ...standaardWeekformulier(),
    ontvangst: [
      {
        id: nieuweId(),
        datum: werkdatumVan(nu),
        leverancier: t.demo.leverancier1,
        product: "Kabeljauw",
        temperatuur: "6,5",
        verpakking: "V",
        tht: "V",
        paraaf: "SV",
        actie: "",
      },
    ],
    opslag: {
      koelcel: { datum: werkdatumVan(nu), temperatuur: "9", afgedekt: "V", fifoTht: "V", paraaf: "SV", actie: t.demo.afwijkingActie },
      koelkast1: { datum: werkdatumVan(nu), temperatuur: "4", afgedekt: "V", fifoTht: "V", paraaf: "SV", actie: "" },
      vriezer1: { datum: werkdatumVan(nu), temperatuur: "-20", afgedekt: "V", fifoTht: "V", paraaf: "SV", actie: "" },
      koelvitrine: { datum: werkdatumVan(nu), temperatuur: "5", afgedekt: "V", fifoTht: "V", paraaf: "SV", actie: "" },
    },
    ccps: { verhitten: { datum: werkdatumVan(nu), product: "Kibbeling", waarde: "82", minuten: "", paraaf: "SV", actie: "" } },
    beoordeeldDoor: "",
    beoordeeldOp: "",
  };

  const leveranciers: Leverancier[] = [t.demo.leverancier1, t.demo.leverancier2, t.demo.leverancier3].map((naam) => ({ id: nieuweId(), naam, gearchiveerd: false }));
  const beoordeling = (verloop: Date, betrouwbaarheid: LeverancierBeoordeling["betrouwbaarheid"], conclusie: LeverancierBeoordeling["conclusie"]): LeverancierBeoordeling => ({
    certificaat: true,
    verloopdatum: werkdatumVan(verloop),
    betrouwbaarheid,
    opmerking: "",
    conclusie,
  });
  const dag = 86400000;
  const leverancierMaand: LeveranciersMaand = {
    beoordelingen: {
      [leveranciers[0].id]: beoordeling(new Date(nu.getTime() + 300 * dag), "goed", "goedgekeurd"),
      [leveranciers[1].id]: beoordeling(new Date(nu.getTime() + 12 * dag), "matig", "voorwaardelijk"), // laat de "verloopt binnenkort"-waarschuwing zien
    },
  };

  for (const l of [centrum, noord]) {
    await zetDocument(l.id, "schoonmaak-config", "config", config);
    await zetDocument(l.id, "schoonmaak-week", weekSleutel(maandag), maakWeek(0));
    await zetDocument(l.id, "schoonmaak-week", weekSleutel(verschuifWeek(maandag, -1)), maakWeek(1));
    await zetDocument(l.id, "schoonmaak-maand", maandSleutel(new Date(maandag.getFullYear(), maandag.getMonth(), maandag.getDate() + 3)), maand);
  }
  await zetDocument(centrum.id, "weekformulier", weekSleutel(maandag), weekformulier);
  await zetDocument(centrum.id, "leveranciers-config", "config", { leveranciers } satisfies LeveranciersConfig);
  await zetDocument(centrum.id, "leveranciers-maand", maandSleutel(nu), leverancierMaand);
  await zetDocument(noord.id, "leveranciers-config", "config", { leveranciers: [leveranciers[0]] } satisfies LeveranciersConfig);
}

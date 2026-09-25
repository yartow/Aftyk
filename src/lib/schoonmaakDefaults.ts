import type { Freq, Methode, SchoonmaakConfig, SchoonmaakObject, Schoonmaakmiddel } from "../types/domain";
import { t } from "../i18n";

/**
 * Voorgevulde waarden uit "Schoonmaakplan vnv.docx"; de gebruiker kan alles aanpassen.
 * `nl` is de oorspronkelijke Nederlandse naam: zolang een opgeslagen naam daar
 * gelijk aan is, wordt de naam in de gekozen taal getoond.
 */
type ObjectSleutel = keyof typeof t.objecten;
const RIJEN: Array<[ObjectSleutel, string, 1 | 2 | 4, 3 | null, Freq]> = [
  ["vriezers", "Vriezers", 1, null, "M"],
  ["verdampers", "Verdampers", 1, null, "M"],
  ["magazijnstellingen", "Magazijnstellingen", 1, null, "M"],
  ["schappen", "Schappen / stellingen", 1, null, "M"],
  ["koelingen", "Koelingen", 1, 3, "W"],
  ["friteuses", "Friteuses", 4, null, "W"],
  ["afzuiging", "Afzuiging (incl. roosters)", 1, null, "W"],
  ["wanden", "Wanden", 1, null, "W"],
  ["bainmarie", "Bain marie", 1, null, "W"],
  ["saladiere", "Saladiere", 1, null, "D"],
  ["grill", "Grill", 4, null, "D"],
  ["werkbanken", "Werkbanken", 1, 3, "D"],
  ["vloer", "Vloer", 2, null, "D"],
  ["vaatwasser", "Vaatwasser", 1, null, "D"],
  ["afvalbakken", "Afvalbakken", 1, 3, "D"],
  ["schoonmaakmateriaal", "Schoonmaakmateriaal", 1, 3, "D"],
  ["handcontactpunten", "Handcontactpunten", 1, 3, "D"],
  ["handenwasgelegenheid", "Handenwasgelegenheid", 1, 3, "D"],
  ["spoelbakken", "Spoelbakken", 1, 3, "D"],
  ["magnetron", "Magnetron", 1, 3, "N"],
  ["messen", "Messen", 1, 3, "N"],
  ["snijplanken", "Snijplanken", 1, 3, "N"],
  ["keukenmachines", "Keukenmachines", 1, 3, "N"],
  ["kleineMaterialen", "Kleine materialen", 1, 3, "N"],
];

const NL_MIDDELEN: Record<1 | 2 | 3 | 4, string> = { 1: "Allesreiniger", 2: "Vloerreiniger", 3: "Desinfectiemiddel", 4: "Ontvetter" };

export function standaardSchoonmaakConfig(): SchoonmaakConfig {
  const objecten: SchoonmaakObject[] = RIJEN.map(([sleutel, nl, reinigen, desinfecteren, frequentie], i) => ({
    id: `obj-${i + 1}`,
    sleutel,
    naam: nl,
    methode: (desinfecteren ? "reinigen-desinfecteren" : "reinigen") as Methode,
    reinigenCode: reinigen,
    desinfecterenCode: desinfecteren,
    frequentie,
  }));
  const middelen: Schoonmaakmiddel[] = ([1, 2, 3, 4] as const).map((code) => ({
    code,
    naam: NL_MIDDELEN[code],
    dosering: "",
    inwerktijd: "",
    naspoelen: "",
  }));
  return { objecten, middelen };
}

/** Naam van een object in de gekozen taal; zelf aangepaste namen blijven zoals ingevoerd. */
export function objectNaam(o: SchoonmaakObject): string {
  const standaard = RIJEN[Number(o.id.replace("obj-", "")) - 1];
  if (standaard && (!o.naam || o.naam === standaard[1])) return t.objecten[standaard[0]];
  return o.naam;
}

export function middelNaam(m: Schoonmaakmiddel): string {
  return !m.naam || m.naam === NL_MIDDELEN[m.code] ? t.middelen[m.code] : m.naam;
}

/** Namen van de frequenties in de gekozen taal (getters, dus altijd de huidige taal). */
export const FREQUENTIE_NAMEN: Record<Freq, string> = {
  get D() {
    return t.frequentie.D;
  },
  get W() {
    return t.frequentie.W;
  },
  get M() {
    return t.frequentie.M;
  },
  get N() {
    return t.frequentie.N;
  },
};

/** Tekst zoals in de tabel: "Reinigen: 1" of "Reinigen: 1\nDesinfecteren: 3". */
export function methodeTekst(o: SchoonmaakObject): string {
  if (!o.methode) return "";
  const reinigen = `${t.schoonmaak.reinigen}: ${o.reinigenCode ?? "–"}`;
  if (o.methode === "reinigen") return reinigen;
  return `${reinigen}\n${t.schoonmaak.desinfecteren}: ${o.desinfecterenCode ?? "–"}`;
}

/**
 * Domeintypes. Bewust in het Nederlands, en gespiegeld tussen de lokale
 * Dexie-database (IndexedDB, op het tablet) en de Postgres-tabellen in
 * Supabase — synchroniseren is daardoor een simpele upsert per rij, zonder
 * veldvertaling.
 */

export type Rol = "eigenaar" | "medewerker";
export type Thema = "systeem" | "licht" | "donker";
export type Tekstgrootte = "normaal" | "groot" | "extra-groot";

export interface Organisatie {
  id: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  kvkNummer: string;
  contactpersoon: string;
  telefoon: string;
  email: string;
  /** Postadres van het hoofdkantoor. Leeg = gelijk aan het bezoekadres (adres/postcode/plaats hierboven). */
  postAdres: string;
  postPostcode: string;
  postPlaats: string;
  bijgewerktOp: string; // ISO
}

/** Een vestiging van het bedrijf; elke locatie heeft eigen formulieren. */
export interface Locatie {
  id: string;
  organisatieId: string;
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  telefoon: string;
  actief: boolean;
  bijgewerktOp: string; // ISO
}

export interface Profiel {
  id: string; // == supabase auth uid
  organisatieId: string;
  naam: string;
  rol: Rol;
}

export interface UitgaandeSyncItem {
  id: string; // == document.id
  pogingen: number;
  laatsteFout?: string;
  aangemaaktOp: string;
}

export interface Instelling {
  sleutel: string;
  waarde: string;
}

// ── Documenten ────────────────────────────────────────────────────────────
// Alle drie de formulieren worden als JSON-document bewaard (één rij per
// document/periode). Zo blijft lokaal opslaan en synchroniseren één
// eenvoudige upsert, ook als een formulier later van velden verandert.

export type DocumentSoort =
  | "schoonmaak-config" // objecten + legenda, gelden voor alle weken
  | "schoonmaak-week" // afvinkblokjes per dag
  | "schoonmaak-maand" // "uitgevoerd op"-datums voor maandelijkse items
  | "weekformulier"
  | "weekformulier-config" // welke punten verborgen zijn (n.v.t.)
  | "leveranciers-config" // de lijst met leveranciers
  | "leveranciers-maand";

export interface Document<T = unknown> {
  id: string; // `${soort}:${locatieId}:${sleutel}`
  locatieId: string;
  soort: DocumentSoort;
  sleutel: string; // "config", "2026-W39" of "2026-09"
  inhoud: T;
  bijgewerktOp: string; // ISO
}

export type Methode = "reinigen" | "reinigen-desinfecteren";
export type Freq = "D" | "W" | "M" | "N";

export interface SchoonmaakObject {
  id: string;
  /** Sleutel van de standaardnaam (voor vertaling); ontbreekt bij eigen objecten. */
  sleutel?: string;
  naam: string;
  methode: Methode | null;
  reinigenCode: 1 | 2 | 4 | null;
  desinfecterenCode: 3 | null;
  frequentie: Freq | null;
}

export interface Schoonmaakmiddel {
  code: 1 | 2 | 3 | 4;
  naam: string;
  dosering: string;
  inwerktijd: string;
  naspoelen: string;
}

export interface SchoonmaakConfig {
  objecten: SchoonmaakObject[];
  middelen: Schoonmaakmiddel[];
}

export interface SchoonmaakWeek {
  dagen: Record<string, boolean[]>; // objectId → 7 booleans, maandag eerst
}

export interface SchoonmaakMaand {
  datums: Record<string, string>; // objectId → YYYY-MM-DD
}

export type VO = "V" | "O" | null;

export interface OntvangstRij {
  id: string;
  datum: string;
  leverancier: string;
  product: string;
  temperatuur: string;
  verpakking: VO;
  tht: VO;
  paraaf: string;
  actie: string;
}

export interface OpslagRij {
  datum: string;
  temperatuur: string;
  afgedekt: VO;
  fifoTht: VO;
  /** Alleen voor de visbakoven (friteuse): wanneer de olie is ververst (YYYY-MM-DD). */
  olieVerversOp?: string;
  paraaf: string;
  actie: string;
}

export interface CcpRij {
  datum: string;
  product: string;
  waarde: string; // temperatuur of pH
  minuten: string;
  paraaf: string;
  actie: string;
}

export interface Weekformulier {
  ontvangst: OntvangstRij[];
  opslag: Record<string, OpslagRij>; // sleutel = opslag-id uit weekformulierDefaults
  ccps: Record<string, CcpRij>;
  beoordeeldDoor: string;
  beoordeeldOp: string;
}

export type EenheidSoort = "koeling" | "diepvries" | "warmhouden" | "friteuse";

/** Eén opslageenheid (koeling, diepvries, vitrine, friteuse) in de volgorde van het weekformulier. */
export interface EenheidConfig {
  /** Standaard-id (bv. "koelcel") of een nieuweId() voor zelf toegevoegde eenheden. */
  id: string;
  soort: EenheidSoort;
  /** Eigen naam; leeg = de vertaalde standaardnaam. */
  naam?: string;
  /** Zelf toegevoegd, en dus te verwijderen. */
  eigen?: true;
  /** Verwijderd: staat niet meer in nieuwe weken, maar oude weken met data blijven compleet. */
  verwijderd?: true;
}

export interface WeekformulierConfig {
  /** Ids van opslageenheden en processen die verborgen zijn en als "n.v.t." gelden. */
  verborgen: string[];
  /** Opslageenheden in weergavevolgorde. Ontbreekt = de standaardlijst. */
  eenheden?: EenheidConfig[];
}

export interface Leverancier {
  id: string;
  naam: string;
  gearchiveerd: boolean;
}

export type Betrouwbaarheid = "goed" | "matig" | "slecht";
export type Conclusie = "goedgekeurd" | "voorwaardelijk" | "afgekeurd";

export interface LeverancierBeoordeling {
  certificaat: boolean | null;
  verloopdatum: string;
  betrouwbaarheid: Betrouwbaarheid | null;
  opmerking: string;
  conclusie: Conclusie | null;
}

export interface LeveranciersConfig {
  leveranciers: Leverancier[];
}

/** Eén steekproef bij een leverancier (één à twee keer per week). */
export interface LeverancierControle extends LeverancierBeoordeling {
  id: string;
  leverancierId: string;
  /** Naam op het moment van de controle, zodat de historie leesbaar blijft als de leverancier later verdwijnt. */
  leverancierNaam: string;
  datum: string; // YYYY-MM-DD
  product: string;
}

export interface LeveranciersMaand {
  controles: LeverancierControle[];
  /** Oud formaat (één beoordeling per leverancier per maand); wordt bij het lezen omgezet naar controles. */
  beoordelingen?: Record<string, LeverancierBeoordeling>;
}

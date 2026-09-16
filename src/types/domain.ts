/**
 * Domeintypes. Bewust in het Nederlands, en gespiegeld tussen de lokale
 * Dexie-database (IndexedDB, op het tablet) en de Postgres-tabellen in
 * Supabase — synchroniseren is daardoor een simpele upsert per rij, zonder
 * veldvertaling.
 */

export type Frequentie = "dagelijks" | "wekelijks" | "maandelijks";
export type ItemType = "vinkje" | "temperatuur" | "tekst";
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
  bijgewerktOp: string; // ISO
}

export interface Profiel {
  id: string; // == supabase auth uid
  organisatieId: string;
  naam: string;
  rol: Rol;
}

export interface Sjabloon {
  id: string;
  organisatieId: string | null; // null = landelijk standaardsjabloon
  naam: string;
  frequentie: Frequentie;
  versie: number;
  actief: boolean;
}

export interface SjabloonItem {
  id: string;
  sjabloonId: string;
  volgorde: number;
  tekst: string;
  type: ItemType;
  verplicht: boolean;
  hulptekst?: string;
}

export interface AntwoordInvoer {
  itemId: string;
  itemTekst: string;
  type: ItemType;
  waardeBool?: boolean;
  waardeGetal?: number;
  waardeTekst?: string;
  opmerking?: string;
}

export interface Registratie {
  id: string; // client-gegenereerde UUID — ook de sync-sleutel
  organisatieId: string;
  sjabloonId: string;
  sjabloonNaam: string;
  sjabloonVersie: number;
  gebruikerId: string;
  gebruikerNaam: string;
  werkdatum: string; // YYYY-MM-DD, de dag waarvoor de lijst geldt
  apparaatTijd: string; // ISO, kloktijd van het tablet op moment van opslaan
  ontvangenOp?: string; // ISO, gezet door de server bij synchronisatie
  isInhaalregistratie: boolean;
  antwoorden: AntwoordInvoer[];
}

export interface Correctie {
  id: string;
  registratieId: string;
  gebruikerId: string;
  gebruikerNaam: string;
  toelichting: string;
  aangemaaktOp: string; // ISO, lokale apparaattijd
}

export interface UitgaandeSyncItem {
  id: string; // == registratie.id of correctie.id
  soort: "registratie" | "correctie";
  pogingen: number;
  laatsteFout?: string;
  aangemaaktOp: string;
}

export interface Instelling {
  sleutel: string;
  waarde: string;
}

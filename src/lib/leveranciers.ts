import { nieuweId } from "./id";
import type { Leverancier, LeveranciersConfig, LeveranciersMaand } from "../types/domain";

/** Alleen voor vergelijken: "  Vis  Groothandel " en "vis groothandel" zijn dezelfde leverancier. */
export function normaliseer(naam: string): string {
  return naam.trim().replace(/\s+/g, " ").toLowerCase();
}

export function schoonNaam(naam: string): string {
  return naam.trim().replace(/\s+/g, " ");
}

export function zoekLeverancier(lijst: Leverancier[], naam: string): Leverancier | undefined {
  const sleutel = normaliseer(naam);
  return sleutel ? lijst.find((l) => normaliseer(l.naam) === sleutel) : undefined;
}

/**
 * Zorgt dat de naam in de lijst staat. Geeft dezelfde `config` terug als er niets
 * te doen is (lege naam of bestaande actieve leverancier), zodat de aanroeper
 * kan zien dat schrijven niet nodig is. Een gearchiveerde leverancier met dezelfde
 * naam wordt teruggezet, want hij wordt weer gebruikt.
 */
export function metLeverancier(config: LeveranciersConfig, naam: string): LeveranciersConfig {
  const schoon = schoonNaam(naam);
  if (!schoon) return config;
  const bestaand = zoekLeverancier(config.leveranciers, schoon);
  if (!bestaand) return { ...config, leveranciers: [...config.leveranciers, { id: nieuweId(), naam: schoon, gearchiveerd: false }] };
  if (!bestaand.gearchiveerd) return config;
  return zetGearchiveerd(config, bestaand.id, false);
}

/** Naam is al van een andere leverancier (de leverancier zelf telt niet mee). */
export function naamIsBezet(config: LeveranciersConfig, naam: string, eigenId?: string): boolean {
  const gevonden = zoekLeverancier(config.leveranciers, naam);
  return !!gevonden && gevonden.id !== eigenId;
}

export function hernoem(config: LeveranciersConfig, id: string, naam: string): LeveranciersConfig {
  return { ...config, leveranciers: config.leveranciers.map((l) => (l.id === id ? { ...l, naam: schoonNaam(naam) } : l)) };
}

export function zetGearchiveerd(config: LeveranciersConfig, id: string, gearchiveerd: boolean): LeveranciersConfig {
  return { ...config, leveranciers: config.leveranciers.map((l) => (l.id === id ? { ...l, gearchiveerd } : l)) };
}

export function verwijder(config: LeveranciersConfig, id: string): LeveranciersConfig {
  return { ...config, leveranciers: config.leveranciers.filter((l) => l.id !== id) };
}

export function sorteerOpNaam(lijst: Leverancier[]): Leverancier[] {
  return [...lijst].sort((a, b) => a.naam.localeCompare(b.naam, undefined, { sensitivity: "base" }));
}

export const LEGE_MAAND: LeveranciersMaand = { controles: [] };

/**
 * Zet een maand in het oude formaat (één beoordeling per leverancier) om naar
 * controles, zodat eerder ingevulde maanden zichtbaar blijven. Zonder bekende
 * leverancier blijft de beoordeling niet leesbaar en wordt hij overgeslagen.
 */
export function normaliseerMaand(maand: LeveranciersMaand, config: LeveranciersConfig): LeveranciersMaand {
  const oud = Object.entries(maand.beoordelingen ?? {}).flatMap(([leverancierId, b]) => {
    const lev = config.leveranciers.find((l) => l.id === leverancierId);
    return lev ? [{ ...b, id: `oud-${leverancierId}`, leverancierId, leverancierNaam: lev.naam, datum: "", product: "" }] : [];
  });
  return { controles: [...(maand.controles ?? []), ...oud] };
}

/** Oudste controle eerst (zoals het logboek en de pdf), zodat een nieuwe controle onderaan komt, bij de knop. */
export function sorteerControles<T extends { datum: string }>(controles: T[]): T[] {
  return controles
    .map((c, i) => ({ c, i }))
    .sort((a, b) => (a.c.datum || "").localeCompare(b.c.datum || "") || a.i - b.i)
    .map(({ c }) => c);
}

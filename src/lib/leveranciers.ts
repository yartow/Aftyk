import { nieuweId } from "./id";
import type { Leverancier, LeveranciersConfig } from "../types/domain";

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

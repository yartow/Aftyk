import { db } from "../db/db";
import { werkdatumVan } from "./format";
import type { Registratie, Sjabloon } from "../types/domain";

/** De periode (dag/week/maand) waarin een sjabloon met een bepaalde frequentie voor `datum` geldt. */
export function periodeVoorDatum(sjabloon: Sjabloon, datum: Date): { vanaf: string; totEnMet: string } {
  if (sjabloon.frequentie === "dagelijks") {
    const dag = werkdatumVan(datum);
    return { vanaf: dag, totEnMet: dag };
  }

  if (sjabloon.frequentie === "wekelijks") {
    const dagenSindsMaandag = (datum.getDay() + 6) % 7; // maandag = 0
    const maandag = new Date(datum);
    maandag.setDate(datum.getDate() - dagenSindsMaandag);
    const zondag = new Date(maandag);
    zondag.setDate(maandag.getDate() + 6);
    return { vanaf: werkdatumVan(maandag), totEnMet: werkdatumVan(zondag) };
  }

  const eersteVanMaand = new Date(datum.getFullYear(), datum.getMonth(), 1);
  const laatsteVanMaand = new Date(datum.getFullYear(), datum.getMonth() + 1, 0);
  return { vanaf: werkdatumVan(eersteVanMaand), totEnMet: werkdatumVan(laatsteVanMaand) };
}

export async function laatsteRegistratieInPeriode(
  sjabloonId: string,
  vanaf: string,
  totEnMet: string,
): Promise<Registratie | undefined> {
  const alles = await db.registraties.where("sjabloonId").equals(sjabloonId).toArray();
  const inPeriode = alles.filter((r) => r.werkdatum >= vanaf && r.werkdatum <= totEnMet);
  inPeriode.sort((a, b) => b.apparaatTijd.localeCompare(a.apparaatTijd));
  return inPeriode[0];
}

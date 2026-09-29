import { haalInstelling, zetInstelling } from "../db/db";

/**
 * Teller voor foute pincodes en wachtwoorden, per apparaat bewaard. Dit is een
 * rem in de app, geen harde beveiliging: wie de browsergegevens wist, begint weer
 * bij nul. Supabase beperkt daarnaast zelf het aantal inlogpogingen op de server.
 */
export type PogingSoort = "pincode" | "wachtwoord";

export const MAX_POGINGEN: Record<PogingSoort, number> = { pincode: 5, wachtwoord: 10 };
/** Vanaf zoveel resterende pogingen tonen we een waarschuwing. */
export const WAARSCHUW_BIJ_OVER = 3;

const sleutel = (soort: PogingSoort) => `${soort}_pogingen`;

export async function haalPogingen(soort: PogingSoort): Promise<number> {
  return Number(await haalInstelling(sleutel(soort))) || 0;
}

/** Telt één mislukte poging bij en geeft het nieuwe aantal terug. */
export async function verhoogPogingen(soort: PogingSoort): Promise<number> {
  const nieuw = (await haalPogingen(soort)) + 1;
  await zetInstelling(sleutel(soort), String(nieuw));
  return nieuw;
}

export async function resetPogingen(soort: PogingSoort): Promise<void> {
  await zetInstelling(sleutel(soort), "0");
}

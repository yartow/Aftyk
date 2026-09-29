import { haalInstelling, zetInstelling } from "../db/db";
import type { Organisatie } from "../types/domain";

const SLEUTEL = "inrichting_overgeslagen";

/**
 * De eerste-keer-inrichting mag worden overgeslagen ("Later invullen"). Dat
 * wordt bewaard bij de gebruiker (niet bij het apparaat), zodat het scherm
 * niet bij elke start terugkomt; de bedrijfsgegevens blijven altijd te
 * vullen via Instellingen.
 */
export async function inrichtingIsOvergeslagen(): Promise<boolean> {
  return (await haalInstelling(SLEUTEL)) === "1";
}

export async function zetInrichtingOvergeslagen(): Promise<void> {
  await zetInstelling(SLEUTEL, "1");
}

/** Kop voor PDF's zolang er nog geen bedrijfsgegevens zijn ingevuld. */
export const LEGE_ORGANISATIE: Organisatie = {
  id: "",
  naam: "",
  adres: "",
  postcode: "",
  plaats: "",
  kvkNummer: "",
  contactpersoon: "",
  telefoon: "",
  email: "",
  postAdres: "",
  postPostcode: "",
  postPlaats: "",
  bijgewerktOp: "",
};

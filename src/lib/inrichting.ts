import type { Organisatie } from "../types/domain";

const SLEUTEL = "inrichting_overgeslagen";

/**
 * De eerste-keer-inrichting mag worden overgeslagen ("Later invullen"). Dat
 * geldt voor deze sessie; bij de volgende start wordt er opnieuw naar
 * gevraagd, tot de gegevens zijn ingevuld.
 */
export function inrichtingIsOvergeslagen(): boolean {
  try {
    return sessionStorage.getItem(SLEUTEL) === "1";
  } catch {
    return false;
  }
}

export function zetInrichtingOvergeslagen(): void {
  try {
    sessionStorage.setItem(SLEUTEL, "1");
  } catch {
    /* niet kritiek */
  }
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

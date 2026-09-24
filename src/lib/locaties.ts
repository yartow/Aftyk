import { db } from "../db/db";
import { nieuweId } from "./id";
import { t } from "../i18n";
import type { Locatie, Organisatie } from "../types/domain";

export interface LocatieInvoer {
  naam: string;
  adres: string;
  postcode: string;
  plaats: string;
  telefoon: string;
}

/** Bezoekadres van het hoofdkantoor is de standaard voor een eerste locatie. */
function standaardLocatie(organisatie: Organisatie | null): Locatie {
  return {
    id: nieuweId(),
    organisatieId: organisatie?.id ?? "",
    naam: t.locaties.standaardNaam,
    adres: organisatie?.adres ?? "",
    postcode: organisatie?.postcode ?? "",
    plaats: organisatie?.plaats ?? "",
    telefoon: organisatie?.telefoon ?? "",
    actief: true,
    bijgewerktOp: new Date().toISOString(),
  };
}

/**
 * Zorgt dat er altijd minstens één locatie bestaat, ook als de bedrijfsgegevens
 * nog niet zijn ingevuld. Een transactie voorkomt dat twee gelijktijdige
 * aanroepen (bijv. React StrictMode) twee standaardlocaties maken.
 */
export async function zorgVoorLocatie(organisatie: Organisatie | null): Promise<void> {
  await db.transaction("rw", db.locaties, async () => {
    if ((await db.locaties.count()) === 0) await db.locaties.add(standaardLocatie(organisatie));
  });
}

/**
 * Wordt aangeroepen nadat de bedrijfsgegevens voor het eerst zijn opgeslagen:
 * locaties die nog geen bedrijf hadden (setup overgeslagen) worden gekoppeld
 * en krijgen, als ze nog geen adres hebben, het bezoekadres.
 */
export async function koppelLocatiesAanOrganisatie(organisatie: Organisatie): Promise<void> {
  await db.transaction("rw", db.locaties, async () => {
    const bestaand = await db.locaties.toArray();
    if (bestaand.length === 0) {
      await db.locaties.add(standaardLocatie(organisatie));
      return;
    }
    for (const locatie of bestaand) {
      if (locatie.organisatieId === organisatie.id) continue;
      const zonderAdres = !locatie.adres && !locatie.postcode && !locatie.plaats;
      await db.locaties.put({
        ...locatie,
        organisatieId: organisatie.id,
        ...(zonderAdres && bestaand.length === 1
          ? { adres: organisatie.adres, postcode: organisatie.postcode, plaats: organisatie.plaats, telefoon: locatie.telefoon || organisatie.telefoon }
          : {}),
        bijgewerktOp: new Date().toISOString(),
      });
    }
  });
}

export async function maakLocatie(organisatieId: string, gegevens: LocatieInvoer): Promise<Locatie> {
  const locatie: Locatie = { id: nieuweId(), organisatieId, ...gegevens, actief: true, bijgewerktOp: new Date().toISOString() };
  await db.locaties.add(locatie);
  return locatie;
}

export async function werkLocatieBij(id: string, gegevens: Partial<LocatieInvoer> & { actief?: boolean }): Promise<void> {
  await db.locaties.update(id, { ...gegevens, bijgewerktOp: new Date().toISOString() });
}

/** Postadres van het hoofdkantoor; valt terug op het bezoekadres als het leeg is. */
export function postadresVan(o: Organisatie): { adres: string; postcode: string; plaats: string } {
  const leeg = !o.postAdres && !o.postPostcode && !o.postPlaats;
  return leeg ? { adres: o.adres, postcode: o.postcode, plaats: o.plaats } : { adres: o.postAdres, postcode: o.postPostcode, plaats: o.postPlaats };
}

export function adresRegel(a: { adres: string; postcode: string; plaats: string }): string {
  return [a.adres, `${a.postcode} ${a.plaats}`.trim()].filter(Boolean).join(", ");
}

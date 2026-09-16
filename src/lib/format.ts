/** Datum/tijd-hulpfuncties, uitsluitend in het Nederlandse formaat. */

export function vandaagAlsWerkdatum(): string {
  const nu = new Date();
  return werkdatumVan(nu);
}

export function werkdatumVan(datum: Date): string {
  const jaar = datum.getFullYear();
  const maand = String(datum.getMonth() + 1).padStart(2, "0");
  const dag = String(datum.getDate()).padStart(2, "0");
  return `${jaar}-${maand}-${dag}`;
}

export function isVandaag(werkdatum: string): boolean {
  return werkdatum === vandaagAlsWerkdatum();
}

/** Aantal hele uren verschil tussen twee ISO-tijdstippen, altijd positief. */
export function urenVerschil(isoA: string, isoB: string): number {
  const ms = Math.abs(new Date(isoA).getTime() - new Date(isoB).getTime());
  return ms / (1000 * 60 * 60);
}

import { werkdatumVan } from "./format";

export const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

export interface MaandRooster {
  jaar: number;
  maand: number; // 0-11
  label: string;
  weken: (string | null)[][]; // werkdatum-strings (YYYY-MM-DD) of null voor opvulling, maandag eerst
}

/** Laatste 12 kalendermaanden (inclusief de huidige), oudste eerst. */
export function laatste12Maanden(vanaf: Date = new Date()): MaandRooster[] {
  const maanden: MaandRooster[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(vanaf.getFullYear(), vanaf.getMonth() - i, 1);
    maanden.push(bouwMaandRooster(d.getFullYear(), d.getMonth()));
  }
  return maanden;
}

export function bouwMaandRooster(jaar: number, maand: number): MaandRooster {
  const eersteDag = new Date(jaar, maand, 1);
  const laatsteDag = new Date(jaar, maand + 1, 0);
  const label = eersteDag.toLocaleDateString("nl-NL", { month: "long", year: "numeric" });

  const dagenVoorLeeg = (eersteDag.getDay() + 6) % 7; // maandag = 0
  const cellen: (string | null)[] = Array(dagenVoorLeeg).fill(null);
  for (let dag = 1; dag <= laatsteDag.getDate(); dag++) {
    cellen.push(werkdatumVan(new Date(jaar, maand, dag)));
  }
  while (cellen.length % 7 !== 0) cellen.push(null);

  const weken: (string | null)[][] = [];
  for (let i = 0; i < cellen.length; i += 7) weken.push(cellen.slice(i, i + 7));

  return { jaar, maand, label, weken };
}

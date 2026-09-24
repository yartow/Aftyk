import { werkdatumVan } from "./format";
import { huidigeTaal, locale } from "../i18n";

export function weekdagen(): string[] {
  return huidigeTaal() === "nl" ? ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"] : ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
}

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
  const label = eersteDag.toLocaleDateString(locale(), { month: "long", year: "numeric" });

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

// ── Weken en maanden voor de formulieren ─────────────────────────────────

export function maandagVan(datum: Date): Date {
  const maandag = new Date(datum.getFullYear(), datum.getMonth(), datum.getDate());
  maandag.setDate(maandag.getDate() - ((maandag.getDay() + 6) % 7));
  return maandag;
}

/** ISO-weeknummer en -jaar (de donderdag van de week bepaalt het jaar). */
export function isoWeek(datum: Date): { jaar: number; week: number } {
  const donderdag = maandagVan(datum);
  donderdag.setDate(donderdag.getDate() + 3);
  const jaar = donderdag.getFullYear();
  const eersteDonderdag = new Date(jaar, 0, 4);
  eersteDonderdag.setDate(eersteDonderdag.getDate() + 3 - ((eersteDonderdag.getDay() + 6) % 7));
  const week = 1 + Math.round((donderdag.getTime() - eersteDonderdag.getTime()) / (7 * 86400000));
  return { jaar, week };
}

export function weekSleutel(maandag: Date): string {
  const { jaar, week } = isoWeek(maandag);
  return `${jaar}-W${String(week).padStart(2, "0")}`;
}

export function maandSleutel(datum: Date): string {
  return `${datum.getFullYear()}-${String(datum.getMonth() + 1).padStart(2, "0")}`;
}

export function verschuifWeek(maandag: Date, weken: number): Date {
  const nieuw = new Date(maandag);
  nieuw.setDate(nieuw.getDate() + weken * 7);
  return nieuw;
}

export function verschuifMaand(datum: Date, maanden: number): Date {
  return new Date(datum.getFullYear(), datum.getMonth() + maanden, 1);
}

export function dagenVanWeek(maandag: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(maandag);
    d.setDate(d.getDate() + i);
    return d;
  });
}

export function weekLabel(maandag: Date): { titel: string; periode: string } {
  const { jaar, week } = isoWeek(maandag);
  const zondag = new Date(maandag);
  zondag.setDate(zondag.getDate() + 6);
  const kort = (d: Date) => d.toLocaleDateString(locale(), { day: "numeric", month: "short" });
  return { titel: `${huidigeTaal() === "nl" ? "Week" : "Week"} ${week} · ${jaar}`, periode: `${kort(maandag)} – ${kort(zondag)}` };
}

export function maandLabel(datum: Date): string {
  return datum.toLocaleDateString(locale(), { month: "long", year: "numeric" });
}

import { nl } from "./nl";
import { en } from "./en";

export type Taal = "nl" | "en";

/** Maakt van de letterlijke waarden in nl.ts algemene typen, zodat en.ts dezelfde vorm heeft. */
type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends boolean
      ? boolean
      : { [K in keyof T]: Widen<T[K]> };

export type Vertaling = Widen<typeof nl>;

const SLEUTEL = "taal";
const woordenboeken: Record<Taal, Vertaling> = { nl, en };

function leesOpgeslagenTaal(): Taal {
  try {
    const opgeslagen = localStorage.getItem(SLEUTEL);
    if (opgeslagen === "nl" || opgeslagen === "en") return opgeslagen;
  } catch {
    /* geen toegang tot localStorage — standaardtaal */
  }
  return "nl";
}

let huidig: Taal = leesOpgeslagenTaal();
if (typeof document !== "undefined") document.documentElement.lang = huidig;

export function huidigeTaal(): Taal {
  return huidig;
}

export function zetTaal(taal: Taal): void {
  huidig = taal;
  try {
    localStorage.setItem(SLEUTEL, taal);
  } catch {
    /* niet kritiek */
  }
  if (typeof document !== "undefined") document.documentElement.lang = taal;
}

/** Locale voor datum- en getalnotatie. */
export function locale(): string {
  return huidig === "nl" ? "nl-NL" : "en-GB";
}

/**
 * Vertalingen. Een Proxy die bij elke toegang de huidige taal opzoekt, zodat
 * `t.start.titel` overal in de code blijft werken en na een taalwissel
 * (de app wordt dan opnieuw opgebouwd, zie App.tsx) direct de nieuwe taal geeft.
 */
export const t: Vertaling = new Proxy({} as Vertaling, {
  get: (_doel, sleutel) => woordenboeken[huidig][sleutel as keyof Vertaling],
});

export function formatteerDatumLang(datum: Date): string {
  return datum.toLocaleDateString(locale(), { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function formatteerDatumKort(datum: Date): string {
  return datum.toLocaleDateString(locale(), { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatteerTijd(datum: Date): string {
  return datum.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
}

export function formatteerDatumTijd(datum: Date): string {
  return `${formatteerDatumKort(datum)} ${formatteerTijd(datum)}`;
}

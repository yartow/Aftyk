import { t } from "../i18n";
import type { CcpRij, OpslagRij, Weekformulier } from "../types/domain";

export interface OpslagEenheid {
  id: keyof typeof t.weekformulier.eenheden;
  /** Naam in de gekozen taal. */
  readonly naam: string;
  grens: { soort: "max" | "min"; waarde: number };
  afgedektNvt?: boolean;
}

/** Vaste rijen uit "Weekformulier Hygiënecode voor de Visdetailhandel.docx". */
export const OPSLAG_EENHEDEN: OpslagEenheid[] = [
  { id: "koelcel", get naam() { return t.weekformulier.eenheden.koelcel; }, grens: { soort: "max", waarde: 7 } },
  { id: "koelkast1", get naam() { return t.weekformulier.eenheden.koelkast1; }, grens: { soort: "max", waarde: 7 } },
  { id: "koelkast2", get naam() { return t.weekformulier.eenheden.koelkast2; }, grens: { soort: "max", waarde: 7 } },
  { id: "vriescel", get naam() { return t.weekformulier.eenheden.vriescel; }, grens: { soort: "max", waarde: -18 } },
  { id: "vriezer1", get naam() { return t.weekformulier.eenheden.vriezer1; }, grens: { soort: "max", waarde: -18 } },
  { id: "vriezer2", get naam() { return t.weekformulier.eenheden.vriezer2; }, grens: { soort: "max", waarde: -18 } },
  { id: "vispresentatie", get naam() { return t.weekformulier.eenheden.vispresentatie; }, grens: { soort: "max", waarde: 7 }, afgedektNvt: true },
  { id: "bainmarie1", get naam() { return t.weekformulier.eenheden.bainmarie1; }, grens: { soort: "min", waarde: 60 } },
  { id: "warmhoudvitrine", get naam() { return t.weekformulier.eenheden.warmhoudvitrine; }, grens: { soort: "min", waarde: 60 } },
  { id: "koelvitrine", get naam() { return t.weekformulier.eenheden.koelvitrine; }, grens: { soort: "max", waarde: 7 } },
  { id: "saladiere", get naam() { return t.weekformulier.eenheden.saladiere; }, grens: { soort: "max", waarde: 7 } },
  { id: "friteuse1", get naam() { return t.weekformulier.eenheden.friteuse1; }, grens: { soort: "max", waarde: 175 } },
];

export interface CcpProces {
  id: keyof typeof t.weekformulier.processenLijst;
  readonly naam: string;
  readonly grensTekst: string;
  waardeLabel: string; // "°C" of "pH"
  metMinuten: boolean;
  minutenLabel?: string;
  /** true als de ingevulde waarden binnen de norm vallen */
  voldoet: (waarde: number, minuten: number | null) => boolean;
}

export const CCP_PROCESSEN: CcpProces[] = [
  {
    id: "verhitten",
    get naam() { return t.weekformulier.processenLijst.verhitten.naam; },
    get grensTekst() { return t.weekformulier.processenLijst.verhitten.norm; },
    waardeLabel: "°C",
    metMinuten: false,
    voldoet: (w) => w >= 75,
  },
  {
    id: "regenereren",
    get naam() { return t.weekformulier.processenLijst.regenereren.naam; },
    get grensTekst() { return t.weekformulier.processenLijst.regenereren.norm; },
    waardeLabel: "°C",
    metMinuten: true,
    minutenLabel: "min.",
    voldoet: (w, m) => w >= 60 && (m === null || m <= 60),
  },
  {
    id: "terugkoelen",
    get naam() { return t.weekformulier.processenLijst.terugkoelen.naam; },
    get grensTekst() { return t.weekformulier.processenLijst.terugkoelen.norm; },
    waardeLabel: "°C",
    metMinuten: true,
    minutenLabel: "min.",
    voldoet: (w, m) => w <= 7 && (m === null || m <= 300),
  },
  {
    id: "warmroken",
    get naam() { return t.weekformulier.processenLijst.warmroken.naam; },
    get grensTekst() { return t.weekformulier.processenLijst.warmroken.norm; },
    waardeLabel: "°C",
    metMinuten: true,
    minutenLabel: "min.",
    voldoet: (w, m) => w >= 65 && (m === null || m >= 10),
  },
  {
    id: "sushirijst",
    get naam() { return t.weekformulier.processenLijst.sushirijst.naam; },
    get grensTekst() { return t.weekformulier.processenLijst.sushirijst.norm; },
    waardeLabel: "pH",
    metMinuten: false,
    voldoet: (w) => w <= 4.6,
  },
];

export function leesGetal(tekst: string): number | null {
  const n = Number(tekst.replace(",", ".").trim());
  return tekst.trim() === "" || Number.isNaN(n) ? null : n;
}

/**
 * Filtert ingetypte tekst voor meetvelden, zodat ongeldige tekens nooit in het
 * veld komen. Tussenstanden zoals "-" of "18," blijven toegestaan (je typt
 * immers teken voor teken). Een komma blijft een komma; leesGetal snapt beide.
 */
export function alleenGetal(tekst: string, soort: "temperatuur" | "ph" | "minuten"): string {
  if (soort === "minuten") return tekst.replace(/\D/g, "");
  const metMin = soort === "temperatuur" && tekst.startsWith("-");
  let scheidingGehad = false;
  let uit = "";
  for (const teken of tekst) {
    if (teken >= "0" && teken <= "9") uit += teken;
    else if ((teken === "," || teken === ".") && !scheidingGehad) {
      scheidingGehad = true;
      uit += teken;
    }
  }
  return (metMin ? "-" : "") + uit;
}

export function opslagAfwijking(eenheid: OpslagEenheid, temperatuur: string): boolean {
  const t = leesGetal(temperatuur);
  if (t === null) return false;
  return eenheid.grens.soort === "max" ? t > eenheid.grens.waarde : t < eenheid.grens.waarde;
}

export function ccpAfwijking(proces: CcpProces, rij: CcpRij | undefined): boolean {
  if (!rij) return false;
  const w = leesGetal(rij.waarde);
  if (w === null) return false;
  return !proces.voldoet(w, leesGetal(rij.minuten));
}

export function grensTekst(e: OpslagEenheid): string {
  return `${e.grens.soort === "max" ? "≤" : "≥"} ${e.grens.waarde} °C`;
}

export function leegOpslagRij(): OpslagRij {
  return { datum: "", temperatuur: "", afgedekt: null, fifoTht: null, paraaf: "", actie: "" };
}

export function leegCcpRij(): CcpRij {
  return { datum: "", product: "", waarde: "", minuten: "", paraaf: "", actie: "" };
}

export function standaardWeekformulier(): Weekformulier {
  return { ontvangst: [], opslag: {}, ccps: {}, beoordeeldDoor: "", beoordeeldOp: "" };
}

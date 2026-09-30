import { t } from "../i18n";
import type { CcpRij, EenheidConfig, EenheidSoort, OpslagRij, Weekformulier, WeekformulierConfig } from "../types/domain";

export interface OpslagEenheid {
  id: string;
  /** Eigen naam of, zonder die, de naam in de gekozen taal. */
  readonly naam: string;
  /** Alleen de door de gebruiker ingestelde naam; leeg = standaardnaam. */
  eigenNaam?: string;
  soort: EenheidSoort;
  grens: { soort: "max" | "min"; waarde: number };
  afgedektNvt?: boolean;
  /** Zelf toegevoegd door de gebruiker (en dus te verwijderen). */
  eigen?: boolean;
}

/** Temperatuurnorm per soort eenheid. */
export const NORM_PER_SOORT: Record<EenheidSoort, { soort: "max" | "min"; waarde: number }> = {
  koeling: { soort: "max", waarde: 7 },
  diepvries: { soort: "max", waarde: -18 },
  warmhouden: { soort: "min", waarde: 60 },
  friteuse: { soort: "max", waarde: 175 },
};

export const EENHEID_SOORTEN: EenheidSoort[] = ["koeling", "diepvries", "warmhouden", "friteuse"];

type StandaardId = keyof typeof t.weekformulier.eenheden;

/** Vaste rijen uit "Weekformulier Hygiënecode voor de Visdetailhandel.docx". */
const STANDAARD_EENHEDEN: { id: StandaardId; soort: EenheidSoort; afgedektNvt?: boolean }[] = [
  { id: "koelcel", soort: "koeling" },
  { id: "koelkast1", soort: "koeling" },
  { id: "koelkast2", soort: "koeling" },
  { id: "vriescel", soort: "diepvries" },
  { id: "vriezer1", soort: "diepvries" },
  { id: "vriezer2", soort: "diepvries" },
  { id: "vispresentatie", soort: "koeling", afgedektNvt: true },
  { id: "bainmarie1", soort: "warmhouden" },
  { id: "warmhoudvitrine", soort: "warmhouden" },
  { id: "koelvitrine", soort: "koeling" },
  { id: "saladiere", soort: "koeling" },
  { id: "friteuse1", soort: "friteuse" },
];

const standaardVan = (id: string) => STANDAARD_EENHEDEN.find((e) => e.id === id);

/** De standaardlijst als configuratie; de basis zolang de gebruiker niets heeft aangepast. */
export function standaardEenheden(): EenheidConfig[] {
  return STANDAARD_EENHEDEN.map((e) => ({ id: e.id, soort: e.soort }));
}

/** Het standaardnaam-alternatief voor een eenheid zonder eigen naam. */
export function standaardNaam(id: string, soort: EenheidSoort): string {
  return standaardVan(id) ? t.weekformulier.eenheden[id as StandaardId] : t.weekformulier.eenheidSoorten[soort];
}

function heeftOpslagData(r: OpslagRij | undefined): boolean {
  return !!r && !!(r.temperatuur || r.paraaf || r.actie || r.afgedekt || r.fifoTht || r.olieVerversOp);
}

/**
 * De eenheden van het weekformulier in de ingestelde volgorde. Verwijderde eenheden
 * blijven alleen staan als de meegegeven week er nog gegevens over bevat.
 */
export function eenhedenUitConfig(config: WeekformulierConfig, opslag?: Record<string, OpslagRij>): OpslagEenheid[] {
  return (config.eenheden ?? standaardEenheden())
    .filter((e) => !e.verwijderd || heeftOpslagData(opslag?.[e.id]))
    .map((e) => ({
      id: e.id,
      get naam() { return e.naam?.trim() || standaardNaam(e.id, e.soort); },
      eigenNaam: e.naam?.trim() || undefined,
      soort: e.soort,
      grens: NORM_PER_SOORT[e.soort],
      afgedektNvt: standaardVan(e.id)?.afgedektNvt,
      eigen: e.eigen,
    }));
}

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

/** Standaard n.v.t. voor deze winkel; per locatie aan te passen in Instellingen. */
export function standaardWeekformulierConfig(): WeekformulierConfig {
  return { verborgen: ["vispresentatie", "bainmarie1", "warmhoudvitrine", "koelvitrine", "saladiere", "regenereren"] };
}

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
  return { datum: "", temperatuur: "", afgedekt: null, fifoTht: null, olieVerversOp: "", paraaf: "", actie: "" };
}

export function leegCcpRij(): CcpRij {
  return { datum: "", product: "", waarde: "", minuten: "", paraaf: "", actie: "" };
}

export function standaardWeekformulier(): Weekformulier {
  return { ontvangst: [], opslag: {}, ccps: {}, beoordeeldDoor: "", beoordeeldOp: "" };
}

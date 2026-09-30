import { useDocument } from "./documenten";
import { nieuweId } from "./id";
import { eenhedenUitConfig, standaardEenheden, standaardWeekformulierConfig } from "./weekformulierDefaults";
import type { EenheidConfig, EenheidSoort, OpslagRij, WeekformulierConfig } from "../types/domain";

/** Geeft de eenhedenlijst van de config, of de standaardlijst zolang er niets is aangepast. */
const lijstVan = (c: WeekformulierConfig): EenheidConfig[] => c.eenheden ?? standaardEenheden();

/** Verborgen (n.v.t.) punten en de opslageenheden van het weekformulier voor de actieve locatie. */
export function useWeekformulierConfig() {
  const doc = useDocument<WeekformulierConfig>("weekformulier-config", "config", standaardWeekformulierConfig);
  const verborgen = doc.waarde ? new Set(doc.waarde.verborgen) : null;

  const zetVerborgen = (id: string, verberg: boolean) =>
    doc.wijzig((c) => ({ ...c, verborgen: verberg ? [...new Set([...c.verborgen, id])] : c.verborgen.filter((x) => x !== id) }));

  /** Eenheden in volgorde; met `opslag` blijven verwijderde eenheden met data uit die week staan. */
  const eenheden = (opslag?: Record<string, OpslagRij>) => (doc.waarde ? eenhedenUitConfig(doc.waarde, opslag) : []);

  const wijzigEenheden = (f: (lijst: EenheidConfig[]) => EenheidConfig[]) =>
    doc.wijzig((c) => ({ ...c, eenheden: f(lijstVan(c)) }));

  /** Lege naam = terug naar de standaardnaam. */
  const hernoem = (id: string, naam: string) =>
    wijzigEenheden((l) => l.map((e) => (e.id === id ? { ...e, naam: naam.trim() || undefined } : e)));

  /** Verplaatst een eenheid één plek, waarbij verwijderde eenheden worden overgeslagen. */
  const verplaats = (id: string, richting: -1 | 1) =>
    wijzigEenheden((l) => {
      const van = l.findIndex((e) => e.id === id);
      if (van < 0) return l;
      let naar = van + richting;
      while (l[naar]?.verwijderd) naar += richting;
      if (naar < 0 || naar >= l.length) return l;
      const uit = [...l];
      [uit[van], uit[naar]] = [uit[naar], uit[van]];
      return uit;
    });

  const voegToe = (soort: EenheidSoort, naam: string) =>
    wijzigEenheden((l) => [...l, { id: nieuweId(), soort, naam: naam.trim() || undefined, eigen: true }]);

  /** Alleen voor zelf toegevoegde eenheden; oude weken houden hun gegevens. */
  const verwijder = (id: string) =>
    doc.wijzig((c) => ({
      ...c,
      verborgen: c.verborgen.filter((x) => x !== id),
      eenheden: lijstVan(c).map((e) => (e.id === id && e.eigen ? { ...e, verwijderd: true as const } : e)),
    }));

  return { verborgen, zetVerborgen, eenheden, hernoem, verplaats, voegToe, verwijder };
}

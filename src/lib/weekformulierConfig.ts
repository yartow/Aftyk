import { useDocument } from "./documenten";
import { standaardWeekformulierConfig } from "./weekformulierDefaults";
import type { WeekformulierConfig } from "../types/domain";

/** Verborgen (n.v.t.) punten van het weekformulier voor de actieve locatie. */
export function useWeekformulierConfig() {
  const doc = useDocument<WeekformulierConfig>("weekformulier-config", "config", standaardWeekformulierConfig);
  const verborgen = doc.waarde ? new Set(doc.waarde.verborgen) : null;
  const zetVerborgen = (id: string, verberg: boolean) =>
    doc.wijzig((c) => ({ ...c, verborgen: verberg ? [...new Set([...c.verborgen, id])] : c.verborgen.filter((x) => x !== id) }));
  return { verborgen, zetVerborgen };
}

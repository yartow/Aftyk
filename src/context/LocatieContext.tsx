import { createContext, useContext, useEffect, type ReactNode } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, zetInstelling } from "../db/db";
import { useAuth } from "./AuthContext";
import { zorgVoorLocatie } from "../lib/locaties";
import { LEGE_ORGANISATIE } from "../lib/inrichting";
import type { Locatie, Organisatie } from "../types/domain";

interface LocatieState {
  /** Alleen actieve locaties (niet gearchiveerd). */
  locaties: Locatie[];
  actieveLocatie: Locatie | null;
  actieveLocatieId: string | null;
  zetActieveLocatie: (id: string) => void;
}

const LocatieContext = createContext<LocatieState | null>(null);
const SLEUTEL_ACTIEF = "actieve_locatie";

/**
 * Houdt bij welke vestiging op dit apparaat is gekozen. Alle formulieren
 * (zie lib/documenten.ts) horen bij de actieve locatie. Er is altijd minstens
 * één locatie; bedrijven met één vestiging merken hier niets van.
 */
export function LocatieProvider({ children }: { children: ReactNode }) {
  const { klaar, organisatie } = useAuth();
  const alle = useLiveQuery(() => db.locaties.toArray(), []);
  const gekozenId = useLiveQuery(async () => (await db.instellingen.get(SLEUTEL_ACTIEF))?.waarde ?? null, []);

  useEffect(() => {
    if (klaar && alle && alle.length === 0) void zorgVoorLocatie(organisatie);
  }, [klaar, alle, organisatie]);

  if (!alle || gekozenId === undefined) return null;

  const locaties = alle.filter((l) => l.actief).sort((a, b) => a.naam.localeCompare(b.naam));
  const actieveLocatie = locaties.find((l) => l.id === gekozenId) ?? locaties[0] ?? null;

  const waarde: LocatieState = {
    locaties,
    actieveLocatie,
    actieveLocatieId: actieveLocatie?.id ?? null,
    zetActieveLocatie: (id) => void zetInstelling(SLEUTEL_ACTIEF, id),
  };
  return <LocatieContext.Provider value={waarde}>{children}</LocatieContext.Provider>;
}

export function useLocatie(): LocatieState {
  const context = useContext(LocatieContext);
  if (!context) throw new Error("useLocatie moet binnen LocatieProvider gebruikt worden");
  return context;
}

export interface PdfBron {
  organisatie: Organisatie;
  locatie: Locatie | null;
  /** Alleen bij meerdere locaties de naam in de kop en bestandsnaam tonen. */
  metLocatieNaam: boolean;
}

/** Gegevens die een PDF-kop nodig heeft (werkt ook zonder ingevulde bedrijfsgegevens). */
export function usePdfBron(): PdfBron {
  const { organisatie } = useAuth();
  const { locaties, actieveLocatie } = useLocatie();
  return { organisatie: organisatie ?? LEGE_ORGANISATIE, locatie: actieveLocatie, metLocatieNaam: locaties.length > 1 };
}

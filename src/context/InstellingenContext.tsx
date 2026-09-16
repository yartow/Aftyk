import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { haalInstelling, zetInstelling } from "../db/db";
import type { Tekstgrootte, Thema } from "../types/domain";

interface InstellingenState {
  tekstgrootte: Tekstgrootte;
  thema: Thema;
  klaar: boolean;
  zetTekstgrootte: (waarde: Tekstgrootte) => void;
  zetThema: (waarde: Thema) => void;
}

const InstellingenContext = createContext<InstellingenState | null>(null);

const SLEUTEL_TEKSTGROOTTE = "tekstgrootte";
const SLEUTEL_THEMA = "thema";

/**
 * Bewaart de weergave-instellingen (tekstgrootte, thema) in IndexedDB en
 * past ze direct toe als attributen op <html>, waar het CSS-tokensysteem
 * (src/styles/global.css) op reageert. Los van of er een account/tablet-
 * setup is voltooid — deze instellingen moeten altijd meteen werken.
 */
export function InstellingenProvider({ children }: { children: ReactNode }) {
  const [tekstgrootte, setTekstgrootteState] = useState<Tekstgrootte>("normaal");
  const [thema, setThemaState] = useState<Thema>("systeem");
  const [klaar, setKlaar] = useState(false);

  useEffect(() => {
    (async () => {
      const opgeslagenGrootte = (await haalInstelling(SLEUTEL_TEKSTGROOTTE)) as Tekstgrootte | undefined;
      const opgeslagenThema = (await haalInstelling(SLEUTEL_THEMA)) as Thema | undefined;
      if (opgeslagenGrootte) setTekstgrootteState(opgeslagenGrootte);
      if (opgeslagenThema) setThemaState(opgeslagenThema);
      setKlaar(true);
    })();
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-tekstgrootte", tekstgrootte);
  }, [tekstgrootte]);

  useEffect(() => {
    if (thema === "systeem") {
      document.documentElement.removeAttribute("data-thema");
    } else {
      document.documentElement.setAttribute("data-thema", thema);
    }
  }, [thema]);

  const zetTekstgrootte = (waarde: Tekstgrootte) => {
    setTekstgrootteState(waarde);
    void zetInstelling(SLEUTEL_TEKSTGROOTTE, waarde);
  };

  const zetThema = (waarde: Thema) => {
    setThemaState(waarde);
    void zetInstelling(SLEUTEL_THEMA, waarde);
  };

  return (
    <InstellingenContext.Provider value={{ tekstgrootte, thema, klaar, zetTekstgrootte, zetThema }}>
      {children}
    </InstellingenContext.Provider>
  );
}

export function useInstellingen(): InstellingenState {
  const context = useContext(InstellingenContext);
  if (!context) throw new Error("useInstellingen moet binnen InstellingenProvider gebruikt worden");
  return context;
}

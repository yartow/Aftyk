import { useCallback, useEffect, useRef, useState } from "react";
import "./Toast.css";

/**
 * Korte melding onderin beeld die vanzelf verdwijnt. Gebruik:
 * `const { toon, toast } = useToast();` → `toon("Tekst")` en render `{toast}` in het scherm.
 */
export function useToast(duurMs = 2500) {
  const [tekst, setTekst] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const toon = useCallback(
    (bericht: string) => {
      window.clearTimeout(timer.current);
      setTekst(bericht);
      timer.current = window.setTimeout(() => setTekst(null), duurMs);
    },
    [duurMs],
  );
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const toast = tekst ? (
    <div className="toast" role="status" aria-live="polite">
      <span aria-hidden="true">✓</span> {tekst}
    </div>
  ) : null;
  return { toon, toast };
}

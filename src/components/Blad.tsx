import { useEffect, useId, useRef, type ReactNode } from "react";
import { t } from "../i18n";
import "./Blad.css";

interface BladProps {
  open: boolean;
  titel: string;
  onSluit: () => void;
  children: ReactNode;
}

/** Geopende bladen, bovenste laatst: Escape sluit alleen het bovenste. */
const geopend: symbol[] = [];

const FOCUSBAAR = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Keuzeblad dat onderin het scherm omhoog schuift — goed bereikbaar met een duim. */
export function Blad({ open, titel, onSluit, children }: BladProps) {
  const titelId = useId();
  const bladRef = useRef<HTMLDivElement>(null);
  const sluitRef = useRef(onSluit);
  sluitRef.current = onSluit;

  useEffect(() => {
    if (!open) return;
    const id = Symbol("blad");
    geopend.push(id);
    const vorigeFocus = document.activeElement as HTMLElement | null;
    // Focus naar het blad, zodat toetsenbord en schermlezer daar verdergaan.
    bladRef.current?.focus();

    const handler = (e: KeyboardEvent) => {
      if (geopend[geopend.length - 1] !== id) return;
      if (e.key === "Escape") {
        sluitRef.current();
      } else if (e.key === "Tab" && bladRef.current) {
        // Focus blijft binnen het blad.
        const elementen = Array.from(bladRef.current.querySelectorAll<HTMLElement>(FOCUSBAAR));
        if (elementen.length === 0) return e.preventDefault();
        const eerste = elementen[0];
        const laatste = elementen[elementen.length - 1];
        const actief = document.activeElement;
        if (e.shiftKey && (actief === eerste || actief === bladRef.current)) {
          e.preventDefault();
          laatste.focus();
        } else if (!e.shiftKey && actief === laatste) {
          e.preventDefault();
          eerste.focus();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      geopend.splice(geopend.indexOf(id), 1);
      vorigeFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="blad-achtergrond" onClick={onSluit}>
      <div
        ref={bladRef}
        className="blad"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titelId}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="blad-kop">
          <h2 id={titelId}>{titel}</h2>
          <button type="button" className="blad-sluit" onClick={onSluit} aria-label={t.algemeen.sluiten}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

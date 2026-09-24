import { useEffect, type ReactNode } from "react";
import { t } from "../i18n";
import "./Blad.css";

interface BladProps {
  open: boolean;
  titel: string;
  onSluit: () => void;
  children: ReactNode;
}

/** Keuzeblad dat onderin het scherm omhoog schuift — goed bereikbaar met een duim. */
export function Blad({ open, titel, onSluit, children }: BladProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => e.key === "Escape" && onSluit();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onSluit]);

  if (!open) return null;
  return (
    <div className="blad-achtergrond" onClick={onSluit}>
      <div className="blad" role="dialog" aria-modal="true" aria-label={titel} onClick={(e) => e.stopPropagation()}>
        <div className="blad-kop">
          <h2>{titel}</h2>
          <button type="button" className="blad-sluit" onClick={onSluit} aria-label={t.algemeen.sluiten}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

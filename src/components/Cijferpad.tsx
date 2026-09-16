import "./Cijferpad.css";
import { t } from "../i18n/nl";

interface CijferpadProps {
  waarde: string;
  onWijzig: (nieuweWaarde: string) => void;
  lengte?: number;
}

const TOETSEN = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "wis"];

/** Grote cijferknoppen voor de pincode — geen toetsenbord nodig op het tablet. */
export function Cijferpad({ waarde, onWijzig, lengte = 4 }: CijferpadProps) {
  function toetsIngedrukt(toets: string) {
    if (toets === "") return;
    if (toets === "wis") {
      onWijzig(waarde.slice(0, -1));
      return;
    }
    if (waarde.length < lengte) onWijzig(waarde + toets);
  }

  return (
    <div>
      <div className="cijferpad-stippen" aria-hidden="true">
        {Array.from({ length: lengte }).map((_, i) => (
          <span key={i} className={`cijferpad-stip ${i < waarde.length ? "cijferpad-stip--gevuld" : ""}`} />
        ))}
      </div>
      <div className="cijferpad-grid">
        {TOETSEN.map((toets, i) =>
          toets === "" ? (
            <span key={i} />
          ) : (
            <button
              key={i}
              type="button"
              className="cijferpad-toets"
              onClick={() => toetsIngedrukt(toets)}
              aria-label={toets === "wis" ? t.pincode.wissen : toets}
            >
              {toets === "wis" ? "⌫" : toets}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

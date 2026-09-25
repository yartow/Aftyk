import "./Selectievakje.css";
import { t } from "../i18n";

interface SelectievakjeProps {
  gedaan: boolean;
  onWijzig: (waarde: boolean) => void;
  label: string;
  hulptekst?: string;
  verplicht?: boolean;
}

/**
 * De hoofdinteractie van de hele app. Eisen waar dit component expliciet
 * op is gebouwd:
 * - kleurenblindheid: status wordt nooit alleen met kleur getoond, altijd
 *   ook met een pictogram (✓ / leeg) én het woord "Gedaan"/"Niet gedaan";
 * - dikke vingers/natte handen: de hele rij is het aanraakdoel, niet alleen
 *   het vinkje zelf, en het vinkje is een dik gevuld vlak i.p.v. een dunne
 *   contourlijn zodat het ook van een afstandje leesbaar is.
 */
export function Selectievakje({ gedaan, onWijzig, label, hulptekst, verplicht }: SelectievakjeProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={gedaan}
      className={`selectievakje-rij ${gedaan ? "selectievakje-rij--gedaan" : ""}`}
      onClick={() => onWijzig(!gedaan)}
    >
      <span className={`selectievakje-doos ${gedaan ? "selectievakje-doos--gedaan" : ""}`} aria-hidden="true">
        {gedaan ? "✓" : ""}
      </span>
      <span className="selectievakje-tekst">
        <span className="selectievakje-label">
          {label}
          {verplicht ? <span className="selectievakje-verplicht"> *</span> : null}
        </span>
        {hulptekst ? <span className="selectievakje-hulptekst tekst-zwak">{hulptekst}</span> : null}
        <span className={`selectievakje-status ${gedaan ? "selectievakje-status--gedaan" : ""}`}>
          {gedaan ? t.status.gedaan : t.status.nietGedaan}
        </span>
      </span>
    </button>
  );
}

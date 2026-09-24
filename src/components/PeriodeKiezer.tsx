import { t } from "../i18n";
import "./PeriodeKiezer.css";

interface PeriodeKiezerProps {
  titel: string;
  ondertitel?: string;
  onVorige: () => void;
  onVolgende: () => void;
  onNu: () => void;
  nuLabel: string;
}

/** Bladeren tussen weken of maanden. */
export function PeriodeKiezer({ titel, ondertitel, onVorige, onVolgende, onNu, nuLabel }: PeriodeKiezerProps) {
  return (
    <div className="periode">
      <button type="button" className="periode-knop" onClick={onVorige} aria-label={t.algemeen.vorige}>
        ‹
      </button>
      <button type="button" className="periode-midden" onClick={onNu} title={nuLabel}>
        <strong>{titel}</strong>
        {ondertitel ? <span className="tekst-zwak">{ondertitel}</span> : null}
      </button>
      <button type="button" className="periode-knop" onClick={onVolgende} aria-label={t.algemeen.volgende}>
        ›
      </button>
    </div>
  );
}

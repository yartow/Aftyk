import { isDemo } from "../lib/modus";
import { verlaatDemo } from "../lib/demo";
import { t } from "../i18n";
import "./DemoBanner.css";

/** Altijd zichtbaar in demo-modus: een vaste "DEMO"-label plus een balk met uitleg en afsluitknop. */
export function DemoBanner() {
  if (!isDemo()) return null;
  return (
    <>
      <div className="demo-label" aria-hidden="true">DEMO</div>
      <div className="demo-balk" role="status">
        <span>{t.demo.banner}</span>
        <button type="button" className="demo-knop" onClick={verlaatDemo}>
          {t.demo.verlaten}
        </button>
      </div>
    </>
  );
}

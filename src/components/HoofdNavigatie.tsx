import { NavLink } from "react-router-dom";
import { t } from "../i18n";
import "./HoofdNavigatie.css";

/**
 * Onderin het scherm — beter bereikbaar met een duim dan bovenin, en
 * consistent met hoe tablet-apps doorgaans genavigeerd worden.
 */
export function HoofdNavigatie() {
  return (
    <nav className="hoofdnavigatie" aria-label="Hoofdnavigatie">
      <NavLink to="/" end className={({ isActive }) => `hoofdnavigatie-item ${isActive ? "hoofdnavigatie-item--actief" : ""}`}>
        <span aria-hidden="true">🏠</span>
        {t.navigatie.start}
      </NavLink>
      <NavLink to="/instellingen" className={({ isActive }) => `hoofdnavigatie-item ${isActive ? "hoofdnavigatie-item--actief" : ""}`}>
        <span aria-hidden="true">⚙️</span>
        {t.navigatie.instellingen}
      </NavLink>
    </nav>
  );
}

import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { t } from "../i18n/nl";

export function AppKop({ titel, terugNaar, actie }: { titel: string; terugNaar?: string; actie?: ReactNode }) {
  const navigate = useNavigate();
  return (
    <header className="app-koptekst">
      {terugNaar ? (
        <button type="button" className="knop knop--tekst" style={{ padding: "0.5rem" }} onClick={() => navigate(terugNaar)}>
          ← {t.algemeen.terug}
        </button>
      ) : null}
      <h1>{titel}</h1>
      {actie}
    </header>
  );
}

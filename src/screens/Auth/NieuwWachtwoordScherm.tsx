import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Invoerveld } from "../../components/Invoerveld";
import { Knop } from "../../components/Knop";
import { useAuth } from "../../context/AuthContext";
import { t } from "../../i18n/nl";

/**
 * Landingspagina van de reset-link uit de e-mail (Supabase zet de
 * herstelsessie automatisch via de URL, zie AuthContext/supabase.ts:
 * detectSessionInUrl). Alleen bereikbaar mét internet — logisch, want de
 * link zelf komt ook via e-mail.
 */
export function NieuwWachtwoordScherm() {
  const navigate = useNavigate();
  const { stelNieuwWachtwoordIn } = useAuth();
  const [wachtwoord, setWachtwoord] = useState("");
  const [bevestiging, setBevestiging] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState(false);
  const [bezig, setBezig] = useState(false);

  async function versturen(e: FormEvent) {
    e.preventDefault();
    setFout(null);
    if (wachtwoord !== bevestiging) {
      setFout(t.auth.wachtwoordenKomenNietOvereen);
      return;
    }
    setBezig(true);
    const resultaat = await stelNieuwWachtwoordIn(wachtwoord);
    setBezig(false);
    if (resultaat.fout) {
      setFout(resultaat.fout);
      return;
    }
    setGelukt(true);
  }

  return (
    <div className="app-scherm">
      <div className="app-inhoud" style={{ maxWidth: "24rem", display: "flex", flexDirection: "column", justifyContent: "center", flex: 1 }}>
        <h1>{t.auth.nieuwWachtwoordTitel}</h1>
        {gelukt ? (
          <>
            <p>{t.auth.wachtwoordGewijzigd}</p>
            <Knop onClick={() => navigate("/inloggen")}>{t.auth.inloggen}</Knop>
          </>
        ) : (
          <form onSubmit={versturen} style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
            <Invoerveld
              label={t.auth.nieuwWachtwoord}
              type="password"
              required
              minLength={6}
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              autoComplete="new-password"
            />
            <Invoerveld
              label={t.auth.nieuwWachtwoordBevestigen}
              type="password"
              required
              minLength={6}
              value={bevestiging}
              onChange={(e) => setBevestiging(e.target.value)}
              autoComplete="new-password"
            />
            {fout ? <p style={{ color: "var(--kleur-fout)" }}>{fout}</p> : null}
            <Knop volledigeBreedte type="submit" disabled={bezig}>{t.auth.wachtwoordInstellen}</Knop>
          </form>
        )}
      </div>
    </div>
  );
}

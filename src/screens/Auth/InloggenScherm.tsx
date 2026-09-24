import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Invoerveld } from "../../components/Invoerveld";
import { Knop } from "../../components/Knop";
import { useAuth } from "../../context/AuthContext";
import { startDemo } from "../../lib/demo";
import { t } from "../../i18n";

/**
 * Inloggen. Account aanmaken kan alleen via de persoonlijke aanmeldlink met
 * toegangscode (zie AanmeldenScherm) en staat hier dus bewust niet.
 */
export function InloggenScherm() {
  const navigate = useNavigate();
  const { logIn } = useAuth();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function versturen(e: FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const resultaat = await logIn(email, wachtwoord);
    setBezig(false);
    if (resultaat.fout) {
      setFout(resultaat.fout);
      return;
    }
    navigate("/");
  }

  return (
    <div className="app-scherm">
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, maxWidth: "24rem" }}>
        <h1>{t.auth.inloggenTitel}</h1>
        <form onSubmit={versturen} style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
          <Invoerveld label={t.auth.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
          <Invoerveld
            label={t.auth.wachtwoord}
            type="password"
            required
            value={wachtwoord}
            onChange={(e) => setWachtwoord(e.target.value)}
            autoComplete="current-password"
            minLength={6}
          />
          {fout ? <p style={{ color: "var(--kleur-fout)" }}>{fout}</p> : null}
          <Knop volledigeBreedte type="submit" disabled={bezig}>
            {t.auth.inloggen}
          </Knop>
          <Knop variant="tekst" onClick={() => navigate("/wachtwoord-vergeten")}>
            {t.auth.wachtwoordVergeten}
          </Knop>
          <Knop variant="secundair" volledigeBreedte onClick={startDemo}>
            {t.demo.bekijken}
          </Knop>
        </form>
      </div>
    </div>
  );
}

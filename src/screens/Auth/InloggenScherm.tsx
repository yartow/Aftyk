import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Invoerveld } from "../../components/Invoerveld";
import { Knop } from "../../components/Knop";
import { useAuth } from "../../context/AuthContext";
import { t } from "../../i18n/nl";

export function InloggenScherm() {
  const navigate = useNavigate();
  const { logIn, meldAan } = useAuth();
  const [aanmelden, setAanmelden] = useState(false);
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [aangemeld, setAangemeld] = useState(false);

  async function versturen(e: FormEvent) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const resultaat = aanmelden ? await meldAan(email, wachtwoord) : await logIn(email, wachtwoord);
    setBezig(false);
    if (resultaat.fout) {
      setFout(resultaat.fout);
      return;
    }
    if (aanmelden) {
      setAangemeld(true);
      return;
    }
    navigate("/vandaag");
  }

  return (
    <div className="app-scherm">
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, maxWidth: "24rem" }}>
        <h1>{aanmelden ? t.algemeen.appNaam : t.auth.inloggenTitel}</h1>

        {aangemeld ? (
          <p>Account aangemaakt. Je kunt nu de bedrijfsgegevens invullen.</p>
        ) : (
          <form onSubmit={versturen} style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
            <Invoerveld label={t.auth.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            <Invoerveld
              label={t.auth.wachtwoord}
              type="password"
              required
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              autoComplete={aanmelden ? "new-password" : "current-password"}
              minLength={6}
            />
            {fout ? <p style={{ color: "var(--kleur-fout)" }}>{fout}</p> : null}
            <Knop volledigeBreedte type="submit" disabled={bezig}>
              {aanmelden ? "Account aanmaken" : t.auth.inloggen}
            </Knop>
            {!aanmelden ? (
              <Knop variant="tekst" onClick={() => navigate("/wachtwoord-vergeten")}>
                {t.auth.wachtwoordVergeten}
              </Knop>
            ) : null}
            <Knop variant="tekst" onClick={() => setAanmelden((v) => !v)}>
              {aanmelden ? "Al een account? Inloggen" : "Nieuw bij Hygiënecode? Account aanmaken"}
            </Knop>
          </form>
        )}
      </div>
    </div>
  );
}

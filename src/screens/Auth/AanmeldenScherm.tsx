import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Invoerveld } from "../../components/Invoerveld";
import { Knop } from "../../components/Knop";
import { useAuth } from "../../context/AuthContext";
import { t } from "../../i18n";

/**
 * Account aanmaken met een persoonlijke, eenmalige toegangscode van 5 cijfers.
 * Deze pagina is bewust nergens in de app aangelinkt: klanten krijgen de
 * link (/#/aanmelden) samen met hun code. De code wordt server-side gecontroleerd
 * en verbruikt; hier wordt alleen het formaat gecontroleerd.
 */
export function AanmeldenScherm() {
  const navigate = useNavigate();
  const { meldAan, modus } = useAuth();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [herhaal, setHerhaal] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [bevestigMail, setBevestigMail] = useState(false);

  async function versturen(e: FormEvent) {
    e.preventDefault();
    setFout(null);
    if (!/^\d{5}$/.test(code)) return setFout(t.aanmelden.codeFormaat);
    if (wachtwoord !== herhaal) return setFout(t.auth.wachtwoordenKomenNietOvereen);
    setBezig(true);
    const resultaat = await meldAan(email, wachtwoord, code);
    setBezig(false);
    if (resultaat.fout) return setFout(resultaat.fout);
    if (resultaat.bevestigMail) return setBevestigMail(true);
    navigate("/");
  }

  return (
    <div className="app-scherm">
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", justifyContent: "center", flex: 1, maxWidth: "24rem" }}>
        <h1>{t.aanmelden.titel}</h1>
        {modus !== "supabase" ? (
          <p>{t.aanmelden.geenServer}</p>
        ) : bevestigMail ? (
          <>
            <p>{t.aanmelden.controleMail}</p>
            <Knop volledigeBreedte onClick={() => navigate("/inloggen")}>{t.auth.inloggen}</Knop>
          </>
        ) : (
          <form onSubmit={versturen} style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
            <p className="tekst-zwak" style={{ margin: 0 }}>{t.aanmelden.uitleg}</p>
            <Invoerveld
              id="toegangscode"
              label={t.aanmelden.code}
              inputMode="numeric"
              pattern="[0-9]{5}"
              maxLength={5}
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              style={{ letterSpacing: "0.4em", fontSize: "1.5rem", textAlign: "center" }}
            />
            <Invoerveld id="aanmeld-email" label={t.aanmelden.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            <Invoerveld id="aanmeld-ww" label={t.aanmelden.wachtwoord} type="password" required minLength={6} value={wachtwoord} onChange={(e) => setWachtwoord(e.target.value)} autoComplete="new-password" />
            <Invoerveld id="aanmeld-ww2" label={t.aanmelden.herhaal} type="password" required minLength={6} value={herhaal} onChange={(e) => setHerhaal(e.target.value)} autoComplete="new-password" />
            {fout ? <p role="alert" style={{ color: "var(--kleur-fout)", margin: 0 }}>{fout}</p> : null}
            <Knop volledigeBreedte type="submit" disabled={bezig}>{t.aanmelden.knop}</Knop>
            <Knop variant="tekst" onClick={() => navigate("/inloggen")}>{t.aanmelden.alAccount}</Knop>
          </form>
        )}
      </div>
    </div>
  );
}

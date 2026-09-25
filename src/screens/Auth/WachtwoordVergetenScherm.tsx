import { useState, type FormEvent } from "react";
import { AppKop } from "../../components/AppKop";
import { Invoerveld } from "../../components/Invoerveld";
import { Knop } from "../../components/Knop";
import { useAuth } from "../../context/AuthContext";
import { t } from "../../i18n";

export function WachtwoordVergetenScherm() {
  const { verstuurResetLink } = useAuth();
  const [email, setEmail] = useState("");
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function versturen(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    const resultaat = await verstuurResetLink(email);
    setBezig(false);
    if (resultaat.fout) {
      setFout(resultaat.fout);
      return;
    }
    setVerstuurd(true);
  }

  return (
    <div className="app-scherm">
      <AppKop titel={t.auth.wachtwoordVergetenTitel} terugNaar="/inloggen" />
      <div className="app-inhoud" style={{ maxWidth: "24rem" }}>
        {verstuurd ? (
          <p>{t.auth.linkVerstuurd}</p>
        ) : (
          <form onSubmit={versturen} style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
            <p className="tekst-zwak" style={{ marginTop: 0 }}>{t.auth.wachtwoordVergetenUitleg}</p>
            <Invoerveld label={t.auth.email} type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            {fout ? <p style={{ color: "var(--kleur-fout)" }}>{fout}</p> : null}
            <Knop volledigeBreedte type="submit" disabled={bezig}>{t.auth.versturen}</Knop>
          </form>
        )}
      </div>
    </div>
  );
}

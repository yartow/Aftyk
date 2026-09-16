import { useState } from "react";
import { Cijferpad } from "../../components/Cijferpad";
import { Knop } from "../../components/Knop";
import { Invoerveld } from "../../components/Invoerveld";
import { useAuth } from "../../context/AuthContext";
import { t } from "../../i18n/nl";

/**
 * Dagelijkse "inlog" op het tablet. Geen e-mailadres, geen wachtwoord bij
 * elk gebruik — het account blijft continu ingelogd (zie AuthContext) en
 * dit scherm is puur een gemak-slot tegen per ongeluk aanraken door een
 * klant. Bij een vergeten pincode kan het accountwachtwoord als noodgreep
 * dienen, zonder dat daarvoor moet worden uitgelogd.
 */
export function PincodeScherm() {
  const { ontgrendelMetPincode, ontgrendel, logIn, modus } = useAuth();
  const [waarde, setWaarde] = useState("");
  const [fout, setFout] = useState(false);
  const [metWachtwoord, setMetWachtwoord] = useState(false);
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [wachtwoordFout, setWachtwoordFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function wijzig(nieuw: string) {
    setFout(false);
    setWaarde(nieuw);
    if (nieuw.length === 4) {
      const juist = await ontgrendelMetPincode(nieuw);
      if (!juist) {
        setFout(true);
        setWaarde("");
      }
    }
  }

  async function ontgrendelMetWachtwoord() {
    setBezig(true);
    setWachtwoordFout(null);
    const resultaat = await logIn(email, wachtwoord);
    setBezig(false);
    if (resultaat.fout) {
      setWachtwoordFout(resultaat.fout);
      return;
    }
    ontgrendel();
  }

  return (
    <div className="app-scherm">
      <div
        className="app-inhoud"
        style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "var(--ruimte-l)", flex: 1 }}
      >
        {!metWachtwoord ? (
          <>
            <div style={{ textAlign: "center" }}>
              <h1 style={{ marginBottom: "0.25rem" }}>{t.pincode.titel}</h1>
              <p className="tekst-zwak">{t.pincode.subtitel}</p>
              {fout ? <p style={{ color: "var(--kleur-fout)", fontWeight: 600 }}>{t.pincode.fout}</p> : null}
            </div>
            <Cijferpad waarde={waarde} onWijzig={wijzig} />
            {modus === "supabase" ? (
              <Knop variant="tekst" onClick={() => setMetWachtwoord(true)}>
                {t.pincode.vergeten}
              </Knop>
            ) : null}
          </>
        ) : (
          <div style={{ width: "100%", maxWidth: "24rem", display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
            <h1>{t.auth.inloggenTitel}</h1>
            <Invoerveld label={t.auth.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
            <Invoerveld
              label={t.auth.wachtwoord}
              type="password"
              value={wachtwoord}
              onChange={(e) => setWachtwoord(e.target.value)}
              autoComplete="current-password"
            />
            {wachtwoordFout ? <p style={{ color: "var(--kleur-fout)" }}>{wachtwoordFout}</p> : null}
            <Knop volledigeBreedte onClick={ontgrendelMetWachtwoord} disabled={bezig}>
              {t.algemeen.verder}
            </Knop>
            <Knop variant="secundair" volledigeBreedte onClick={() => setMetWachtwoord(false)}>
              {t.algemeen.annuleren}
            </Knop>
          </div>
        )}
      </div>
    </div>
  );
}

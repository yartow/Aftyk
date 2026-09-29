import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Cijferpad } from "../../components/Cijferpad";
import { Knop } from "../../components/Knop";
import { Invoerveld } from "../../components/Invoerveld";
import { PogingenMelding } from "../../components/PogingenMelding";
import { useAuth } from "../../context/AuthContext";
import { MAX_POGINGEN, haalPogingen } from "../../lib/pogingen";
import { useWachtwoordPogingen } from "../../lib/useWachtwoordPogingen";
import { verwijderLokaleData } from "../../lib/verwijderen";
import { t } from "../../i18n";

/**
 * Dagelijkse "inlog" op het tablet. Geen e-mailadres, geen wachtwoord bij
 * elk gebruik — het account blijft continu ingelogd (zie AuthContext) en
 * dit scherm is puur een gemak-slot tegen per ongeluk aanraken door een
 * klant. Na 5 foute pincodes, of bij een vergeten pincode, dient het
 * accountwachtwoord als noodgreep, zonder dat daarvoor moet worden uitgelogd.
 * Bij een vergeten pincode volgt na het inloggen een nieuwe pincode.
 */
export function PincodeScherm() {
  const { ontgrendelMetPincode, ontgrendel, logIn, logUit, vergeetPincode, modus } = useAuth();
  const navigate = useNavigate();
  const [waarde, setWaarde] = useState("");
  const [fout, setFout] = useState<number | null>(null); // resterende pogingen bij een foute pincode
  const [pincodeGeblokkeerd, setPincodeGeblokkeerd] = useState(false);
  const [metWachtwoord, setMetWachtwoord] = useState(false);
  const [pincodeVergeten, setPincodeVergeten] = useState(false);
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [wachtwoordFout, setWachtwoordFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const { over, geblokkeerd, zetOver } = useWachtwoordPogingen();

  // Na herladen of heropenen blijft het pincodeslot dicht staan.
  useEffect(() => {
    if (modus !== "supabase") return;
    void haalPogingen("pincode").then((n) => {
      if (n >= MAX_POGINGEN.pincode) {
        setPincodeGeblokkeerd(true);
        setMetWachtwoord(true);
      }
    });
  }, [modus]);

  async function wijzig(nieuw: string) {
    setFout(null);
    setWaarde(nieuw);
    if (nieuw.length === 4) {
      const uitkomst = await ontgrendelMetPincode(nieuw);
      if (!uitkomst.juist) {
        setWaarde("");
        if (uitkomst.geblokkeerd) {
          setPincodeGeblokkeerd(true);
          setMetWachtwoord(true);
        } else {
          setFout(uitkomst.pogingenOver);
        }
      }
      // (bij een juiste pincode verdwijnt dit scherm vanzelf)
    }
  }

  async function ontgrendelMetWachtwoord() {
    setBezig(true);
    setWachtwoordFout(null);
    // Bij "pincode vergeten" blijft de app vergrendeld tot er een nieuwe pincode is gekozen.
    const resultaat = await logIn(email, wachtwoord, { ontgrendel: !pincodeVergeten });
    setBezig(false);
    if (resultaat.pogingenOver !== undefined) zetOver(resultaat.pogingenOver);
    if (resultaat.fout) {
      setWachtwoordFout(resultaat.geblokkeerd ? null : resultaat.fout);
      return;
    }
    if (pincodeVergeten) await vergeetPincode(); // de app vraagt nu om een nieuwe pincode
    else ontgrendel();
  }

  /** Wachtwoord kwijt: de resetlink werkt alleen uitgelogd, dus eerst uitloggen. */
  async function wachtwoordVergeten() {
    await logUit();
    navigate("/wachtwoord-vergeten");
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
              {fout !== null ? (
                <p role="alert" style={{ color: "var(--kleur-fout)", fontWeight: 600 }}>{modus === "supabase" ? t.pincode.foutMetPogingen(fout) : t.pincode.fout}</p>
              ) : null}
            </div>
            <Cijferpad waarde={waarde} onWijzig={wijzig} />
            {modus === "supabase" ? (
              <Knop
                variant="tekst"
                onClick={() => {
                  setPincodeVergeten(true);
                  setMetWachtwoord(true);
                }}
              >
                {t.pincode.vergeten}
              </Knop>
            ) : (
              // Lokale modus heeft geen account: de enige uitweg is de gegevens op dit apparaat wissen.
              <Knop
                variant="tekst"
                onClick={() => {
                  if (window.confirm(t.pincode.wisBevestiging)) void verwijderLokaleData();
                }}
              >
                {t.pincode.vergetenLokaal}
              </Knop>
            )}
          </>
        ) : (
          <div style={{ width: "100%", maxWidth: "24rem", display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
            <h1>{t.auth.inloggenTitel}</h1>
            {pincodeGeblokkeerd ? <p>{t.pincode.geblokkeerd}</p> : pincodeVergeten ? <p className="tekst-zwak">{t.pincode.vergetenUitleg}</p> : null}
            {geblokkeerd ? null : (
              <>
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
              </>
            )}
            <PogingenMelding over={over} onResetLink={() => void wachtwoordVergeten()} />
            {pincodeGeblokkeerd ? null : (
              <Knop variant="secundair" volledigeBreedte onClick={() => { setMetWachtwoord(false); setPincodeVergeten(false); }}>
                {t.algemeen.annuleren}
              </Knop>
            )}
            {geblokkeerd ? null : (
              <Knop variant="tekst" onClick={() => void wachtwoordVergeten()}>
                {t.auth.wachtwoordVergeten}
              </Knop>
            )}
            <Knop variant="tekst" onClick={() => void logUit()}>
              {t.instellingen.uitloggen}
            </Knop>
          </div>
        )}
      </div>
    </div>
  );
}

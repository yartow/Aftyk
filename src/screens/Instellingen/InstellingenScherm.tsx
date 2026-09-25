import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppKop } from "../../components/AppKop";
import { Kaart } from "../../components/Kaart";
import { Knop } from "../../components/Knop";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Cijferpad } from "../../components/Cijferpad";
import { VerwijderBevestiging } from "../../components/VerwijderBevestiging";
import { isDemo } from "../../lib/modus";
import { startDemo, verlaatDemo, resetDemo } from "../../lib/demo";
import { useInstellingen } from "../../context/InstellingenContext";
import { useAuth } from "../../context/AuthContext";
import { useLocatie } from "../../context/LocatieContext";
import { synchroniseerNu } from "../../lib/sync";
import { maakBackupBestand, herstelBackupBestand } from "../../lib/backup";
import { zetPincode, schakelPincodeUit, pincodeIsIngeschakeld } from "../../lib/pin";
import { t, type Taal } from "../../i18n";
import type { Tekstgrootte, Thema } from "../../types/domain";

export function InstellingenScherm() {
  const navigate = useNavigate();
  const { tekstgrootte, thema, taal, zetTekstgrootte, zetThema, zetTaal } = useInstellingen();
  const { organisatie, profiel, modus, sessie, logUit } = useAuth();
  const [verwijderSoort, setVerwijderSoort] = useState<"lokaal" | "online" | null>(null);
  const demo = isDemo();
  const { actieveLocatie } = useLocatie();

  const [pincodeStap, setPincodeStap] = useState<"uit" | "invoeren" | "herhalen">("uit");
  const [nieuwePincode, setNieuwePincode] = useState("");
  const [eerstePincode, setEerstePincode] = useState("");
  const [pincodeAan, setPincodeAan] = useState(false);
  const [pincodeFout, setPincodeFout] = useState(false);

  useEffect(() => {
    void pincodeIsIngeschakeld().then(setPincodeAan);
  }, []);
  const [syncBericht, setSyncBericht] = useState<string | null>(null);
  const [syncBezig, setSyncBezig] = useState(false);
  const [herstelBericht, setHerstelBericht] = useState<string | null>(null);
  const bestandsInvoerRef = useRef<HTMLInputElement>(null);

  async function bestandGekozenVoorHerstel(e: ChangeEvent<HTMLInputElement>) {
    const bestand = e.target.files?.[0];
    e.target.value = ""; // zelfde bestand nogmaals kunnen kiezen
    if (!bestand) return;
    try {
      const { aantalDocumenten } = await herstelBackupBestand(bestand);
      setHerstelBericht(t.instellingen.backupHersteld(aantalDocumenten));
    } catch (fout) {
      setHerstelBericht(fout instanceof Error ? fout.message : t.instellingen.backupMislukt);
    }
  }

  async function handSync() {
    setSyncBezig(true);
    const resultaat = await synchroniseerNu(true);
    setSyncBericht(resultaat.gelukt ? t.instellingen.synchronisatieGelukt : resultaat.foutmelding ?? t.instellingen.synchronisatieMislukt);
    setSyncBezig(false);
  }

  async function pincodeBevestigen(waarde: string) {
    setNieuwePincode(waarde);
    if (waarde.length !== 4) return;
    if (pincodeStap === "invoeren") {
      // Twee keer invoeren, zodat één verkeerd getikt cijfer je niet buitensluit.
      setEerstePincode(waarde);
      setNieuwePincode("");
      setPincodeFout(false);
      setPincodeStap("herhalen");
    } else if (waarde === eerstePincode) {
      await zetPincode(waarde);
      setPincodeAan(true);
      setPincodeStap("uit");
      setNieuwePincode("");
      setEerstePincode("");
    } else {
      setPincodeFout(true);
      setNieuwePincode("");
      setEerstePincode("");
      setPincodeStap("invoeren");
    }
  }

  return (
    <div className="app-scherm">
      <AppKop titel={t.instellingen.titel} />
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-l)" }}>
        <section>
          <h2>{t.instellingen.weergave}</h2>
          <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
            <div>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{t.instellingen.tekstgrootte}</p>
              <div style={{ display: "flex", gap: "var(--ruimte-s)", flexWrap: "wrap" }}>
                {(
                  [
                    ["normaal", t.instellingen.tekstgrootteNormaal],
                    ["groot", t.instellingen.tekstgrootteGroot],
                    ["extra-groot", t.instellingen.tekstgrootteExtraGroot],
                  ] as [Tekstgrootte, string][]
                ).map(([waarde, label]) => (
                  <Knop key={waarde} variant={tekstgrootte === waarde ? "primair" : "secundair"} onClick={() => zetTekstgrootte(waarde)}>
                    {label}
                  </Knop>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{t.instellingen.thema}</p>
              <div style={{ display: "flex", gap: "var(--ruimte-s)", flexWrap: "wrap" }}>
                {(
                  [
                    ["systeem", t.instellingen.themaSysteem],
                    ["licht", t.instellingen.themaLicht],
                    ["donker", t.instellingen.themaDonker],
                  ] as [Thema, string][]
                ).map(([waarde, label]) => (
                  <Knop key={waarde} variant={thema === waarde ? "primair" : "secundair"} onClick={() => zetThema(waarde)}>
                    {label}
                  </Knop>
                ))}
              </div>
            </div>
            <div>
              <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>{t.instellingen.taal}</p>
              <div style={{ display: "flex", gap: "var(--ruimte-s)", flexWrap: "wrap" }}>
                {(
                  [
                    ["nl", "Nederlands"],
                    ["en", "English"],
                  ] as [Taal, string][]
                ).map(([waarde, label]) => (
                  <Knop key={waarde} lang={waarde} variant={taal === waarde ? "primair" : "secundair"} aria-pressed={taal === waarde} onClick={() => zetTaal(waarde)}>
                    {label}
                  </Knop>
                ))}
              </div>
            </div>
          </Kaart>
        </section>

        <section>
          <h2>{t.instellingen.beveiliging}</h2>
          <Kaart>
            {pincodeStap !== "uit" ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 600 }}>{pincodeStap === "invoeren" ? t.instellingen.pincodeNieuw : t.instellingen.pincodeHerhaal}</p>
                {pincodeFout ? <p style={{ color: "var(--kleur-fout)" }}>{t.instellingen.pincodeNietGelijk}</p> : null}
                <Cijferpad waarde={nieuwePincode} onWijzig={pincodeBevestigen} />
                <Knop
                  variant="tekst"
                  onClick={() => {
                    setPincodeStap("uit");
                    setNieuwePincode("");
                    setEerstePincode("");
                    setPincodeFout(false);
                  }}
                >
                  {t.algemeen.annuleren}
                </Knop>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "var(--ruimte-s)", flexWrap: "wrap" }}>
                <Knop variant="secundair" onClick={() => setPincodeStap("invoeren")}>
                  {pincodeAan ? t.instellingen.pincodeWijzigen : t.instellingen.pincodeInschakelen}
                </Knop>
                {pincodeAan ? (
                  <Knop
                    variant="secundair"
                    onClick={async () => {
                      await schakelPincodeUit();
                      setPincodeAan(false);
                    }}
                  >
                    {t.instellingen.pincodeUitschakelen}
                  </Knop>
                ) : null}
              </div>
            )}
          </Kaart>
        </section>

        {modus === "supabase" ? (
          <section>
            <h2>{t.instellingen.synchronisatie}</h2>
            <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
              <Knop onClick={handSync} disabled={syncBezig}>
                {syncBezig ? t.instellingen.bezigMetSynchroniseren : t.instellingen.nuSynchroniseren}
              </Knop>
              {syncBericht ? <p className="tekst-zwak" style={{ margin: 0 }}>{syncBericht}</p> : null}
            </Kaart>
          </section>
        ) : null}

        <section>
          <h2>{t.instellingen.gegevensbeheer}</h2>
          <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
            <Knop variant="secundair" onClick={() => maakBackupBestand()}>{t.instellingen.backupOpslaan}</Knop>
            <p className="tekst-zwak" style={{ margin: 0 }}>{t.instellingen.backupUitleg}</p>
            <input
              ref={bestandsInvoerRef}
              type="file"
              accept="application/json"
              hidden
              onChange={bestandGekozenVoorHerstel}
            />
            <Knop variant="secundair" onClick={() => bestandsInvoerRef.current?.click()}>
              {t.instellingen.backupHerstellen}
            </Knop>
            {herstelBericht ? <p className="tekst-zwak" style={{ margin: 0 }}>{herstelBericht}</p> : null}
          </Kaart>
        </section>

        <section>
          <h2>{t.instellingen.bedrijfsgegevens}</h2>
          <Kaart>
            <p style={{ margin: "0 0 0.75rem 0", fontWeight: 600 }}>{organisatie?.naam}</p>
            <Knop variant="secundair" onClick={() => navigate(organisatie ? "/instellingen/bedrijfsgegevens" : "/inrichten")}>
              {t.algemeen.bewerken}
            </Knop>
          </Kaart>
        </section>

        <section>
          <h2>{t.instellingen.locaties}</h2>
          <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
            <p style={{ margin: 0, fontWeight: 600 }}>📍 {actieveLocatie?.naam}</p>
            <Knop variant="secundair" onClick={() => navigate("/instellingen/locaties")}>{t.instellingen.locaties}</Knop>
          </Kaart>
        </section>

        <section>
          <h2>{t.demo.sectie}</h2>
          <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
            <p className="tekst-zwak" style={{ margin: 0 }}>{t.demo.uitleg}</p>
            {demo ? (
              <>
                <Knop onClick={verlaatDemo}>{t.demo.verlaten}</Knop>
                <Knop
                  variant="secundair"
                  onClick={() => {
                    if (window.confirm(t.demo.opnieuwBevestiging)) void resetDemo();
                  }}
                >
                  {t.demo.opnieuw}
                </Knop>
              </>
            ) : (
              <Knop variant="secundair" onClick={startDemo}>{t.demo.bekijken}</Knop>
            )}
          </Kaart>
        </section>

        {!demo ? (
          <section>
            <h2>{t.verwijderen.sectie}</h2>
            <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
              <Knop variant="gevaar" onClick={() => setVerwijderSoort("lokaal")}>{t.verwijderen.lokaalKnop}</Knop>
              <p className="tekst-zwak" style={{ margin: 0 }}>{t.verwijderen.lokaalUitleg}</p>
              {modus === "supabase" && sessie ? (
                <>
                  <Knop variant="gevaar" onClick={() => setVerwijderSoort("online")}>{t.verwijderen.onlineKnop}</Knop>
                  <p className="tekst-zwak" style={{ margin: 0 }}>{t.verwijderen.onlineUitleg}</p>
                </>
              ) : null}
            </Kaart>
          </section>
        ) : null}

        {modus === "supabase" ? (
          <section>
            <h2>{t.instellingen.account}</h2>
            <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
              {profiel ? <p style={{ margin: 0 }}>{t.instellingen.ingelogdAls(profiel.naam)}</p> : null}
              <Knop variant="gevaar" onClick={() => logUit()}>{t.instellingen.uitloggen}</Knop>
            </Kaart>
          </section>
        ) : null}
      </div>
      <VerwijderBevestiging key={verwijderSoort ?? "uit"} soort={verwijderSoort} onSluit={() => setVerwijderSoort(null)} />
      <HoofdNavigatie />
    </div>
  );
}

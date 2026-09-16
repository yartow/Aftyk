import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppKop } from "../../components/AppKop";
import { Kaart } from "../../components/Kaart";
import { Knop } from "../../components/Knop";
import { Invoerveld } from "../../components/Invoerveld";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Cijferpad } from "../../components/Cijferpad";
import { useInstellingen } from "../../context/InstellingenContext";
import { useAuth } from "../../context/AuthContext";
import { synchroniseerNu } from "../../lib/sync";
import { maakBackupBestand } from "../../lib/backup";
import { zetPincode, schakelPincodeUit, pincodeIsIngeschakeld } from "../../lib/pin";
import { t } from "../../i18n/nl";
import type { Tekstgrootte, Thema } from "../../types/domain";

export function InstellingenScherm() {
  const navigate = useNavigate();
  const { tekstgrootte, thema, zetTekstgrootte, zetThema } = useInstellingen();
  const { organisatie, profiel, modus, logUit } = useAuth();

  const [pincodeStap, setPincodeStap] = useState<"uit" | "invoeren">("uit");
  const [nieuwePincode, setNieuwePincode] = useState("");
  const [syncBericht, setSyncBericht] = useState<string | null>(null);
  const [syncBezig, setSyncBezig] = useState(false);

  async function handSync() {
    setSyncBezig(true);
    const resultaat = await synchroniseerNu();
    setSyncBericht(resultaat.gelukt ? t.instellingen.synchronisatieGelukt : resultaat.foutmelding ?? t.instellingen.synchronisatieMislukt);
    setSyncBezig(false);
  }

  async function pincodeBevestigen(waarde: string) {
    setNieuwePincode(waarde);
    if (waarde.length === 4) {
      await zetPincode(waarde);
      setPincodeStap("uit");
      setNieuwePincode("");
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
          </Kaart>
        </section>

        <section>
          <h2>{t.instellingen.beveiliging}</h2>
          <Kaart>
            {pincodeStap === "invoeren" ? (
              <div style={{ textAlign: "center" }}>
                <p style={{ fontWeight: 600 }}>{t.instellingen.pincodeWijzigen}</p>
                <Cijferpad waarde={nieuwePincode} onWijzig={pincodeBevestigen} />
                <Knop variant="tekst" onClick={() => setPincodeStap("uit")}>{t.algemeen.annuleren}</Knop>
              </div>
            ) : (
              <div style={{ display: "flex", gap: "var(--ruimte-s)", flexWrap: "wrap" }}>
                <Knop variant="secundair" onClick={() => setPincodeStap("invoeren")}>{t.instellingen.pincodeWijzigen}</Knop>
                <Knop
                  variant="secundair"
                  onClick={async () => {
                    if (await pincodeIsIngeschakeld()) {
                      await schakelPincodeUit();
                    } else {
                      setPincodeStap("invoeren");
                    }
                  }}
                >
                  {t.instellingen.pincodeUitschakelen}
                </Knop>
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
          </Kaart>
        </section>

        <section>
          <h2>{t.instellingen.bedrijfsgegevens}</h2>
          <Kaart>
            <p style={{ margin: "0 0 0.75rem 0", fontWeight: 600 }}>{organisatie?.naam}</p>
            <Knop variant="secundair" onClick={() => navigate("/instellingen/bedrijfsgegevens")}>
              {t.algemeen.bewerken}
            </Knop>
          </Kaart>
        </section>

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
      <HoofdNavigatie />
    </div>
  );
}

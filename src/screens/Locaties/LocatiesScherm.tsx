import { useState } from "react";
import { AppKop } from "../../components/AppKop";
import { Blad } from "../../components/Blad";
import { Invoerveld } from "../../components/Invoerveld";
import { Kaart } from "../../components/Kaart";
import { Knop } from "../../components/Knop";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { StatusBalk } from "../../components/StatusBalk";
import { useAuth } from "../../context/AuthContext";
import { useLocatie } from "../../context/LocatieContext";
import { adresRegel, maakLocatie, werkLocatieBij, type LocatieInvoer } from "../../lib/locaties";
import { t } from "../../i18n";
import "../formulieren.css";

const LEEG: LocatieInvoer = { naam: "", adres: "", postcode: "", plaats: "", telefoon: "" };

/** Vestigingen beheren: elke locatie heeft eigen formulieren (zie lib/documenten.ts). */
export function LocatiesScherm() {
  const { organisatie } = useAuth();
  const { locaties, actieveLocatieId, zetActieveLocatie } = useLocatie();
  const [bewerkId, setBewerkId] = useState<string | "nieuw" | null>(null);
  const [invoer, setInvoer] = useState<LocatieInvoer>(LEEG);

  function open(id: string | "nieuw") {
    const bestaand = locaties.find((l) => l.id === id);
    setInvoer(bestaand ? { naam: bestaand.naam, adres: bestaand.adres, postcode: bestaand.postcode, plaats: bestaand.plaats, telefoon: bestaand.telefoon } : LEEG);
    setBewerkId(id);
  }

  async function opslaan() {
    if (!invoer.naam.trim()) return;
    if (bewerkId === "nieuw") {
      const nieuw = await maakLocatie(organisatie?.id ?? "", { ...invoer, naam: invoer.naam.trim() });
      zetActieveLocatie(nieuw.id);
    } else if (bewerkId) {
      await werkLocatieBij(bewerkId, { ...invoer, naam: invoer.naam.trim() });
    }
    setBewerkId(null);
  }

  async function archiveer(id: string, naam: string) {
    if (locaties.length <= 1) {
      window.alert(t.locaties.laatsteKanNiet);
      return;
    }
    if (!window.confirm(t.locaties.archiveerBevestiging(naam))) return;
    await werkLocatieBij(id, { actief: false });
    setBewerkId(null);
  }

  const veld = (sleutel: keyof LocatieInvoer) => ({
    value: invoer[sleutel],
    onChange: (e: { target: { value: string } }) => setInvoer({ ...invoer, [sleutel]: e.target.value }),
  });

  return (
    <div className="app-scherm">
      <StatusBalk />
      <AppKop titel={t.locaties.titel} terugNaar="/instellingen" />
      <div className="app-inhoud">
        <p className="tekst-zwak" style={{ marginTop: 0 }}>{t.locaties.uitleg}</p>
        <div className="kaartlijst">
          {locaties.map((l) => (
            <Kaart key={l.id}>
              <div className="kaart-kop">
                <h3>📍 {l.naam}</h3>
                {l.id === actieveLocatieId ? <span className="badge-ok">✓ {t.locaties.actief}</span> : null}
              </div>
              <p className="tekst-zwak" style={{ margin: "0 0 var(--ruimte-s) 0" }}>{adresRegel(l) || "—"}</p>
              <div className="werkbalk" style={{ marginBottom: 0 }}>
                {l.id !== actieveLocatieId ? (
                  <Knop variant="secundair" onClick={() => zetActieveLocatie(l.id)}>{t.locaties.kies}</Knop>
                ) : null}
                <Knop variant="secundair" onClick={() => open(l.id)}>{t.algemeen.bewerken}</Knop>
              </div>
            </Kaart>
          ))}
        </div>
        <div style={{ marginTop: "var(--ruimte-m)" }}>
          <Knop volledigeBreedte onClick={() => open("nieuw")}>+ {t.locaties.toevoegen}</Knop>
        </div>
      </div>

      <Blad open={bewerkId !== null} titel={bewerkId === "nieuw" ? t.locaties.nieuw : t.locaties.bewerken} onSluit={() => setBewerkId(null)}>
        <Invoerveld id="loc-naam" label={t.locaties.naam} placeholder={t.locaties.naamVoorbeeld} {...veld("naam")} />
        <Invoerveld id="loc-adres" label={t.bedrijfsgegevens.adres} {...veld("adres")} />
        <div style={{ display: "flex", gap: "var(--ruimte-m)", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 7rem" }}>
            <Invoerveld id="loc-postcode" label={t.bedrijfsgegevens.postcode} {...veld("postcode")} />
          </div>
          <div style={{ flex: "2 1 10rem" }}>
            <Invoerveld id="loc-plaats" label={t.bedrijfsgegevens.plaats} {...veld("plaats")} />
          </div>
        </div>
        <Invoerveld id="loc-telefoon" label={t.locaties.telefoon} type="tel" {...veld("telefoon")} />
        <Knop onClick={opslaan} disabled={!invoer.naam.trim()}>{t.locaties.opslaan}</Knop>
        {bewerkId && bewerkId !== "nieuw" ? (
          <Knop variant="gevaar" onClick={() => archiveer(bewerkId, invoer.naam)}>{t.locaties.archiveren}</Knop>
        ) : null}
      </Blad>
      <HoofdNavigatie />
    </div>
  );
}

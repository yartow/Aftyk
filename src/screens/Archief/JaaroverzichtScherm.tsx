import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Knop } from "../../components/Knop";
import { laatste12Maanden } from "./kalender";
import { vandaagAlsWerkdatum } from "../../lib/format";
import { t } from "../../i18n/nl";
import "./Jaaroverzicht.css";

const WEEKDAGEN = ["Ma", "Di", "Wo", "Do", "Vr", "Za", "Zo"];

/**
 * Het scherm dat aan een inspecteur wordt getoond: alle dagen van de
 * afgelopen 12 maanden, met per dag zichtbaar of er is afgevinkt. Kleur is
 * hier bewust nooit de enige informatiedrager — elke dag met een
 * registratie krijgt ook een ✓, en dagen zonder registratie zijn leeg in
 * plaats van rood, om onnodige "foutmeldingen" op dagen dat de winkel
 * dicht was te voorkomen.
 */
export function JaaroverzichtScherm() {
  const navigate = useNavigate();
  const registraties = useLiveQuery(() => db.registraties.toArray(), []);
  const vandaag = vandaagAlsWerkdatum();

  const dagenMetRegistratie = useMemo(() => {
    const verzameling = new Set<string>();
    (registraties ?? []).forEach((r) => verzameling.add(r.werkdatum));
    return verzameling;
  }, [registraties]);

  const maanden = useMemo(() => laatste12Maanden(), []);

  return (
    <div className="app-scherm">
      <header className="app-koptekst">
        <h1>{t.archief.titel}</h1>
        <Knop variant="secundair" onClick={() => navigate("/exporteren")}>{t.archief.exporteren}</Knop>
      </header>
      <div className="app-inhoud">
        <p className="tekst-zwak" style={{ marginTop: 0 }}>{t.archief.ondertitel}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-l)" }}>
          {maanden.map((maand) => (
            <div key={`${maand.jaar}-${maand.maand}`}>
              <h2 style={{ fontSize: "1rem", textTransform: "capitalize", margin: "0 0 0.5rem 0" }}>{maand.label}</h2>
              <div className="kalender-weekdagen">
                {WEEKDAGEN.map((dag) => (
                  <span key={dag}>{dag}</span>
                ))}
              </div>
              {maand.weken.map((week, i) => (
                <div className="kalender-week" key={i}>
                  {week.map((werkdatum, j) => {
                    if (!werkdatum) return <span key={j} className="kalender-dag kalender-dag--leeg" />;
                    const heeftRegistratie = dagenMetRegistratie.has(werkdatum);
                    const isVandaag = werkdatum === vandaag;
                    const dagnummer = Number(werkdatum.slice(-2));
                    return (
                      <button
                        key={j}
                        type="button"
                        className={`kalender-dag ${heeftRegistratie ? "kalender-dag--ingevuld" : ""} ${isVandaag ? "kalender-dag--vandaag" : ""}`}
                        onClick={() => navigate(`/archief/dag/${werkdatum}`)}
                        aria-label={`${werkdatum}${heeftRegistratie ? ", " + t.status.gedaan : ""}`}
                      >
                        <span>{dagnummer}</span>
                        {heeftRegistratie ? <span aria-hidden="true" className="kalender-dag-vinkje">✓</span> : null}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
      <HoofdNavigatie />
    </div>
  );
}

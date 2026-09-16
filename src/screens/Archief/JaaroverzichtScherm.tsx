import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db, haalInstelling, zetInstelling } from "../../db/db";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Knop } from "../../components/Knop";
import { laatste12Maanden, WEEKDAGEN, type MaandRooster } from "../../lib/kalender";
import { vandaagAlsWerkdatum } from "../../lib/format";
import { t } from "../../i18n/nl";
import type { ArchiefWeergave } from "../../types/domain";
import "./Jaaroverzicht.css";

const SLEUTEL_ARCHIEF_WEERGAVE = "archief_weergave";

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
  const [weergave, setWeergaveState] = useState<ArchiefWeergave>("kalender");
  const [weergaveKlaar, setWeergaveKlaar] = useState(false);
  const gebruikerWijzigdeRef = useRef(false);

  useEffect(() => {
    (async () => {
      const opgeslagen = (await haalInstelling(SLEUTEL_ARCHIEF_WEERGAVE)) as ArchiefWeergave | undefined;
      if (opgeslagen && !gebruikerWijzigdeRef.current) setWeergaveState(opgeslagen);
      setWeergaveKlaar(true);
    })();
  }, []);

  const zetWeergave = (waarde: ArchiefWeergave) => {
    gebruikerWijzigdeRef.current = true;
    setWeergaveState(waarde);
    void zetInstelling(SLEUTEL_ARCHIEF_WEERGAVE, waarde);
  };

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

        <div className="archief-weergave-kiezer">
          <span className="archief-weergave-label">{t.archief.toonAls}</span>
          <div style={{ display: "flex", gap: "var(--ruimte-s)" }}>
            <Knop
              variant={weergave === "lijst" ? "primair" : "secundair"}
              onClick={() => zetWeergave("lijst")}
              aria-pressed={weergave === "lijst"}
            >
              {t.archief.weergaveLijst}
            </Knop>
            <Knop
              variant={weergave === "kalender" ? "primair" : "secundair"}
              onClick={() => zetWeergave("kalender")}
              aria-pressed={weergave === "kalender"}
            >
              {t.archief.weergaveKalender}
            </Knop>
          </div>
        </div>

        {!weergaveKlaar ? null : weergave === "kalender" ? (
          <MaandBlokken maanden={maanden}>
            {(maand) => (
              <>
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
              </>
            )}
          </MaandBlokken>
        ) : (
          <MaandBlokken maanden={maanden}>
            {(maand) => (
              <div className="archief-lijst">
                {maand.weken.flat().map((werkdatum, i) => {
                  if (!werkdatum) return null;
                  const heeftRegistratie = dagenMetRegistratie.has(werkdatum);
                  const isVandaag = werkdatum === vandaag;
                  return (
                    <button
                      key={i}
                      type="button"
                      className={`archief-lijst-rij ${isVandaag ? "archief-lijst-rij--vandaag" : ""}`}
                      onClick={() => navigate(`/archief/dag/${werkdatum}`)}
                    >
                      <span>{formatteerDagLabel(werkdatum)}</span>
                      <span className={`archief-lijst-status ${heeftRegistratie ? "archief-lijst-status--ingevuld" : ""}`}>
                        {heeftRegistratie ? (
                          <>
                            <span aria-hidden="true">✓</span> {t.status.gedaan}
                          </>
                        ) : (
                          t.archief.geenRegistratie
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </MaandBlokken>
        )}
      </div>
      <HoofdNavigatie />
    </div>
  );
}

function MaandBlokken({ maanden, children }: { maanden: MaandRooster[]; children: (maand: MaandRooster) => ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-l)" }}>
      {maanden.map((maand) => (
        <div key={`${maand.jaar}-${maand.maand}`}>
          <h2 style={{ fontSize: "1rem", textTransform: "capitalize", margin: "0 0 0.5rem 0" }}>{maand.label}</h2>
          {children(maand)}
        </div>
      ))}
    </div>
  );
}

function formatteerDagLabel(werkdatum: string): string {
  const [jaar, maand, dag] = werkdatum.split("-").map(Number);
  return new Date(jaar, maand - 1, dag).toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

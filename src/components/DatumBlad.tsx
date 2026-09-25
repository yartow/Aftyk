import { useState } from "react";
import { bouwMaandRooster, weekdagen } from "../lib/kalender";
import { werkdatumVan } from "../lib/format";
import { formatteerDatumKort, formatteerDatumLang, t } from "../i18n";
import { Blad } from "./Blad";
import "./DatumKiezer.css";
import "./DatumBlad.css";

interface DatumBladProps {
  waarde: string; // YYYY-MM-DD of ""
  onWijzig: (waarde: string) => void;
  /** Tekst op de knop zolang er geen datum is gekozen. */
  leegLabel: string;
  titel: string;
  className?: string;
}

/**
 * Datumkiezer als knop + keuzeblad. De kalender opent in maandweergave; met
 * ‹ en › ga je naar de vorige/volgende maand. Eigen HTML (geen native
 * datumkiezer) zodat de dagknoppen meeschalen met de tekstgrootte.
 */
export function DatumBlad({ waarde, onWijzig, leegLabel, titel, className }: DatumBladProps) {
  const [open, setOpen] = useState(false);
  const startDatum = waarde ? new Date(`${waarde}T00:00:00`) : new Date();
  const [jaar, setJaar] = useState(startDatum.getFullYear());
  const [maand, setMaand] = useState(startDatum.getMonth());

  function openBlad() {
    const d = waarde ? new Date(`${waarde}T00:00:00`) : new Date();
    setJaar(d.getFullYear());
    setMaand(d.getMonth());
    setOpen(true);
  }

  function verschuif(delta: number) {
    const d = new Date(jaar, maand + delta, 1);
    setJaar(d.getFullYear());
    setMaand(d.getMonth());
  }

  const rooster = bouwMaandRooster(jaar, maand);
  const vandaag = werkdatumVan(new Date());

  return (
    <>
      <button type="button" className={`datumblad-knop ${waarde ? "datumblad-knop--gevuld" : ""} ${className ?? ""}`} onClick={openBlad}>
        <span aria-hidden="true">📅</span> {waarde ? formatteerDatumKort(new Date(`${waarde}T00:00:00`)) : leegLabel}
      </button>
      <Blad open={open} titel={titel} onSluit={() => setOpen(false)}>
        <div className="datumkiezer-nav">
          <button type="button" className="datumkiezer-navknop" onClick={() => verschuif(-1)} aria-label={t.algemeen.vorigeMaand}>
            ‹
          </button>
          <span className="datumkiezer-maandlabel" aria-live="polite">{rooster.label}</span>
          <button type="button" className="datumkiezer-navknop" onClick={() => verschuif(1)} aria-label={t.algemeen.volgendeMaand}>
            ›
          </button>
        </div>
        <div className="datumkiezer-weekdagen">
          {weekdagen().map((dag) => (
            <span key={dag}>{dag}</span>
          ))}
        </div>
        {rooster.weken.map((week, i) => (
          <div className="datumkiezer-week" key={i}>
            {week.map((dag, j) =>
              dag ? (
                <button
                  key={j}
                  type="button"
                  className={`datumkiezer-dag ${dag === waarde ? "datumkiezer-dag--geselecteerd" : ""} ${dag === vandaag ? "datumblad-vandaag" : ""}`}
                  aria-label={formatteerDatumLang(new Date(`${dag}T00:00:00`))}
                  aria-pressed={dag === waarde}
                  onClick={() => {
                    onWijzig(dag);
                    setOpen(false);
                  }}
                >
                  {Number(dag.slice(-2))}
                </button>
              ) : (
                <span key={j} className="datumkiezer-dag datumkiezer-dag--leeg" />
              ),
            )}
          </div>
        ))}
        {waarde ? (
          <button
            type="button"
            className="knop knop--tekst"
            onClick={() => {
              onWijzig("");
              setOpen(false);
            }}
          >
            {t.algemeen.datumWissen}
          </button>
        ) : null}
      </Blad>
    </>
  );
}

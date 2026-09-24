import { useState } from "react";
import { bouwMaandRooster, weekdagen } from "../lib/kalender";
import { formatteerDatumLang, t } from "../i18n";
import "./DatumKiezer.css";

interface DatumKiezerProps {
  label: string;
  waarde: string; // YYYY-MM-DD
  max: string; // YYYY-MM-DD, latere dagen zijn niet kiesbaar
  onWijzig: (waarde: string) => void;
}

/**
 * Vervangt de native <input type="date">: de pop-up kalender van het besturingssysteem
 * heeft knopjes die niet groter te maken zijn (geen CSS grip op OS-UI), wat voor dikke
 * vingers onbruikbaar is. Deze kalender is volledig eigen HTML, dus de dagknoppen
 * schalen mee met --raakdoel-min zoals de rest van de app.
 */
export function DatumKiezer({ label, waarde, max, onWijzig }: DatumKiezerProps) {
  const [open, setOpen] = useState(false);
  const [jaar, maand] = waarde.split("-").map(Number);
  const [weergaveJaar, setWeergaveJaar] = useState(jaar);
  const [weergaveMaand, setWeergaveMaand] = useState(maand - 1);

  const [maxJaar, maxMaandGetal] = max.split("-").map(Number);
  const maxMaand = maxMaandGetal - 1;
  const kanVolgende = weergaveJaar < maxJaar || (weergaveJaar === maxJaar && weergaveMaand < maxMaand);

  function openKlap() {
    if (!open) {
      const [j, m] = waarde.split("-").map(Number);
      setWeergaveJaar(j);
      setWeergaveMaand(m - 1);
    }
    setOpen((huidig) => !huidig);
  }

  function vorigeMaand() {
    if (weergaveMaand === 0) {
      setWeergaveJaar((j) => j - 1);
      setWeergaveMaand(11);
    } else {
      setWeergaveMaand((m) => m - 1);
    }
  }

  function volgendeMaand() {
    if (!kanVolgende) return;
    if (weergaveMaand === 11) {
      setWeergaveJaar((j) => j + 1);
      setWeergaveMaand(0);
    } else {
      setWeergaveMaand((m) => m + 1);
    }
  }

  const rooster = bouwMaandRooster(weergaveJaar, weergaveMaand);

  return (
    <div className="datumkiezer">
      <label className="invoerveld-label" htmlFor="datumkiezer-knop">
        {label}
      </label>
      <button
        id="datumkiezer-knop"
        type="button"
        className="invoerveld-input datumkiezer-trigger"
        onClick={openKlap}
        aria-expanded={open}
      >
        <span>{formatteerDatumLang(new Date(`${waarde}T00:00:00`))}</span>
        <span aria-hidden="true" className="datumkiezer-pictogram">📅</span>
      </button>

      {open ? (
        <div className="datumkiezer-paneel">
          <div className="datumkiezer-nav">
            <button type="button" className="datumkiezer-navknop" onClick={vorigeMaand} aria-label={t.algemeen.vorigeMaand}>
              ‹
            </button>
            <span className="datumkiezer-maandlabel">{rooster.label}</span>
            <button
              type="button"
              className="datumkiezer-navknop"
              onClick={volgendeMaand}
              disabled={!kanVolgende}
              aria-label={t.algemeen.volgendeMaand}
            >
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
              {week.map((werkdatum, j) => {
                if (!werkdatum) return <span key={j} className="datumkiezer-dag datumkiezer-dag--leeg" />;
                const buitenBereik = werkdatum > max;
                const isGeselecteerd = werkdatum === waarde;
                const dagnummer = Number(werkdatum.slice(-2));
                return (
                  <button
                    key={j}
                    type="button"
                    className={`datumkiezer-dag ${isGeselecteerd ? "datumkiezer-dag--geselecteerd" : ""}`}
                    disabled={buitenBereik}
                    onClick={() => {
                      onWijzig(werkdatum);
                      setOpen(false);
                    }}
                  >
                    {dagnummer}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

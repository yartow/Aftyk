import { useState } from "react";
import { Invoerveld } from "./Invoerveld";
import { normaliseer } from "../lib/leveranciers";
import { t } from "../i18n";
import type { Leverancier } from "../types/domain";
import "./LeverancierZoeker.css";

const MIN_TEKENS = 2;

interface Props {
  leveranciers: Leverancier[];
  /** Naam van de gekozen (of nieuw toe te voegen) leverancier. */
  onKies: (naam: string) => void;
}

/**
 * Naamveld met voorspelling van eerder ingevulde leveranciers. Een eigen lijst
 * i.p.v. <datalist>, want die werkt op iPad/iPhone onbetrouwbaar. Past de naam
 * bij niemand, dan kan de gebruiker hem toevoegen.
 */
export function LeverancierZoeker({ leveranciers, onKies }: Props) {
  const [tekst, setTekst] = useState("");
  const zoek = normaliseer(tekst);
  const actief = leveranciers.filter((l) => !l.gearchiveerd);
  const suggesties = zoek.length >= MIN_TEKENS ? actief.filter((l) => normaliseer(l.naam).includes(zoek)).slice(0, 6) : [];
  const preciesBestaand = actief.some((l) => normaliseer(l.naam) === zoek);
  const kanToevoegen = zoek.length >= MIN_TEKENS && !preciesBestaand;

  return (
    <div className="lev-zoeker">
      <Invoerveld id="lev-zoeker" label={t.leveranciers.naamLeverancier} autoComplete="off" autoFocus value={tekst} onChange={(e) => setTekst(e.target.value)} />
      {suggesties.length > 0 || kanToevoegen ? (
        <ul className="lev-zoeker-lijst" role="listbox">
          {suggesties.map((l) => (
            <li key={l.id}>
              <button type="button" role="option" aria-selected={false} onClick={() => onKies(l.naam)}>
                {l.naam}
              </button>
            </li>
          ))}
          {kanToevoegen ? (
            <li>
              <button type="button" role="option" aria-selected={false} className="lev-zoeker-nieuw" onClick={() => onKies(tekst)}>
                + {t.leveranciers.voegNaamToe(tekst.trim())}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

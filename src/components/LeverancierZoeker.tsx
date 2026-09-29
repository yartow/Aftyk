import { useState, type PointerEvent } from "react";
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
  /** Gecontroleerd gebruik (een veld in een formulier); zonder `waarde` houdt de zoeker de tekst zelf bij. */
  waarde?: string;
  onWijzig?: (tekst: string) => void;
  /** Bij het verlaten van het veld, met de ingevulde tekst. */
  onBlur?: (tekst: string) => void;
  id?: string;
  label?: string;
  autoFocus?: boolean;
}

/**
 * Naamveld met voorspelling van eerder ingevulde leveranciers. Een eigen lijst
 * i.p.v. <datalist>, want die werkt op iPad/iPhone onbetrouwbaar. Past de naam
 * bij niemand, dan kan de gebruiker hem toevoegen.
 */
export function LeverancierZoeker({ leveranciers, onKies, waarde, onWijzig, onBlur, id = "lev-zoeker", label, autoFocus = true }: Props) {
  const [eigenTekst, setEigenTekst] = useState("");
  // De lijst staat alleen open terwijl er getypt wordt: in een formulier blijft het veld met een ingevulde naam staan.
  const [open, setOpen] = useState(autoFocus);
  const tekst = waarde ?? eigenTekst;
  const zetTekst = (nieuw: string) => {
    setEigenTekst(nieuw);
    onWijzig?.(nieuw);
  };
  const zoek = normaliseer(tekst);
  const actief = leveranciers.filter((l) => !l.gearchiveerd);
  const suggesties =
    zoek.length >= MIN_TEKENS ? actief.filter((l) => normaliseer(l.naam) !== zoek && normaliseer(l.naam).includes(zoek)).slice(0, 6) : [];
  const preciesBestaand = actief.some((l) => normaliseer(l.naam) === zoek);
  const kanToevoegen = zoek.length >= MIN_TEKENS && !preciesBestaand;

  function kies(naam: string) {
    setOpen(false);
    onKies(naam);
  }

  // Voorkomt dat het veld eerst de focus verliest (en de lijst verdwijnt) voordat de tik op een keuze telt, vooral op iOS.
  const houdFocus = (e: PointerEvent<HTMLButtonElement>) => e.preventDefault();

  return (
    <div className="lev-zoeker">
      <Invoerveld
        id={id}
        label={label ?? t.leveranciers.naamLeverancier}
        autoComplete="off"
        autoFocus={autoFocus}
        value={tekst}
        onChange={(e) => {
          setOpen(true);
          zetTekst(e.target.value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={(e) => {
          setOpen(false);
          onBlur?.(e.target.value);
        }}
      />
      {open && (suggesties.length > 0 || kanToevoegen) ? (
        <ul className="lev-zoeker-lijst" role="listbox">
          {suggesties.map((l) => (
            <li key={l.id}>
              <button type="button" role="option" aria-selected={false} onPointerDown={houdFocus} onClick={() => kies(l.naam)}>
                {l.naam}
              </button>
            </li>
          ))}
          {kanToevoegen ? (
            <li>
              <button type="button" role="option" aria-selected={false} className="lev-zoeker-nieuw" onPointerDown={houdFocus} onClick={() => kies(tekst)}>
                + {t.leveranciers.voegNaamToe(tekst.trim())}
              </button>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

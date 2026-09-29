import { Blad } from "./Blad";
import { Knop } from "./Knop";
import { t } from "../i18n";

interface BevestigBladProps {
  open: boolean;
  titel: string;
  uitleg: string;
  bevestigLabel?: string;
  onBevestig: () => void;
  onSluit: () => void;
}

/**
 * Bevestiging als keuzeblad onderin het scherm, i.p.v. window.confirm: grote knoppen
 * binnen duimbereik, in de stijl van de app, en niet te onderdrukken door de browser.
 */
export function BevestigBlad({ open, titel, uitleg, bevestigLabel = t.algemeen.verwijderen, onBevestig, onSluit }: BevestigBladProps) {
  return (
    <Blad open={open} titel={titel} onSluit={onSluit}>
      <p style={{ marginTop: 0 }}>{uitleg}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
        <Knop variant="gevaar" volledigeBreedte onClick={onBevestig}>
          {bevestigLabel}
        </Knop>
        <Knop variant="secundair" volledigeBreedte onClick={onSluit}>
          {t.algemeen.annuleren}
        </Knop>
      </div>
    </Blad>
  );
}

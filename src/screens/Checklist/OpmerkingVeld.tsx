import { useState } from "react";
import { Tekstveld } from "../../components/Invoerveld";
import { t } from "../../i18n/nl";

/**
 * Los inklapbaar opmerkingveld onder elk vraagtype (vinkje, temperatuur,
 * tekst) — de eis was dat élke vraag een opmerking moet kunnen krijgen, niet
 * alleen de afvinkpunten.
 */
export function OpmerkingVeld({ waarde, onWijzig }: { waarde: string; onWijzig: (waarde: string) => void }) {
  const [open, setOpen] = useState(waarde.trim() !== "");

  if (!open) {
    return (
      <button type="button" className="knop knop--tekst" style={{ padding: "0.25rem 0" }} onClick={() => setOpen(true)}>
        + {t.checklist.opmerkingKnop}
      </button>
    );
  }

  return (
    <Tekstveld
      value={waarde}
      onChange={(e) => onWijzig(e.target.value)}
      placeholder={t.checklist.opmerkingPlaceholder}
    />
  );
}

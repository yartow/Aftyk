import { Knop } from "./Knop";
import { WAARSCHUW_BIJ_OVER } from "../lib/pogingen";
import { t } from "../i18n";

interface Props {
  /** Resterende wachtwoordpogingen; null = nog niets mislukt. */
  over: number | null;
  onResetLink: () => void;
}

/** Waarschuwing bij de laatste pogingen, en na de laatste poging alleen nog de resetlink. */
export function PogingenMelding({ over, onResetLink }: Props) {
  if (over === null || over > WAARSCHUW_BIJ_OVER) return null;
  if (over <= 0) {
    return (
      <>
        <p style={{ color: "var(--kleur-fout)", fontWeight: 600 }}>{t.auth.geblokkeerd}</p>
        <Knop volledigeBreedte onClick={onResetLink}>
          {t.auth.resetlinkVersturen}
        </Knop>
      </>
    );
  }
  return (
    <p role="alert" style={{ color: "var(--kleur-fout)", fontWeight: 600 }}>
      {t.auth.pogingenWaarschuwing(over)}
    </p>
  );
}

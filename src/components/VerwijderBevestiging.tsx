import { useEffect, useState } from "react";
import { Blad } from "./Blad";
import { Cijferpad } from "./Cijferpad";
import { Invoerveld } from "./Invoerveld";
import { Knop } from "./Knop";
import { controleerPincode, pincodeIsIngeschakeld } from "../lib/pin";
import { maakBackupBestand } from "../lib/backup";
import { verwijderLokaleData, verwijderOnlineData } from "../lib/verwijderen";
import { t } from "../i18n";

interface VerwijderBevestigingProps {
  soort: "lokaal" | "online" | null;
  onSluit: () => void;
}

/**
 * Verwijderen van gegevens is nooit één tik: eerst een vraag met uitleg,
 * daarna een tweede controle — de pincode, of (zonder pincode) het intypen
 * van een woord. Niets wordt verwijderd zolang die controle niet slaagt.
 */
export function VerwijderBevestiging({ soort, onSluit }: VerwijderBevestigingProps) {
  const [stap, setStap] = useState<"vraag" | "controle" | "bezig" | "klaar">("vraag");
  const [heeftPincode, setHeeftPincode] = useState(false);
  const [pincode, setPincode] = useState("");
  const [woord, setWoord] = useState("");
  const [fout, setFout] = useState<string | null>(null);

  // De ouder geeft dit component een `key` per soort, dus de stappen beginnen telkens opnieuw.
  useEffect(() => {
    pincodeIsIngeschakeld().then(setHeeftPincode);
  }, [soort]);

  async function voerUit() {
    if (!soort) return;
    setStap("bezig");
    try {
      if (soort === "lokaal") {
        await verwijderLokaleData(); // laadt de pagina opnieuw
      } else {
        await verwijderOnlineData();
        setStap("klaar");
      }
    } catch (e) {
      setFout(e instanceof Error && e.message ? e.message : t.verwijderen.fout);
      setStap("controle");
    }
  }

  async function pincodeIngevoerd(waarde: string) {
    setPincode(waarde);
    setFout(null);
    if (waarde.length < 4) return;
    if (await controleerPincode(waarde)) {
      await voerUit();
    } else {
      setFout(t.verwijderen.foutPin);
      setPincode("");
    }
  }

  async function woordBevestigd() {
    if (woord.trim().toUpperCase() !== t.verwijderen.woord) {
      setFout(t.verwijderen.foutWoord);
      return;
    }
    await voerUit();
  }

  const titel = soort === "lokaal" ? t.verwijderen.lokaalKnop : t.verwijderen.onlineKnop;

  return (
    <Blad open={soort !== null} titel={titel} onSluit={stap === "bezig" ? () => undefined : onSluit}>
      {stap === "vraag" ? (
        <>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1.125rem" }}>{t.verwijderen.zeker}</p>
          <p style={{ margin: 0 }}>{soort === "lokaal" ? t.verwijderen.lokaalGevolg : t.verwijderen.onlineGevolg}</p>
          <Knop variant="secundair" onClick={() => void maakBackupBestand()}>{t.verwijderen.backupEerst}</Knop>
          <Knop variant="gevaar" onClick={() => setStap("controle")}>{t.verwijderen.jaVerwijder}</Knop>
          <Knop variant="tekst" onClick={onSluit}>{t.algemeen.annuleren}</Knop>
        </>
      ) : null}

      {stap === "controle" ? (
        <>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "1.125rem" }}>{t.verwijderen.bevestigTitel}</p>
          {heeftPincode ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ marginTop: 0 }}>{t.verwijderen.bevestigPin}</p>
              <Cijferpad waarde={pincode} onWijzig={pincodeIngevoerd} />
            </div>
          ) : (
            <>
              <p style={{ margin: 0 }}>{t.verwijderen.bevestigWoord(t.verwijderen.woord)}</p>
              <Invoerveld
                id="verwijder-woord"
                label={t.verwijderen.woord}
                value={woord}
                autoComplete="off"
                autoCapitalize="characters"
                onChange={(e) => {
                  setWoord(e.target.value);
                  setFout(null);
                }}
              />
              <Knop variant="gevaar" onClick={woordBevestigd} disabled={!woord.trim()}>{t.verwijderen.bevestigKnop}</Knop>
            </>
          )}
          {fout ? <p role="alert" style={{ margin: 0, color: "var(--kleur-fout)", fontWeight: 600 }}>{fout}</p> : null}
          <Knop variant="tekst" onClick={onSluit}>{t.algemeen.annuleren}</Knop>
        </>
      ) : null}

      {stap === "bezig" ? <p style={{ margin: 0 }}>{t.verwijderen.bezig}</p> : null}

      {stap === "klaar" ? (
        <>
          <p style={{ margin: 0, fontWeight: 700 }}>✓ {t.verwijderen.klaarOnline}</p>
          <p className="tekst-zwak" style={{ margin: 0 }}>{t.verwijderen.gepauzeerd}</p>
          <Knop onClick={onSluit}>{t.algemeen.klaar}</Knop>
        </>
      ) : null}
    </Blad>
  );
}

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { synchroniseerNu, laatsteSyncTijd, registreerAutomatischeSync } from "../lib/sync";
import { supabaseIsGeconfigureerd } from "../lib/supabase";
import { t, formatteerDatumTijd } from "../i18n";
import "./StatusBalk.css";

/**
 * Altijd zichtbare balk zodat de eigenaar nooit weken kan doorwerken zonder
 * te merken dat de synchronisatie vastzit — de belangrijkste eis achter het
 * "outbox"-ontwerp in het plan.
 */
export function StatusBalk() {
  const aantalOnverstuurd = useLiveQuery(() => db.uitgaand.count(), []) ?? 0;
  const [laatsteSync, setLaatsteSync] = useState<Date | null>(null);
  const [bezig, setBezig] = useState(false);

  useEffect(() => {
    laatsteSyncTijd().then(setLaatsteSync);
    if (!supabaseIsGeconfigureerd) return;
    return registreerAutomatischeSync(() => laatsteSyncTijd().then(setLaatsteSync));
  }, []);

  if (!supabaseIsGeconfigureerd) return null;

  async function handSync() {
    setBezig(true);
    await synchroniseerNu(true);
    setLaatsteSync(await laatsteSyncTijd());
    setBezig(false);
  }

  return (
    <div className={`statusbalk ${aantalOnverstuurd > 0 ? "statusbalk--wacht" : ""}`}>
      <span className="statusbalk-tekst">
        {aantalOnverstuurd > 0 ? t.sync.nogNietVerstuurd(aantalOnverstuurd) : t.instellingen.synchronisatieGelukt}
        {" · "}
        {laatsteSync ? t.sync.laatstGesynchroniseerd(formatteerDatumTijd(laatsteSync)) : t.sync.nooitGesynchroniseerd}
      </span>
      <button type="button" className="statusbalk-knop" onClick={handSync} disabled={bezig}>
        {bezig ? t.instellingen.bezigMetSynchroniseren : t.instellingen.nuSynchroniseren}
      </button>
    </div>
  );
}

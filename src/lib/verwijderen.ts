import Dexie from "dexie";
import { db, zetInstelling } from "../db/db";
import { DB_NAAM_DEMO, DB_NAAM_ECHT } from "./modus";
import { supabase } from "./supabase";
import { SLEUTEL_GEPAUZEERD } from "./sync";
import { t } from "../i18n";

/**
 * Wist alles wat deze app op dit apparaat bewaart: de hele lokale database
 * (formulieren, bedrijfsgegevens, locaties, pincode, instellingen), de
 * opgeslagen inlogsessie, de demogegevens en de taalkeuze. Daarna start de app opnieuw op.
 * Wat online staat blijft ongemoeid.
 */
export async function verwijderLokaleData(): Promise<void> {
  if (supabase) {
    try {
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      /* de sessie wordt hieronder sowieso gewist */
    }
  }
  // Ook de demo-database: dit is alles wat de app op dit apparaat bewaart.
  await db.delete();
  await Dexie.delete(DB_NAAM_ECHT);
  await Dexie.delete(DB_NAAM_DEMO);
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch {
    /* geen toegang tot opslag */
  }
  window.location.replace(window.location.pathname);
}

/**
 * Wist alle online gegevens van het bedrijf (via de server-functie
 * `verwijder_online_data`, zie supabase/migrations/0003). De inlog blijft
 * bestaan. Lokale gegevens blijven staan; automatische synchronisatie wordt
 * gepauzeerd zodat ze niet meteen weer online komen.
 */
export async function verwijderOnlineData(): Promise<void> {
  if (!supabase) throw new Error(t.sync.geenProject);
  if (!navigator.onLine) throw new Error(t.verwijderen.geenInternet);
  const { error } = await supabase.rpc("verwijder_online_data");
  if (error) throw error;
  await db.uitgaand.clear();
  await zetInstelling(SLEUTEL_GEPAUZEERD, "true");
}

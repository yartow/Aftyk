import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isDemo } from "./modus";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * `null` wanneer er geen Supabase-project is gekoppeld (bijv. tijdens lokale
 * ontwikkeling van de checklist-schermen, zie Fase 2 in het plan). De rest
 * van de app moet dit overal verdragen: invullen en opslaan werkt altijd
 * lokaal, synchronisatie is puur een bonus wanneer dit bestaat.
 */
/** In demo-modus is er bewust nooit een verbinding: demogegevens mogen nooit de echte database bereiken. */
export const supabase: SupabaseClient | null =
  url && anonKey && !isDemo()
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : null;

export const supabaseIsGeconfigureerd = supabase !== null;

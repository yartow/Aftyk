import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/global.css";
import { InstellingenProvider } from "./context/InstellingenContext";
import { AuthProvider } from "./context/AuthContext";
import { LocatieProvider } from "./context/LocatieContext";
import { synchroniseerNu } from "./lib/sync";
import { supabaseIsGeconfigureerd } from "./lib/supabase";
import { zaaiDemoData } from "./lib/demo";

// Vermindert de kans dat de browser lokale gegevens opruimt bij weinig
// opslagruimte — belangrijk omdat het tablet de enige bron van waarheid is
// totdat er gesynchroniseerd is. Zie ook de iPad/Safari-kanttekening in het
// deploy-plan: dit voorkomt géén opruiming bij 7+ dagen ongebruikte site,
// alleen bij ruimtedruk.
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {
    /* niet kritiek als dit mislukt */
  });
}

if (supabaseIsGeconfigureerd && navigator.onLine) {
  synchroniseerNu().catch(() => {
    /* stille mislukking bij opstarten is prima — de statusbalk toont dit */
  });
}

function toon() {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <InstellingenProvider>
        <AuthProvider>
          <LocatieProvider>
          <App />
          </LocatieProvider>
        </AuthProvider>
      </InstellingenProvider>
    </StrictMode>,
  );
}

// In demo-modus eerst de voorbeeldgegevens klaarzetten, zodat het eerste scherm meteen gevuld is.
zaaiDemoData().catch(() => undefined).then(toon);

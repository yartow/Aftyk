import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/global.css";
import { InstellingenProvider } from "./context/InstellingenContext";
import { AuthProvider } from "./context/AuthContext";
import { zaaiVoorbeeldgegevensIndienLeeg } from "./db/seed";
import { synchroniseerNu } from "./lib/sync";
import { supabaseIsGeconfigureerd } from "./lib/supabase";

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

zaaiVoorbeeldgegevensIndienLeeg().then(() => {
  if (supabaseIsGeconfigureerd && navigator.onLine) {
    synchroniseerNu().catch(() => {
      /* stille mislukking bij opstarten is prima — de statusbalk toont dit */
    });
  }
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <InstellingenProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </InstellingenProvider>
  </StrictMode>,
);

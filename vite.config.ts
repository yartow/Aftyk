import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  // Relatieve paden: de app werkt zowel in de root van een domein als in een submap (bijv. /Aftyk/).
  base: "./",
  plugins: [
    react(),
    VitePWA({
      // "prompt" i.p.v. automatische reload: een service-workerupdate mag
      // nooit ongevraagd het scherm verversen terwijl iemand middenin het
      // afvinken van een checklist zit.
      registerType: "prompt",
      includeAssets: ["icoon-32.png", "icoon-180.png"],
      manifest: {
        name: "Hygiënecode-registratie",
        short_name: "Hygiënecode",
        description: "Digitale hygiënecode-checklists, ook zonder internetverbinding.",
        lang: "nl",
        start_url: ".",
        display: "standalone",
        background_color: "#f7f8f7",
        theme_color: "#0f5e8c",
        icons: [
          { src: "icoon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icoon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icoon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
          { src: "icoon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // App-shell + gebouwde assets vooraf cachen zodat de app ook na een
        // koude start zonder netwerk volledig laadt.
        globPatterns: ["**/*.{js,css,html,png,svg,ico,webmanifest}"],
        navigateFallback: "index.html",
        // Nooit API-aanroepen naar Supabase cachen als "offline werkend
        // antwoord" — de outbox in Dexie is de enige offline-waarheid.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
});

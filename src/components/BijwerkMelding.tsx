import { useRegisterSW } from "virtual:pwa-register/react";
import { Knop } from "./Knop";

/**
 * Toont pas een update-knop als er echt een nieuwe versie klaarstaat — de
 * service worker ververst nooit uit zichzelf (registerType: "prompt" in
 * vite.config.ts), zodat een update nooit midden in het invullen van een
 * checklist het scherm wegtrekt.
 */
export function BijwerkMelding() {
  const { needRefresh: [nieuweVersieBeschikbaar], updateServiceWorker } = useRegisterSW();

  if (!nieuweVersieBeschikbaar) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: "1rem",
        right: "1rem",
        bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))",
        zIndex: 50,
        background: "var(--kleur-oppervlak)",
        border: "0.125rem solid var(--kleur-primair)",
        borderRadius: "var(--radius)",
        padding: "var(--ruimte-m)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "var(--ruimte-m)",
        boxShadow: "var(--schaduw-kaart)",
      }}
    >
      <span>Er is een update beschikbaar.</span>
      <Knop onClick={() => updateServiceWorker(true)}>Nu bijwerken</Knop>
    </div>
  );
}

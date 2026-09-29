import { useEffect } from "react";
import { haalVergrendelMinuten } from "./vergrendeling";

const CONTROLE_INTERVAL_MS = 15_000;
const ACTIVITEIT_EVENTS = ["pointerdown", "keydown", "scroll", "touchstart"] as const;

/**
 * Vergrendelt de app na een tijd zonder aanraking. Zolang `actief` is (app
 * ontgrendeld) wordt de laatste activiteit bijgehouden; ook als het apparaat
 * uit slaap komt (tabblad weer zichtbaar) wordt direct gecontroleerd.
 */
export function useAutomatischVergrendelen(actief: boolean, vergrendel: () => void) {
  useEffect(() => {
    if (!actief) return;
    let laatste = Date.now();
    const activiteit = () => {
      laatste = Date.now();
    };
    const controleer = () => {
      // De instelling kan in Instellingen zijn gewijzigd; goedkoop opnieuw lezen.
      void haalVergrendelMinuten().then((m) => {
        if (Date.now() - laatste >= m * 60_000) vergrendel();
      });
    };
    const bijZichtbaar = () => {
      if (document.visibilityState === "visible") controleer();
    };

    for (const e of ACTIVITEIT_EVENTS) window.addEventListener(e, activiteit, { passive: true, capture: true });
    document.addEventListener("visibilitychange", bijZichtbaar);
    const timer = window.setInterval(controleer, CONTROLE_INTERVAL_MS);
    return () => {
      for (const e of ACTIVITEIT_EVENTS) window.removeEventListener(e, activiteit, { capture: true });
      document.removeEventListener("visibilitychange", bijZichtbaar);
      window.clearInterval(timer);
    };
  }, [actief, vergrendel]);
}

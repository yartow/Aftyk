import { useState } from "react";
import { Knop } from "./Knop";
import { t } from "../i18n";

const SLEUTEL = "installatieTipGezien";

/** iPhone/iPad in de browser (iPadOS meldt zich als Mac, maar heeft een touchscreen) — daar is er geen automatische installatiemelding. */
function isIosBrowser(): boolean {
  const ua = navigator.userAgent;
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const geinstalleerd = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return ios && !geinstalleerd;
}

function alGezien(): boolean {
  try {
    return localStorage.getItem(SLEUTEL) === "1";
  } catch {
    return false;
  }
}

/**
 * Eenmalig tipje op iOS: zet de app op het beginscherm. Safari wist de
 * lokale gegevens van een website na ~7 dagen zonder gebruik, een app op het
 * beginscherm niet.
 */
export function InstallatieTip() {
  const [zichtbaar, setZichtbaar] = useState(() => isIosBrowser() && !alGezien());
  if (!zichtbaar) return null;

  function sluit() {
    try {
      localStorage.setItem(SLEUTEL, "1");
    } catch {
      /* geen toegang tot localStorage — het tipje verdwijnt in elk geval nu */
    }
    setZichtbaar(false);
  }

  return (
    <div
      role="status"
      style={{
        position: "fixed",
        left: "1rem",
        right: "1rem",
        bottom: "calc(4.5rem + env(safe-area-inset-bottom, 0px))",
        zIndex: 40,
        background: "var(--kleur-oppervlak)",
        border: "0.125rem solid var(--kleur-primair)",
        borderRadius: "var(--radius)",
        padding: "var(--ruimte-m)",
        display: "flex",
        flexDirection: "column",
        gap: "var(--ruimte-s)",
        boxShadow: "var(--schaduw-kaart)",
      }}
    >
      <strong>{t.installatie.titel}</strong>
      <span>{t.installatie.uitleg}</span>
      <Knop onClick={sluit}>{t.installatie.begrepen}</Knop>
    </div>
  );
}

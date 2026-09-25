export function downloadBlob(blob: Blob, bestandsnaam: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = bestandsnaam;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function pdfBestand(blob: Blob, bestandsnaam: string): File {
  return new File([blob], bestandsnaam, { type: "application/pdf" });
}

/** Kan dit apparaat het bestand via het deelmenu delen (bijv. naar een mail-app)? */
export function kanBestandDelen(bestand: File): boolean {
  return !!navigator.canShare?.({ files: [bestand] });
}

/** Opent de PDF in een nieuw tabblad. Moet direct vanuit een klik worden aangeroepen. */
export function openBlob(blob: Blob): boolean {
  const url = URL.createObjectURL(blob);
  const venster = window.open(url, "_blank");
  // Niet meteen intrekken: het nieuwe tabblad heeft de URL nog nodig om te laden.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return venster !== null;
}

/**
 * Deelt het bestand via het deelmenu van het apparaat. Moet direct vanuit een
 * klik worden aangeroepen, anders blokkeert de browser het.
 */
export async function deelBestand(bestand: File, titel: string): Promise<"gedeeld" | "geannuleerd" | "fout"> {
  try {
    await navigator.share({ files: [bestand], title: titel });
    return "gedeeld";
  } catch (fout) {
    return (fout as DOMException).name === "AbortError" ? "geannuleerd" : "fout";
  }
}

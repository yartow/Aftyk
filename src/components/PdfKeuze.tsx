import { useEffect, useState } from "react";
import { Blad } from "./Blad";
import { Knop } from "./Knop";
import { deelBestand, downloadBlob, kanBestandDelen, openBlob, pdfBestand } from "../lib/deel";
import { t } from "../i18n";

interface PdfKeuzeProps {
  open: boolean;
  onSluit: () => void;
  maakPdf: () => Blob;
  bestandsnaam: string;
  titel: string;
}

interface Resultaat {
  blob: Blob;
  bestand: File;
  kanDelen: boolean;
}

/**
 * Keuzeblad na "PDF maken": openen, mailen (deelmenu) of opslaan. De PDF wordt
 * één keer gemaakt zodra het blad opent en voor alle drie de opties hergebruikt.
 */
export function PdfKeuze({ open, onSluit, maakPdf, bestandsnaam, titel }: PdfKeuzeProps) {
  const [pdf, setPdf] = useState<Resultaat | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPdf(null);
      setMelding(null);
      return;
    }
    try {
      const blob = maakPdf();
      const bestand = pdfBestand(blob, bestandsnaam);
      setPdf({ blob, bestand, kanDelen: kanBestandDelen(bestand) });
    } catch {
      setMelding(t.pdfKeuze.makenMislukt);
    }
    // maakPdf wordt bij elke render nieuw aangemaakt; alleen bij openen opnieuw genereren.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Geen async/await vóór navigator.share: de klik moet direct de share starten.
  function mail() {
    if (!pdf) return;
    void deelBestand(pdf.bestand, titel).then((uitkomst) => {
      if (uitkomst === "gedeeld") onSluit();
      else if (uitkomst === "fout") setMelding(t.pdfKeuze.delenMislukt);
    });
  }

  function openen() {
    if (!pdf) return;
    if (!openBlob(pdf.blob)) setMelding(t.pdfKeuze.openenMislukt);
  }

  function opslaan() {
    if (!pdf) return;
    downloadBlob(pdf.blob, bestandsnaam);
  }

  return (
    <Blad open={open} titel={t.pdfKeuze.titel} onSluit={onSluit}>
      <p style={{ margin: 0 }}>{t.pdfKeuze.vraag}</p>
      {!pdf && !melding ? <p className="tekst-zwak">{t.pdfKeuze.maken}</p> : null}
      {pdf ? (
        <>
          <Knop volledigeBreedte onClick={openen}>
            {t.pdfKeuze.openen}
          </Knop>
          {pdf.kanDelen ? (
            <Knop volledigeBreedte variant="secundair" onClick={mail}>
              {t.pdfKeuze.mailen}
            </Knop>
          ) : (
            <p className="tekst-zwak" style={{ margin: 0 }}>
              {t.pdfKeuze.delenNietMogelijk}
            </p>
          )}
          <Knop volledigeBreedte variant="secundair" onClick={opslaan}>
            {t.pdfKeuze.opslaan}
          </Knop>
        </>
      ) : null}
      {melding ? (
        <span className="veldfout" role="alert">
          {melding}
        </span>
      ) : null}
    </Blad>
  );
}

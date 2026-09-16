import { useState } from "react";
import { AppKop } from "../../components/AppKop";
import { Kaart } from "../../components/Kaart";
import { Knop } from "../../components/Knop";
import { db } from "../../db/db";
import { useAuth } from "../../context/AuthContext";
import { genereerCsv, downloadBlob } from "../../lib/csv";
import { werkdatumVan } from "../../lib/format";
import { t } from "../../i18n/nl";
import type { Correctie } from "../../types/domain";

function eenJaarGeleden(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return werkdatumVan(d);
}

export function ExporterenScherm() {
  const { organisatie } = useAuth();
  const [vanaf, setVanaf] = useState(eenJaarGeleden());
  const [totEnMet, setTotEnMet] = useState(werkdatumVan(new Date()));
  const [bezig, setBezig] = useState(false);

  async function haalGegevensOp() {
    const alles = await db.registraties.where("werkdatum").between(vanaf, totEnMet, true, true).toArray();
    const correctiesPerRegistratie = new Map<string, Correctie[]>();
    for (const registratie of alles) {
      const correcties = await db.correcties.where("registratieId").equals(registratie.id).toArray();
      correctiesPerRegistratie.set(registratie.id, correcties);
    }
    return { alles, correctiesPerRegistratie };
  }

  async function exporteerPdf() {
    if (!organisatie) return;
    setBezig(true);
    // Lazy geladen: jsPDF is fors qua bestandsgrootte en alleen nodig zodra
    // er daadwerkelijk wordt geëxporteerd — dit houdt de dagelijkse,
    // offline-kritieke schermen licht en snel opstartend.
    const { genereerJaaroverzichtPdf } = await import("../../lib/pdf");
    const { alles, correctiesPerRegistratie } = await haalGegevensOp();
    const blob = genereerJaaroverzichtPdf(organisatie, alles, correctiesPerRegistratie, new Date(vanaf), new Date(totEnMet));
    downloadBlob(blob, `hygienecode-${vanaf}-tot-${totEnMet}.pdf`);
    setBezig(false);
  }

  async function exporteerCsv() {
    setBezig(true);
    const { alles, correctiesPerRegistratie } = await haalGegevensOp();
    const blob = genereerCsv(alles, correctiesPerRegistratie);
    downloadBlob(blob, `hygienecode-${vanaf}-tot-${totEnMet}.csv`);
    setBezig(false);
  }

  return (
    <div className="app-scherm">
      <AppKop titel={t.exporteren.titel} terugNaar="/archief" />
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
        <p className="tekst-zwak" style={{ marginTop: 0 }}>{t.exporteren.uitleg}</p>
        <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontWeight: 600 }}>
            {t.exporteren.vanaf}
            <input type="date" className="invoerveld-input" value={vanaf} max={totEnMet} onChange={(e) => setVanaf(e.target.value)} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontWeight: 600 }}>
            {t.exporteren.totEnMet}
            <input
              type="date"
              className="invoerveld-input"
              value={totEnMet}
              min={vanaf}
              max={werkdatumVan(new Date())}
              onChange={(e) => setTotEnMet(e.target.value)}
            />
          </label>
        </Kaart>
        <Knop volledigeBreedte onClick={exporteerPdf} disabled={bezig}>
          {bezig ? t.exporteren.bezig : t.exporteren.alsPdf}
        </Knop>
        <Knop variant="secundair" volledigeBreedte onClick={exporteerCsv} disabled={bezig}>
          {bezig ? t.exporteren.bezig : t.exporteren.alsCsv}
        </Knop>
      </div>
    </div>
  );
}

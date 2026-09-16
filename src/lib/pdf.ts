import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Correctie, Organisatie, Registratie } from "../types/domain";
import { formatteerDatumKort, formatteerDatumTijd } from "../i18n/nl";

/**
 * PDF-export, volledig in de browser gegenereerd (ook offline bruikbaar).
 * Eén tabel per maand, met de bedrijfsgegevens boven elke pagina zodat een
 * losse pagina voor een inspecteur altijd te herleiden is naar de winkel.
 */
export function genereerJaaroverzichtPdf(
  organisatie: Organisatie,
  registraties: Registratie[],
  correctiesPerRegistratie: Map<string, Correctie[]>,
  vanaf: Date,
  totEnMet: Date,
): Blob {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const perMaand = groepeerPerMaand(registraties);
  const maandSleutels = Array.from(perMaand.keys()).sort();

  maandSleutels.forEach((maandSleutel, index) => {
    if (index > 0) doc.addPage();
    tekenKop(doc, organisatie, maandSleutel, vanaf, totEnMet);

    const rijen = perMaand.get(maandSleutel)!.map((registratie) => {
      const afgerond = registratie.antwoorden.filter(
        (a) => a.waardeBool === true || (a.type !== "vinkje" && (a.waardeGetal !== undefined || a.waardeTekst)),
      ).length;
      const opmerkingen = registratie.antwoorden.filter((a) => a.opmerking && a.opmerking.trim() !== "").length;
      const correcties = correctiesPerRegistratie.get(registratie.id)?.length ?? 0;
      const labels: string[] = [];
      if (registratie.isInhaalregistratie) labels.push("inhaal");
      if (correcties > 0) labels.push(`${correcties} correctie${correcties > 1 ? "s" : ""}`);

      return [
        formatteerDatumKort(new Date(registratie.werkdatum)),
        registratie.sjabloonNaam,
        registratie.gebruikerNaam,
        formatteerDatumTijd(new Date(registratie.apparaatTijd)),
        `${afgerond}/${registratie.antwoorden.length}`,
        opmerkingen > 0 ? String(opmerkingen) : "–",
        labels.join(", ") || "–",
      ];
    });

    autoTable(doc, {
      startY: 90,
      head: [["Datum", "Checklist", "Ingevuld door", "Tijd (tablet)", "Afgerond", "Opmerkingen", "Bijzonderheden"]],
      body: rijen,
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [15, 94, 140] },
      didDrawPage: () => tekenKop(doc, organisatie, maandSleutel, vanaf, totEnMet),
      margin: { top: 90 },
    });
  });

  if (maandSleutels.length === 0) {
    tekenKop(doc, organisatie, "", vanaf, totEnMet);
    doc.setFontSize(11);
    doc.text("Geen registraties gevonden in de gekozen periode.", 40, 110);
  }

  return doc.output("blob");
}

function tekenKop(doc: jsPDF, organisatie: Organisatie, maandLabel: string, vanaf: Date, totEnMet: Date): void {
  doc.setFontSize(14);
  doc.setTextColor(15, 94, 140);
  doc.text(organisatie.naam || "Hygiënecode-registratie", 40, 35);

  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const adresregel = [organisatie.adres, `${organisatie.postcode} ${organisatie.plaats}`.trim()]
    .filter(Boolean)
    .join(" — ");
  doc.text(adresregel, 40, 50);
  if (organisatie.kvkNummer) doc.text(`KvK: ${organisatie.kvkNummer}`, 40, 63);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `Periode: ${formatteerDatumKort(vanaf)} t/m ${formatteerDatumKort(totEnMet)}${maandLabel ? `  —  ${leesbareMaand(maandLabel)}` : ""}`,
    40,
    78,
  );
  doc.setDrawColor(199, 204, 208);
  doc.line(40, 84, 555, 84);
}

function groepeerPerMaand(registraties: Registratie[]): Map<string, Registratie[]> {
  const kaart = new Map<string, Registratie[]>();
  const gesorteerd = [...registraties].sort((a, b) => a.werkdatum.localeCompare(b.werkdatum));
  for (const registratie of gesorteerd) {
    const sleutel = registratie.werkdatum.slice(0, 7); // YYYY-MM
    if (!kaart.has(sleutel)) kaart.set(sleutel, []);
    kaart.get(sleutel)!.push(registratie);
  }
  return kaart;
}

function leesbareMaand(jaarMaand: string): string {
  const [jaar, maand] = jaarMaand.split("-").map(Number);
  return new Date(jaar, maand - 1, 1).toLocaleDateString("nl-NL", { month: "long", year: "numeric" });
}

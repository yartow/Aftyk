import { jsPDF } from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";
import logoDataUrl from "../assets/visdetailhandel-logo.jpg?inline";
import type { PdfBron } from "../context/LocatieContext";
import type {
  LeveranciersConfig,
  LeveranciersMaand,
  SchoonmaakConfig,
  SchoonmaakMaand,
  SchoonmaakWeek,
  VO,
  Weekformulier,
} from "../types/domain";
import { dagenVanWeek, maandLabel, weekLabel, weekdagen } from "./kalender";
import { FREQUENTIE_NAMEN, methodeTekst, middelNaam, objectNaam } from "./schoonmaakDefaults";
import { CCP_PROCESSEN, OPSLAG_EENHEDEN, ccpAfwijking, grensTekst, opslagAfwijking } from "./weekformulierDefaults";
import { adresRegel } from "./locaties";
import { formatteerDatumKort, t } from "../i18n";

/**
 * PDF's worden volledig in de browser gemaakt (ook offline bruikbaar). Elke
 * pagina krijgt het logo, de bedrijfsnaam en het adres van de locatie
 * bovenaan, zodat een losse pagina voor de inspecteur altijd te herleiden is
 * naar de juiste vestiging.
 */

const BLAUW: [number, number, number] = [15, 94, 140];
const LOGO_BREEDTE = 44;
const LOGO_HOOGTE = (LOGO_BREEDTE * 254) / 241;
const MARGE = 36;
const KOP_HOOGTE = 100;

/** De standaard PDF-lettertypen kennen geen ≤ ≥ ✓ — vervang die door leesbare tekens. */
function pdfTekst(tekst: string): string {
  return tekst.replace(/≤/g, "<=").replace(/≥/g, ">=").replace(/✓/g, "X").replace(/→/g, "->").replace(/’/g, "'");
}

function datumKort(iso: string): string {
  return iso ? formatteerDatumKort(new Date(`${iso}T00:00:00`)) : "";
}

/** V/O wordt in de gekozen taal als V/O of OK/NG getoond. */
function voTekst(v: VO): string {
  if (!v) return "";
  return (v === "V" ? t.weekformulier.voldoet : t.weekformulier.onvoldoende).split(" ")[0];
}

/** Bestandsnaam met (bij meerdere locaties) de locatienaam erin. */
export function pdfBestandsnaam(bron: PdfBron, soort: "schoonmaak" | "week" | "leveranciers", sleutel: string): string {
  const basis = soort === "schoonmaak" ? t.pdf.bestandSchoonmaak : soort === "week" ? t.pdf.bestandWeek : t.pdf.bestandLeveranciers;
  const locatie = bron.metLocatieNaam && bron.locatie ? `-${bron.locatie.naam.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : "";
  return `${basis}${locatie}-${sleutel}.pdf`;
}

function nieuwDocument(orientatie: "portrait" | "landscape", bron: PdfBron, titel: string, periode: string) {
  const { organisatie, locatie, metLocatieNaam } = bron;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: orientatie });
  const breedte = doc.internal.pageSize.getWidth();
  const getekend = new Set<number>();

  // Adres van de vestiging; bij een lege locatie het bezoekadres van het hoofdkantoor.
  const locatieAdres = locatie && (locatie.adres || locatie.plaats) ? locatie : organisatie;
  const adres = adresRegel(locatieAdres);
  const locatieRegel = [metLocatieNaam && locatie ? `${t.pdf.locatie}: ${locatie.naam}` : "", adres].filter(Boolean).join(" – ");

  function tekenKop() {
    const pagina = doc.getCurrentPageInfo().pageNumber;
    if (getekend.has(pagina)) return;
    getekend.add(pagina);

    doc.addImage(logoDataUrl, "JPEG", MARGE, 24, LOGO_BREEDTE, LOGO_HOOGTE);
    const tekstX = MARGE + LOGO_BREEDTE + 12;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...BLAUW);
    doc.text(pdfTekst(organisatie.naam || t.pdf.bedrijfsnaamLeeg), tekstX, 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    if (locatieRegel) doc.text(pdfTekst(locatieRegel), tekstX, 53);
    if (organisatie.kvkNummer) doc.text(`${t.pdf.kvk}: ${organisatie.kvkNummer}`, tekstX, 65);

    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0, 0, 0);
    doc.text(pdfTekst(titel), breedte - MARGE, 40, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(pdfTekst(periode), breedte - MARGE, 55, { align: "right" });

    doc.setDrawColor(199, 204, 208);
    doc.line(MARGE, KOP_HOOGTE - 12, breedte - MARGE, KOP_HOOGTE - 12);
  }

  tekenKop();
  const tabel = (opties: Parameters<typeof autoTable>[1]) =>
    autoTable(doc, {
      margin: { top: KOP_HOOGTE, left: MARGE, right: MARGE, bottom: 40 },
      styles: { fontSize: 8.5, cellPadding: 4, lineColor: [199, 204, 208], lineWidth: 0.5, textColor: 20 },
      headStyles: { fillColor: BLAUW, textColor: 255 },
      didDrawPage: tekenKop,
      ...opties,
    });
  const eindY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
  function kopje(tekst: string, y: number): number {
    if (y > doc.internal.pageSize.getHeight() - 90) {
      doc.addPage();
      tekenKop();
      y = KOP_HOOGTE;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...BLAUW);
    doc.text(pdfTekst(tekst), MARGE, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    return y + 14;
  }

  return { doc, tabel, eindY, kopje, breedte };
}

export function maakSchoonmaakplanPdf(
  bron: PdfBron,
  config: SchoonmaakConfig,
  maandag: Date,
  week: SchoonmaakWeek,
  maandDoc: SchoonmaakMaand,
): Blob {
  const { titel: weekTitel, periode } = weekLabel(maandag);
  const { doc, tabel, eindY, breedte } = nieuwDocument("landscape", bron, t.pdf.schoonmaakplan, `${weekTitel} (${periode})`);

  const dagen = dagenVanWeek(maandag);
  const kop: RowInput[] = [
    [
      { content: t.pdf.kolObject, rowSpan: 2 },
      { content: t.pdf.kolMethode, rowSpan: 2 },
      { content: t.pdf.kolFreq, rowSpan: 2 },
      { content: t.pdf.uitgevoerdOpKop, colSpan: 7, styles: { halign: "center" } },
    ],
    dagen.map((d, i) => `${weekdagen()[i]} ${d.getDate()}`),
  ];

  const rijen: RowInput[] = config.objecten.map((o) => {
    const basis = [{ content: objectNaam(o), styles: { fontStyle: "bold" as const } }, methodeTekst(o).replace(/\n/, "  /  "), o.frequentie ?? ""];
    if (o.frequentie === "M") {
      const datum = maandDoc.datums[o.id];
      return [...basis, { content: datum ? `${t.pdf.uitgevoerdOp} ${datumKort(datum)}` : t.pdf.uitgevoerdOp, colSpan: 7 }];
    }
    const vinkjes = week.dagen[o.id] ?? [];
    return [
      ...basis,
      ...dagen.map((_, i) => ({
        content: vinkjes[i] ? "X" : "",
        styles: { halign: "center" as const, fontStyle: "bold" as const, fillColor: vinkjes[i] ? ([214, 236, 220] as [number, number, number]) : undefined },
      })),
    ];
  });

  tabel({
    head: kop,
    body: rijen,
    startY: 100,
    columnStyles: { 0: { cellWidth: 150 }, 1: { cellWidth: 130 }, 2: { cellWidth: 35, halign: "center" } },
  });

  // Legenda
  let y = eindY() + 20;
  if (y > doc.internal.pageSize.getHeight() - 160) {
    doc.addPage();
    y = KOP_HOOGTE;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BLAUW);
  doc.text(t.pdf.legenda, MARGE, y);
  tabel({
    head: [[t.schoonmaak.kolCode, t.schoonmaak.kolMiddel, t.schoonmaak.kolDosering, t.schoonmaak.kolInwerktijd, t.schoonmaak.kolNaspoelen]],
    body: config.middelen.map((m) => [String(m.code), middelNaam(m), m.dosering, m.inwerktijd, m.naspoelen]),
    startY: y + 6,
    tableWidth: 520,
  });
  y = eindY() + 14;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  const letOp = `${t.schoonmaak.letOpKop} `;
  doc.text(pdfTekst(letOp), MARGE, y);
  doc.setFont("helvetica", "normal");
  const regels = doc.splitTextToSize(pdfTekst(t.schoonmaak.letOpTekst), breedte - 2 * MARGE - doc.getTextWidth(letOp));
  doc.text(regels, MARGE + doc.getTextWidth(letOp), y);
  y += regels.length * 11 + 6;
  doc.text(pdfTekst(Object.entries(FREQUENTIE_NAMEN).map(([k, v]) => `${k} = ${v}`).join("      ")), MARGE, y);

  return doc.output("blob");
}

export function maakWeekformulierPdf(bron: PdfBron, maandag: Date, formulier: Weekformulier): Blob {
  const { titel, periode } = weekLabel(maandag);
  const { doc, tabel, eindY, kopje } = nieuwDocument("landscape", bron, t.pdf.weekformulier, `${titel} (${periode})`);
  const w = t.weekformulier;
  const afwijkingStijl = { fontStyle: "bold" as const, textColor: [138, 31, 43] as [number, number, number] };

  let y = kopje(t.pdf.ontvangst, 92);
  tabel({
    startY: y,
    head: [[w.datum, w.leverancier, w.product, t.pdf.kolTemp, t.pdf.kolVerpakking, t.pdf.kolTht, w.paraaf, w.actie]],
    body: formulier.ontvangst.length
      ? formulier.ontvangst.map((r) => [datumKort(r.datum), r.leverancier, r.product, r.temperatuur, voTekst(r.verpakking), voTekst(r.tht), r.paraaf, r.actie])
      : [[{ content: t.pdf.geenAfwijkingen, colSpan: 8, styles: { fontStyle: "italic" as const } }]],
  });

  y = kopje(t.pdf.opslag, eindY() + 18);
  tabel({
    startY: y,
    head: [[w.kolOpslag, w.kolNorm, w.datum, t.pdf.kolTemp, t.pdf.kolAfgedekt, t.pdf.kolFifo, w.paraaf, w.actie]],
    body: OPSLAG_EENHEDEN.map((e) => {
      const r = formulier.opslag[e.id];
      const afwijking = r ? opslagAfwijking(e, r.temperatuur) : false;
      return [
        e.naam,
        grensTekst(e),
        datumKort(r?.datum ?? ""),
        { content: (r?.temperatuur ?? "") + (afwijking ? `  (${t.pdf.afwijkingHoofdletters})` : ""), styles: afwijking ? afwijkingStijl : {} },
        e.afgedektNvt ? w.nvt : voTekst(r?.afgedekt ?? null),
        voTekst(r?.fifoTht ?? null),
        r?.paraaf ?? "",
        r?.actie ?? "",
      ];
    }),
  });

  y = kopje(t.pdf.processen, eindY() + 18);
  tabel({
    startY: y,
    head: [[w.kolProces, w.kolNorm, w.datum, w.product, w.kolWaarde, w.kolMinuten, w.paraaf, w.actie]],
    body: CCP_PROCESSEN.map((p) => {
      const r = formulier.ccps[p.id];
      const afwijking = ccpAfwijking(p, r);
      return [
        p.naam,
        p.grensTekst,
        datumKort(r?.datum ?? ""),
        r?.product ?? "",
        { content: r?.waarde ? `${r.waarde} ${p.waardeLabel}${afwijking ? `  (${t.pdf.afwijkingHoofdletters})` : ""}` : "", styles: afwijking ? afwijkingStijl : {} },
        p.metMinuten ? (r?.minuten ?? "") : "-",
        r?.paraaf ?? "",
        r?.actie ?? "",
      ];
    }),
  });

  y = eindY() + 22;
  doc.setFontSize(10);
  doc.text(
    pdfTekst(`${t.pdf.beoordeeld}: ${formulier.beoordeeldDoor || "................................"}   ${w.datum}: ${datumKort(formulier.beoordeeldOp) || "................"}`),
    36,
    y,
  );
  return doc.output("blob");
}

export function maakLeveranciersPdf(bron: PdfBron, maand: Date, config: LeveranciersConfig, maandDoc: LeveranciersMaand): Blob {
  const { doc, tabel } = nieuwDocument("landscape", bron, t.pdf.leveranciers, maandLabel(maand));
  const l = t.leveranciers;
  const betrouwbaarheid = { goed: l.goed, matig: l.matig, slecht: l.slecht } as const;
  const conclusie = { goedgekeurd: l.goedgekeurd, voorwaardelijk: l.voorwaardelijk, afgekeurd: l.afgekeurd } as const;

  tabel({
    startY: 92,
    head: [[l.kolLeverancier, t.pdf.kolCertificaat, t.pdf.kolVerloop, t.pdf.kolBetrouwbaarheid, t.pdf.kolOpmerking, t.pdf.kolConclusie]],
    body: config.leveranciers
      .filter((lev) => !lev.gearchiveerd)
      .map((lev) => {
        const b = maandDoc.beoordelingen[lev.id];
        return [
          lev.naam,
          b?.certificaat === true ? t.algemeen.ja : b?.certificaat === false ? t.algemeen.nee : "",
          datumKort(b?.verloopdatum ?? ""),
          b?.betrouwbaarheid ? betrouwbaarheid[b.betrouwbaarheid] : "",
          b?.opmerking ?? "",
          b?.conclusie ? conclusie[b.conclusie] : "",
        ];
      }),
    columnStyles: { 0: { fontStyle: "bold" } },
  });
  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(pdfTekst(l.versiedatum), 36, doc.internal.pageSize.getHeight() - 20);
  return doc.output("blob");
}

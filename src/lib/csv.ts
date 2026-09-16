import type { Correctie, Registratie } from "../types/domain";
import { formatteerDatumTijd } from "../i18n/nl";

/**
 * CSV-export: één rij per beantwoord punt, zodat de volledige inhoud
 * (inclusief opmerkingen) in een spreadsheet te doorzoeken is — bedoeld als
 * aanvulling op de overzichtelijkere PDF-export.
 */
export function genereerCsv(registraties: Registratie[], correctiesPerRegistratie: Map<string, Correctie[]>): Blob {
  const kop = [
    "Werkdatum",
    "Checklist",
    "Ingevuld door",
    "Tijd op tablet",
    "Ontvangen op server",
    "Inhaalregistratie",
    "Vraag",
    "Antwoord",
    "Opmerking",
    "Correcties",
  ];

  const regels = [kop.map(csvVeld).join(";")];

  const gesorteerd = [...registraties].sort((a, b) => a.werkdatum.localeCompare(b.werkdatum));
  for (const registratie of gesorteerd) {
    const correcties = correctiesPerRegistratie.get(registratie.id) ?? [];
    const correctieTekst = correcties
      .map((c) => `${formatteerDatumTijd(new Date(c.aangemaaktOp))} (${c.gebruikerNaam}): ${c.toelichting}`)
      .join(" | ");

    for (const antwoord of registratie.antwoorden) {
      const waarde =
        antwoord.type === "vinkje"
          ? antwoord.waardeBool
            ? "Gedaan"
            : "Niet gedaan"
          : antwoord.type === "temperatuur"
            ? (antwoord.waardeGetal !== undefined ? `${antwoord.waardeGetal} °C` : "")
            : (antwoord.waardeTekst ?? "");

      regels.push(
        [
          registratie.werkdatum,
          registratie.sjabloonNaam,
          registratie.gebruikerNaam,
          formatteerDatumTijd(new Date(registratie.apparaatTijd)),
          registratie.ontvangenOp ? formatteerDatumTijd(new Date(registratie.ontvangenOp)) : "nog niet gesynchroniseerd",
          registratie.isInhaalregistratie ? "Ja" : "Nee",
          antwoord.itemTekst,
          waarde,
          antwoord.opmerking ?? "",
          correctieTekst,
        ]
          .map(csvVeld)
          .join(";"),
      );
    }
  }

  // BOM zodat Excel op Windows het bestand herkent als UTF-8.
  return new Blob(["﻿" + regels.join("\r\n")], { type: "text/csv;charset=utf-8" });
}

function csvVeld(waarde: string): string {
  const tekst = waarde ?? "";
  if (/[";\r\n]/.test(tekst)) {
    return `"${tekst.replace(/"/g, '""')}"`;
  }
  return tekst;
}

export function downloadBlob(blob: Blob, bestandsnaam: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = bestandsnaam;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

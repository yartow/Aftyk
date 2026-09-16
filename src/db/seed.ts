import { db } from "./db";
import type { Sjabloon, SjabloonItem } from "../types/domain";

/**
 * Tijdelijke voorbeeldchecklists voor een visdetailhandel, zodat de app
 * volledig te gebruiken en te beoordelen is voordat de definitieve
 * hygiënecode-lijst is aangeleverd. Zet `actief: false` (of verwijder de
 * rij) zodra de echte lijst via het Supabase-dashboard is ingevoerd — de
 * app haalt sjablonen dan van de server in plaats van deze voorbeelden.
 *
 * Let op de twee soorten items: "vinkje" voor gewone afvinkpunten en
 * "temperatuur" voor koeling/vriezer-metingen, die de hygiënecode voor
 * visverkoop vrijwel zeker vereist naast de losse afvinkpunten.
 */
const VOORBEELD_SJABLONEN: Array<{ sjabloon: Sjabloon; items: Omit<SjabloonItem, "sjabloonId">[] }> = [
  {
    sjabloon: {
      id: "voorbeeld-dagelijks",
      organisatieId: null,
      naam: "Dagelijkse schoonmaak",
      frequentie: "dagelijks",
      versie: 1,
      actief: true,
    },
    items: [
      { id: "d1", volgorde: 1, tekst: "Snijplanken en messen gereinigd en gedesinfecteerd", type: "vinkje", verplicht: true },
      { id: "d2", volgorde: 2, tekst: "Werkblad en toonbank gereinigd", type: "vinkje", verplicht: true },
      { id: "d3", volgorde: 3, tekst: "Visschalen en display gereinigd", type: "vinkje", verplicht: true },
      { id: "d4", volgorde: 4, tekst: "Weegschaal gereinigd", type: "vinkje", verplicht: true },
      { id: "d5", volgorde: 5, tekst: "Vloer gereinigd en droog", type: "vinkje", verplicht: true },
      { id: "d6", volgorde: 6, tekst: "Afvalbakken geleegd en gereinigd", type: "vinkje", verplicht: true },
      {
        id: "d7",
        volgorde: 7,
        tekst: "Temperatuur koelvitrine",
        type: "temperatuur",
        verplicht: true,
        hulptekst: "Moet 4°C of lager zijn",
      },
      {
        id: "d8",
        volgorde: 8,
        tekst: "Temperatuur vriezer",
        type: "temperatuur",
        verplicht: true,
        hulptekst: "Moet -18°C of lager zijn",
      },
      { id: "d9", volgorde: 9, tekst: "Handen gewassen voor aanvang werk", type: "vinkje", verplicht: true },
    ],
  },
  {
    sjabloon: {
      id: "voorbeeld-wekelijks",
      organisatieId: null,
      naam: "Wekelijkse schoonmaak",
      frequentie: "wekelijks",
      versie: 1,
      actief: true,
    },
    items: [
      { id: "w1", volgorde: 1, tekst: "Koelvitrine volledig ontdooid en gereinigd", type: "vinkje", verplicht: true },
      { id: "w2", volgorde: 2, tekst: "Voorraadkoeling gereinigd", type: "vinkje", verplicht: true },
      { id: "w3", volgorde: 3, tekst: "Muren en tegels achter werkplek gereinigd", type: "vinkje", verplicht: true },
      { id: "w4", volgorde: 4, tekst: "Afvoerputjes gereinigd en gecontroleerd", type: "vinkje", verplicht: true },
      { id: "w5", volgorde: 5, tekst: "Schoonmaakmaterialen gecontroleerd en zo nodig vervangen", type: "vinkje", verplicht: false },
    ],
  },
  {
    sjabloon: {
      id: "voorbeeld-maandelijks",
      organisatieId: null,
      naam: "Maandelijkse controle",
      frequentie: "maandelijks",
      versie: 1,
      actief: true,
    },
    items: [
      { id: "m1", volgorde: 1, tekst: "Ongediertecontrole uitgevoerd", type: "vinkje", verplicht: true },
      { id: "m2", volgorde: 2, tekst: "Houdbaarheidsdata voorraad gecontroleerd", type: "vinkje", verplicht: true },
      { id: "m3", volgorde: 3, tekst: "Thermometers gekalibreerd/gecontroleerd", type: "vinkje", verplicht: true },
      { id: "m4", volgorde: 4, tekst: "Ventilatie- en afzuigsysteem gereinigd", type: "vinkje", verplicht: false },
    ],
  },
];

export async function zaaiVoorbeeldgegevensIndienLeeg(): Promise<void> {
  const aantal = await db.sjablonen.count();
  if (aantal > 0) return;

  for (const { sjabloon, items } of VOORBEELD_SJABLONEN) {
    await db.sjablonen.put(sjabloon);
    for (const item of items) {
      await db.sjabloonItems.put({ ...item, sjabloonId: sjabloon.id });
    }
  }
}

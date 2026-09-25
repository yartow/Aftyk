import Dexie from "dexie";
import { db } from "../db/db";

/** Instellingen die bij het apparaat horen, niet bij een gebruiker: die blijven staan bij een wissel. */
const BLIJFT_OP_APPARAAT = new Set(["pincode_hash", "pincode_ingeschakeld", "tekstgrootte", "thema"]);

function bewaardeDb(gebruikerId: string): Dexie {
  const bewaard = new Dexie(`${db.name}-bewaard-${gebruikerId}`);
  bewaard.version(1).stores({
    organisaties: "id",
    profielen: "id",
    locaties: "id",
    documenten: "id",
    uitgaand: "id",
    instellingen: "sleutel",
  });
  return bewaard;
}

async function wissel(gebruikerId: string): Promise<boolean> {
  const huidig = await db.profielen.toCollection().first();
  // Geen lokale gegevens, al van deze gebruiker, of aangemaakt zonder account (lokale modus): niets te wisselen.
  if (!huidig || huidig.id === gebruikerId || huidig.id.startsWith("lokaal-")) return false;

  const TABELLEN = ["organisaties", "profielen", "locaties", "documenten", "uitgaand"] as const;
  // Let op: binnen een transactie mag je niet uit een andere database lezen (dan sluit
  // IndexedDB de transactie). Daarom worden alle gegevens eerst ingelezen.

  // 1. De gegevens van de vorige gebruiker veilig opzij zetten (eerst schrijven, dan pas wissen).
  const vorigeGegevens = new Map<string, unknown[]>();
  for (const naam of TABELLEN) vorigeGegevens.set(naam, await db.table(naam).toArray());
  const instellingenVorige = (await db.instellingen.toArray()).filter((i) => !BLIJFT_OP_APPARAAT.has(i.sleutel));
  const vorige = bewaardeDb(huidig.id);
  await vorige.open();
  await vorige.transaction("rw", vorige.tables, async () => {
    for (const naam of TABELLEN) {
      await vorige.table(naam).clear();
      await vorige.table(naam).bulkPut(vorigeGegevens.get(naam)!);
    }
    await vorige.table("instellingen").clear();
    await vorige.table("instellingen").bulkPut(instellingenVorige);
  });
  vorige.close();

  // 2. Eventuele eerder opzij gezette gegevens van de nieuwe gebruiker terugzetten.
  const eigenNaam = `${db.name}-bewaard-${gebruikerId}`;
  const eigenGegevens = new Map<string, unknown[]>();
  let eigenInstellingen: { sleutel: string; waarde: string }[] = [];
  if (await Dexie.exists(eigenNaam)) {
    const eigen = bewaardeDb(gebruikerId);
    await eigen.open();
    for (const naam of TABELLEN) eigenGegevens.set(naam, await eigen.table(naam).toArray());
    eigenInstellingen = await eigen.table("instellingen").toArray();
    eigen.close();
  }
  await db.transaction("rw", [db.organisaties, db.profielen, db.locaties, db.documenten, db.uitgaand, db.instellingen], async () => {
    for (const naam of TABELLEN) {
      await db.table(naam).clear();
      const rijen = eigenGegevens.get(naam);
      if (rijen?.length) await db.table(naam).bulkPut(rijen);
    }
    for (const rij of instellingenVorige) await db.instellingen.delete(rij.sleutel);
    if (eigenInstellingen.length) await db.instellingen.bulkPut(eigenInstellingen);
  });
  await Dexie.delete(eigenNaam); // no-op als hij niet bestond
  return true;
}

let keten: Promise<unknown> = Promise.resolve();

/**
 * Zorgt dat de lokale database alleen gegevens van de ingelogde gebruiker toont.
 * Logt een andere gebruiker in op hetzelfde apparaat, dan worden de gegevens van
 * de vorige gebruiker opzij gezet (niet gewist) en bij diens volgende login teruggezet.
 * Aanroepen worden na elkaar uitgevoerd, zodat twee gelijktijdige logins elkaar niet in de weg zitten.
 * Geeft true terug als de lokale gegevens zijn gewisseld.
 */
export function zorgVoorEigenLokaleData(gebruikerId: string): Promise<boolean> {
  const uitkomst = keten.then(() => wissel(gebruikerId));
  keten = uitkomst.catch(() => undefined);
  return uitkomst;
}

import { useCallback, useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";
import { useLocatie } from "../context/LocatieContext";
import type { Document, DocumentSoort } from "../types/domain";

export function documentId(soort: DocumentSoort, locatieId: string, sleutel: string): string {
  return `${soort}:${locatieId}:${sleutel}`;
}

/** Slaat een document lokaal op en zet het klaar voor synchronisatie. */
export async function bewaarDocument<T>(
  locatieId: string,
  soort: DocumentSoort,
  sleutel: string,
  inhoud: T,
  tijd = new Date().toISOString(),
): Promise<void> {
  const id = documentId(soort, locatieId, sleutel);
  await db.transaction("rw", [db.documenten, db.uitgaand], async () => {
    await db.documenten.put({ id, locatieId, soort, sleutel, inhoud, bijgewerktOp: tijd });
    await db.uitgaand.put({ id, pogingen: 0, aangemaaktOp: tijd });
  });
}

interface Lokaal<T> {
  id: string;
  waarde: T;
  tijd: string;
}

/**
 * Leest een document en geeft een setter die direct opslaat (autosave).
 * `standaard` wordt gebruikt zolang er nog niets is opgeslagen. Geeft `null`
 * terug zolang de database nog laadt.
 *
 * Een wijziging is meteen zichtbaar (lokale kopie) en wordt weggegooid zodra
 * de database-query de opgeslagen versie heeft ingehaald, zodat twee snelle
 * tikken elkaar nooit overschrijven.
 */
export function useDocument<T>(
  soort: DocumentSoort,
  sleutel: string,
  standaard: () => T,
): { waarde: T | null; wijzig: (aanpassing: (huidig: T) => T) => void } {
  const { actieveLocatieId } = useLocatie();
  const locatieId = actieveLocatieId ?? "";
  const id = documentId(soort, locatieId, sleutel);
  // `undefined` = nog aan het laden, `null` = bestaat niet.
  const rij = useLiveQuery(async () => (await db.documenten.get(id)) ?? null, [id]);
  const [lokaal, setLokaal] = useState<Lokaal<T> | null>(null);
  const lokaalRef = useRef<Lokaal<T> | null>(null);
  const opgeslagenRef = useRef<{ waarde: T; tijd: string } | null>(null);

  const opgeslagen = rij === undefined || !actieveLocatieId ? null : rij ? (rij.inhoud as T) : standaard();
  const opgeslagenTijd = rij?.bijgewerktOp ?? "";

  useEffect(() => {
    opgeslagenRef.current = opgeslagen === null ? null : { waarde: opgeslagen, tijd: opgeslagenTijd };
  });

  /** De lokale kopie geldt zolang de database nog niet minstens even recent is. */
  const geldig = (l: Lokaal<T> | null, tijdInDb: string): l is Lokaal<T> => !!l && l.id === id && tijdInDb < l.tijd;

  const wijzig = useCallback(
    (aanpassing: (huidig: T) => T) => {
      const db_ = opgeslagenRef.current;
      if (!db_) return;
      const l = lokaalRef.current;
      const basis = l && l.id === id && db_.tijd < l.tijd ? l.waarde : db_.waarde;
      const nieuw = aanpassing(basis);
      const tijd = new Date().toISOString();
      const nieuweLokaal = { id, waarde: nieuw, tijd };
      lokaalRef.current = nieuweLokaal;
      setLokaal(nieuweLokaal);
      bewaarDocument(locatieId, soort, sleutel, nieuw, tijd);
    },
    [id, locatieId, soort, sleutel],
  );

  if (opgeslagen === null) return { waarde: null, wijzig };
  return { waarde: geldig(lokaal, opgeslagenTijd) ? lokaal.waarde : opgeslagen, wijzig };
}

export async function haalDocument<T>(locatieId: string, soort: DocumentSoort, sleutel: string): Promise<T | undefined> {
  const rij: Document | undefined = await db.documenten.get(documentId(soort, locatieId, sleutel));
  return rij?.inhoud as T | undefined;
}

import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { AppKop } from "../../components/AppKop";
import { Kaart } from "../../components/Kaart";
import { Knop } from "../../components/Knop";
import { Selectievakje } from "../../components/Selectievakje";
import { OpmerkingVeld } from "./OpmerkingVeld";
import { useAuth } from "../../context/AuthContext";
import { nieuweId } from "../../lib/id";
import { vandaagAlsWerkdatum, isVandaag } from "../../lib/format";
import { t } from "../../i18n/nl";
import type { AntwoordInvoer } from "../../types/domain";

type AntwoordStatus = Record<string, AntwoordInvoer>;

export function ChecklistScherm() {
  const { sjabloonId } = useParams<{ sjabloonId: string }>();
  const navigate = useNavigate();
  const { organisatie, profiel } = useAuth();

  const sjabloon = useLiveQuery(() => (sjabloonId ? db.sjablonen.get(sjabloonId) : undefined), [sjabloonId]);
  const items = useLiveQuery(
    () => (sjabloonId ? db.sjabloonItems.where("sjabloonId").equals(sjabloonId).sortBy("volgorde") : []),
    [sjabloonId],
  );

  const [werkdatum, setWerkdatum] = useState(vandaagAlsWerkdatum());
  const [antwoorden, setAntwoorden] = useState<AntwoordStatus>({});
  const [poogGedaan, setPoogGedaan] = useState(false);

  const antwoordVoor = (itemId: string, standaard: AntwoordInvoer): AntwoordInvoer => antwoorden[itemId] ?? standaard;

  function werkAntwoordBij(itemId: string, wijziging: Partial<AntwoordInvoer>, standaard: AntwoordInvoer) {
    setAntwoorden((huidig) => ({
      ...huidig,
      [itemId]: { ...antwoordVoor(itemId, standaard), ...wijziging },
    }));
  }

  const aantalAfgerond = useMemo(() => {
    if (!items) return 0;
    return items.filter((item) => {
      const a = antwoorden[item.id];
      if (!a) return false;
      if (item.type === "vinkje") return a.waardeBool === true;
      if (item.type === "temperatuur") return a.waardeGetal !== undefined && !Number.isNaN(a.waardeGetal);
      return !!a.waardeTekst?.trim();
    }).length;
  }, [items, antwoorden]);

  if (!sjabloon || !items) {
    return (
      <div className="app-scherm">
        <AppKop titel={t.algemeen.laden} terugNaar="/vandaag" />
      </div>
    );
  }

  const ontbrekendeVerplichte = items.filter((item) => {
    if (!item.verplicht) return false;
    const a = antwoorden[item.id];
    if (!a) return true;
    if (item.type === "vinkje") return a.waardeBool !== true;
    if (item.type === "temperatuur") return a.waardeGetal === undefined || Number.isNaN(a.waardeGetal);
    return !a.waardeTekst?.trim();
  });

  async function opslaan() {
    if (ontbrekendeVerplichte.length > 0 && !poogGedaan) {
      setPoogGedaan(true);
      return;
    }
    if (!profiel || !organisatie) return;

    const apparaatTijd = new Date().toISOString();
    const registratieId = nieuweId();

    const antwoordenArray: AntwoordInvoer[] = items!.map((item) => {
      const standaard: AntwoordInvoer = { itemId: item.id, itemTekst: item.tekst, type: item.type };
      return antwoordVoor(item.id, standaard);
    });

    await db.registraties.put({
      id: registratieId,
      organisatieId: organisatie.id,
      sjabloonId: sjabloon.id,
      sjabloonNaam: sjabloon.naam,
      sjabloonVersie: sjabloon.versie,
      gebruikerId: profiel.id,
      gebruikerNaam: profiel.naam,
      werkdatum,
      apparaatTijd,
      isInhaalregistratie: !isVandaag(werkdatum),
      antwoorden: antwoordenArray,
    });
    await db.uitgaand.put({ id: registratieId, soort: "registratie", pogingen: 0, aangemaaktOp: apparaatTijd });

    navigate(`/bevestiging/${registratieId}`);
  }

  return (
    <div className="app-scherm">
      <AppKop titel={sjabloon.naam} terugNaar="/vandaag" />
      <div className="app-inhoud">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--ruimte-m)" }}>
          <label style={{ display: "flex", flexDirection: "column", gap: "0.25rem", fontSize: "0.9375rem", fontWeight: 600 }}>
            Datum
            <input
              type="date"
              className="invoerveld-input"
              value={werkdatum}
              max={vandaagAlsWerkdatum()}
              onChange={(e) => setWerkdatum(e.target.value)}
            />
          </label>
          <p className="tekst-zwak" style={{ margin: 0, fontWeight: 600 }}>{t.checklist.voortgang(aantalAfgerond, items.length)}</p>
        </div>

        {!isVandaag(werkdatum) ? (
          <Kaart className="kaart--waarschuwing" style={{ marginBottom: "var(--ruimte-m)", borderColor: "var(--kleur-waarschuwing)", background: "var(--kleur-waarschuwing-vlak)" }}>
            <p style={{ margin: 0, color: "var(--kleur-waarschuwing)", fontWeight: 600 }}>⚠ {t.checklist.inhaalWaarschuwing}</p>
          </Kaart>
        ) : null}

        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
          {items.map((item) => {
            const standaard: AntwoordInvoer = { itemId: item.id, itemTekst: item.tekst, type: item.type };
            const antwoord = antwoordVoor(item.id, standaard);

            return (
              <div key={item.id} style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-xs)" }}>
                {item.type === "vinkje" ? (
                  <Selectievakje
                    label={item.tekst}
                    hulptekst={item.hulptekst}
                    verplicht={item.verplicht}
                    gedaan={antwoord.waardeBool === true}
                    onWijzig={(waardeBool) => werkAntwoordBij(item.id, { waardeBool }, standaard)}
                  />
                ) : (
                  <Kaart>
                    <p style={{ margin: "0 0 0.5rem 0", fontWeight: 600 }}>
                      {item.tekst}
                      {item.verplicht ? <span style={{ color: "var(--kleur-fout)" }}> *</span> : null}
                    </p>
                    {item.hulptekst ? <p className="tekst-zwak" style={{ margin: "0 0 0.5rem 0" }}>{item.hulptekst}</p> : null}
                    {item.type === "temperatuur" ? (
                      <input
                        type="number"
                        step="0.1"
                        inputMode="decimal"
                        className="invoerveld-input"
                        placeholder={t.checklist.temperatuurPlaceholder}
                        value={antwoord.waardeGetal ?? ""}
                        onChange={(e) =>
                          werkAntwoordBij(item.id, { waardeGetal: e.target.value === "" ? undefined : Number(e.target.value) }, standaard)
                        }
                      />
                    ) : (
                      <input
                        type="text"
                        className="invoerveld-input"
                        value={antwoord.waardeTekst ?? ""}
                        onChange={(e) => werkAntwoordBij(item.id, { waardeTekst: e.target.value }, standaard)}
                      />
                    )}
                  </Kaart>
                )}
                <div style={{ paddingLeft: "0.25rem" }}>
                  <OpmerkingVeld
                    waarde={antwoord.opmerking ?? ""}
                    onWijzig={(opmerking) => werkAntwoordBij(item.id, { opmerking }, standaard)}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {poogGedaan && ontbrekendeVerplichte.length > 0 ? (
          <p style={{ color: "var(--kleur-fout)", fontWeight: 600, marginTop: "var(--ruimte-m)" }}>
            {t.checklist.nietAllesIngevuld}
          </p>
        ) : null}
      </div>

      <div style={{ position: "sticky", bottom: 0, padding: "var(--ruimte-m)", background: "var(--kleur-oppervlak)", borderTop: "0.0625rem solid var(--kleur-rand)" }}>
        <Knop volledigeBreedte onClick={opslaan}>
          {poogGedaan && ontbrekendeVerplichte.length > 0 ? t.algemeen.opslaan + " (toch)" : t.checklist.opslaanKnop}
        </Knop>
      </div>
    </div>
  );
}

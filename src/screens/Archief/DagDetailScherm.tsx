import { useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { AppKop } from "../../components/AppKop";
import { Kaart } from "../../components/Kaart";
import { urenVerschil } from "../../lib/format";
import { t, formatteerDatumLang, formatteerDatumTijd } from "../../i18n/nl";
import type { Correctie } from "../../types/domain";

/** Detailweergave van één dag — dit is het scherm dat je aan een inspecteur laat zien. */
export function DagDetailScherm() {
  const { datum } = useParams<{ datum: string }>();

  const registraties = useLiveQuery(
    () => (datum ? db.registraties.where("werkdatum").equals(datum).toArray() : []),
    [datum],
  );
  const correcties = useLiveQuery<Map<string, Correctie[]>>(async () => {
    const kaart = new Map<string, Correctie[]>();
    for (const r of registraties ?? []) {
      kaart.set(r.id, await db.correcties.where("registratieId").equals(r.id).toArray());
    }
    return kaart;
  }, [registraties]);

  if (!datum) return null;

  return (
    <div className="app-scherm">
      <AppKop titel={t.archief.dagDetailTitel(formatteerDatumLang(new Date(datum)))} terugNaar="/archief" />
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
        {!registraties || registraties.length === 0 ? (
          <Kaart>
            <p style={{ margin: 0 }}>{t.archief.geenRegistratie}</p>
          </Kaart>
        ) : (
          registraties.map((registratie) => {
            const apparaatDatum = new Date(registratie.apparaatTijd);
            const tijdWijktAf = registratie.ontvangenOp ? urenVerschil(registratie.apparaatTijd, registratie.ontvangenOp) > 36 : false;
            const correctiesVoorRegistratie = correcties?.get(registratie.id) ?? [];

            return (
              <Kaart key={registratie.id}>
                <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.0625rem" }}>{registratie.sjabloonNaam}</h2>
                <p className="tekst-zwak" style={{ margin: 0 }}>{t.archief.ingevuldDoor(registratie.gebruikerNaam)}</p>
                <p className="tekst-zwak" style={{ margin: 0 }}>{t.archief.apparaatTijd(formatteerDatumTijd(apparaatDatum))}</p>
                {registratie.ontvangenOp ? (
                  <p className="tekst-zwak" style={{ margin: 0 }}>{t.archief.ontvangenOp(formatteerDatumTijd(new Date(registratie.ontvangenOp)))}</p>
                ) : null}
                {tijdWijktAf ? (
                  <p style={{ color: "var(--kleur-waarschuwing)", fontWeight: 600 }}>⚠ {t.archief.tijdWaarschuwing}</p>
                ) : null}
                {registratie.isInhaalregistratie ? (
                  <p style={{ color: "var(--kleur-waarschuwing)", fontWeight: 600 }}>⚠ {t.archief.inhaalLabel}</p>
                ) : null}

                <ul style={{ listStyle: "none", padding: 0, margin: "var(--ruimte-m) 0 0 0", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {registratie.antwoorden.map((antwoord) => {
                    const waarde =
                      antwoord.type === "vinkje"
                        ? antwoord.waardeBool
                          ? t.status.gedaan
                          : t.status.nietGedaan
                        : antwoord.type === "temperatuur"
                          ? antwoord.waardeGetal !== undefined
                            ? `${antwoord.waardeGetal} °C`
                            : "–"
                          : antwoord.waardeTekst || "–";
                    return (
                      <li key={antwoord.itemId} style={{ borderTop: "0.0625rem solid var(--kleur-rand)", paddingTop: "0.75rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "var(--ruimte-s)" }}>
                          <span>{antwoord.itemTekst}</span>
                          <strong style={{ color: antwoord.type === "vinkje" && !antwoord.waardeBool ? "var(--kleur-niet-gedaan)" : "var(--kleur-gedaan)" }}>
                            {waarde}
                          </strong>
                        </div>
                        {antwoord.opmerking ? <p className="tekst-zwak" style={{ margin: "0.25rem 0 0 0" }}>💬 {antwoord.opmerking}</p> : null}
                      </li>
                    );
                  })}
                </ul>

                {correctiesVoorRegistratie.length > 0 ? (
                  <div style={{ marginTop: "var(--ruimte-m)", paddingTop: "var(--ruimte-m)", borderTop: "0.125rem dashed var(--kleur-rand)" }}>
                    <p style={{ fontWeight: 700, margin: "0 0 0.5rem 0" }}>{t.archief.correcties}</p>
                    {correctiesVoorRegistratie.map((c) => (
                      <p key={c.id} className="tekst-zwak" style={{ margin: "0 0 0.5rem 0" }}>
                        {formatteerDatumTijd(new Date(c.aangemaaktOp))} — {c.gebruikerNaam}: {c.toelichting}
                      </p>
                    ))}
                  </div>
                ) : null}
              </Kaart>
            );
          })
        )}
      </div>
    </div>
  );
}

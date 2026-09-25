import { useState } from "react";
import { AppKop } from "../../components/AppKop";
import { StatusBalk } from "../../components/StatusBalk";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Knop } from "../../components/Knop";
import { Blad } from "../../components/Blad";
import { PdfKeuze } from "../../components/PdfKeuze";
import { Segmentknop } from "../../components/Segmentknop";
import { PeriodeKiezer } from "../../components/PeriodeKiezer";
import { DatumBlad } from "../../components/DatumBlad";
import { usePdfBron } from "../../context/LocatieContext";
import { useDocument } from "../../lib/documenten";
import { standaardSchoonmaakConfig, FREQUENTIE_NAMEN, methodeTekst, objectNaam, middelNaam } from "../../lib/schoonmaakDefaults";
import { dagenVanWeek, maandagVan, maandSleutel, verschuifWeek, weekLabel, weekSleutel, weekdagen } from "../../lib/kalender";
import { werkdatumVan } from "../../lib/format";
import { maakSchoonmaakplanPdf, pdfBestandsnaam } from "../../lib/pdf";
import { t } from "../../i18n";
import type { Freq, Methode, SchoonmaakConfig, SchoonmaakMaand, SchoonmaakObject, SchoonmaakWeek } from "../../types/domain";
import "../formulieren.css";
import "./Schoonmaakplan.css";

export function SchoonmaakplanScherm() {
  const pdfBron = usePdfBron();
  const [maandag, setMaandag] = useState(() => maandagVan(new Date()));
  const [legendaOpen, setLegendaOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [toonMethode, setToonMethode] = useState(false);
  const [methodeId, setMethodeId] = useState<string | null>(null);
  const [freqId, setFreqId] = useState<string | null>(null);

  // Maandelijkse items horen bij de maand waarin de donderdag van de week valt (ISO-conventie).
  const donderdag = new Date(maandag.getFullYear(), maandag.getMonth(), maandag.getDate() + 3);
  const config = useDocument<SchoonmaakConfig>("schoonmaak-config", "config", standaardSchoonmaakConfig);
  const week = useDocument<SchoonmaakWeek>("schoonmaak-week", weekSleutel(maandag), () => ({ dagen: {} }));
  const maand = useDocument<SchoonmaakMaand>("schoonmaak-maand", maandSleutel(donderdag), () => ({ datums: {} }));

  if (!config.waarde || !week.waarde || !maand.waarde) return null;
  const cfg = config.waarde;
  const wk = week.waarde;
  const mnd = maand.waarde;

  const dagen = dagenVanWeek(maandag);
  const vandaag = werkdatumVan(new Date());
  const label = weekLabel(maandag);
  const nuMaandag = maandagVan(new Date());

  function pasObjectAan(id: string, aanpassing: Partial<SchoonmaakObject>) {
    config.wijzig((c) => ({ ...c, objecten: c.objecten.map((o) => (o.id === id ? { ...o, ...aanpassing } : o)) }));
  }

  function zetMethode(id: string, methode: Methode | null) {
    pasObjectAan(id, methode === "reinigen" ? { methode, desinfecterenCode: null } : { methode });
  }

  function zetDag(id: string, index: number) {
    week.wijzig((w) => {
      const huidig = w.dagen[id] ?? Array(7).fill(false);
      const nieuw = huidig.map((waarde, i) => (i === index ? !waarde : waarde));
      return { ...w, dagen: { ...w.dagen, [id]: nieuw } };
    });
  }

  function zetDatum(id: string, datum: string) {
    maand.wijzig((m) => {
      const datums = { ...m.datums };
      if (datum) datums[id] = datum;
      else delete datums[id];
      return { ...m, datums };
    });
  }

  function zetMiddel(code: number, veld: "dosering" | "inwerktijd" | "naspoelen", waarde: string) {
    config.wijzig((c) => ({ ...c, middelen: c.middelen.map((m) => (m.code === code ? { ...m, [veld]: waarde } : m)) }));
  }

  const maakPdf = () => maakSchoonmaakplanPdf(pdfBron, cfg, maandag, wk, mnd);

  const methodeObject = cfg.objecten.find((o) => o.id === methodeId);
  const freqObject = cfg.objecten.find((o) => o.id === freqId);

  return (
    <div className="app-scherm">
      <StatusBalk />
      <AppKop titel={t.schoonmaak.titel} terugNaar="/" />
      <div className="app-inhoud app-inhoud--breed">
        <PeriodeKiezer
          titel={label.titel}
          ondertitel={label.periode}
          onVorige={() => setMaandag(verschuifWeek(maandag, -1))}
          onVolgende={() => setMaandag(verschuifWeek(maandag, 1))}
          onNu={() => setMaandag(nuMaandag)}
          nuLabel={t.schoonmaak.dezeWeek}
        />

        <div className="werkbalk">
          <Knop variant="secundair" aria-expanded={legendaOpen} onClick={() => setLegendaOpen(!legendaOpen)}>
            {legendaOpen ? t.schoonmaak.verbergLegenda : t.schoonmaak.toonLegenda}
          </Knop>
          <Knop variant="secundair" aria-pressed={toonMethode} onClick={() => setToonMethode(!toonMethode)}>
            {toonMethode ? t.schoonmaak.verbergMethode : t.schoonmaak.toonMethode}
          </Knop>
          <Knop onClick={() => setPdfOpen(true)}>{t.algemeen.pdfMaken}</Knop>
        </div>

        {legendaOpen ? (
          <div className="kaart sp-legenda">
            <div className="sp-tabelwrap">
              <table className="sp-legenda-tabel">
                <thead>
                  <tr>
                    <th>{t.schoonmaak.kolCode}</th>
                    <th>{t.schoonmaak.kolMiddel}</th>
                    <th>{t.schoonmaak.kolDosering}</th>
                    <th>{t.schoonmaak.kolInwerktijd}</th>
                    <th>{t.schoonmaak.kolNaspoelen}</th>
                  </tr>
                </thead>
                <tbody>
                  {cfg.middelen.map((m) => (
                    <tr key={m.code}>
                      <td className="sp-legenda-code">{m.code}</td>
                      <td>{middelNaam(m)}</td>
                      {(["dosering", "inwerktijd", "naspoelen"] as const).map((veld) => (
                        <td key={veld}>
                          <input
                            className="invoerveld-input"
                            aria-label={`${t.schoonmaak[veld === "dosering" ? "kolDosering" : veld === "inwerktijd" ? "kolInwerktijd" : "kolNaspoelen"]} ${middelNaam(m)}`}
                            value={m[veld]}
                            onChange={(e) => zetMiddel(m.code, veld, e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="sp-let-op">
              <strong>{t.schoonmaak.letOpKop}</strong> {t.schoonmaak.letOpTekst}
            </p>
            <ul className="sp-afkortingen">
              {(Object.entries(FREQUENTIE_NAMEN) as [Freq, string][]).map(([k, naam]) => (
                <li key={k}>
                  <strong>{k}</strong> = {naam}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="sp-tabelwrap">
          <table className="sp-tabel">
            <thead>
              <tr>
                <th>{t.schoonmaak.kolObject}</th>
                {toonMethode ? <th>{t.schoonmaak.kolMethode}</th> : null}
                <th className="sp-kol-freq">{t.schoonmaak.kolFrequentie}</th>
                <th>{t.schoonmaak.kolUitgevoerd}</th>
              </tr>
            </thead>
            <tbody>
              {cfg.objecten.map((o) => {
                const vinkjes = wk.dagen[o.id] ?? [];
                return (
                  <tr key={o.id}>
                    <td className="sp-object">{objectNaam(o)}</td>
                    {toonMethode ? (
                      <td data-label={t.schoonmaak.kolMethode}>
                        <button
                          type="button"
                          className={`sp-celknop sp-methode ${o.methode ? "sp-celknop--gevuld" : ""}`}
                          style={{ textAlign: "left" }}
                          onClick={() => setMethodeId(o.id)}
                        >
                          {o.methode ? methodeTekst(o) : t.schoonmaak.kiesMethode}
                        </button>
                      </td>
                    ) : null}
                    <td className="sp-kol-freq" data-label={t.schoonmaak.kolFrequentie}>
                      <button
                        type="button"
                        className={`sp-celknop ${o.frequentie ? "sp-celknop--gevuld sp-freqchip" : ""}`}
                        aria-label={o.frequentie ? t.schoonmaak.frequentieLabel(FREQUENTIE_NAMEN[o.frequentie]) : t.schoonmaak.kiesFrequentie}
                        onClick={() => setFreqId(o.id)}
                      >
                        {o.frequentie ?? t.schoonmaak.kiesFrequentie}
                      </button>
                    </td>
                    <td data-label={t.schoonmaak.kolUitgevoerd}>
                      {o.frequentie === "M" ? (
                        <DatumBlad
                          waarde={mnd.datums[o.id] ?? ""}
                          onWijzig={(d) => zetDatum(o.id, d)}
                          leegLabel={t.schoonmaak.uitgevoerdOp}
                          titel={`${objectNaam(o)} — ${t.schoonmaak.uitgevoerdOp}`}
                        />
                      ) : o.frequentie ? (
                        <div className="sp-dagen">
                          {dagen.map((dag, i) => {
                            const gedaan = !!vinkjes[i];
                            const opTijd = werkdatumVan(dag) <= vandaag;
                            return (
                              <button
                                key={i}
                                type="button"
                                className={`sp-dag ${gedaan ? "sp-dag--gedaan" : ""}`}
                                aria-pressed={gedaan}
                                aria-label={t.schoonmaak.dagLabel(objectNaam(o), `${weekdagen()[i]} ${dag.getDate()}`, gedaan ? t.status.gedaan : t.status.nietGedaan)}
                                disabled={!opTijd && !gedaan}
                                onClick={() => zetDag(o.id, i)}
                              >
                                <span className="sp-dag-vink" aria-hidden="true">
                                  {gedaan ? "✓" : ""}
                                </span>
                                <span>
                                  {weekdagen()[i]} {dag.getDate()}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="sp-hint">{t.schoonmaak.kiesEerstFrequentie}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Blad open={!!methodeObject} titel={methodeObject ? t.schoonmaak.methodeTitel(objectNaam(methodeObject)) : ""} onSluit={() => setMethodeId(null)}>
        {methodeObject ? (
          <>
            <div className="sp-keuzes">
              {(
                [
                  ["reinigen", t.schoonmaak.reinigen],
                  ["reinigen-desinfecteren", t.schoonmaak.reinigenEnDesinfecteren],
                ] as [Methode, string][]
              ).map(([waarde, naam]) => (
                <button
                  key={waarde}
                  type="button"
                  className={`sp-keuze ${methodeObject.methode === waarde ? "sp-keuze--gekozen" : ""}`}
                  onClick={() => zetMethode(methodeObject.id, waarde)}
                >
                  {naam}
                  {methodeObject.methode === waarde ? <span aria-hidden="true">✓</span> : null}
                </button>
              ))}
            </div>
            {methodeObject.methode ? (
              <Segmentknop
                label={t.schoonmaak.reinigen}
                opties={[
                  { waarde: "1", label: "1" },
                  { waarde: "2", label: "2" },
                  { waarde: "4", label: "4" },
                ]}
                waarde={methodeObject.reinigenCode ? (String(methodeObject.reinigenCode) as "1" | "2" | "4") : null}
                onWijzig={(w) => pasObjectAan(methodeObject.id, { reinigenCode: w ? (Number(w) as 1 | 2 | 4) : null })}
              />
            ) : null}
            {methodeObject.methode === "reinigen-desinfecteren" ? (
              <Segmentknop
                label={t.schoonmaak.desinfecteren}
                opties={[{ waarde: "3", label: "3" }]}
                waarde={methodeObject.desinfecterenCode ? "3" : null}
                onWijzig={(w) => pasObjectAan(methodeObject.id, { desinfecterenCode: w ? 3 : null })}
              />
            ) : null}
            <Knop onClick={() => setMethodeId(null)}>{t.algemeen.klaar}</Knop>
          </>
        ) : null}
      </Blad>

      <Blad open={!!freqObject} titel={freqObject ? t.schoonmaak.frequentieTitel(objectNaam(freqObject)) : ""} onSluit={() => setFreqId(null)}>
        {freqObject ? (
          <div className="sp-keuzes">
            {(Object.entries(FREQUENTIE_NAMEN) as [Freq, string][]).map(([code, naam]) => (
              <button
                key={code}
                type="button"
                className={`sp-keuze ${freqObject.frequentie === code ? "sp-keuze--gekozen" : ""}`}
                onClick={() => {
                  pasObjectAan(freqObject.id, { frequentie: code });
                  setFreqId(null);
                }}
              >
                <span>{naam}</span>
                <strong>{code}</strong>
              </button>
            ))}
          </div>
        ) : null}
      </Blad>

      <PdfKeuze
        open={pdfOpen}
        onSluit={() => setPdfOpen(false)}
        maakPdf={maakPdf}
        bestandsnaam={pdfBestandsnaam(pdfBron, "schoonmaak", weekSleutel(maandag))}
        titel={`${t.schoonmaak.titel} ${label.titel}`}
      />
      <HoofdNavigatie />
    </div>
  );
}

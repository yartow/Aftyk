import { useState } from "react";
import { AppKop } from "../../components/AppKop";
import { StatusBalk } from "../../components/StatusBalk";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Knop } from "../../components/Knop";
import { Kaart } from "../../components/Kaart";
import { Invoerveld, Tekstveld } from "../../components/Invoerveld";
import { Segmentknop } from "../../components/Segmentknop";
import { PeriodeKiezer } from "../../components/PeriodeKiezer";
import { Uitklapblok } from "../../components/Uitklapblok";
import { DatumBlad } from "../../components/DatumBlad";
import { PdfKeuze } from "../../components/PdfKeuze";
import { usePdfBron } from "../../context/LocatieContext";
import { useDocument } from "../../lib/documenten";
import { maandagVan, verschuifWeek, weekLabel, weekSleutel } from "../../lib/kalender";
import { werkdatumVan } from "../../lib/format";
import { nieuweId } from "../../lib/id";
import { maakWeekformulierPdf, pdfBestandsnaam } from "../../lib/pdf";
import {
  CCP_PROCESSEN,
  OPSLAG_EENHEDEN,
  alleenGetal,
  ccpAfwijking,
  grensTekst,
  leegCcpRij,
  leegOpslagRij,
  opslagAfwijking,
  standaardWeekformulier,
} from "../../lib/weekformulierDefaults";
import { t } from "../../i18n";
import type { CcpRij, LeveranciersConfig, OntvangstRij, OpslagRij, VO, Weekformulier } from "../../types/domain";
import "../formulieren.css";

const voOpties = (): { waarde: "V" | "O"; label: string }[] => [
  { waarde: "V", label: t.weekformulier.voldoet },
  { waarde: "O", label: t.weekformulier.onvoldoende },
];

function AfwijkingBadge() {
  return (
    <span className="afwijking-badge" role="status">
      <span aria-hidden="true">⚠</span> {t.weekformulier.afwijking}
    </span>
  );
}

export function WeekformulierScherm() {
  const pdfBron = usePdfBron();
  const [maandag, setMaandagRuw] = useState(() => maandagVan(new Date()));
  const [controleDatum, setControleDatum] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const formulier = useDocument<Weekformulier>("weekformulier", weekSleutel(maandag), standaardWeekformulier);
  // De datum bovenaan is alleen een hulpmiddel; bij een andere week wissen we hem,
  // zodat je niet per ongeluk een datum van vorige week kopieert.
  const setMaandag = (d: Date) => {
    setMaandagRuw(d);
    setControleDatum("");
  };
  const leveranciers = useDocument<LeveranciersConfig>("leveranciers-config", "config", () => ({ leveranciers: [] }));

  if (!formulier.waarde) return null;
  const f = formulier.waarde;
  const vandaag = werkdatumVan(new Date());
  const label = weekLabel(maandag);

  const zetOntvangst = (id: string, deel: Partial<OntvangstRij>) =>
    formulier.wijzig((w) => ({ ...w, ontvangst: w.ontvangst.map((r) => (r.id === id ? { ...r, ...deel } : r)) }));

  const zetOpslag = (id: string, deel: Partial<OpslagRij>) =>
    formulier.wijzig((w) => {
      const huidig = w.opslag[id] ?? leegOpslagRij();
      const nieuw = { ...huidig, ...deel };
      if (!nieuw.datum) nieuw.datum = vandaag;
      return { ...w, opslag: { ...w.opslag, [id]: nieuw } };
    });

  const zetCcp = (id: string, deel: Partial<CcpRij>) =>
    formulier.wijzig((w) => {
      const huidig = w.ccps[id] ?? leegCcpRij();
      const nieuw = { ...huidig, ...deel };
      if (!nieuw.datum) nieuw.datum = vandaag;
      return { ...w, ccps: { ...w.ccps, [id]: nieuw } };
    });

  function voegOntvangstToe() {
    const rij: OntvangstRij = {
      id: nieuweId(),
      datum: vandaag,
      leverancier: "",
      product: "",
      temperatuur: "",
      verpakking: null,
      tht: null,
      paraaf: "",
      actie: "",
    };
    formulier.wijzig((w) => ({ ...w, ontvangst: [...w.ontvangst, rij] }));
  }

  const maakPdf = () => maakWeekformulierPdf(pdfBron, maandag, f);

  function kopieerDatum() {
    if (!controleDatum) return;
    formulier.wijzig((w) => ({
      ...w,
      opslag: Object.fromEntries(OPSLAG_EENHEDEN.map((e) => [e.id, { ...(w.opslag[e.id] ?? leegOpslagRij()), datum: controleDatum }])),
      ccps: Object.fromEntries(CCP_PROCESSEN.map((p) => [p.id, { ...(w.ccps[p.id] ?? leegCcpRij()), datum: controleDatum }])),
    }));
  }

  const aantalOpslagAfwijkingen = OPSLAG_EENHEDEN.filter((e) => opslagAfwijking(e, f.opslag[e.id]?.temperatuur ?? "")).length;
  const aantalCcpAfwijkingen = CCP_PROCESSEN.filter((p) => ccpAfwijking(p, f.ccps[p.id])).length;
  const badge = (aantal: number) => (aantal > 0 ? <AfwijkingBadge /> : null);

  return (
    <div className="app-scherm">
      <StatusBalk />
      <AppKop titel={t.weekformulier.titel} terugNaar="/" />
      <div className="app-inhoud">
        <PeriodeKiezer
          titel={label.titel}
          ondertitel={label.periode}
          onVorige={() => setMaandag(verschuifWeek(maandag, -1))}
          onVolgende={() => setMaandag(verschuifWeek(maandag, 1))}
          onNu={() => setMaandag(maandagVan(new Date()))}
          nuLabel={t.schoonmaak.dezeWeek}
        />

        <Kaart>
          <div className="veldenraster">
            <div>
              <span className="invoerveld-label">{t.weekformulier.datumControle}</span>
              <DatumBlad waarde={controleDatum} onWijzig={setControleDatum} leegLabel={t.algemeen.kiesDatum} titel={t.weekformulier.datumControle} />
            </div>
            <div style={{ alignSelf: "end" }}>
              <Knop variant="secundair" disabled={!controleDatum} onClick={kopieerDatum}>
                {t.weekformulier.kopieerNaarAlleRijen}
              </Knop>
            </div>
          </div>
        </Kaart>

        <Uitklapblok titel={t.weekformulier.ontvangst} beginOpen badge={badge(f.ontvangst.length)}>
          <p className="tekst-zwak" style={{ margin: 0 }}>
            {t.weekformulier.ontvangstUitleg}
          </p>
          <datalist id="leveranciers-lijst">
            {(leveranciers.waarde?.leveranciers ?? [])
              .filter((l) => !l.gearchiveerd)
              .map((l) => (
                <option key={l.id} value={l.naam} />
              ))}
          </datalist>
          {f.ontvangst.length === 0 ? <p className="leeg-melding">{t.weekformulier.geenAfwijkingen}</p> : null}
          <div className="kaartlijst">
            {f.ontvangst.map((r) => (
              <Kaart key={r.id}>
                <div className="veldenraster">
                  <div>
                    <span className="invoerveld-label">{t.weekformulier.datumControle}</span>
                    <DatumBlad waarde={r.datum} onWijzig={(d) => zetOntvangst(r.id, { datum: d })} leegLabel={t.algemeen.kiesDatum} titel={t.weekformulier.datumControle} />
                  </div>
                  <Invoerveld id={`lev-${r.id}`} label={t.weekformulier.leverancier} list="leveranciers-lijst" value={r.leverancier} onChange={(e) => zetOntvangst(r.id, { leverancier: e.target.value })} />
                  <Invoerveld id={`prod-${r.id}`} label={t.weekformulier.product} value={r.product} onChange={(e) => zetOntvangst(r.id, { product: e.target.value })} />
                  <Invoerveld id={`temp-${r.id}`} label={t.weekformulier.temperatuur} inputMode="decimal" value={r.temperatuur} onChange={(e) => zetOntvangst(r.id, { temperatuur: alleenGetal(e.target.value, "temperatuur") })} />
                  <Segmentknop label={t.weekformulier.verpakking} opties={voOpties()} waarde={r.verpakking} onWijzig={(v: VO) => zetOntvangst(r.id, { verpakking: v })} />
                  <Segmentknop label={t.weekformulier.tht} opties={voOpties()} waarde={r.tht} onWijzig={(v: VO) => zetOntvangst(r.id, { tht: v })} />
                  <Invoerveld id={`par-${r.id}`} label={t.weekformulier.paraaf} value={r.paraaf} onChange={(e) => zetOntvangst(r.id, { paraaf: e.target.value })} />
                </div>
                <div style={{ marginTop: "var(--ruimte-m)" }}>
                  <Tekstveld id={`act-${r.id}`} label={t.weekformulier.actie} value={r.actie} onChange={(e) => zetOntvangst(r.id, { actie: e.target.value })} />
                </div>
                <div style={{ marginTop: "var(--ruimte-s)" }}>
                  <Knop
                    variant="gevaar"
                    onClick={() => {
                      if (window.confirm(t.weekformulier.verwijderBevestiging)) formulier.wijzig((w) => ({ ...w, ontvangst: w.ontvangst.filter((x) => x.id !== r.id) }));
                    }}
                  >
                    {t.algemeen.verwijderen}
                  </Knop>
                </div>
              </Kaart>
            ))}
          </div>
          <Knop variant="secundair" onClick={voegOntvangstToe}>
            + {t.weekformulier.afwijkingToevoegen}
          </Knop>
        </Uitklapblok>

        <Uitklapblok titel={t.weekformulier.opslag} beginOpen badge={badge(aantalOpslagAfwijkingen)}>
          <div className="kaartlijst">
            {OPSLAG_EENHEDEN.map((e) => {
              const r = f.opslag[e.id] ?? leegOpslagRij();
              const afwijking = opslagAfwijking(e, r.temperatuur);
              return (
                <Kaart key={e.id}>
                  <div className="kaart-kop">
                    <h3>
                      {e.naam} <span className="norm">({grensTekst(e)})</span>
                    </h3>
                    {afwijking ? <AfwijkingBadge /> : r.temperatuur ? <span className="badge-ok">✓ {t.weekformulier.binnenNorm}</span> : null}
                  </div>
                  <div className="veldenraster">
                    <div>
                      <span className="invoerveld-label">{t.weekformulier.datumControle}</span>
                      <DatumBlad waarde={r.datum} onWijzig={(d) => zetOpslag(e.id, { datum: d })} leegLabel={t.algemeen.kiesDatum} titel={`${e.naam} — ${t.weekformulier.datumControle}`} />
                    </div>
                    <Invoerveld id={`opslag-t-${e.id}`} label={t.weekformulier.temperatuur} inputMode="decimal" value={r.temperatuur} onChange={(ev) => zetOpslag(e.id, { temperatuur: alleenGetal(ev.target.value, "temperatuur") })} />
                    {e.afgedektNvt ? (
                      <div>
                        <span className="invoerveld-label">{t.weekformulier.afgedekt}</span>
                        <p style={{ margin: 0 }}>{t.weekformulier.nvt}</p>
                      </div>
                    ) : (
                      <Segmentknop label={t.weekformulier.afgedekt} opties={voOpties()} waarde={r.afgedekt} onWijzig={(v: VO) => zetOpslag(e.id, { afgedekt: v })} />
                    )}
                    <Segmentknop label={t.weekformulier.fifoTht} opties={voOpties()} waarde={r.fifoTht} onWijzig={(v: VO) => zetOpslag(e.id, { fifoTht: v })} />
                    <Invoerveld id={`opslag-p-${e.id}`} label={t.weekformulier.paraaf} value={r.paraaf} onChange={(ev) => zetOpslag(e.id, { paraaf: ev.target.value })} />
                  </div>
                  {afwijking || r.actie ? (
                    <div style={{ marginTop: "var(--ruimte-m)" }}>
                      <Tekstveld id={`opslag-a-${e.id}`} label={t.weekformulier.actie} value={r.actie} onChange={(ev) => zetOpslag(e.id, { actie: ev.target.value })} />
                      {afwijking && !r.actie.trim() ? <span className="veldfout">{t.weekformulier.actieVerplicht}</span> : null}
                    </div>
                  ) : null}
                </Kaart>
              );
            })}
          </div>
        </Uitklapblok>

        <Uitklapblok titel={t.weekformulier.processen} badge={badge(aantalCcpAfwijkingen)}>
          <div className="kaartlijst">
            {CCP_PROCESSEN.map((p) => {
              const r = f.ccps[p.id] ?? leegCcpRij();
              const afwijking = ccpAfwijking(p, f.ccps[p.id]);
              return (
                <Kaart key={p.id}>
                  <div className="kaart-kop">
                    <h3>
                      {p.naam} <span className="norm">({p.grensTekst})</span>
                    </h3>
                    {afwijking ? <AfwijkingBadge /> : r.waarde ? <span className="badge-ok">✓ {t.weekformulier.binnenNorm}</span> : null}
                  </div>
                  <div className="veldenraster">
                    <div>
                      <span className="invoerveld-label">{t.weekformulier.datumControle}</span>
                      <DatumBlad waarde={r.datum} onWijzig={(d) => zetCcp(p.id, { datum: d })} leegLabel={t.algemeen.kiesDatum} titel={`${p.naam} — ${t.weekformulier.datumControle}`} />
                    </div>
                    <Invoerveld id={`ccp-pr-${p.id}`} label={t.weekformulier.product} value={r.product} onChange={(e) => zetCcp(p.id, { product: e.target.value })} />
                    <Invoerveld id={`ccp-w-${p.id}`} label={p.waardeLabel === "pH" ? t.weekformulier.phWaarde : t.weekformulier.temperatuur} inputMode="decimal" value={r.waarde} onChange={(e) => zetCcp(p.id, { waarde: alleenGetal(e.target.value, p.waardeLabel === "pH" ? "ph" : "temperatuur") })} />
                    {p.metMinuten ? (
                      <Invoerveld id={`ccp-m-${p.id}`} label={t.weekformulier.tijdMinuten} inputMode="numeric" value={r.minuten} onChange={(e) => zetCcp(p.id, { minuten: alleenGetal(e.target.value, "minuten") })} />
                    ) : null}
                    <Invoerveld id={`ccp-pa-${p.id}`} label={t.weekformulier.paraaf} value={r.paraaf} onChange={(e) => zetCcp(p.id, { paraaf: e.target.value })} />
                  </div>
                  {afwijking || r.actie ? (
                    <div style={{ marginTop: "var(--ruimte-m)" }}>
                      <Tekstveld id={`ccp-a-${p.id}`} label={t.weekformulier.actie} value={r.actie} onChange={(e) => zetCcp(p.id, { actie: e.target.value })} />
                      {afwijking && !r.actie.trim() ? <span className="veldfout">{t.weekformulier.actieVerplicht}</span> : null}
                    </div>
                  ) : null}
                </Kaart>
              );
            })}
          </div>
        </Uitklapblok>

        <Uitklapblok titel={t.weekformulier.beoordeling}>
          <div className="veldenraster">
            <Invoerveld id="beoordeeld-door" label={t.weekformulier.beoordeeldDoor} value={f.beoordeeldDoor} onChange={(e) => formulier.wijzig((w) => ({ ...w, beoordeeldDoor: e.target.value }))} />
            <div>
              <span className="invoerveld-label">{t.weekformulier.datum}</span>
              <DatumBlad waarde={f.beoordeeldOp} onWijzig={(d) => formulier.wijzig((w) => ({ ...w, beoordeeldOp: d }))} leegLabel={t.algemeen.kiesDatum} titel={t.weekformulier.datum} />
            </div>
          </div>
        </Uitklapblok>

        <Knop volledigeBreedte onClick={() => setPdfOpen(true)}>
          {t.algemeen.pdfMaken}
        </Knop>
      </div>
      <PdfKeuze
        open={pdfOpen}
        onSluit={() => setPdfOpen(false)}
        maakPdf={maakPdf}
        bestandsnaam={pdfBestandsnaam(pdfBron, "week", weekSleutel(maandag))}
        titel={`${t.weekformulier.titel} ${label.titel}`}
      />
      <HoofdNavigatie />
    </div>
  );
}

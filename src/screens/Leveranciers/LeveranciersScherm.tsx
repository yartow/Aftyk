import { useState } from "react";
import { AppKop } from "../../components/AppKop";
import { StatusBalk } from "../../components/StatusBalk";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Knop } from "../../components/Knop";
import { Kaart } from "../../components/Kaart";
import { Invoerveld, Tekstveld } from "../../components/Invoerveld";
import { Segmentknop } from "../../components/Segmentknop";
import { PeriodeKiezer } from "../../components/PeriodeKiezer";
import { DatumBlad } from "../../components/DatumBlad";
import { PdfKeuze } from "../../components/PdfKeuze";
import { usePdfBron, useLocatie } from "../../context/LocatieContext";
import { bewaarDocument, haalDocument, useDocument } from "../../lib/documenten";
import { maandLabel, maandSleutel, verschuifMaand } from "../../lib/kalender";
import { werkdatumVan } from "../../lib/format";
import { nieuweId } from "../../lib/id";
import { maakLeveranciersPdf, pdfBestandsnaam } from "../../lib/pdf";
import { t } from "../../i18n";
import type { Betrouwbaarheid, Conclusie, LeverancierBeoordeling, LeveranciersConfig, LeveranciersMaand } from "../../types/domain";
import "../formulieren.css";

const LEEG: LeverancierBeoordeling = { certificaat: null, verloopdatum: "", betrouwbaarheid: null, opmerking: "", conclusie: null };

/** Aantal dagen tot een datum (negatief = verlopen). */
function dagenTot(datum: string): number {
  const nu = new Date(`${werkdatumVan(new Date())}T00:00:00`).getTime();
  return Math.round((new Date(`${datum}T00:00:00`).getTime() - nu) / 86400000);
}

export function LeveranciersScherm() {
  const pdfBron = usePdfBron();
  const { actieveLocatieId } = useLocatie();
  const [maand, setMaand] = useState(() => verschuifMaand(new Date(), 0));
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [pdfOpen, setPdfOpen] = useState(false);
  const config = useDocument<LeveranciersConfig>("leveranciers-config", "config", () => ({ leveranciers: [] }));
  const dezeMaand = useDocument<LeveranciersMaand>("leveranciers-maand", maandSleutel(maand), () => ({ beoordelingen: {} }));

  if (!config.waarde || !dezeMaand.waarde) return null;
  const lijst = config.waarde.leveranciers.filter((l) => !l.gearchiveerd);
  const beoordelingen = dezeMaand.waarde.beoordelingen;

  const zet = (id: string, deel: Partial<LeverancierBeoordeling>) =>
    dezeMaand.wijzig((m) => ({ ...m, beoordelingen: { ...m.beoordelingen, [id]: { ...LEEG, ...m.beoordelingen[id], ...deel } } }));

  function voegToe() {
    const naam = nieuweNaam.trim();
    if (!naam) return;
    config.wijzig((c) => ({ ...c, leveranciers: [...c.leveranciers, { id: nieuweId(), naam, gearchiveerd: false }] }));
    setNieuweNaam("");
  }

  async function kopieerVorigeMaand() {
    const vorige = await haalDocument<LeveranciersMaand>(actieveLocatieId!, "leveranciers-maand", maandSleutel(verschuifMaand(maand, -1)));
    if (!vorige) return;
    // Vult alleen aan wat nog leeg is; ingevulde beoordelingen van deze maand blijven staan.
    const samengevoegd = { ...vorige.beoordelingen, ...beoordelingen };
    await bewaarDocument(actieveLocatieId!, "leveranciers-maand", maandSleutel(maand), { beoordelingen: samengevoegd });
  }

  const maakPdf = () => maakLeveranciersPdf(pdfBron, maand, config.waarde!, dezeMaand.waarde!);

  const beoordeeld = lijst.filter((l) => beoordelingen[l.id]?.conclusie).length;

  return (
    <div className="app-scherm">
      <StatusBalk />
      <AppKop titel={t.leveranciers.titel} terugNaar="/" />
      <div className="app-inhoud">
        <PeriodeKiezer
          titel={maandLabel(maand)}
          ondertitel={t.leveranciers.voortgang(beoordeeld, lijst.length)}
          onVorige={() => setMaand(verschuifMaand(maand, -1))}
          onVolgende={() => setMaand(verschuifMaand(maand, 1))}
          onNu={() => setMaand(verschuifMaand(new Date(), 0))}
          nuLabel={t.leveranciers.dezeMaand}
        />

        <div className="werkbalk">
          <Knop variant="secundair" onClick={kopieerVorigeMaand}>
            {t.leveranciers.kopieerVorige}
          </Knop>
          <Knop onClick={() => setPdfOpen(true)}>{t.algemeen.pdfMaken}</Knop>
        </div>

        {lijst.length === 0 ? (
          <Kaart>
            <p className="leeg-melding">{t.leveranciers.geenLeveranciers}</p>
          </Kaart>
        ) : null}

        <div className="kaartlijst">
          {lijst.map((l) => {
            const b = { ...LEEG, ...beoordelingen[l.id] };
            const dagen = b.verloopdatum ? dagenTot(b.verloopdatum) : null;
            return (
              <Kaart key={l.id}>
                <div className="kaart-kop">
                  <h3>{l.naam}</h3>
                  {dagen !== null && dagen < 0 ? (
                    <span className="afwijking-badge">⚠ {t.leveranciers.verlopen}</span>
                  ) : dagen !== null && dagen <= 30 ? (
                    <span className="afwijking-badge">⚠ {t.leveranciers.verloptBinnenkort(dagen)}</span>
                  ) : null}
                </div>
                <div className="veldenraster">
                  <Segmentknop
                    label={t.leveranciers.certificaat}
                    opties={[
                      { waarde: "ja", label: t.algemeen.ja },
                      { waarde: "nee", label: t.algemeen.nee },
                    ]}
                    waarde={b.certificaat === null ? null : b.certificaat ? "ja" : "nee"}
                    onWijzig={(w) => zet(l.id, { certificaat: w === null ? null : w === "ja" })}
                  />
                  <div>
                    <span className="invoerveld-label">{t.leveranciers.verloopdatum}</span>
                    <DatumBlad waarde={b.verloopdatum} onWijzig={(d) => zet(l.id, { verloopdatum: d })} leegLabel={t.algemeen.kiesDatum} titel={t.leveranciers.verloopTitel(l.naam)} />
                  </div>
                  <Segmentknop<Betrouwbaarheid>
                    label={t.leveranciers.betrouwbaarheid}
                    opties={[
                      { waarde: "goed", label: t.leveranciers.goed },
                      { waarde: "matig", label: t.leveranciers.matig },
                      { waarde: "slecht", label: t.leveranciers.slecht },
                    ]}
                    waarde={b.betrouwbaarheid}
                    onWijzig={(w) => zet(l.id, { betrouwbaarheid: w })}
                  />
                  <Segmentknop<Conclusie>
                    label={t.leveranciers.conclusie}
                    opties={[
                      { waarde: "goedgekeurd", label: t.leveranciers.goedgekeurd },
                      { waarde: "voorwaardelijk", label: t.leveranciers.voorwaardelijk },
                      { waarde: "afgekeurd", label: t.leveranciers.afgekeurd },
                    ]}
                    waarde={b.conclusie}
                    onWijzig={(w) => zet(l.id, { conclusie: w })}
                  />
                </div>
                <div style={{ marginTop: "var(--ruimte-m)" }}>
                  <Tekstveld id={`lev-opm-${l.id}`} label={t.leveranciers.opmerking} value={b.opmerking} onChange={(e) => zet(l.id, { opmerking: e.target.value })} />
                </div>
                <div style={{ marginTop: "var(--ruimte-s)" }}>
                  <Knop
                    variant="tekst"
                    onClick={() => {
                      if (window.confirm(t.leveranciers.archiveerBevestiging(l.naam)))
                        config.wijzig((c) => ({ ...c, leveranciers: c.leveranciers.map((x) => (x.id === l.id ? { ...x, gearchiveerd: true } : x)) }));
                    }}
                  >
                    {t.leveranciers.archiveren}
                  </Knop>
                </div>
              </Kaart>
            );
          })}
        </div>

        <Kaart style={{ marginTop: "var(--ruimte-m)" }}>
          <form
            className="veldenraster"
            onSubmit={(e) => {
              e.preventDefault();
              voegToe();
            }}
          >
            <Invoerveld id="nieuwe-leverancier" label={t.leveranciers.nieuweLeverancier} value={nieuweNaam} onChange={(e) => setNieuweNaam(e.target.value)} />
            <Knop type="submit" disabled={!nieuweNaam.trim()}>
              + {t.leveranciers.toevoegen}
            </Knop>
          </form>
        </Kaart>
        <p className="tekst-zwak" style={{ textAlign: "center" }}>
          {t.leveranciers.versiedatum}
        </p>
      </div>
      <PdfKeuze
        open={pdfOpen}
        onSluit={() => setPdfOpen(false)}
        maakPdf={maakPdf}
        bestandsnaam={pdfBestandsnaam(pdfBron, "leveranciers", maandSleutel(maand))}
        titel={`${t.leveranciers.titel} ${maandLabel(maand)}`}
      />
      <HoofdNavigatie />
    </div>
  );
}

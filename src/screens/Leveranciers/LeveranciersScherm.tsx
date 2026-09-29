import { useState } from "react";
import { Link } from "react-router-dom";
import { AppKop } from "../../components/AppKop";
import { StatusBalk } from "../../components/StatusBalk";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Knop } from "../../components/Knop";
import { Kaart } from "../../components/Kaart";
import { Invoerveld, Tekstveld } from "../../components/Invoerveld";
import { BevestigBlad } from "../../components/BevestigBlad";
import { useToast } from "../../components/Toast";
import { LeverancierZoeker } from "../../components/LeverancierZoeker";
import { Segmentknop } from "../../components/Segmentknop";
import { PeriodeKiezer } from "../../components/PeriodeKiezer";
import { DatumBlad } from "../../components/DatumBlad";
import { PdfKeuze } from "../../components/PdfKeuze";
import { usePdfBron } from "../../context/LocatieContext";
import { useDocument } from "../../lib/documenten";
import { maandLabel, maandSleutel, verschuifMaand } from "../../lib/kalender";
import { werkdatumVan } from "../../lib/format";
import { nieuweId } from "../../lib/id";
import { LEGE_MAAND, metLeverancier, normaliseerMaand, sorteerControles, zoekLeverancier } from "../../lib/leveranciers";
import { maakLeveranciersPdf, pdfBestandsnaam } from "../../lib/pdf";
import { t } from "../../i18n";
import type { Betrouwbaarheid, Conclusie, LeverancierControle, LeveranciersConfig, LeveranciersMaand } from "../../types/domain";
import "../formulieren.css";

/** Aantal dagen tot een datum (negatief = verlopen). */
function dagenTot(datum: string): number {
  const nu = new Date(`${werkdatumVan(new Date())}T00:00:00`).getTime();
  return Math.round((new Date(`${datum}T00:00:00`).getTime() - nu) / 86400000);
}

export function LeveranciersScherm() {
  const pdfBron = usePdfBron();
  const [maand, setMaand] = useState(() => verschuifMaand(new Date(), 0));
  // Waar het naamveld staat: bij de knop waarmee de gebruiker het opende (boven of onder).
  const [kiest, setKiest] = useState<"boven" | "onder" | null>(null);
  const [teVerwijderen, setTeVerwijderen] = useState<LeverancierControle | null>(null);
  const { toon, toast } = useToast();
  const [pdfOpen, setPdfOpen] = useState(false);
  const config = useDocument<LeveranciersConfig>("leveranciers-config", "config", () => ({ leveranciers: [] }));
  const dezeMaand = useDocument<LeveranciersMaand>("leveranciers-maand", maandSleutel(maand), () => LEGE_MAAND);

  if (!config.waarde || !dezeMaand.waarde) return null;
  const cfg = config.waarde;
  const controles = sorteerControles(normaliseerMaand(dezeMaand.waarde, cfg).controles);

  const zet = (id: string, deel: Partial<LeverancierControle>) =>
    dezeMaand.wijzig((m) => ({ controles: normaliseerMaand(m, cfg).controles.map((c) => (c.id === id ? { ...c, ...deel } : c)) }));

  function verwijder(id: string) {
    dezeMaand.wijzig((m) => ({ controles: normaliseerMaand(m, cfg).controles.filter((c) => c.id !== id) }));
    setTeVerwijderen(null);
  }

  /** Nieuwe controle voor de gekozen leverancier; een nieuwe naam komt ook in de leverancierslijst. */
  function voegControleToe(naam: string) {
    const bijgewerkt = metLeverancier(cfg, naam);
    // Eén keer berekend en zo opgeslagen: metLeverancier maakt bij elke aanroep een nieuw id.
    if (bijgewerkt !== cfg) config.wijzig(() => bijgewerkt);
    const lev = zoekLeverancier(bijgewerkt.leveranciers, naam);
    if (!lev) return;
    const controle: LeverancierControle = {
      id: nieuweId(),
      leverancierId: lev.id,
      leverancierNaam: lev.naam,
      datum: werkdatumVan(new Date()),
      product: "",
      certificaat: null,
      verloopdatum: "",
      betrouwbaarheid: null,
      opmerking: "",
      conclusie: null,
    };
    dezeMaand.wijzig((m) => ({ controles: [...normaliseerMaand(m, cfg).controles, controle] }));
    setKiest(null);
    // Scrollt naar de nieuwe kaart, ook als de gebruiker onderaan de pagina begon.
    window.setTimeout(() => document.getElementById(`controle-${controle.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  const zoekerKaart = (
    <Kaart>
      <LeverancierZoeker leveranciers={cfg.leveranciers} onKies={voegControleToe} />
      <div style={{ marginTop: "var(--ruimte-s)" }}>
        <Knop variant="tekst" onClick={() => setKiest(null)}>
          {t.algemeen.annuleren}
        </Knop>
      </div>
    </Kaart>
  );

  const maakPdf = () => maakLeveranciersPdf(pdfBron, maand, { controles });

  return (
    <div className="app-scherm">
      <StatusBalk />
      <AppKop titel={t.leveranciers.titel} terugNaar="/" />
      <div className="app-inhoud">
        <PeriodeKiezer
          titel={maandLabel(maand)}
          ondertitel={t.leveranciers.aantalControles(controles.length)}
          onVorige={() => setMaand(verschuifMaand(maand, -1))}
          onVolgende={() => setMaand(verschuifMaand(maand, 1))}
          onNu={() => setMaand(verschuifMaand(new Date(), 0))}
          nuLabel={t.leveranciers.dezeMaand}
        />

        <div className="werkbalk">
          <Knop onClick={() => setKiest("boven")} disabled={!!kiest}>
            + {t.leveranciers.controleToevoegen}
          </Knop>
          <Knop variant="secundair" onClick={() => setPdfOpen(true)}>
            {t.algemeen.pdfMaken}
          </Knop>
          <Link to="/leveranciers/lijst" className="knop knop--secundair">
            {t.leverancierslijst.titel}
          </Link>
        </div>

        {kiest === "boven" ? zoekerKaart : null}

        {controles.length === 0 && !kiest ? (
          <Kaart>
            <p className="leeg-melding">{t.leveranciers.geenControles}</p>
          </Kaart>
        ) : null}

        <div className="kaartlijst">
          {controles.map((c) => {
            const dagen = c.verloopdatum ? dagenTot(c.verloopdatum) : null;
            return (
              <div key={c.id} id={`controle-${c.id}`} style={{ scrollMarginTop: "1rem" }}>
              <Kaart>
                <div className="kaart-kop">
                  <h3>{c.leverancierNaam}</h3>
                  {dagen !== null && dagen < 0 ? (
                    <span className="afwijking-badge">⚠ {t.leveranciers.verlopen}</span>
                  ) : dagen !== null && dagen <= 30 ? (
                    <span className="afwijking-badge">⚠ {t.leveranciers.verloptBinnenkort(dagen)}</span>
                  ) : null}
                </div>
                <div className="veldenraster">
                  <div className="veld">
                    <span className="invoerveld-label">{t.leveranciers.datumControle}</span>
                    <DatumBlad waarde={c.datum} onWijzig={(d) => zet(c.id, { datum: d })} leegLabel={t.algemeen.kiesDatum} titel={t.leveranciers.datumControle} />
                  </div>
                  <Invoerveld id={`lev-prod-${c.id}`} label={t.leveranciers.product} value={c.product} onChange={(e) => zet(c.id, { product: e.target.value })} />
                  <Segmentknop
                    label={t.leveranciers.certificaat}
                    opties={[
                      { waarde: "ja", label: t.algemeen.ja },
                      { waarde: "nee", label: t.algemeen.nee },
                    ]}
                    waarde={c.certificaat === null ? null : c.certificaat ? "ja" : "nee"}
                    onWijzig={(w) => zet(c.id, { certificaat: w === null ? null : w === "ja" })}
                  />
                  <div className="veld">
                    <span className="invoerveld-label">{t.leveranciers.verloopdatum}</span>
                    <DatumBlad waarde={c.verloopdatum} onWijzig={(d) => zet(c.id, { verloopdatum: d })} leegLabel={t.algemeen.kiesDatum} titel={t.leveranciers.verloopTitel(c.leverancierNaam)} />
                  </div>
                  <Segmentknop<Betrouwbaarheid>
                    label={t.leveranciers.betrouwbaarheid}
                    opties={[
                      { waarde: "goed", label: t.leveranciers.goed },
                      { waarde: "matig", label: t.leveranciers.matig },
                      { waarde: "slecht", label: t.leveranciers.slecht },
                    ]}
                    waarde={c.betrouwbaarheid}
                    onWijzig={(w) => zet(c.id, { betrouwbaarheid: w })}
                  />
                  <Segmentknop<Conclusie>
                    label={t.leveranciers.conclusie}
                    opties={[
                      { waarde: "goedgekeurd", label: t.leveranciers.goedgekeurd },
                      { waarde: "voorwaardelijk", label: t.leveranciers.voorwaardelijk },
                      { waarde: "afgekeurd", label: t.leveranciers.afgekeurd },
                    ]}
                    waarde={c.conclusie}
                    onWijzig={(w) => zet(c.id, { conclusie: w })}
                  />
                </div>
                <div style={{ marginTop: "var(--ruimte-m)" }}>
                  <Tekstveld id={`lev-opm-${c.id}`} label={t.leveranciers.opmerking} value={c.opmerking} onChange={(e) => zet(c.id, { opmerking: e.target.value })} />
                </div>
                <div style={{ marginTop: "var(--ruimte-s)", display: "flex", gap: "var(--ruimte-s)", flexWrap: "wrap" }}>
                  <Knop variant="gevaar" onClick={() => setTeVerwijderen(c)}>
                    {t.algemeen.verwijderen}
                  </Knop>
                  {/* Alles wordt al automatisch bewaard; deze knop geeft de gebruiker de bevestiging daarvan. */}
                  <Knop onClick={() => toon(t.algemeen.opgeslagen)}>{t.algemeen.opslaan}</Knop>
                </div>
              </Kaart>
              </div>
            );
          })}
        </div>

        {kiest === "onder" ? zoekerKaart : null}
        {controles.length > 0 ? (
          <div className="werkbalk">
            <Knop onClick={() => setKiest("onder")} disabled={!!kiest}>
              + {t.leveranciers.controleToevoegen}
            </Knop>
          </div>
        ) : null}

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
      <BevestigBlad
        open={!!teVerwijderen}
        titel={t.leveranciers.verwijderTitel}
        uitleg={teVerwijderen ? t.leveranciers.verwijderUitleg(teVerwijderen.leverancierNaam) : ""}
        onBevestig={() => teVerwijderen && verwijder(teVerwijderen.id)}
        onSluit={() => setTeVerwijderen(null)}
      />
      {toast}
      <HoofdNavigatie />
    </div>
  );
}

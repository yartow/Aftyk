import { useState } from "react";
import { Link } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { useAuth } from "../../context/AuthContext";
import { StatusBalk } from "../../components/StatusBalk";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Kaart } from "../../components/Kaart";
import { Blad } from "../../components/Blad";
import { useLocatie } from "../../context/LocatieContext";
import { documentId } from "../../lib/documenten";
import { maandagVan, maandLabel, maandSleutel, weekSleutel } from "../../lib/kalender";
import { CCP_PROCESSEN, OPSLAG_EENHEDEN, ccpAfwijking, opslagAfwijking } from "../../lib/weekformulierDefaults";
import { t, formatteerDatumLang } from "../../i18n";
import type { LeveranciersConfig, LeveranciersMaand, SchoonmaakWeek, Weekformulier } from "../../types/domain";
import "./Start.css";
import "../Schoonmaakplan/Schoonmaakplan.css";

export function StartScherm() {
  const { organisatie } = useAuth();
  const { locaties, actieveLocatie, actieveLocatieId, zetActieveLocatie } = useLocatie();
  const [kiesOpen, setKiesOpen] = useState(false);
  const nu = new Date();
  const maandag = maandagVan(nu);
  const week = weekSleutel(maandag);
  const maand = maandSleutel(nu);

  const status = useLiveQuery(async () => {
    const [sp, wf, lc, lm] = await Promise.all([
      db.documenten.get(documentId("schoonmaak-week", actieveLocatieId ?? "", week)),
      db.documenten.get(documentId("weekformulier", actieveLocatieId ?? "", week)),
      db.documenten.get(documentId("leveranciers-config", actieveLocatieId ?? "", "config")),
      db.documenten.get(documentId("leveranciers-maand", actieveLocatieId ?? "", maand)),
    ]);

    const afgevinkt = Object.values((sp?.inhoud as SchoonmaakWeek | undefined)?.dagen ?? {}).reduce(
      (som, dagen) => som + dagen.filter(Boolean).length,
      0,
    );

    const f = wf?.inhoud as Weekformulier | undefined;
    const afwijkingen = f
      ? OPSLAG_EENHEDEN.filter((e) => opslagAfwijking(e, f.opslag[e.id]?.temperatuur ?? "")).length +
        CCP_PROCESSEN.filter((p) => ccpAfwijking(p, f.ccps[p.id])).length +
        f.ontvangst.length
      : 0;
    const ingevuld = !!f && (f.ontvangst.length > 0 || Object.keys(f.opslag).length > 0 || Object.keys(f.ccps).length > 0);

    const lijst = ((lc?.inhoud as LeveranciersConfig | undefined)?.leveranciers ?? []).filter((l) => !l.gearchiveerd);
    const beoordelingen = (lm?.inhoud as LeveranciersMaand | undefined)?.beoordelingen ?? {};
    const beoordeeld = lijst.filter((l) => beoordelingen[l.id]?.conclusie).length;

    return { afgevinkt, afwijkingen, ingevuld, totaal: lijst.length, beoordeeld };
  }, [week, maand, actieveLocatieId]);

  return (
    <div className="app-scherm">
      <StatusBalk />
      <header className="app-koptekst">
        <h1>{t.start.titel}</h1>
      </header>
      <div className="app-inhoud">
        <p className="tekst-zwak" style={{ marginTop: 0 }}>
          {t.start.ondertitel(formatteerDatumLang(nu))}
        </p>
        {locaties.length > 1 ? (
          <button type="button" className="start-locatie" onClick={() => setKiesOpen(true)} aria-haspopup="dialog">
            <span aria-hidden="true">📍</span>
            <span className="start-locatie-naam">{actieveLocatie?.naam}</span>
            <span aria-hidden="true">▾</span>
          </button>
        ) : null}
        {!organisatie ? (
          <Kaart className="start-melding">
            <span>{t.bedrijfsgegevens.ontbreektMelding}</span>
            <Link to="/inrichten" className="knop knop--secundair">{t.bedrijfsgegevens.nuInvullen}</Link>
          </Kaart>
        ) : null}
        <nav className="start-lijst" aria-label={t.start.documenten}>
          <Link to="/schoonmaakplan" className="start-link">
            <Kaart className="start-kaart">
              <span className="start-icoon" aria-hidden="true">🧽</span>
              <span className="start-tekst">
                <strong>{t.start.schoonmaak}</strong>
                <span className="tekst-zwak">{status ? t.start.schoonmaakStatus(status.afgevinkt) : ""}</span>
              </span>
              <span aria-hidden="true" className="start-pijl">›</span>
            </Kaart>
          </Link>
          <Link to="/weekformulier" className="start-link">
            <Kaart className="start-kaart">
              <span className="start-icoon" aria-hidden="true">📋</span>
              <span className="start-tekst">
                <strong>{t.start.weekformulier}</strong>
                <span className="tekst-zwak">{status ? t.start.weekformulierStatus(status.afwijkingen, status.ingevuld) : ""}</span>
              </span>
              <span aria-hidden="true" className="start-pijl">›</span>
            </Kaart>
          </Link>
          <Link to="/leveranciers" className="start-link">
            <Kaart className="start-kaart">
              <span className="start-icoon" aria-hidden="true">🚚</span>
              <span className="start-tekst">
                <strong>{t.start.leveranciers}</strong>
                <span className="tekst-zwak">{status ? t.start.leveranciersStatus(maandLabel(nu), status.beoordeeld, status.totaal) : ""}</span>
              </span>
              <span aria-hidden="true" className="start-pijl">›</span>
            </Kaart>
          </Link>
        </nav>
      </div>
      <Blad open={kiesOpen} titel={t.locaties.kies} onSluit={() => setKiesOpen(false)}>
        <div className="sp-keuzes">
          {locaties.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`sp-keuze ${l.id === actieveLocatieId ? "sp-keuze--gekozen" : ""}`}
              onClick={() => {
                zetActieveLocatie(l.id);
                setKiesOpen(false);
              }}
            >
              <span>📍 {l.naam}</span>
              {l.id === actieveLocatieId ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      </Blad>
      <HoofdNavigatie />
    </div>
  );
}

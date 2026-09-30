import { useState, type CSSProperties } from "react";
import { Kaart } from "../../components/Kaart";
import { Knop } from "../../components/Knop";
import { Blad } from "../../components/Blad";
import { BevestigBlad } from "../../components/BevestigBlad";
import { Invoerveld } from "../../components/Invoerveld";
import { Segmentknop } from "../../components/Segmentknop";
import { useWeekformulierConfig } from "../../lib/weekformulierConfig";
import { CCP_PROCESSEN, EENHEID_SOORTEN, type OpslagEenheid } from "../../lib/weekformulierDefaults";
import { t } from "../../i18n";
import type { EenheidSoort } from "../../types/domain";

const ikoonKnop: CSSProperties = { padding: "0.5rem 0.75rem", minWidth: "var(--raakdoel-min)" };

/** Instellingen: apparaten van het weekformulier toevoegen, hernoemen, ordenen en verbergen. */
export function WeekformulierEenheden() {
  const { verborgen, zetVerborgen, eenheden, hernoem, verplaats, voegToe, verwijder } = useWeekformulierConfig();
  const [hernoemen, setHernoemen] = useState<OpslagEenheid | null>(null);
  const [naamInvoer, setNaamInvoer] = useState("");
  const [verwijderen, setVerwijderen] = useState<OpslagEenheid | null>(null);
  const [toevoegen, setToevoegen] = useState(false);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [nieuweSoort, setNieuweSoort] = useState<EenheidSoort>("koeling");

  if (!verborgen) return null;
  const lijst = eenheden();

  const zichtbaarheid = (id: string, naam: string) => (
    <Segmentknop<"zichtbaar" | "verborgen">
      ariaLabel={naam}
      leegmaken={false}
      opties={[
        { waarde: "zichtbaar", label: t.weekformulier.zichtbaar },
        { waarde: "verborgen", label: t.weekformulier.verborgen },
      ]}
      waarde={verborgen.has(id) ? "verborgen" : "zichtbaar"}
      onWijzig={(w) => w && zetVerborgen(id, w === "verborgen")}
    />
  );

  function opslaanNaam() {
    if (hernoemen) hernoem(hernoemen.id, naamInvoer);
    setHernoemen(null);
  }

  function opslaanNieuw() {
    voegToe(nieuweSoort, nieuweNaam);
    setToevoegen(false);
  }

  return (
    <section>
      <h2>{t.weekformulier.verborgenInstellingenTitel}</h2>
      <Kaart style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
        <p className="tekst-zwak" style={{ margin: 0 }}>
          {t.weekformulier.verborgenInstellingenUitleg}
        </p>

        {lijst.map((e, i) => (
          <div key={e.id} style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-xs, 0.25rem)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--ruimte-xs, 0.25rem)" }}>
              <span style={{ flex: 1, fontWeight: 600 }}>{e.naam}</span>
              <Knop
                variant="tekst"
                style={ikoonKnop}
                aria-label={t.weekformulier.eenheidHernoemen(e.naam)}
                onClick={() => {
                  setNaamInvoer(e.eigenNaam ?? "");
                  setHernoemen(e);
                }}
              >
                ✎
              </Knop>
              <Knop variant="tekst" style={ikoonKnop} disabled={i === 0} aria-label={t.weekformulier.eenheidOmhoog(e.naam)} onClick={() => verplaats(e.id, -1)}>
                ▲
              </Knop>
              <Knop variant="tekst" style={ikoonKnop} disabled={i === lijst.length - 1} aria-label={t.weekformulier.eenheidOmlaag(e.naam)} onClick={() => verplaats(e.id, 1)}>
                ▼
              </Knop>
              {e.eigen ? (
                <Knop variant="tekst" style={ikoonKnop} aria-label={t.weekformulier.eenheidVerwijderen(e.naam)} onClick={() => setVerwijderen(e)}>
                  ✕
                </Knop>
              ) : null}
            </div>
            {zichtbaarheid(e.id, e.naam)}
          </div>
        ))}

        <Knop variant="secundair" onClick={() => {
          setNieuweNaam("");
          setNieuweSoort("koeling");
          setToevoegen(true);
        }}>
          + {t.weekformulier.eenheidToevoegen}
        </Knop>

        {CCP_PROCESSEN.map((p) => (
          <div key={p.id} style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-xs, 0.25rem)" }}>
            <span style={{ fontWeight: 600 }}>{p.naam}</span>
            {zichtbaarheid(p.id, p.naam)}
          </div>
        ))}
      </Kaart>

      <Blad open={hernoemen !== null} titel={hernoemen ? t.weekformulier.eenheidHernoemen(hernoemen.naam) : ""} onSluit={() => setHernoemen(null)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
          <Invoerveld id="eenheid-naam" label={t.weekformulier.eenheidNaam} value={naamInvoer} onChange={(ev) => setNaamInvoer(ev.target.value)} />
          <p className="tekst-zwak" style={{ margin: 0 }}>{t.weekformulier.eenheidHernoemUitleg}</p>
          <Knop volledigeBreedte onClick={opslaanNaam}>{t.algemeen.opslaan}</Knop>
          <Knop variant="secundair" volledigeBreedte onClick={() => setHernoemen(null)}>{t.algemeen.annuleren}</Knop>
        </div>
      </Blad>

      <Blad open={toevoegen} titel={t.weekformulier.eenheidToevoegen} onSluit={() => setToevoegen(false)}>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)" }}>
          <Invoerveld id="eenheid-nieuw-naam" label={t.weekformulier.eenheidNaam} value={nieuweNaam} onChange={(ev) => setNieuweNaam(ev.target.value)} />
          <Segmentknop<EenheidSoort>
            label={t.weekformulier.eenheidSoort}
            leegmaken={false}
            opties={EENHEID_SOORTEN.map((s) => ({ waarde: s, label: t.weekformulier.eenheidSoorten[s] }))}
            waarde={nieuweSoort}
            onWijzig={(s) => s && setNieuweSoort(s)}
          />
          <Knop volledigeBreedte disabled={!nieuweNaam.trim()} onClick={opslaanNieuw}>{t.algemeen.opslaan}</Knop>
          <Knop variant="secundair" volledigeBreedte onClick={() => setToevoegen(false)}>{t.algemeen.annuleren}</Knop>
        </div>
      </Blad>

      <BevestigBlad
        open={verwijderen !== null}
        titel={verwijderen ? t.weekformulier.eenheidVerwijderen(verwijderen.naam) : ""}
        uitleg={verwijderen ? t.weekformulier.eenheidVerwijderBevestiging(verwijderen.naam) : ""}
        onBevestig={() => {
          if (verwijderen) verwijder(verwijderen.id);
          setVerwijderen(null);
        }}
        onSluit={() => setVerwijderen(null)}
      />
    </section>
  );
}

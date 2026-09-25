import { useState } from "react";
import { AppKop } from "../../components/AppKop";
import { StatusBalk } from "../../components/StatusBalk";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { Knop } from "../../components/Knop";
import { Kaart } from "../../components/Kaart";
import { Blad } from "../../components/Blad";
import { Invoerveld } from "../../components/Invoerveld";
import { Segmentknop } from "../../components/Segmentknop";
import { useDocument } from "../../lib/documenten";
import { hernoem, metLeverancier, naamIsBezet, schoonNaam, sorteerOpNaam, verwijder, zetGearchiveerd } from "../../lib/leveranciers";
import { t } from "../../i18n";
import type { Leverancier, LeveranciersConfig } from "../../types/domain";
import "../formulieren.css";
import "../Schoonmaakplan/Schoonmaakplan.css";

type Filter = "actief" | "gearchiveerd" | "alle";

export function LeverancierslijstScherm() {
  const config = useDocument<LeveranciersConfig>("leveranciers-config", "config", () => ({ leveranciers: [] }));
  const [filter, setFilter] = useState<Filter>("actief");
  const [bewerkId, setBewerkId] = useState<string | null>(null);
  const [naam, setNaam] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [nieuweNaam, setNieuweNaam] = useState("");
  const [nieuweFout, setNieuweFout] = useState<string | null>(null);

  if (!config.waarde) return null;
  const c = config.waarde;
  const l = t.leverancierslijst;
  const bewerkt = c.leveranciers.find((x) => x.id === bewerkId);

  // Actieve eerst, dan gearchiveerde; binnen elke groep alfabetisch.
  const zichtbaar: Leverancier[] = [
    ...sorteerOpNaam(c.leveranciers.filter((x) => !x.gearchiveerd)),
    ...sorteerOpNaam(c.leveranciers.filter((x) => x.gearchiveerd)),
  ].filter((x) => filter === "alle" || (filter === "actief" ? !x.gearchiveerd : x.gearchiveerd));

  function openBewerken(x: Leverancier) {
    setBewerkId(x.id);
    setNaam(x.naam);
    setFout(null);
  }

  function slaOp() {
    if (!bewerkt) return;
    if (!schoonNaam(naam)) return setFout(l.naamLeeg);
    if (naamIsBezet(c, naam, bewerkt.id)) return setFout(l.naamBestaatAl);
    config.wijzig((cfg) => hernoem(cfg, bewerkt.id, naam));
    setBewerkId(null);
  }

  function voegToe() {
    if (!schoonNaam(nieuweNaam)) return;
    const nieuw = metLeverancier(c, nieuweNaam);
    if (nieuw === c) return setNieuweFout(l.naamBestaatAl);
    config.wijzig((cfg) => metLeverancier(cfg, nieuweNaam));
    setNieuweNaam("");
    setNieuweFout(null);
  }

  return (
    <div className="app-scherm">
      <StatusBalk />
      <AppKop titel={l.titel} terugNaar="/" />
      <div className="app-inhoud">
        <p className="tekst-zwak" style={{ marginTop: 0 }}>
          {l.uitleg}
        </p>
        <Segmentknop<Filter>
          label={l.filter}
          leegmaken={false}
          opties={[
            { waarde: "actief", label: l.actief },
            { waarde: "gearchiveerd", label: l.gearchiveerd },
            { waarde: "alle", label: l.alle },
          ]}
          waarde={filter}
          onWijzig={(w) => w && setFilter(w)}
        />

        <Kaart>
          {zichtbaar.length === 0 ? (
            <p className="leeg-melding">{l.geen}</p>
          ) : (
            <div className="sp-tabelwrap">
              <table className="sp-legenda-tabel">
                <thead>
                  <tr>
                    <th>{l.kolNaam}</th>
                    <th>{l.kolStatus}</th>
                    <th>
                      <span className="visueel-verborgen">{l.bewerken}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {zichtbaar.map((x) => (
                    <tr key={x.id}>
                      <td>
                        <strong>{x.naam}</strong>
                      </td>
                      <td>{x.gearchiveerd ? l.gearchiveerd : l.actief}</td>
                      <td>
                        <Knop variant="secundair" onClick={() => openBewerken(x)} aria-label={`${l.bewerken}: ${x.naam}`}>
                          {l.bewerken}
                        </Knop>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Kaart>

        <Kaart>
          <form
            className="veldenraster"
            onSubmit={(e) => {
              e.preventDefault();
              voegToe();
            }}
          >
            <div>
              <Invoerveld
                id="lijst-nieuwe-leverancier"
                label={t.leveranciers.nieuweLeverancier}
                autoComplete="off"
                value={nieuweNaam}
                onChange={(e) => {
                  setNieuweNaam(e.target.value);
                  setNieuweFout(null);
                }}
              />
              {nieuweFout ? <span className="veldfout">{nieuweFout}</span> : null}
            </div>
            <Knop type="submit" disabled={!nieuweNaam.trim()}>
              + {l.toevoegen}
            </Knop>
          </form>
        </Kaart>
      </div>

      <Blad open={!!bewerkt} titel={bewerkt ? bewerkt.naam : l.bewerken} onSluit={() => setBewerkId(null)}>
        {bewerkt ? (
          <>
            <div>
              <Invoerveld
                id="lijst-naam"
                label={l.naam}
                autoComplete="off"
                value={naam}
                onChange={(e) => {
                  setNaam(e.target.value);
                  setFout(null);
                }}
              />
              {fout ? (
                <span className="veldfout" role="alert">
                  {fout}
                </span>
              ) : null}
            </div>
            <p className="tekst-zwak" style={{ margin: 0 }}>
              {l.hernoemUitleg}
            </p>
            <Knop volledigeBreedte onClick={slaOp}>
              {l.opslaan}
            </Knop>
            <Knop
              volledigeBreedte
              variant="secundair"
              onClick={() => {
                config.wijzig((cfg) => zetGearchiveerd(cfg, bewerkt.id, !bewerkt.gearchiveerd));
                setBewerkId(null);
              }}
            >
              {bewerkt.gearchiveerd ? l.terugzetten : l.archiveren}
            </Knop>
            <Knop
              volledigeBreedte
              variant="gevaar"
              onClick={() => {
                if (!window.confirm(l.verwijderBevestiging(bewerkt.naam))) return;
                config.wijzig((cfg) => verwijder(cfg, bewerkt.id));
                setBewerkId(null);
              }}
            >
              {l.verwijderen}
            </Knop>
          </>
        ) : null}
      </Blad>
      <HoofdNavigatie />
    </div>
  );
}

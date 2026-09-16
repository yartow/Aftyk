import { useNavigate, useParams } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Knop } from "../../components/Knop";
import { t, formatteerDatumKort, formatteerTijd } from "../../i18n/nl";

export function BevestigingScherm() {
  const { registratieId } = useParams<{ registratieId: string }>();
  const navigate = useNavigate();
  const registratie = useLiveQuery(() => (registratieId ? db.registraties.get(registratieId) : undefined), [registratieId]);

  if (!registratie) return null;

  const apparaatDatum = new Date(registratie.apparaatTijd);

  return (
    <div className="app-scherm">
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", gap: "var(--ruimte-l)" }}>
        <div
          aria-hidden="true"
          style={{
            width: "5rem",
            height: "5rem",
            borderRadius: "50%",
            background: "var(--kleur-gedaan)",
            color: "var(--kleur-primair-tekst)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2.5rem",
          }}
        >
          ✓
        </div>
        <div>
          <h1 style={{ margin: "0 0 0.5rem 0" }}>{t.bevestiging.titel}</h1>
          <p style={{ margin: 0, fontSize: "1.0625rem" }}>
            {t.bevestiging.tekst(formatteerDatumKort(apparaatDatum), formatteerTijd(apparaatDatum))}
          </p>
          <p className="tekst-zwak" style={{ marginTop: "0.5rem" }}>
            {registratie.sjabloonNaam} — {registratie.gebruikerNaam}
          </p>
          {!registratie.ontvangenOp ? <p className="tekst-zwak" style={{ marginTop: "0.5rem" }}>{t.bevestiging.lokaalNogNiet}</p> : null}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-s)", width: "100%", maxWidth: "20rem" }}>
          <Knop volledigeBreedte onClick={() => navigate("/vandaag")}>
            {t.bevestiging.naarVandaag}
          </Knop>
          <Knop variant="tekst" onClick={() => navigate(`/correctie/${registratie.id}`)}>
            {t.bevestiging.correctieToevoegen}
          </Knop>
        </div>
      </div>
    </div>
  );
}

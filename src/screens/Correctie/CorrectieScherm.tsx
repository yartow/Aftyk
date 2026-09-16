import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../../db/db";
import { AppKop } from "../../components/AppKop";
import { Kaart } from "../../components/Kaart";
import { Knop } from "../../components/Knop";
import { Tekstveld } from "../../components/Invoerveld";
import { useAuth } from "../../context/AuthContext";
import { nieuweId } from "../../lib/id";
import { t } from "../../i18n/nl";

/**
 * Registraties zijn append-only (zie Supabase RLS-policies) — een fout
 * wordt hier niet "gerepareerd" maar toegevoegd als aparte, gedateerde
 * toelichting die in het archief onder de oorspronkelijke registratie
 * verschijnt. Dat is precies wat een inspecteur van een betrouwbaar
 * logboek verwacht.
 */
export function CorrectieScherm() {
  const { registratieId } = useParams<{ registratieId: string }>();
  const navigate = useNavigate();
  const { profiel } = useAuth();
  const [toelichting, setToelichting] = useState("");

  async function opslaan() {
    if (!registratieId || !profiel || !toelichting.trim()) return;
    const aangemaaktOp = new Date().toISOString();
    const correctieId = nieuweId();
    await db.correcties.put({
      id: correctieId,
      registratieId,
      gebruikerId: profiel.id,
      gebruikerNaam: profiel.naam,
      toelichting: toelichting.trim(),
      aangemaaktOp,
    });
    await db.uitgaand.put({ id: correctieId, soort: "correctie", pogingen: 0, aangemaaktOp });
    navigate("/vandaag");
  }

  return (
    <div className="app-scherm">
      <AppKop titel={t.correctie.titel} terugNaar="/vandaag" />
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
        <Kaart>
          <p style={{ margin: 0 }}>{t.correctie.uitleg}</p>
        </Kaart>
        <Tekstveld
          label={t.correctie.toelichtingLabel}
          value={toelichting}
          onChange={(e) => setToelichting(e.target.value)}
          rows={5}
        />
        <Knop volledigeBreedte onClick={opslaan} disabled={!toelichting.trim()}>
          {t.correctie.opslaan}
        </Knop>
      </div>
    </div>
  );
}

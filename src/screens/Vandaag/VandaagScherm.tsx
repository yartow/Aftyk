import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../db/db";
import { Kaart } from "../../components/Kaart";
import { Knop } from "../../components/Knop";
import { StatusBalk } from "../../components/StatusBalk";
import { HoofdNavigatie } from "../../components/HoofdNavigatie";
import { periodeVoorDatum, laatsteRegistratieInPeriode } from "../../lib/planning";
import { t, formatteerDatumLang } from "../../i18n/nl";
import type { Registratie, Sjabloon } from "../../types/domain";

interface LijstStatus {
  sjabloon: Sjabloon;
  laatsteRegistratie?: Registratie;
}

export function VandaagScherm() {
  const navigate = useNavigate();
  const alleSjablonen = useLiveQuery(() => db.sjablonen.toArray(), []);
  const [statussen, setStatussen] = useState<LijstStatus[]>([]);

  const actieveSjablonen = (alleSjablonen ?? []).filter((s) => s.actief);

  useEffect(() => {
    (async () => {
      const vandaag = new Date();
      const resultaten: LijstStatus[] = [];
      for (const sjabloon of actieveSjablonen) {
        const { vanaf, totEnMet } = periodeVoorDatum(sjabloon, vandaag);
        const laatste = await laatsteRegistratieInPeriode(sjabloon.id, vanaf, totEnMet);
        resultaten.push({ sjabloon, laatsteRegistratie: laatste });
      }
      setStatussen(resultaten);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actieveSjablonen.length, alleSjablonen]);

  return (
    <div className="app-scherm">
      <StatusBalk />
      <header className="app-koptekst">
        <h1>{t.vandaag.titel}</h1>
      </header>
      <div className="app-inhoud">
        <p className="tekst-zwak" style={{ marginTop: 0 }}>{t.vandaag.ondertitel(formatteerDatumLang(new Date()))}</p>

        {statussen.length === 0 ? (
          <Kaart>
            <p style={{ margin: 0 }}>{t.vandaag.geenLijsten}</p>
          </Kaart>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }}>
            {statussen.map(({ sjabloon, laatsteRegistratie }) => (
              <Kaart key={sjabloon.id}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "var(--ruimte-m)", flexWrap: "wrap" }}>
                  <div>
                    <h2 style={{ margin: "0 0 0.25rem 0", fontSize: "1.125rem" }}>{sjabloon.naam}</h2>
                    <p className="tekst-zwak" style={{ margin: 0 }}>
                      {laatsteRegistratie
                        ? `${t.vandaag.afgerond} — ${laatsteRegistratie.antwoorden.length} punten`
                        : t.vandaag.nogNietIngevuld}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "var(--ruimte-s)" }}>
                    {laatsteRegistratie ? (
                      <Knop variant="secundair" onClick={() => navigate(`/checklist/${sjabloon.id}`)}>
                        {t.vandaag.invullen}
                      </Knop>
                    ) : (
                      <Knop onClick={() => navigate(`/checklist/${sjabloon.id}`)}>{t.vandaag.invullen}</Knop>
                    )}
                  </div>
                </div>
              </Kaart>
            ))}
          </div>
        )}
      </div>
      <HoofdNavigatie />
    </div>
  );
}

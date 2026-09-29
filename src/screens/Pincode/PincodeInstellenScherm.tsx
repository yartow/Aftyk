import { useState } from "react";
import { Knop } from "../../components/Knop";
import { Cijferpad } from "../../components/Cijferpad";
import { useAuth } from "../../context/AuthContext";
import { t } from "../../i18n";

/**
 * Verplichte pincode voor dit apparaat. Elk apparaat heeft zijn eigen
 * pincode; hij wordt alleen lokaal bewaard (zie lib/pin.ts).
 */
export function PincodeInstellenScherm() {
  const { stelPincodeIn, logUit, modus } = useAuth();
  const [eerste, setEerste] = useState("");
  const [waarde, setWaarde] = useState("");
  const [fout, setFout] = useState(false);

  async function wijzig(nieuw: string) {
    setWaarde(nieuw);
    if (nieuw.length !== 4) return;
    if (!eerste) {
      setEerste(nieuw);
      setWaarde("");
      setFout(false);
    } else if (nieuw === eerste) {
      await stelPincodeIn(nieuw); // het scherm verdwijnt vanzelf
    } else {
      setFout(true);
      setEerste("");
      setWaarde("");
    }
  }

  return (
    <div className="app-scherm">
      <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: "var(--ruimte-l)", flex: 1 }}>
        <div style={{ textAlign: "center", maxWidth: "24rem" }}>
          <h1 style={{ marginBottom: "0.25rem" }}>{t.pincode.instellenTitel}</h1>
          <p className="tekst-zwak">{t.pincode.instellenUitleg}</p>
          <p style={{ fontWeight: 600 }}>{eerste ? t.instellingen.pincodeHerhaal : t.instellingen.pincodeNieuw}</p>
          {fout ? <p style={{ color: "var(--kleur-fout)", fontWeight: 600 }}>{t.instellingen.pincodeNietGelijk}</p> : null}
        </div>
        <Cijferpad waarde={waarde} onWijzig={wijzig} />
        {/* Uitweg als iemand met het verkeerde account is ingelogd. */}
        {modus === "supabase" ? (
          <Knop variant="tekst" onClick={() => void logUit()}>
            {t.instellingen.uitloggen}
          </Knop>
        ) : null}
      </div>
    </div>
  );
}

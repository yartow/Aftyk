import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppKop } from "../../components/AppKop";
import { Invoerveld } from "../../components/Invoerveld";
import { Knop } from "../../components/Knop";
import { useAuth } from "../../context/AuthContext";
import { t } from "../../i18n/nl";

/**
 * Eenmalige inrichting bij eerste gebruik (zie "Eenmalige inrichting" in het
 * plan) — hierna alleen nog te bewerken via Instellingen. Werkt ook zonder
 * Supabase-koppeling (lokale modus), zodat de rest van de app zonder
 * account te testen is.
 */
export function BedrijfsgegevensScherm({ bewerkModus = false }: { bewerkModus?: boolean }) {
  const navigate = useNavigate();
  const { organisatie, richtOrganisatieIn, werkOrganisatieBij } = useAuth();

  const [naam, setNaam] = useState(organisatie?.naam ?? "");
  const [adres, setAdres] = useState(organisatie?.adres ?? "");
  const [postcode, setPostcode] = useState(organisatie?.postcode ?? "");
  const [plaats, setPlaats] = useState(organisatie?.plaats ?? "");
  const [kvkNummer, setKvkNummer] = useState(organisatie?.kvkNummer ?? "");
  const [contactpersoon, setContactpersoon] = useState(organisatie?.contactpersoon ?? "");
  const [telefoon, setTelefoon] = useState(organisatie?.telefoon ?? "");
  const [email, setEmail] = useState(organisatie?.email ?? "");
  const [bezig, setBezig] = useState(false);

  async function versturen(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    const gegevens = { naam, adres, postcode, plaats, kvkNummer, contactpersoon, telefoon, email };
    if (bewerkModus) {
      await werkOrganisatieBij(gegevens);
      navigate("/instellingen");
    } else {
      await richtOrganisatieIn(gegevens);
      navigate("/vandaag");
    }
    setBezig(false);
  }

  return (
    <div className="app-scherm">
      <AppKop titel={t.bedrijfsgegevens.titel} terugNaar={bewerkModus ? "/instellingen" : undefined} />
      <form className="app-inhoud" style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }} onSubmit={versturen}>
        <p className="tekst-zwak" style={{ marginTop: 0 }}>{t.bedrijfsgegevens.uitleg}</p>
        <Invoerveld label={t.bedrijfsgegevens.naam} required value={naam} onChange={(e) => setNaam(e.target.value)} />
        <Invoerveld label={t.bedrijfsgegevens.adres} value={adres} onChange={(e) => setAdres(e.target.value)} />
        <div style={{ display: "flex", gap: "var(--ruimte-m)", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 8rem" }}>
            <Invoerveld label={t.bedrijfsgegevens.postcode} value={postcode} onChange={(e) => setPostcode(e.target.value)} />
          </div>
          <div style={{ flex: "2 1 12rem" }}>
            <Invoerveld label={t.bedrijfsgegevens.plaats} value={plaats} onChange={(e) => setPlaats(e.target.value)} />
          </div>
        </div>
        <Invoerveld label={t.bedrijfsgegevens.kvkNummer} value={kvkNummer} onChange={(e) => setKvkNummer(e.target.value)} />
        <Invoerveld label={t.bedrijfsgegevens.contactpersoon} value={contactpersoon} onChange={(e) => setContactpersoon(e.target.value)} />
        <Invoerveld label={t.bedrijfsgegevens.telefoon} type="tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} />
        <Invoerveld label={t.bedrijfsgegevens.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Knop volledigeBreedte type="submit" disabled={bezig || !naam.trim()}>
          {t.bedrijfsgegevens.opslaan}
        </Knop>
      </form>
    </div>
  );
}

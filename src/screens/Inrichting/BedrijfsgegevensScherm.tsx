import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { AppKop } from "../../components/AppKop";
import { Invoerveld } from "../../components/Invoerveld";
import { Knop } from "../../components/Knop";
import { useAuth } from "../../context/AuthContext";
import { zetInrichtingOvergeslagen } from "../../lib/inrichting";
import { startDemo } from "../../lib/demo";
import { isDemo } from "../../lib/modus";
import { t } from "../../i18n";

/**
 * Eenmalige inrichting bij eerste gebruik — hierna alleen nog te bewerken
 * via Instellingen. Het hoofdkantoor heeft een bezoekadres (fysieke locatie)
 * en een postadres; vestigingen met eigen adres worden apart beheerd onder
 * Instellingen → Locaties. Werkt ook zonder Supabase-koppeling (lokale modus).
 */
export function BedrijfsgegevensScherm({ bewerkModus = false }: { bewerkModus?: boolean }) {
  const navigate = useNavigate();
  const { organisatie, richtOrganisatieIn, werkOrganisatieBij } = useAuth();

  const [naam, setNaam] = useState(organisatie?.naam ?? "");
  const [kvkNummer, setKvkNummer] = useState(organisatie?.kvkNummer ?? "");
  const [contactpersoon, setContactpersoon] = useState(organisatie?.contactpersoon ?? "");
  const [telefoon, setTelefoon] = useState(organisatie?.telefoon ?? "");
  const [email, setEmail] = useState(organisatie?.email ?? "");
  const [adres, setAdres] = useState(organisatie?.adres ?? "");
  const [postcode, setPostcode] = useState(organisatie?.postcode ?? "");
  const [plaats, setPlaats] = useState(organisatie?.plaats ?? "");
  const [postGelijk, setPostGelijk] = useState(!organisatie || (!organisatie.postAdres && !organisatie.postPostcode && !organisatie.postPlaats));
  const [postAdres, setPostAdres] = useState(organisatie?.postAdres ?? "");
  const [postPostcode, setPostPostcode] = useState(organisatie?.postPostcode ?? "");
  const [postPlaats, setPostPlaats] = useState(organisatie?.postPlaats ?? "");
  const [bezig, setBezig] = useState(false);

  async function versturen(e: FormEvent) {
    e.preventDefault();
    setBezig(true);
    const gegevens = {
      naam,
      kvkNummer,
      contactpersoon,
      telefoon,
      email,
      adres,
      postcode,
      plaats,
      // Leeg postadres betekent "gelijk aan het bezoekadres".
      postAdres: postGelijk ? "" : postAdres,
      postPostcode: postGelijk ? "" : postPostcode,
      postPlaats: postGelijk ? "" : postPlaats,
    };
    if (bewerkModus) {
      await werkOrganisatieBij(gegevens);
      navigate("/instellingen");
    } else {
      await richtOrganisatieIn(gegevens);
      navigate("/");
    }
    setBezig(false);
  }

  /** Bij bewerken: terug naar Instellingen. Bij eerste inrichting: overslaan, later invullen. */
  function annuleren() {
    if (bewerkModus) {
      navigate("/instellingen");
    } else {
      zetInrichtingOvergeslagen();
      navigate("/");
    }
  }

  return (
    <div className="app-scherm">
      <AppKop titel={t.bedrijfsgegevens.titel} terugNaar={bewerkModus ? "/instellingen" : undefined} />
      <form className="app-inhoud" style={{ display: "flex", flexDirection: "column", gap: "var(--ruimte-m)" }} onSubmit={versturen}>
        <p className="tekst-zwak" style={{ marginTop: 0 }}>{t.bedrijfsgegevens.uitleg}</p>

        <h2 style={{ marginBottom: 0 }}>{t.bedrijfsgegevens.sectieBedrijf}</h2>
        <Invoerveld label={t.bedrijfsgegevens.naam} required value={naam} onChange={(e) => setNaam(e.target.value)} />
        <Invoerveld label={t.bedrijfsgegevens.kvkNummer} value={kvkNummer} onChange={(e) => setKvkNummer(e.target.value)} />
        <Invoerveld label={t.bedrijfsgegevens.contactpersoon} value={contactpersoon} onChange={(e) => setContactpersoon(e.target.value)} />
        <Invoerveld label={t.bedrijfsgegevens.telefoon} type="tel" value={telefoon} onChange={(e) => setTelefoon(e.target.value)} />
        <Invoerveld label={t.bedrijfsgegevens.email} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />

        <h2 style={{ marginBottom: 0 }}>{t.bedrijfsgegevens.sectieBezoek}</h2>
        <p className="tekst-zwak" style={{ margin: 0 }}>{t.bedrijfsgegevens.bezoekUitleg}</p>
        <Invoerveld id="bezoek-adres" label={t.bedrijfsgegevens.adres} value={adres} onChange={(e) => setAdres(e.target.value)} />
        <div style={{ display: "flex", gap: "var(--ruimte-m)", flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 8rem" }}>
            <Invoerveld id="bezoek-postcode" label={t.bedrijfsgegevens.postcode} value={postcode} onChange={(e) => setPostcode(e.target.value)} />
          </div>
          <div style={{ flex: "2 1 12rem" }}>
            <Invoerveld id="bezoek-plaats" label={t.bedrijfsgegevens.plaats} value={plaats} onChange={(e) => setPlaats(e.target.value)} />
          </div>
        </div>

        <h2 style={{ marginBottom: 0 }}>{t.bedrijfsgegevens.sectiePost}</h2>
        <label style={{ display: "flex", alignItems: "center", gap: "var(--ruimte-s)", minHeight: "var(--raakdoel-min)", cursor: "pointer" }}>
          <input type="checkbox" style={{ width: "1.5rem", height: "1.5rem" }} checked={postGelijk} onChange={(e) => setPostGelijk(e.target.checked)} />
          <span>{t.bedrijfsgegevens.postGelijk}</span>
        </label>
        {!postGelijk ? (
          <>
            <Invoerveld id="post-adres" label={t.bedrijfsgegevens.adres} value={postAdres} onChange={(e) => setPostAdres(e.target.value)} />
            <div style={{ display: "flex", gap: "var(--ruimte-m)", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 8rem" }}>
                <Invoerveld id="post-postcode" label={t.bedrijfsgegevens.postcode} value={postPostcode} onChange={(e) => setPostPostcode(e.target.value)} />
              </div>
              <div style={{ flex: "2 1 12rem" }}>
                <Invoerveld id="post-plaats" label={t.bedrijfsgegevens.plaats} value={postPlaats} onChange={(e) => setPostPlaats(e.target.value)} />
              </div>
            </div>
          </>
        ) : null}

        {!bewerkModus ? <p className="tekst-zwak" style={{ margin: 0 }}>{t.bedrijfsgegevens.eersteLocatieUitleg}</p> : null}

        <Knop volledigeBreedte type="submit" disabled={bezig || !naam.trim()}>
          {t.bedrijfsgegevens.opslaan}
        </Knop>
        <Knop volledigeBreedte variant="secundair" onClick={annuleren} disabled={bezig}>
          {bewerkModus ? t.algemeen.annuleren : t.bedrijfsgegevens.laterInvullen}
        </Knop>
        {!bewerkModus ? <p className="tekst-zwak" style={{ margin: 0 }}>{t.bedrijfsgegevens.overslaanUitleg}</p> : null}
        {!bewerkModus && !isDemo() ? (
          <Knop variant="tekst" onClick={startDemo}>{t.bedrijfsgegevens.demoBekijken}</Knop>
        ) : null}
      </form>
    </div>
  );
}

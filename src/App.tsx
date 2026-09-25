import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { useInstellingen } from "./context/InstellingenContext";

import { InloggenScherm } from "./screens/Auth/InloggenScherm";
import { AanmeldenScherm } from "./screens/Auth/AanmeldenScherm";
import { WachtwoordVergetenScherm } from "./screens/Auth/WachtwoordVergetenScherm";
import { NieuwWachtwoordScherm } from "./screens/Auth/NieuwWachtwoordScherm";
import { BedrijfsgegevensScherm } from "./screens/Inrichting/BedrijfsgegevensScherm";
import { PincodeScherm } from "./screens/Pincode/PincodeScherm";
import { StartScherm } from "./screens/Start/StartScherm";
import { SchoonmaakplanScherm } from "./screens/Schoonmaakplan/SchoonmaakplanScherm";
import { WeekformulierScherm } from "./screens/Weekformulier/WeekformulierScherm";
import { LocatiesScherm } from "./screens/Locaties/LocatiesScherm";
import { LeveranciersScherm } from "./screens/Leveranciers/LeveranciersScherm";
import { LeverancierslijstScherm } from "./screens/Leveranciers/LeverancierslijstScherm";
import { InstellingenScherm } from "./screens/Instellingen/InstellingenScherm";
import { inrichtingIsOvergeslagen } from "./lib/inrichting";
import { Knop } from "./components/Knop";
import { t } from "./i18n";
import { DemoBanner } from "./components/DemoBanner";
import { BijwerkMelding } from "./components/BijwerkMelding";

/**
 * Bepaalt in welke fase de app zit en stuurt onbereikbare routes terug naar
 * het juiste scherm. Volgorde is belangrijk:
 * 1. wachtwoord-reset-link werkt altijd (komt zelf al met een sessie mee)
 * 2. zonder Supabase-sessie (indien gekoppeld) → inloggen
 * 3. zonder bedrijfsgegevens → eenmalige inrichting
 * 4. vergrendeld door pincode → pincodescherm
 * 5. verder → de eigenlijke app
 */
function Poortwachter({ children }: { children: ReactNode }) {
  const { klaar, modus, sessie, organisatie, vergrendeldDoorPincode, accountLaadFout, probeerAccountOpnieuw, logUit } = useAuth();
  const { klaar: instellingenKlaar } = useInstellingen();
  const locatie = useLocation();

  if (!klaar || !instellingenKlaar) return null;

  if (locatie.pathname === "/nieuw-wachtwoord") return <>{children}</>;

  if (modus === "supabase" && !sessie) {
    if (["/inloggen", "/wachtwoord-vergeten", "/aanmelden"].includes(locatie.pathname)) return <>{children}</>;
    return <Navigate to="/inloggen" replace />;
  }

  // Ingelogd maar het bedrijf kon niet worden geladen: niet naar de inrichting sturen,
  // anders ontstaat er een tweede bedrijf naast het bestaande.
  if (modus === "supabase" && sessie && !organisatie && accountLaadFout) {
    return (
      <div className="app-scherm">
        <div className="app-inhoud" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: "var(--ruimte-m)", flex: 1, maxWidth: "24rem", margin: "0 auto" }}>
          <h1>{t.auth.accountLadenMislukt}</h1>
          <p className="tekst-zwak">{t.auth.accountLadenUitleg}</p>
          <Knop volledigeBreedte onClick={() => void probeerAccountOpnieuw()}>
            {t.auth.opnieuwProberen}
          </Knop>
          <Knop variant="secundair" volledigeBreedte onClick={() => void logUit()}>
            {t.instellingen.uitloggen}
          </Knop>
        </div>
      </div>
    );
  }

  if (!organisatie && !inrichtingIsOvergeslagen()) {
    if (locatie.pathname === "/inrichten") return <>{children}</>;
    return <Navigate to="/inrichten" replace />;
  }

  if (vergrendeldDoorPincode) {
    if (locatie.pathname === "/pincode") return <>{children}</>;
    return <Navigate to="/pincode" replace />;
  }

  // Zonder bedrijfsgegevens (overgeslagen) blijft /inrichten bereikbaar om alsnog in te vullen.
  if (!organisatie && locatie.pathname === "/inrichten") return <>{children}</>;

  if (["/inloggen", "/wachtwoord-vergeten", "/aanmelden", "/inrichten", "/pincode"].includes(locatie.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function Schermen() {
  return (
    <Poortwachter>
      <Routes>
        <Route path="/" element={<StartScherm />} />
        <Route path="/inloggen" element={<InloggenScherm />} />
        <Route path="/aanmelden" element={<AanmeldenScherm />} />
        <Route path="/wachtwoord-vergeten" element={<WachtwoordVergetenScherm />} />
        <Route path="/nieuw-wachtwoord" element={<NieuwWachtwoordScherm />} />
        <Route path="/inrichten" element={<BedrijfsgegevensScherm />} />
        <Route path="/pincode" element={<PincodeScherm />} />

        <Route path="/schoonmaakplan" element={<SchoonmaakplanScherm />} />
        <Route path="/weekformulier" element={<WeekformulierScherm />} />
        <Route path="/leveranciers" element={<LeveranciersScherm />} />
        <Route path="/leveranciers/lijst" element={<LeverancierslijstScherm />} />

        <Route path="/instellingen" element={<InstellingenScherm />} />
        <Route path="/instellingen/locaties" element={<LocatiesScherm />} />
        <Route path="/instellingen/bedrijfsgegevens" element={<BedrijfsgegevensScherm bewerkModus />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Poortwachter>
  );
}

export default function App() {
  // De sleutel bouwt het scherm opnieuw op na een taalwissel; de route zit in de URL en blijft dus behouden.
  const { taal } = useInstellingen();
  return (
    <HashRouter key={taal}>
      <DemoBanner />
      <Schermen />
      <BijwerkMelding />
    </HashRouter>
  );
}

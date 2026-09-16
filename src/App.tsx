import { HashRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./context/AuthContext";
import { useInstellingen } from "./context/InstellingenContext";

import { InloggenScherm } from "./screens/Auth/InloggenScherm";
import { WachtwoordVergetenScherm } from "./screens/Auth/WachtwoordVergetenScherm";
import { NieuwWachtwoordScherm } from "./screens/Auth/NieuwWachtwoordScherm";
import { BedrijfsgegevensScherm } from "./screens/Inrichting/BedrijfsgegevensScherm";
import { PincodeScherm } from "./screens/Pincode/PincodeScherm";
import { VandaagScherm } from "./screens/Vandaag/VandaagScherm";
import { ChecklistScherm } from "./screens/Checklist/ChecklistScherm";
import { BevestigingScherm } from "./screens/Bevestiging/BevestigingScherm";
import { CorrectieScherm } from "./screens/Correctie/CorrectieScherm";
import { JaaroverzichtScherm } from "./screens/Archief/JaaroverzichtScherm";
import { DagDetailScherm } from "./screens/Archief/DagDetailScherm";
import { ExporterenScherm } from "./screens/Exporteren/ExporterenScherm";
import { InstellingenScherm } from "./screens/Instellingen/InstellingenScherm";
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
  const { klaar, modus, sessie, organisatie, vergrendeldDoorPincode } = useAuth();
  const { klaar: instellingenKlaar } = useInstellingen();
  const locatie = useLocation();

  if (!klaar || !instellingenKlaar) return null;

  if (locatie.pathname === "/nieuw-wachtwoord") return <>{children}</>;

  if (modus === "supabase" && !sessie) {
    if (locatie.pathname === "/inloggen" || locatie.pathname === "/wachtwoord-vergeten") return <>{children}</>;
    return <Navigate to="/inloggen" replace />;
  }

  if (!organisatie) {
    if (locatie.pathname === "/inrichten") return <>{children}</>;
    return <Navigate to="/inrichten" replace />;
  }

  if (vergrendeldDoorPincode) {
    if (locatie.pathname === "/pincode") return <>{children}</>;
    return <Navigate to="/pincode" replace />;
  }

  if (["/inloggen", "/wachtwoord-vergeten", "/inrichten", "/pincode"].includes(locatie.pathname)) {
    return <Navigate to="/vandaag" replace />;
  }

  return <>{children}</>;
}

function Schermen() {
  return (
    <Poortwachter>
      <Routes>
        <Route path="/" element={<Navigate to="/vandaag" replace />} />
        <Route path="/inloggen" element={<InloggenScherm />} />
        <Route path="/wachtwoord-vergeten" element={<WachtwoordVergetenScherm />} />
        <Route path="/nieuw-wachtwoord" element={<NieuwWachtwoordScherm />} />
        <Route path="/inrichten" element={<BedrijfsgegevensScherm />} />
        <Route path="/pincode" element={<PincodeScherm />} />

        <Route path="/vandaag" element={<VandaagScherm />} />
        <Route path="/checklist/:sjabloonId" element={<ChecklistScherm />} />
        <Route path="/bevestiging/:registratieId" element={<BevestigingScherm />} />
        <Route path="/correctie/:registratieId" element={<CorrectieScherm />} />

        <Route path="/archief" element={<JaaroverzichtScherm />} />
        <Route path="/archief/dag/:datum" element={<DagDetailScherm />} />
        <Route path="/exporteren" element={<ExporterenScherm />} />

        <Route path="/instellingen" element={<InstellingenScherm />} />
        <Route path="/instellingen/bedrijfsgegevens" element={<BedrijfsgegevensScherm bewerkModus />} />

        <Route path="*" element={<Navigate to="/vandaag" replace />} />
      </Routes>
    </Poortwachter>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Schermen />
      <BijwerkMelding />
    </HashRouter>
  );
}

/**
 * Alle in de gebruikersinterface getoonde tekst staat hier gebundeld, zodat
 * er nooit losse Engelse tekst per ongeluk in een scherm terechtkomt en
 * teksten op één plek te controleren/aan te passen zijn.
 */
export const t = {
  algemeen: {
    appNaam: "Hygiënecode",
    opslaan: "Opslaan",
    annuleren: "Annuleren",
    terug: "Terug",
    verder: "Verder",
    sluiten: "Sluiten",
    verwijderen: "Verwijderen",
    bewerken: "Bewerken",
    laden: "Bezig met laden…",
    onbekend: "Onbekend",
  },

  status: {
    gedaan: "Gedaan",
    nietGedaan: "Niet gedaan",
  },

  pincode: {
    titel: "Voer pincode in",
    subtitel: "Vraag de eigenaar als je de code niet weet.",
    fout: "Onjuiste pincode, probeer opnieuw.",
    vergeten: "Pincode vergeten? Log in met wachtwoord.",
    wissen: "Wissen",
  },

  vandaag: {
    titel: "Vandaag",
    ondertitel: (datum: string) => `Overzicht voor ${datum}`,
    nogNietIngevuld: "Nog niet ingevuld",
    afgerond: "Afgerond",
    gedeeltelijk: (aantal: number, totaal: number) => `${aantal} van ${totaal} afgerond`,
    invullen: "Invullen",
    bekijken: "Bekijken",
    geenLijsten: "Er zijn geen checklists ingesteld voor vandaag.",
    nogNietVerstuurd: (aantal: number) =>
      aantal === 1
        ? "1 registratie nog niet verstuurd"
        : `${aantal} registraties nog niet verstuurd`,
    laatstGesynchroniseerd: (tekst: string) => `Laatst gesynchroniseerd: ${tekst}`,
    nooitGesynchroniseerd: "Nog niet gesynchroniseerd",
  },

  checklist: {
    opmerkingKnop: "Opmerking toevoegen",
    opmerkingPlaceholder: "Typ hier een opmerking (optioneel)…",
    verplicht: "Verplicht",
    temperatuurPlaceholder: "Temperatuur in °C",
    voortgang: (aantal: number, totaal: number) => `${aantal} van ${totaal} afgerond`,
    opslaanKnop: "Registratie opslaan",
    nietAllesIngevuld: "Niet alle verplichte punten zijn ingevuld. Toch opslaan?",
    inhaalWaarschuwing:
      "Je vult een lijst in voor een andere dag dan vandaag. Dit wordt als inhaalregistratie gemarkeerd.",
  },

  bevestiging: {
    titel: "Opgeslagen",
    tekst: (datum: string, tijd: string) => `Opgeslagen op ${datum} om ${tijd}`,
    lokaalNogNiet: "Nog niet verstuurd naar het archief — dit gebeurt automatisch zodra er wifi is.",
    naarVandaag: "Terug naar vandaag",
    correctieToevoegen: "Fout gemaakt? Correctie toevoegen",
  },

  correctie: {
    titel: "Correctie toevoegen",
    uitleg:
      "Een opgeslagen registratie kan niet worden gewist of gewijzigd — dat is nodig voor een betrouwbaar logboek. Leg hier uit wat er niet klopte.",
    toelichtingLabel: "Toelichting",
    opslaan: "Correctie opslaan",
  },

  instellingen: {
    titel: "Instellingen",
    weergave: "Weergave",
    tekstgrootte: "Tekstgrootte",
    tekstgrootteNormaal: "Normaal",
    tekstgrootteGroot: "Groot",
    tekstgrootteExtraGroot: "Extra groot",
    thema: "Thema",
    themaSysteem: "Systeem",
    themaLicht: "Licht",
    themaDonker: "Donker",
    beveiliging: "Beveiliging",
    pincodeWijzigen: "Pincode wijzigen",
    pincodeUitschakelen: "Pincode uitschakelen",
    pincodeInschakelen: "Pincode inschakelen",
    synchronisatie: "Synchronisatie",
    nuSynchroniseren: "Nu synchroniseren",
    bezigMetSynchroniseren: "Bezig met synchroniseren…",
    synchronisatieGelukt: "Synchronisatie gelukt",
    synchronisatieMislukt: "Synchronisatie mislukt — probeer het later opnieuw",
    gegevensbeheer: "Gegevensbeheer",
    backupOpslaan: "Back-up opslaan als bestand",
    backupUitleg: "Bewaar dit bestand op een veilige plek, bijvoorbeeld een USB-stick.",
    backupHerstellen: "Back-up herstellen vanaf bestand",
    bedrijfsgegevens: "Bedrijfsgegevens",
    account: "Account",
    uitloggen: "Uitloggen",
    ingelogdAls: (naam: string) => `Ingelogd als ${naam}`,
  },

  bedrijfsgegevens: {
    titel: "Bedrijfsgegevens",
    uitleg: "Deze gegevens komen boven elk exportbestand te staan en hoef je maar één keer in te vullen.",
    naam: "Bedrijfsnaam",
    adres: "Adres",
    postcode: "Postcode",
    plaats: "Plaats",
    kvkNummer: "KvK-nummer",
    contactpersoon: "Contactpersoon",
    telefoon: "Telefoonnummer",
    email: "E-mailadres",
    opslaan: "Gegevens opslaan",
  },

  archief: {
    titel: "Jaaroverzicht",
    ondertitel: "Laatste 12 maanden",
    exporteren: "Exporteren",
    geenRegistratie: "Geen registratie",
    dagDetailTitel: (datum: string) => `Overzicht ${datum}`,
    ingevuldDoor: (naam: string) => `Ingevuld door ${naam}`,
    apparaatTijd: (tijd: string) => `Tijd op tablet: ${tijd}`,
    ontvangenOp: (tijd: string) => `Ontvangen op server: ${tijd}`,
    tijdWaarschuwing: "Let op: de tijd op het tablet week sterk af van de servertijd toen dit werd opgeslagen.",
    inhaalLabel: "Inhaalregistratie (ingevuld voor een eerdere dag)",
    correcties: "Correcties",
    geenOpmerking: "Geen opmerking",
  },

  exporteren: {
    titel: "Exporteren",
    uitleg: "Kies een periode om te exporteren voor de inspecteur.",
    vanaf: "Vanaf",
    totEnMet: "Tot en met",
    alsPdf: "Exporteer als PDF",
    alsCsv: "Exporteer als CSV",
    bezig: "Bestand wordt gemaakt…",
  },

  auth: {
    inloggenTitel: "Inloggen",
    email: "E-mailadres",
    wachtwoord: "Wachtwoord",
    inloggen: "Inloggen",
    wachtwoordVergeten: "Wachtwoord vergeten?",
    fout: "Inloggen mislukt. Controleer e-mailadres en wachtwoord.",
    wachtwoordVergetenTitel: "Wachtwoord vergeten",
    wachtwoordVergetenUitleg:
      "Vul je e-mailadres in. Je ontvangt een link om een nieuw wachtwoord in te stellen. Dit werkt alleen met internetverbinding.",
    linkVerstuurd: "Als dit e-mailadres bekend is, is er een link verstuurd.",
    versturen: "Link versturen",
    nieuwWachtwoordTitel: "Nieuw wachtwoord instellen",
    nieuwWachtwoord: "Nieuw wachtwoord",
    nieuwWachtwoordBevestigen: "Bevestig nieuw wachtwoord",
    wachtwoordenKomenNietOvereen: "De wachtwoorden komen niet overeen.",
    wachtwoordInstellen: "Wachtwoord instellen",
    wachtwoordGewijzigd: "Wachtwoord gewijzigd. Je kunt nu inloggen.",
  },

  navigatie: {
    vandaag: "Vandaag",
    archief: "Archief",
    instellingen: "Instellingen",
  },
} as const;

export function formatteerDatumLang(datum: Date): string {
  return datum.toLocaleDateString("nl-NL", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatteerDatumKort(datum: Date): string {
  return datum.toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatteerTijd(datum: Date): string {
  return datum.toLocaleTimeString("nl-NL", { hour: "2-digit", minute: "2-digit" });
}

export function formatteerDatumTijd(datum: Date): string {
  return `${formatteerDatumKort(datum)} ${formatteerTijd(datum)}`;
}

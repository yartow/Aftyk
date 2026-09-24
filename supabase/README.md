# Supabase-project opzetten

Dit hoort bij het plan in `.claude/plans` (of vraag de eigenaar van dit
project ernaar) — kort samengevat: het tablet werkt volledig offline op
IndexedDB, Supabase is alleen de back-up/archief die alles ontvangt zodra
er wifi is. Deze stappen hoef je maar één keer te doen.

## 1. Project aanmaken

1. Ga naar [supabase.com](https://supabase.com) → **New project** (gratis tier is ruim voldoende).
2. Kies een regio dicht bij Nederland (bijv. Frankfurt/`eu-central-1`).
3. Bewaar het database-wachtwoord dat je hier instelt (niet hetzelfde als het inlogwachtwoord van de winkelier).

## 2. Schema en beveiligingsregels

1. Open **SQL Editor** in het Supabase-dashboard → **New query**.
2. Plak de inhoud van [`migrations/0001_init.sql`](./migrations/0001_init.sql) en klik **Run**.
   Dit maakt alle tabellen aan én de RLS-policies die ervoor zorgen dat:
   - elke organisatie alleen haar eigen gegevens ziet;
   - registraties, antwoorden en correcties nooit gewijzigd of verwijderd kunnen worden (append-only) — dit is de kern van de betrouwbaarheid van het logboek voor een inspecteur.
3. Plak daarna de inhoud van [`migrations/0002_documenten.sql`](./migrations/0002_documenten.sql) en klik **Run**. Dit maakt de tabel aan waarin het schoonmaakplan, het weekformulier en de leveranciersregistratie worden bewaard.
4. Plak daarna [`migrations/0003_toegangscodes_locaties.sql`](./migrations/0003_toegangscodes_locaties.sql) en klik **Run**. Dit voegt toe:
   - de tabel `locaties` (meerdere vestigingen per bedrijf) en de postadres-kolommen;
   - de tabel `toegangscodes` en de trigger die aanmelden alleen met een geldige code toestaat (zie hoofdstuk 3b);
   - de functie `verwijder_online_data()` achter de knop "Verwijder online data" in de app.

   > Deze migratie is geschreven en op syntax gecontroleerd, maar nog **niet** uitgevoerd tegen een echte of lokale database. Draai hem eerst lokaal (hoofdstuk 6) of op een testproject en controleer de stappen onder "Testen" in hoofdstuk 3b.

## 3. Authenticatie

1. **Authentication → Providers**: e-mail/wachtwoord staat standaard aan, dat is voldoende.
2. **Authentication → Settings**: laat "Allow new users to sign up" **aan** (aanmelden wordt afgeschermd door de toegangscode, zie 3b) en zet "Confirm email" **aan** zodra je klanten uitnodigt, zodat elk account een echt e-mailadres heeft. Voor interne tests kun je "Confirm email" tijdelijk uitzetten.
3. **Authentication → URL Configuration**: zet de **Site URL** op waar je de app host (bijv. `https://jouwdomein.nl`).

## 3b. Toegangscodes: klanten laten aanmelden

Nieuwe klanten maken zelf een account via `https://jouwdomein.nl/#/aanmelden`.
Ze hebben daarvoor een **persoonlijke code van 5 cijfers** nodig die jij ze geeft en die **maar één keer** werkt.
Die pagina staat nergens in de app aangelinkt; je geeft de link samen met de code.

**Een code aanmaken** — in Supabase → SQL Editor:

```sql
select maak_toegangscode();                                    -- één nieuwe code
select maak_toegangscode() from generate_series(1, 5);         -- vijf codes
select * from toegangscodes order by aangemaakt_op desc;       -- wie gebruikte welke code, en wanneer
```

**Hoe het werkt.** De app stuurt de code mee bij het aanmelden. Een trigger op
`auth.users` controleert en verbruikt de code in één atomaire stap; is de code
onbekend of al gebruikt, dan wordt het account niet aangemaakt. Dat kan de
gebruiker dus niet omzeilen vanuit de app. De tabel `toegangscodes` is voor
de app onzichtbaar. Mislukt de aanmelding om een andere reden (bijv. het
e-mailadres bestaat al), dan wordt de code niet verbruikt.

**Goed om te weten**
- Vijf cijfers zijn 100.000 mogelijkheden: gokken is in theorie mogelijk. De aanmeldlimieten van Supabase Auth remmen dat, maar houd daarom niet veel ongebruikte codes tegelijk open en verwijder ongebruikte codes die je niet meer nodig hebt (`delete from toegangscodes where gebruikt_door is null and code = '12345';`).
- De trigger geldt voor **alle** nieuwe gebruikers. Een gebruiker handmatig aanmaken in het dashboard ("Add user") lukt alleen als je er `{"toegangscode": "<code>"}` als *user metadata* bij geeft, of als je de trigger tijdelijk uitzet: `alter table auth.users disable trigger toegangscode_bij_aanmelding;` (en daarna weer `enable`).
- Bestaande accounts zijn niet beïnvloed.

**Testen** (nog niet gedaan, zie `TODO.md`):
1. `select maak_toegangscode();` → aanmelden met die code lukt.
2. Dezelfde code nogmaals → foutmelding "Ongeldige of al gebruikte toegangscode".
3. Een verzonnen code → dezelfde foutmelding.
4. Twee aanmeldingen tegelijk met dezelfde code → precies één slaagt.

## 3c. Online gegevens verwijderen

De knop **Verwijder online data** (Instellingen, na bevestiging met pincode) roept
`verwijder_online_data()` aan. Dat wist alle gegevens van het bedrijf van de
ingelogde gebruiker: documenten, locaties, bedrijfsgegevens, profiel en de
oude checklist-tabellen. De **inlog blijft bestaan** en de gebruikte
toegangscode blijft gebruikt. Wil je een gebruiker helemaal verwijderen, doe
dat dan in Authentication → Users.

## 4. Wachtwoordherstel via e-mail (Resend)

Supabase's ingebouwde mailer is bedoeld om te testen en is sterk gelimiteerd
(een paar mails per uur) — voor een echte "wachtwoord vergeten"-knop is een
eigen SMTP-koppeling nodig. Dit vraagt geen eigen mailserver:

1. Maak een gratis account op [resend.com](https://resend.com) (3.000 mails/maand gratis).
2. **Domains** → voeg je domein toe en zet de getoonde SPF/DKIM-DNS-records bij je domeinregistrar (dezelfde plek waar je de cPanel-hosting beheert). Dit duurt meestal enkele minuten tot een paar uur voordat het geverifieerd is.
3. **API Keys** → maak een key aan.
4. In Supabase: **Project Settings → Authentication → SMTP Settings** → schakel "Enable Custom SMTP" in en vul in:
   - Host: `smtp.resend.com`
   - Port: `587`
   - Username: `resend`
   - Password: de API-key uit stap 3
   - Sender email: een adres op je geverifieerde domein (bijv. `noreply@jouwdomein.nl`)
5. Test via de "Wachtwoord vergeten"-link in de app.

**Alternatief zonder eigen domein/DNS-gedoe:** gebruik het e-mailaccount dat
bij je cPanel-hosting hoort als SMTP-relay (Host/poort staan in cPanel onder
"E-mailaccounts" → "Configureer e-mailclient"). Werkt met minder moeite,
iets grotere kans dat het in spam belandt.

## 5. Omgevingsvariabelen voor de app

1. **Project Settings → API** → kopieer "Project URL" en de "anon public" key.
2. Kopieer `.env.example` naar `.env` in de projectroot en vul beide in.
3. Bouw de app opnieuw (`npm run build`) — de sleutels worden tijdens het bouwen in de statische bestanden verwerkt.

De "anon public" key is bewust openbaar bruikbaar (dat is ook zo bij elk
Supabase-project) — de RLS-policies in `0001_init.sql` zijn de eigenlijke
beveiliging, niet het geheimhouden van deze key.

## 6. Lokaal testen met Docker (zonder cloud-project)

Wil je inloggen, RLS of de synchronisatielogica testen zonder meteen een
echt Supabase-project aan te maken? De Supabase CLI draait de volledige
backend (Postgres, Auth, Studio, …) lokaal in Docker.

1. **Docker** moet draaien (Docker Desktop of gelijkwaardig).
2. Installeer de CLI eenmalig: `brew install supabase/tap/supabase`.
3. In de projectmap:
   ```bash
   supabase init      # eenmalig, als supabase/config.toml nog niet bestaat
   supabase start     # start de containers (eerste keer duurt dit even, images worden gedownload)
   supabase db reset  # past de migraties toe (0001 t/m 0003)
   ```
4. Kopieer [`../.env.local-supabase.example`](../.env.local-supabase.example)
   naar `.env` in de projectroot — de sleutels daarin zijn de vaste,
   publiek bekende standaardwaarden die de CLI voor elk lokaal project
   genereert, dus geen eigen sleutels nodig.
5. `npm run dev` en gebruik de app zoals normaal. Er is geen account
   vooraf aangemaakt — gebruik Supabase Studio (`http://127.0.0.1:54323`,
   **Authentication**) om er handmatig een aan te maken, of maak er een
   via de admin-API (zie GoTrue-documentatie).
6. `supabase stop` sluit de containers weer af. `supabase db reset` zet
   alles terug naar de staat direct na de migraties.

**Bekende beperking:** bij het testen is gebleken dat de PostgREST-versie
die de Supabase CLI op dit moment lokaal meelevert, schrijfacties
(INSERT/UPDATE) via de REST-API ten onrechte kan weigeren onder RLS, zelfs
met een volledig toegankelijk beleid — dit is bevestigd als een probleem in
de lokale Docker-images zelf (rechtstreeks geverifieerd met SQL tegen
Postgres, buiten PostgREST om), niet in het schema of de RLS-policies van
dit project. Lezen (bijv. het ophalen van sjablonen) werkt wel betrouwbaar
lokaal. Voor het écht end-to-end testen van inloggen → inrichten →
synchroniseren is een gratis cloud-project (hierboven) op dit moment
betrouwbaarder.

## 7. Voorkom dat het gratis project in slaap valt

Een gratis Supabase-project pauzeert na ~7 dagen zonder verkeer. Onschuldig
voor het tablet (het blijft gewoon lokaal doorwerken en synchroniseert
zodra het project weer wakker is), maar vervelend als je het archief net
dan nodig hebt. Zet een gratis wekelijkse cronjob (bijv. via
[cron-job.org](https://cron-job.org)) die een simpele request doet naar je
project-URL, bijvoorbeeld naar `/rest/v1/` met de anon-key als header — dat
is genoeg om het project actief te houden.

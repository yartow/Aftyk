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
3. Plak daarna de inhoud van [`seed.sql`](./seed.sql) en klik **Run** voor de voorbeeldchecklists. **Vervang deze zodra de definitieve hygiënecode-lijst er is** (pas de teksten in dat bestand aan en voer het opnieuw uit).

## 3. Authenticatie

1. **Authentication → Providers**: e-mail/wachtwoord staat standaard aan, dat is voldoende.
2. **Authentication → Settings**: overweeg "Confirm email" uit te zetten voor het eerste, interne gebruik (één winkelier) — zo kan hij direct inloggen na het aanmaken van een account zonder op een bevestigingsmail te wachten. Zet dit weer aan zodra er onbekende mensen zich kunnen aanmelden.
3. **Authentication → URL Configuration**: zet de **Site URL** op waar je de app host (bijv. `https://jouwdomein.nl`).

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
   supabase db reset  # past migrations/0001_init.sql en seed.sql toe
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
   alles terug naar de staat direct na de migraties/seed.

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

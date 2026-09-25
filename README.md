# Hygiënecode-registratie

Offline-first PWA that digitizes the three paper documents a fish retailer
keeps for the food-safety inspector, on a tablet (and phone):

1. **Schoonmaakplan** — cleaning schedule: what gets cleaned, how, and how often, with per-day/per-month proof.
2. **Weekformulier Hygiënecode** — the owner's weekly inspection: goods-receipt deviations, chilled storage temperatures, process CCPs.
3. **Registratie Leveranciers** — monthly supplier/certificate register.

Each document autosaves on every tap and can be exported as a PDF (with the
shop logo, company name and location address in the header) and mailed via
the device's share sheet. The UI is available in **Dutch and English**
(Settings → Taal / Language); domain names in the code are Dutch by design.

Also included: a **demo mode** for showing the app to prospects, **multiple
locations** per company, **data deletion** (local and online) behind a PIN
check, and **sign-up with single-use access codes** for new customers.

**The core constraint:** the tablet often has no internet in the shop, only
wifi at home. So the tablet is the source of truth (IndexedDB via Dexie),
and a Supabase project is the optional backup/sync target that gets synced
to whenever wifi is available. The app is fully usable with **zero backend
configured** — see "Local mode" below.

Related documents:

- [`handleiding.md`](./handleiding.md) — user manual for the shop staff (Dutch, non-technical).
- [`TODO.md`](./TODO.md) — what is still open, and decisions that need confirming.
- [`supabase/README.md`](./supabase/README.md) — Supabase setup.

## Stack

- React 19 + TypeScript + Vite → static build, no Node needed in production.
- Dexie (IndexedDB) — local, offline-first data store; the actual source of truth on the tablet.
- Supabase (Postgres + Auth + Row Level Security) — optional backup/sync + accounts, free tier.
- vite-plugin-pwa (Workbox) — installable, offline app shell.
- jsPDF / jspdf-autotable — client-side PDF generation (works offline too).
- React Router (hash router), no UI framework — hand-rolled components (`src/components`) built around three requirements that are easy to break with off-the-shelf components: scalable text/touch-targets, colour-blind-safe status (icon + word, never colour alone), and everything in Dutch.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run lint       # oxlint
```

No `.env` is required. Without `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
set, the app runs in **local mode**: no login, no sync, a fixed local
"owner" profile, and everything else (all three documents, PDF export,
text-size/theme settings, backup file) fully functional against IndexedDB
only. On first start you are asked for the company details (used in the PDF
header); this can be skipped with **Later invullen** and filled in later
via Instellingen. Chrome DevTools → Network → Offline is the right way to
test the critical path.

## The three documents

| Screen | Route | Source (`files/`) | Stored as |
|---|---|---|---|
| Home (three links + status lines) | `/` | — | — |
| Schoonmaakplan | `/schoonmaakplan` | `Schoonmaakplan vnv.docx` | `schoonmaak-config` (objects + legend, valid for all weeks), `schoonmaak-week` (day ticks), `schoonmaak-maand` (monthly "uitgevoerd op" dates) |
| Weekformulier Hygiënecode | `/weekformulier` | `Weekformulier Hygiënecode….docx` | `weekformulier` per ISO week |
| Registratie Leveranciers | `/leveranciers` | `Registratie gecertificeerde leveranciers.xlsx` | `leveranciers-config` (supplier list), `leveranciers-maand` (assessments per month) |

Key behaviours:

- **Schoonmaakplan**: collapsible legend with editable dosering/inwerktijd/naspoelen; hidden-by-default Methode column; frequency (D/W/M/N) collapses to its abbreviation once chosen; D/W/N rows show seven day blocks (grey 70 % → green 100 % with a ✓), M rows show a month-view date picker. Method and frequency persist week to week; defaults from `src/lib/schoonmaakDefaults.ts` (24 objects from the Word file; "Vriezers" `1/2` is treated as monthly).
- **Weekformulier**: temperatures and process values are checked against the norms in `src/lib/weekformulierDefaults.ts`; an out-of-norm value shows a deviation badge (icon + word) and requires a corrective action text.
- **Registratie Leveranciers**: supplier list carries over month to month; "Kopieer vorige maand"; certificate expiry warnings (expired / within 30 days).
- **PDF**: `src/lib/pdf.ts` (logo from `src/assets/visdetailhandel-logo.jpg`, inlined). `src/lib/deel.ts` uses the Web Share API with files (share sheet → mail app) and falls back to a download. The standard PDF fonts lack ≤ ≥ ✓, so `pdfTekst()` substitutes `<=`, `>=`, `X`.

### Data model

Everything is a generic JSON document (`Document` in `src/types/domain.ts`)
in one Dexie table, `documenten`, keyed `"<soort>:<locatieId>:<sleutel>"`, e.g.
`schoonmaak-week:<location-uuid>:2026-W39`. Documents therefore belong to a
**location** (see below). `useDocument()` in `src/lib/documenten.ts` reads a
document for the active location reactively and returns a setter that saves
immediately (with an optimistic local copy so quick successive taps don't
overwrite each other). Every save also puts the document id in the `uitgaand`
outbox table.

Other tables: `organisaties` (the company / head office), `profielen`,
`locaties`, `instellingen` (key/value: text size, theme, PIN hash, active
location, sync pause flag), `uitgaand` (sync outbox).

Dexie schema history (`src/db/db.ts`): v1 checklist app, v2 `documenten`,
v3 `locaties` + `locatieId` on documents. The v3 upgrade moves existing
documents to one default location, so no data is lost (verified by
upgrading a hand-made v2 database).

### Sync

`src/lib/sync.ts` pushes the company/profile and locations, drains the outbox
to the Supabase table `documenten`, and pulls documents/locations that are
newer on the server. **Conflict rule: the newest `bijgewerktOp` wins, per
document** — two devices editing the same week at the same time can
overwrite each other's changes. Sync never blocks saving; failures leave
the outbox untouched for the next attempt (on `online` events, at startup,
or via "Nu synchroniseren" in Instellingen). Server rows without a
`locatie_id` (from before locations existed) are ignored.

The older append-only checklist tables from `0001_init.sql`
(`registraties`, `antwoorden`, …) are no longer used by the app.

## Multiple locations and addresses

A **company** (`Organisatie`) is the head office and has two addresses: the
**Bezoekadres** (physical; stored in `adres/postcode/plaats`) and the
**Postadres** (`postAdres/postPostcode/postPlaats`; empty = same as
bezoekadres). Each **location** (`Locatie`: name, address, phone) is a branch,
such as "Restaurant 1" and "Restaurant 2". Every document belongs to one
location, so **each location has its own Schoonmaakplan, Weekformulier and
supplier list**.

- `LocatieContext` provides the active location (stored per device); `useDocument` uses it automatically.
- A location picker appears on the home page only when there is more than one location. A company with one location never sees any of this.
- Manage locations under Instellingen → Locaties (add, edit, archive).
- First setup creates one location from the bezoekadres. If setup is skipped ("Later invullen"), a location without company is created and linked once the details are saved (`src/lib/locaties.ts`).
- PDF header: company name, then `Locatie: <name> – <address>` (name shown only with 2+ locations), then KvK. The postal address is not printed.

## Language (Nederlands / English)

`src/i18n/nl.ts` and `src/i18n/en.ts` have the same shape (English is typed
against Dutch, so a missing key is a compile error). `t` from
`src/i18n/index.ts` is a Proxy that resolves the current language on every
access, so `t.start.titel` works everywhere; the language is kept in
`localStorage`. Changing it remounts the router (`key={taal}` in `App.tsx`),
so all screens re-render. Static tables use getters (`FREQUENTIE_NAMEN`,
`OPSLAG_EENHEDEN[].naam`, …), calendar/date output uses `locale()`, and the
default cleaning-object and legend names are translated unless the user
renamed them. PDFs follow the language too. The Dutch user manual is not
translated.

## Demo mode

For showing the app to prospects: Settings → Demo, "Demo bekijken" on the
login screen, or on the first-start screen.

- The flag lives in `sessionStorage` (`src/lib/modus.ts`), so closing the app ends the demo. Switching reloads the page, because `db.ts` and `supabase.ts` pick their target once at load.
- Demo uses a **separate IndexedDB** (`hygienecode-demo`) and `supabase` is `null` — demo data can never reach the real local database or the online one (verified by inspecting both databases).
- `src/lib/demo.ts` seeds a fictional company with two locations, ticked days, suppliers (one certificate about to expire), and a weekly form with a deviation, only when the demo database is empty. "Demo opnieuw instellen" resets it. The banner and a "DEMO" label stay visible on every screen.
- Seed data is created in the language active at that moment.

## Deleting data

Settings → "Gegevens verwijderen" (hidden in demo). Both actions use
`VerwijderBevestiging`: an explanation and "Weet je zeker dat je alles wilt
verwijderen?", then a second check — the **PIN** if one is set, otherwise
typing the word `VERWIJDER` (`DELETE` in English). A "make a backup first"
button is offered.

- **Verwijder lokaal opgeslagen data** (`src/lib/verwijderen.ts`): signs out locally, deletes the whole IndexedDB (real and demo), clears `localStorage`/`sessionStorage`, and restarts the app at first-run setup.
- **Verwijder online data** (only when logged in to Supabase): calls the RPC `verwijder_online_data()` (migration 0003), which deletes the company's documents, locations, company details and profile. **The login and the used access code stay.** Local data stays too, and automatic sync is paused (`sync_gepauzeerd`) until the user taps "Nu synchroniseren", so the local copy doesn't silently come back online. A manual sync re-creates the company/location rows from local data.

## Signing up new customers (access codes)

New customers sign up at `https://<your-domain>/#/aanmelden` with a personal,
single-use **5-digit access code** you give them. That page is not linked
anywhere in the app, and the sign-up toggle was removed from the login screen.

The code is enforced in the database, not in the browser: the app sends it
as user metadata, and a `before insert` trigger on `auth.users` atomically
checks and consumes it (`supabase/migrations/0003_toegangscodes_locaties.sql`).
An unknown or used code aborts the sign-up. Create codes in the SQL editor
with `select maak_toegangscode();` — see [`supabase/README.md`](./supabase/README.md)
(chapter 3b) for details, limits and testing.

**Not yet verified against a running Supabase** (Docker was not available):
the migration is syntax-checked only. See `TODO.md`.

## Running against different backends (`.env`)

There are three example env files — copy whichever matches what you're
testing to `.env` (restart `npm run dev` after changing it, Vite only
reads `.env` at startup):

| File | When to use it | Backend |
|---|---|---|
| [`.env.local.example`](./.env.local.example) | Reviewing screens, document layouts, accessibility settings — the fastest loop, and what most day-to-day development should use | None — local mode, IndexedDB only |
| [`.env.local-supabase.example`](./.env.local-supabase.example) | Testing login, RLS policies, or the sync/outbox logic without touching a real project | A local Supabase stack running in Docker on your own machine |
| [`.env.example`](./.env.example) | Final verification before deploying, or ongoing use by the shop | Your real Supabase cloud project |

```bash
cp .env.local.example .env             # local mode (or just: rm .env)
# — or —
cp .env.local-supabase.example .env    # local Supabase via Docker — see supabase/README.md
# — or —
cp .env.example .env                   # real cloud project — fill in your own URL + key
npm run build
```

Setting up the real cloud project (accounts, cross-device sync, password
reset) and running a local Supabase stack for testing are both covered in
[`supabase/README.md`](./supabase/README.md).

## Deploying (cPanel or any static host)

`npm run build` produces a fully static `dist/` folder — no Node process
runs in production, so this deploys to plain cPanel hosting exactly like a
plain HTML site:

1. `npm run build`
2. Upload the **contents** of `dist/` (not the folder itself) to `public_html/` (or a subfolder) via cPanel's File Manager or FTP.
3. Make sure the site is served over **HTTPS** (cPanel AutoSSL) — required for the PWA install prompt and for `navigator.storage.persist()` to work.
4. No `.htaccess` rewrite rules are needed: the app uses a hash-based router (`/#/schoonmaakplan`, etc.) specifically so client-side routing works on hosting that can't be configured to redirect unknown paths to `index.html`.

Any other static host (Cloudflare Pages, Netlify, GitHub Pages, …) works the same way — just point it at `dist/`.

## Responsive design

Layout is built for tablet first and also works on phones: everything is in
`rem` (three text sizes scale touch targets too), the Schoonmaakplan table
turns into one card per object below 40 rem, pickers are bottom sheets, and
screens use a 48–68 rem max width. Verified to have no horizontal page
overflow at 390 px and 768 px wide (emulated in desktop Chrome, normal text
size). Not yet verified on real devices or at the largest text size — see
`TODO.md`.

## Setting up the tablet

1. Open the deployed HTTPS URL in Chrome (Android) — **recommended over an iPad**, because Chrome does not evict a home-screen PWA's local storage. Safari on iPad clears site data after ~7 days of disuse unless the app is installed to the home screen; verify that install explicitly if iPad is what's available.
2. Use the browser menu → **"Add to Home screen" / "Install app"**. Launch it from the home-screen icon from then on, not the browser.
3. Log in once (this requires the one moment of internet access — e.g. do this at home before bringing the tablet to the shop). The session then persists indefinitely; day-to-day use only needs the optional 4-digit PIN, set from Instellingen.
4. In Instellingen, set the text size and check the "Back-up opslaan" flow once so it's familiar — a monthly backup to a USB stick is a cheap extra safety net on top of Supabase sync.

## Project structure

```
src/
  components/    Reusable UI building blocks (accessibility rules live here)
  context/       Settings (text size/theme/language), auth/session, active location
  db/            Dexie (IndexedDB) schema
  i18n/          nl.ts + en.ts (same shape) and index.ts (`t`, locale, date formatting)
  lib/           documenten (autosave hook), sync, PDF + share, calendar/week helpers,
                 default data for the three documents, locaties, demo, verwijderen,
                 modus (demo flag), backup, PIN hashing
  screens/       Start, Schoonmaakplan, Weekformulier, Leveranciers, Locaties,
                 Instellingen, Auth (login, sign-up with code, password reset),
                 Inrichting (company details), Pincode
  assets/        Shop logo (PDF header only — app/tab icons live in public/)
supabase/
  migrations/    0001 base schema + RLS, 0002 `documenten`, 0003 locations + postal address + access codes + `verwijder_online_data()`, 0004 fix for the profile-insert policy
  README.md      Step-by-step Supabase + Resend (password reset) setup
```

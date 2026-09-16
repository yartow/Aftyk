# Hygiënecode-registratie

Offline-first PWA that replaces a paper HACCP/hygiene-code checklist for a
fish retailer with a tablet app: tick items, add a comment per item, submit
— and keep a tamper-evident log an inspector can review for at least the
last year. Full context and design rationale lives in the project plan
(ask the project owner, or see `.claude/plans/` if you have access to this
session's history).

**The core constraint:** the tablet has no internet in the shop, only wifi
at home. So the tablet is the source of truth (IndexedDB via Dexie), and a
Supabase project is the backup/archive that gets synced to whenever wifi is
available. The app is fully usable with **zero backend configured** — see
"Local mode" below — which is the fastest way to try it or to review the
checklist wording before wiring up an account.

## Stack

- React 18 + TypeScript + Vite → static build, no Node needed in production.
- Dexie (IndexedDB) — local, offline-first data store; the actual source of truth on the tablet.
- Supabase (Postgres + Auth + Row Level Security) — backup/archive + accounts, free tier.
- vite-plugin-pwa (Workbox) — installable, offline app shell.
- jsPDF / jspdf-autotable — client-side PDF export (works offline too).
- No UI framework — hand-rolled components (`src/components`) built around three requirements that are easy to break with off-the-shelf components: scalable text/touch-targets, colour-blind-safe status (icon + word, never colour alone), and everything in Dutch.

## Getting started

```bash
npm install
npm run dev
```

That's it — no `.env` required. Without `VITE_SUPABASE_URL` /
`VITE_SUPABASE_ANON_KEY` set, the app runs in **local mode**: no login, no
sync, a fixed local "owner" profile, everything else (checklists,
comments, the yearly archive, PDF/CSV export, text-size/theme settings)
fully functional against IndexedDB only. This is also what Chrome DevTools
→ Network → Offline should be tested against first, since it's the
critical path in production.

To connect a real backend (accounts, cross-device sync, password reset),
follow [`supabase/README.md`](./supabase/README.md), then:

```bash
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run build
```

## Deploying (cPanel or any static host)

`npm run build` produces a fully static `dist/` folder — no Node process
runs in production, so this deploys to plain cPanel hosting exactly like a
plain HTML site:

1. `npm run build`
2. Upload the **contents** of `dist/` (not the folder itself) to `public_html/` (or a subfolder) via cPanel's File Manager or FTP.
3. Make sure the site is served over **HTTPS** (cPanel AutoSSL) — required for the PWA install prompt and for `navigator.storage.persist()` to work.
4. No `.htaccess` rewrite rules are needed: the app uses a hash-based router (`/#/vandaag`, etc.) specifically so client-side routing works on hosting that can't be configured to redirect unknown paths to `index.html`.

Any other static host (Cloudflare Pages, Netlify, GitHub Pages, …) works the same way — just point it at `dist/`.

## Setting up the tablet

1. Open the deployed HTTPS URL in Chrome (Android) — **recommended over an iPad**, because Chrome does not evict a home-screen PWA's local storage. Safari on iPad clears site data after ~7 days of disuse unless the app is installed to the home screen; verify that install explicitly if iPad is what's available.
2. Use the browser menu → **"Add to Home screen" / "Install app"**. Launch it from the home-screen icon from then on, not the browser.
3. Log in once (this requires the one moment of internet access — e.g. do this at home before bringing the tablet to the shop). The session then persists indefinitely; day-to-day use only needs the optional 4-digit PIN, set from Instellingen.
4. In Instellingen, set the text size and check the "Back-up opslaan" flow once so it's familiar — a monthly backup to a USB stick is a cheap extra safety net on top of Supabase sync.

## Adding the real checklist

The app ships with a **placeholder** daily/weekly/monthly checklist for a
fish shop (temperature checks, cleaning tasks) so the structure is
reviewable before the final hygiene-code list is available:

- Local mode: edit `src/db/seed.ts`.
- With Supabase connected: edit and re-run `supabase/seed.sql` (safe to re-run — it's an upsert).

## Project structure

```
src/
  components/    Reusable UI building blocks (accessibility rules live here)
  context/       Settings (text size/theme) and auth/session state
  db/            Dexie (IndexedDB) schema + placeholder seed data
  i18n/nl.ts     Every user-facing string, in Dutch, in one place
  lib/           Sync, PDF/CSV export, PIN hashing, planning logic
  screens/       One folder per screen, matching the plan's screen list
supabase/
  migrations/    Schema + Row Level Security (append-only audit log, multi-tenant isolation)
  seed.sql       Same placeholder checklist as src/db/seed.ts, for a connected project
  README.md      Step-by-step Supabase + Resend (password reset) setup
```

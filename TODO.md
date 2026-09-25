# What still needs to be done

State after adding demo mode, data deletion, access-code sign-up, multiple locations and English. Roughly in priority order. (This file is now in English; the shop-facing manual is `handleiding.md`, in Dutch.)

## 1. Verify before any real customer uses it

- [ ] **Run migration `0003_toegangscodes_locaties.sql` against a real database.** Docker Desktop would not start on the dev machine, so it has never been executed. It is syntax-checked with a Postgres parser only (the parser could not handle the trigger body's `RETURN NEW`, a tool quirk, so the trigger body was not parsed at all). Start Docker, then `supabase start && supabase db reset`, or run it on a free cloud test project. See `supabase/README.md` (3b, 6).
- [ ] **Test access-code sign-up end to end**: valid code works; the same code twice fails; invented code fails; two simultaneous sign-ups with one code → exactly one succeeds; a failed sign-up (e.g. email already exists) does not burn the code. Also check the error text: the app maps GoTrue's `Database error saving new user` to "Ongeldige of al gebruikte toegangscode", which is an assumption about what GoTrue returns for a trigger exception.
- [ ] **Test "Verwijder online data" end to end**: `verwijder_online_data()` empties only the caller's company, the login survives, sync is paused afterwards, and a manual sync re-creates the company/locations from the local copy.
- [ ] **Test sync with locations**: locations and documents (`locatie_id`) have never been pushed to or pulled from a server. Also note the known local-Supabase caveat in `supabase/README.md` (writes rejected under RLS by the local images); a cloud project may be needed for this.
- [ ] **Test the PDF sheet (`PdfKeuze`) on a real Android and iOS device — UNTESTED.** "Mailen" uses `navigator.share({ files })` and could only be checked for type errors, not on a device. "PDF openen" (blob URL in a new tab) will probably just download the file in Chrome on Android, and may be limited in an iOS home-screen app. Only "Opslaan" and "PDF openen" were checked on desktop.
- [ ] **Test on real devices**: tablet and phone (share sheet → mail app, install to home screen, offline, touch targets, "Extra groot" text). Responsive layout was only measured in an emulated 390 px and 768 px frame (no horizontal overflow).
- [ ] **Look at the PDFs**: all three generate, and the header text (company, location, address, KvK) was verified by inspecting the file contents, but the layout has not been reviewed visually. Compare against the paper forms with the inspector.
- [ ] **Have someone read the English texts** (`src/i18n/en.ts`); I wrote them, no native review yet.

## 2. Assets and content you need to supply

- [ ] **App icon / tab icon.** `public/icoon-*.png` are still the old placeholders. The logo is used only in the PDF header.
- [ ] **Supplier lists.** The Excel template had no names, so every location starts with no suppliers.
- [ ] **Dosing** (dosering, inwerktijd, naspoelen) per cleaning agent: empty, as in the Word file.
- [ ] Deploy (cPanel/static host, HTTPS required) and create the real Supabase project, see README "Deploying" and `supabase/README.md`.

## 3. Decisions to confirm

- [ ] "Vriezers" (`1/2` in the Word file) is treated as monthly (M).
- [ ] "Na gebruik" (N) rows get seven day blocks like D and W.
- [ ] Monthly dates belong to the month containing the Thursday of the shown week.
- [ ] Weekformulier limits (fridge ≤ 7 °C, freezer ≤ –18 °C, hot-hold ≥ 60 °C, fryer max 175 °C, heating ≥ 75 °C, reheating ≥ 60 °C within 60 min, cooling ≤ 7 °C within 5 h, smoking ≥ 65 °C for ≥ 10 min, pH ≤ 4.6) come from the Word file. Please check them.
- [ ] Weekformulier and Leveranciers screens were designed by me from the paper versions (no requirements were given).
- [ ] Weeks are never locked. The old checklist app was tamper-evident; this one is not. Should a finished week be lockable?
- [ ] **Online delete keeps the login and the used access code.** A customer who deleted everything can log in and set up again; they do not need a new code. Is that what you want, or should it also delete the account?
- [ ] **Access-code strength:** 5 digits = 100,000 possibilities. Supabase's auth rate limits slow guessing but do not stop it. Keep few unused codes open at once, delete unused ones, or consider longer codes / an attempt counter.
- [ ] **Users created by hand** in the Supabase dashboard fail the trigger unless created through the admin API/SQL with `app_metadata` `toegangscode_niet_nodig: true`, or with `toegangscode` in user metadata. Documented in `supabase/README.md`. Migrations 0003 (bypass) and 0004 (profile policy fix) are untested against a real database.
- [ ] **Postal address is not printed on the PDF** (only the location's address). Should it be?

## 4. Missing features

- [ ] **Copy a location's setup to another location.** A new location starts with the default cleaning objects and an empty supplier list; there is no "copy from Restaurant 1".
- [ ] **Manage cleaning objects** (add, rename, delete, reorder) and the fixed storage/process rows of the Weekformulier: only possible in code (`schoonmaakDefaults.ts`, `weekformulierDefaults.ts`).
- [ ] **Overview/archive of past weeks and months** and an export for "the last 12 months": you can only step back with the arrows.
- [ ] End-of-week warning for items not ticked off.
- [ ] Per-location permissions / multiple users per company (all users of a company see all locations).
- [ ] English version of the manual (`handleiding.md` is Dutch only).
- [ ] Optionally translate the PWA title/manifest name and `<title>` (still "Hygiënecode").

## 5. Known limitations

- **Sync conflicts: newest edit wins per document.** Two devices editing the same week at once can overwrite each other.
- **Demo seed data is created in the language active when the demo is first started.** After switching language, use "Demo opnieuw instellen" to see sample data in that language.
- **Language:** custom text a user typed and renamed cleaning objects are not translated. Values are stored as "V"/"O" and shown as OK/NG in English.
- **"Verwijder lokaal opgeslagen data"** wipes the databases, `localStorage` and `sessionStorage`. It does not clear the service-worker cache (app files only, no user data) and does not uninstall the home-screen app.
- **Local delete cannot be undone**, and after an online delete the local copy will re-upload once the user taps "Nu synchroniseren".
- **Server rows from before locations existed** (documents without `locatie_id`) are ignored by the app.
- **Safari on iPad clears site data after ~7 days of non-use** unless installed to the home screen; Chrome on Android does not. Regular backups remain sensible.
- The old checklist tables from migration 0001 (`registraties`, `antwoorden`, …) are unused. Drop them with a new migration or leave them.

## 6. Technical debt

- [ ] No automated tests. Manually verified in the browser: v2→v3 local upgrade (with data), English on all screens (scan for Dutch text), demo isolation (both IndexedDBs inspected), location switching, PIN and typed-word deletion (including the wrong-PIN and wrong-word cases), wipe of localStorage/IndexedDB, company details with different Bezoekadres/Postadres, adding a location, PDF header contents.
- [ ] `window.confirm` / `window.alert` are used for a few confirmations (removing lines, archiving, demo reset); replace with the styled sheet.
- [ ] `.sp-keuzes` / `.sp-keuze` styles live in `Schoonmaakplan.css` and are imported by the Start screen; move them to a shared stylesheet.
- [ ] `LocatieProvider` renders nothing until locations have loaded (a brief blank frame on start).
- [ ] Two existing lint warnings (`only-export-components` in `InstellingenContext.tsx`, `AuthContext.tsx`).
- [ ] **Nothing is committed.** Many changes sit on branch `mac-local`; the `files/` folder (customer documents) is untracked — decide whether it belongs in git.

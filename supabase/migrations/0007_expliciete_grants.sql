-- Supabase geeft vanaf 30 oktober 2026 niet meer automatisch Data API-rechten aan nieuwe
-- tabellen in "public". Bestaande tabellen houden hun rechten, maar een nieuw project,
-- preview-branch of `supabase db reset` heeft ze niet meer. Daarom hier expliciet, per
-- tabel, precies wat de RLS-policies al toestaan (de GRANT is de buitenste laag, RLS de binnenste).
-- Opnieuw draaien is veilig.

-- Lezen, aanmaken en bijwerken.
grant select, insert, update on public.organisaties  to authenticated;
grant select, insert, update on public.profielen     to authenticated;
grant select, insert, update on public.sjablonen     to authenticated;
grant select, insert, update on public.sjabloon_items to authenticated;
grant select, insert, update on public.documenten    to authenticated;
grant select, insert, update on public.locaties      to authenticated;

-- Append-only (zie 0001): bewust geen update/delete.
grant select, insert on public.registraties to authenticated;
grant select, insert on public.antwoorden   to authenticated;
grant select, insert on public.correcties   to authenticated;

-- toegangscodes en keepalive: bewust niets voor anon/authenticated; alleen via functies.

-- service_role (server-side, omzeilt RLS) mag overal bij.
grant select, insert, update, delete on
  public.organisaties, public.profielen, public.sjablonen, public.sjabloon_items,
  public.registraties, public.antwoorden, public.correcties, public.documenten,
  public.locaties, public.toegangscodes, public.keepalive
to service_role;

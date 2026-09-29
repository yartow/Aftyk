-- Keep-alive: een minimale functie die de wekelijkse ping (GitHub Action) aanroept,
-- zodat het gratis Supabase-project na 7 dagen inactiviteit niet in de pauzestand valt.
-- Geeft alleen de servertijd terug, geen gegevens.

create or replace function ping() returns timestamptz
language sql
security definer
set search_path = ''
as $$ select now() $$;

grant execute on function ping() to anon;

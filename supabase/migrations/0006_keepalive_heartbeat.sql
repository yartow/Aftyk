-- Keep-alive (vervolg op 0005): ping() schrijft nu een heartbeat-rij naar een echte tabel.
-- Een kale `select now()` telt bij Supabase blijkbaar niet als activiteit; een schrijfactie wel.
-- Geeft alleen de servertijd terug, geen gegevens.

create table if not exists public.keepalive (
  id int primary key default 1 check (id = 1),
  last_ping timestamptz not null default now()
);

alter table public.keepalive enable row level security;
-- Bewust geen policies: anon heeft geen directe toegang, alleen via ping().

insert into public.keepalive (id) values (1) on conflict (id) do nothing;

create or replace function ping() returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  t timestamptz;
begin
  update public.keepalive set last_ping = now() where id = 1 returning last_ping into t;
  return t;
end;
$$;

grant execute on function ping() to anon;

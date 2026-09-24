-- Meerdere locaties per bedrijf, postadres, toegangscodes voor aanmelding
-- en het verwijderen van alle online gegevens van een bedrijf.
--
-- Uitvoeren: plak dit bestand in het Supabase-dashboard onder "SQL Editor"
-- (na 0001 en 0002), of laat `supabase db reset` / `supabase db push` het doen.

-- ─────────────────────────────────────────────────────────────────────────
-- 1. Locaties (vestigingen) en postadres van het hoofdkantoor
-- ─────────────────────────────────────────────────────────────────────────

alter table organisaties
  add column if not exists post_adres text not null default '',
  add column if not exists post_postcode text not null default '',
  add column if not exists post_plaats text not null default '';
-- Let op: organisaties.adres/postcode/plaats zijn voortaan het BEZOEKADRES.

create table if not exists locaties (
  id uuid primary key,                       -- client-gegenereerd
  organisatie_id uuid not null references organisaties (id) on delete cascade,
  naam text not null,
  adres text not null default '',
  postcode text not null default '',
  plaats text not null default '',
  telefoon text not null default '',
  actief boolean not null default true,
  bijgewerkt_op timestamptz not null default now()
);
create index if not exists locaties_organisatie_idx on locaties (organisatie_id);

alter table locaties enable row level security;

create policy "locatie: eigen organisatie lezen" on locaties
  for select using (organisatie_id = huidige_organisatie_id());
create policy "locatie: eigen organisatie aanmaken" on locaties
  for insert with check (organisatie_id = huidige_organisatie_id());
create policy "locatie: eigen organisatie bijwerken" on locaties
  for update using (organisatie_id = huidige_organisatie_id())
  with check (organisatie_id = huidige_organisatie_id());

-- Formulieren horen bij een locatie. Oudere rijen (zonder locatie) worden door
-- de app genegeerd; nieuwe rijen krijgen altijd een locatie.
alter table documenten
  add column if not exists locatie_id uuid references locaties (id) on delete cascade;
create index if not exists documenten_locatie_idx on documenten (locatie_id);

-- ─────────────────────────────────────────────────────────────────────────
-- 2. Toegangscodes: 5 cijfers, persoonlijk uitgedeeld, één keer te gebruiken
-- ─────────────────────────────────────────────────────────────────────────
--
-- De tabel is voor de app onzichtbaar (RLS aan, geen enkele policy, geen
-- rechten voor anon/authenticated). Controleren én verbruiken van een code
-- gebeurt in één atomaire UPDATE binnen de trigger hieronder, dus een code
-- kan niet twee keer worden gebruikt, ook niet bij twee gelijktijdige
-- aanmeldingen. Mislukt de aanmelding daarna toch (bijv. e-mailadres al in
-- gebruik), dan wordt de hele transactie teruggedraaid en blijft de code geldig.

create table if not exists toegangscodes (
  code text primary key check (code ~ '^[0-9]{5}$'),
  aangemaakt_op timestamptz not null default now(),
  gebruikt_op timestamptz,
  gebruikt_door uuid
);
alter table toegangscodes enable row level security;
revoke all on toegangscodes from anon, authenticated;

create or replace function controleer_toegangscode_bij_aanmelding()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_aantal integer;
begin
  v_code := new.raw_user_meta_data ->> 'toegangscode';

  if v_code is null or v_code !~ '^[0-9]{5}$' then
    raise exception 'ongeldige_toegangscode';
  end if;

  update public.toegangscodes
     set gebruikt_op = now(), gebruikt_door = new.id
   where code = v_code and gebruikt_door is null;
  get diagnostics v_aantal = row_count;

  if v_aantal = 0 then
    raise exception 'ongeldige_toegangscode';
  end if;

  return new;
end;
$$;

drop trigger if exists toegangscode_bij_aanmelding on auth.users;
create trigger toegangscode_bij_aanmelding
  before insert on auth.users
  for each row execute function public.controleer_toegangscode_bij_aanmelding();

-- Nieuwe code aanmaken (alleen jij, in de SQL Editor):  select maak_toegangscode();
-- Vijf codes ineens:  select maak_toegangscode() from generate_series(1, 5);
-- Codes en wie ze gebruikte bekijken:  select * from toegangscodes order by aangemaakt_op;
create or replace function maak_toegangscode()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
begin
  loop
    -- gen_random_uuid() is cryptografisch willekeurig (random() is dat niet).
    v_code := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 100000)::text, 5, '0');
    begin
      insert into toegangscodes (code) values (v_code);
      return v_code;
    exception when unique_violation then
      null; -- code bestaat al: probeer een andere
    end;
  end loop;
end;
$$;
revoke execute on function maak_toegangscode() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────
-- 3. Alle online gegevens van het eigen bedrijf verwijderen
-- ─────────────────────────────────────────────────────────────────────────
--
-- Aangeroepen door "Verwijder online data" in de app (na bevestiging met de
-- pincode). Verwijdert alleen gegevens van de organisatie van de ingelogde
-- gebruiker. De inlog zelf (auth.users) en de gebruikte toegangscode blijven bestaan.

create or replace function verwijder_online_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org uuid;
begin
  v_org := huidige_organisatie_id();
  if v_org is null then
    return; -- niets om te verwijderen
  end if;

  delete from documenten where organisatie_id = v_org;
  delete from locaties where organisatie_id = v_org;

  -- Tabellen uit de eerdere checklist-versie (0001), in volgorde van afhankelijkheid.
  delete from correcties where registratie_id in (select id from registraties where organisatie_id = v_org);
  delete from antwoorden where registratie_id in (select id from registraties where organisatie_id = v_org);
  delete from registraties where organisatie_id = v_org;
  delete from sjabloon_items where sjabloon_id in (select id from sjablonen where organisatie_id = v_org);
  delete from sjablonen where organisatie_id = v_org;

  delete from profielen where organisatie_id = v_org;
  delete from organisaties where id = v_org;
end;
$$;
revoke execute on function verwijder_online_data() from public, anon;
grant execute on function verwijder_online_data() to authenticated;

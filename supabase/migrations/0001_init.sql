-- Hygiënecode-registratie — datamodel en beveiligingsregels (RLS)
--
-- Uitvoeren: plak dit bestand in het Supabase-dashboard onder
-- "SQL Editor" → "New query" en klik Run. (Of via de Supabase CLI:
-- `supabase db push` wanneer je dit project met de CLI beheert.)
--
-- Twee ontwerpbeslissingen zijn hier vastgelegd in het datamodel zelf,
-- niet alleen in de applicatiecode, omdat een inspecteur een logboek moet
-- kunnen vertrouwen dat niet achteraf is aan te passen:
--   1. "registraties", "antwoorden" en "correcties" zijn append-only: er
--      bestaat bewust geen UPDATE- of DELETE-policy op deze tabellen. Een
--      fout wordt gecorrigeerd door een rij toe te voegen aan "correcties",
--      nooit door de oorspronkelijke rij te wijzigen.
--   2. "ontvangen_op" wordt uitsluitend door de database gezet (DEFAULT
--      now()) en is nergens beschrijfbaar vanuit de app — dit is de
--      betrouwbare servertijd naast de (op een offline tablet manipuleerbare)
--      "apparaat_tijd".

-- ─────────────────────────────────────────────────────────────────────────
-- Tabellen
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists organisaties (
  id uuid primary key,
  naam text not null,
  adres text not null default '',
  postcode text not null default '',
  plaats text not null default '',
  kvk_nummer text not null default '',
  contactpersoon text not null default '',
  telefoon text not null default '',
  email text not null default '',
  aangemaakt_op timestamptz not null default now(),
  bijgewerkt_op timestamptz not null default now()
);

create table if not exists profielen (
  id uuid primary key references auth.users (id) on delete cascade,
  organisatie_id uuid not null references organisaties (id) on delete cascade,
  naam text not null,
  rol text not null default 'medewerker' check (rol in ('eigenaar', 'medewerker')),
  aangemaakt_op timestamptz not null default now()
);
create index if not exists profielen_organisatie_idx on profielen (organisatie_id);

create table if not exists sjablonen (
  id uuid primary key,
  -- null = landelijk standaardsjabloon, zichtbaar voor iedere organisatie.
  organisatie_id uuid references organisaties (id) on delete cascade,
  naam text not null,
  frequentie text not null check (frequentie in ('dagelijks', 'wekelijks', 'maandelijks')),
  versie integer not null default 1,
  actief boolean not null default true
);
create index if not exists sjablonen_organisatie_idx on sjablonen (organisatie_id);

create table if not exists sjabloon_items (
  id uuid primary key,
  sjabloon_id uuid not null references sjablonen (id) on delete cascade,
  volgorde integer not null default 0,
  tekst text not null,
  type text not null check (type in ('vinkje', 'temperatuur', 'tekst')),
  verplicht boolean not null default true,
  hulptekst text
);
create index if not exists sjabloon_items_sjabloon_idx on sjabloon_items (sjabloon_id);

create table if not exists registraties (
  id uuid primary key,
  organisatie_id uuid not null references organisaties (id) on delete cascade,
  sjabloon_id uuid not null references sjablonen (id),
  sjabloon_naam text not null,
  sjabloon_versie integer not null,
  gebruiker_id uuid not null references auth.users (id),
  gebruiker_naam text not null,
  werkdatum date not null,
  apparaat_tijd timestamptz not null,
  -- Alleen door de server gezet — zie uitleg bovenaan dit bestand.
  ontvangen_op timestamptz not null default now(),
  is_inhaalregistratie boolean not null default false
);
create index if not exists registraties_organisatie_werkdatum_idx on registraties (organisatie_id, werkdatum);
create index if not exists registraties_sjabloon_idx on registraties (sjabloon_id);

create table if not exists antwoorden (
  -- Client-gegenereerd als "<registratie_id>:<item_id>", zie lib/sync.ts.
  id text primary key,
  registratie_id uuid not null references registraties (id) on delete cascade,
  item_id uuid not null,
  item_tekst text not null,
  waarde_bool boolean,
  waarde_getal numeric,
  waarde_tekst text,
  opmerking text
);
create index if not exists antwoorden_registratie_idx on antwoorden (registratie_id);

create table if not exists correcties (
  id uuid primary key,
  registratie_id uuid not null references registraties (id) on delete cascade,
  gebruiker_id uuid not null references auth.users (id),
  gebruiker_naam text not null,
  toelichting text not null,
  aangemaakt_op timestamptz not null default now()
);
create index if not exists correcties_registratie_idx on correcties (registratie_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Hulpfunctie: organisatie van de ingelogde gebruiker
-- ─────────────────────────────────────────────────────────────────────────

create or replace function huidige_organisatie_id()
returns uuid
language sql
stable
as $$
  select organisatie_id from profielen where id = auth.uid()
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────

alter table organisaties enable row level security;
alter table profielen enable row level security;
alter table sjablonen enable row level security;
alter table sjabloon_items enable row level security;
alter table registraties enable row level security;
alter table antwoorden enable row level security;
alter table correcties enable row level security;

-- organisaties: alleen de eigen organisatie zien en bewerken. Aanmaken mag
-- door elke ingelogde gebruiker (eenmalige inrichting bij eerste gebruik).
create policy "organisatie: eigen organisatie lezen" on organisaties
  for select using (id = huidige_organisatie_id());
create policy "organisatie: eenmalige inrichting" on organisaties
  for insert with check (auth.uid() is not null);
create policy "organisatie: eigen organisatie bewerken" on organisaties
  for update using (id = huidige_organisatie_id());

-- profielen: iedereen ziet en beheert uitsluitend het eigen profiel.
--
-- Belangrijk: organisatie_id mag NOOIT vrij instelbaar zijn bij insert/update,
-- anders kan een ingelogde gebruiker zijn eigen profiel aan een andere
-- (bestaande) organisatie hangen en zo via huidige_organisatie_id() bij het
-- volledige logboek van die organisatie kunnen — precies het lek dat de
-- multi-tenant isolatie hieronder juist moet voorkomen.
create policy "profiel: eigen profiel lezen" on profielen
  for select using (id = auth.uid());
create policy "profiel: eigen profiel aanmaken" on profielen
  for insert with check (
    id = auth.uid()
    -- Alleen aanmaken voor een organisatie die nog geen profiel heeft: dit is
    -- de eenmalige inrichting door de eigenaar. Extra leden van een bestaande
    -- organisatie worden later toegevoegd via een uitnodigingsmechanisme met
    -- verhoogde rechten (service role), niet via een open client-insert.
    and not exists (select 1 from profielen bestaand where bestaand.organisatie_id = organisatie_id)
  );
create policy "profiel: eigen profiel bewerken" on profielen
  for update using (id = auth.uid());

-- organisatie_id van een profiel kan na aanmaken nooit meer wijzigen — dit is
-- niet via een with-check-policy af te dwingen (die ziet alleen de nieuwe
-- rij, niet de oude), dus dit is een trigger die ook geldt als een policy
-- ooit per ongeluk wordt versoepeld.
create or replace function voorkom_wijzigen_organisatie_id()
returns trigger
language plpgsql
as $$
begin
  if new.organisatie_id <> old.organisatie_id then
    raise exception 'organisatie_id van een profiel kan niet worden gewijzigd';
  end if;
  return new;
end;
$$;

create trigger profiel_organisatie_id_onveranderlijk
  before update on profielen
  for each row
  execute function voorkom_wijzigen_organisatie_id();

-- sjablonen: landelijke standaardsjablonen (organisatie_id is null) zijn
-- voor iedereen zichtbaar; eigen sjablonen alleen voor de eigen organisatie.
create policy "sjabloon: landelijk of eigen organisatie lezen" on sjablonen
  for select using (organisatie_id is null or organisatie_id = huidige_organisatie_id());
create policy "sjabloon: eigen organisatie aanmaken" on sjablonen
  for insert with check (organisatie_id = huidige_organisatie_id());
create policy "sjabloon: eigen organisatie bewerken" on sjablonen
  for update using (organisatie_id = huidige_organisatie_id());

create policy "sjabloon_item: landelijk of eigen organisatie lezen" on sjabloon_items
  for select using (
    exists (
      select 1 from sjablonen s
      where s.id = sjabloon_items.sjabloon_id
        and (s.organisatie_id is null or s.organisatie_id = huidige_organisatie_id())
    )
  );
create policy "sjabloon_item: eigen organisatie aanmaken" on sjabloon_items
  for insert with check (
    exists (select 1 from sjablonen s where s.id = sjabloon_items.sjabloon_id and s.organisatie_id = huidige_organisatie_id())
  );
create policy "sjabloon_item: eigen organisatie bewerken" on sjabloon_items
  for update using (
    exists (select 1 from sjablonen s where s.id = sjabloon_items.sjabloon_id and s.organisatie_id = huidige_organisatie_id())
  );

-- registraties: append-only. Bewust GEEN update/delete-policy — zie de
-- toelichting bovenaan dit bestand.
create policy "registratie: eigen organisatie lezen" on registraties
  for select using (organisatie_id = huidige_organisatie_id());
create policy "registratie: eigen organisatie aanmaken" on registraties
  for insert with check (organisatie_id = huidige_organisatie_id() and gebruiker_id = auth.uid());

-- antwoorden: zelfde append-only regel, gekoppeld via de registratie.
create policy "antwoord: eigen organisatie lezen" on antwoorden
  for select using (
    exists (select 1 from registraties r where r.id = antwoorden.registratie_id and r.organisatie_id = huidige_organisatie_id())
  );
create policy "antwoord: eigen organisatie aanmaken" on antwoorden
  for insert with check (
    exists (select 1 from registraties r where r.id = antwoorden.registratie_id and r.organisatie_id = huidige_organisatie_id())
  );

-- correcties: ook append-only — een fout in een correctie wordt met een
-- nieuwe correctie rechtgezet, niet door de vorige te wijzigen.
create policy "correctie: eigen organisatie lezen" on correcties
  for select using (
    exists (select 1 from registraties r where r.id = correcties.registratie_id and r.organisatie_id = huidige_organisatie_id())
  );
create policy "correctie: eigen organisatie aanmaken" on correcties
  for insert with check (
    gebruiker_id = auth.uid()
    and exists (select 1 from registraties r where r.id = correcties.registratie_id and r.organisatie_id = huidige_organisatie_id())
  );

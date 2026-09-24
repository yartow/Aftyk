-- Schoonmaakplan, weekformulier en leveranciersregistratie worden als
-- JSON-document bewaard (één rij per document/periode). Anders dan de
-- registraties uit 0001 mogen deze rijen wel worden bijgewerkt: het zijn
-- werkdocumenten die de eigenaar de hele week aanvult. De nieuwste
-- `bijgewerkt_op` wint.

create table if not exists documenten (
  id text primary key,                       -- "<soort>:<sleutel>", client-gegenereerd
  organisatie_id uuid not null references organisaties(id),
  soort text not null,
  sleutel text not null,
  inhoud jsonb not null,
  bijgewerkt_op timestamptz not null default now()
);

create index if not exists documenten_organisatie_idx on documenten (organisatie_id, soort, sleutel);

alter table documenten enable row level security;

create policy "document: eigen organisatie lezen" on documenten
  for select using (organisatie_id = huidige_organisatie_id());
create policy "document: eigen organisatie aanmaken" on documenten
  for insert with check (organisatie_id = huidige_organisatie_id());
create policy "document: eigen organisatie bijwerken" on documenten
  for update using (organisatie_id = huidige_organisatie_id())
  with check (organisatie_id = huidige_organisatie_id());

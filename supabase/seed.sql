-- Landelijke standaardchecklists (organisatie_id = null, dus zichtbaar voor
-- elke organisatie — zie RLS-policy "sjabloon: landelijk of eigen
-- organisatie lezen" in 0001_init.sql).
--
-- Dit zijn dezelfde placeholders als src/db/seed.ts, zodat lokaal
-- ontwikkelen (zonder Supabase) en een echt gekoppeld project hetzelfde
-- laten zien. VERVANG DEZE INHOUD zodra de definitieve hygiënecode-
-- checklist van de visdetailhandel is aangeleverd: pas de teksten hieronder
-- aan en voer dit bestand opnieuw uit (de "on conflict"-clausules maken dat
-- veilig herhaalbaar).

insert into sjablonen (id, organisatie_id, naam, frequentie, versie, actief) values
  ('00000000-0000-0000-0000-000000000001', null, 'Dagelijkse schoonmaak', 'dagelijks', 1, true),
  ('00000000-0000-0000-0000-000000000002', null, 'Wekelijkse schoonmaak', 'wekelijks', 1, true),
  ('00000000-0000-0000-0000-000000000003', null, 'Maandelijkse controle', 'maandelijks', 1, true)
on conflict (id) do update set naam = excluded.naam, frequentie = excluded.frequentie, actief = excluded.actief;

insert into sjabloon_items (id, sjabloon_id, volgorde, tekst, type, verplicht, hulptekst) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 1, 'Snijplanken en messen gereinigd en gedesinfecteerd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 2, 'Werkblad en toonbank gereinigd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 3, 'Visschalen en display gereinigd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000001', 4, 'Weegschaal gereinigd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000001', 5, 'Vloer gereinigd en droog', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000001', 6, 'Afvalbakken geleegd en gereinigd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000001', 7, 'Temperatuur koelvitrine', 'temperatuur', true, 'Moet 4°C of lager zijn'),
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000001', 8, 'Temperatuur vriezer', 'temperatuur', true, 'Moet -18°C of lager zijn'),
  ('00000000-0000-0000-0000-000000000109', '00000000-0000-0000-0000-000000000001', 9, 'Handen gewassen voor aanvang werk', 'vinkje', true, null),

  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000002', 1, 'Koelvitrine volledig ontdooid en gereinigd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000002', 2, 'Voorraadkoeling gereinigd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000002', 3, 'Muren en tegels achter werkplek gereinigd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000204', '00000000-0000-0000-0000-000000000002', 4, 'Afvoerputjes gereinigd en gecontroleerd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000205', '00000000-0000-0000-0000-000000000002', 5, 'Schoonmaakmaterialen gecontroleerd en zo nodig vervangen', 'vinkje', false, null),

  ('00000000-0000-0000-0000-000000000301', '00000000-0000-0000-0000-000000000003', 1, 'Ongediertecontrole uitgevoerd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000302', '00000000-0000-0000-0000-000000000003', 2, 'Houdbaarheidsdata voorraad gecontroleerd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000303', '00000000-0000-0000-0000-000000000003', 3, 'Thermometers gekalibreerd/gecontroleerd', 'vinkje', true, null),
  ('00000000-0000-0000-0000-000000000304', '00000000-0000-0000-0000-000000000003', 4, 'Ventilatie- en afzuigsysteem gereinigd', 'vinkje', false, null)
on conflict (id) do update set
  tekst = excluded.tekst, type = excluded.type, verplicht = excluded.verplicht, hulptekst = excluded.hulptekst, volgorde = excluded.volgorde;

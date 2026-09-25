-- Herstel van de policy "profiel: eigen profiel aanmaken" uit 0001.
--
-- In 0001 verwees `organisatie_id` binnen de subquery naar de binnenste tabel
-- (bestaand), niet naar de nieuwe rij: de controle vergeleek een kolom met
-- zichzelf. Daardoor kon iedere ingelogde gebruiker zonder profiel een profiel
-- aanmaken voor een willekeurige bestaande organisatie en zo bij de gegevens
-- daarvan. Nu wordt expliciet de nieuwe rij (profielen.organisatie_id) gebruikt.
--
-- Uitvoeren na 0003 (SQL Editor, of `supabase db reset` / `supabase db push`).

drop policy if exists "profiel: eigen profiel aanmaken" on profielen;
create policy "profiel: eigen profiel aanmaken" on profielen
  for insert with check (
    id = auth.uid()
    -- Let op: `profielen.organisatie_id` is de nieuwe rij, `bestaand` de bestaande profielen.
    -- (RLS beperkt bestaand hier tot het eigen profiel; een bestaande organisatie wordt
    -- daarom aanvullend geblokkeerd via de security-definer-functie hieronder.)
    and not organisatie_heeft_profiel(organisatie_id)
  );

create or replace function organisatie_heeft_profiel(p_organisatie uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profielen where organisatie_id = p_organisatie);
$$;
revoke execute on function organisatie_heeft_profiel(uuid) from public, anon;
grant execute on function organisatie_heeft_profiel(uuid) to authenticated;

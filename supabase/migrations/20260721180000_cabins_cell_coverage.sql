-- Retroactive migration: cell_coverage already exists on the hosted database, where it
-- was added out of band during the CampsiteAttributes ingest. No migration ever recorded
-- it, so a fresh `supabase db reset` built a cabins table one column short of production
-- and the seed dump failed to load against it.
--
-- IF NOT EXISTS makes this a no-op on hosted (which already has the column) while adding
-- it locally, so the two schemas converge without a destructive re-apply.
--
-- Nullable and additive: safe under expand → migrate → contract, and readable by the
-- currently deployed code, which already treats cell_coverage as optional
-- (see types/cabin.ts and formatSignal in lib/format.ts).

alter table "public"."cabins"
  add column if not exists "cell_coverage" numeric;

comment on column "public"."cabins"."cell_coverage" is
  'rec.gov aggregate_cell_coverage (0-5 average). Rendered via formatSignal().';

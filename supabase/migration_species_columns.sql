-- Supabase Migration: Ensure public.species Has All Required Columns & Constraints
-- Reference: docs/BACKEND_SCHEMA.md & supabase/schema.sql
-- Safe & idempotent migration for Supabase instances created with older schema.sql versions.
-- Leaves all existing data and rows completely untouched.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Diagnostic: View current columns in public.species before migration
-- ─────────────────────────────────────────────────────────────────────────────
select
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'species'
order by ordinal_position;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Add any missing columns (idempotent: safe if already present)
-- Types and defaults match supabase/schema.sql exactly.
-- ─────────────────────────────────────────────────────────────────────────────

-- Core taxonomy & nomenclature
alter table public.species add column if not exists slug text;
alter table public.species add column if not exists common_name text;
alter table public.species add column if not exists scientific_name text;
alter table public.species add column if not exists family text;
alter table public.species add column if not exists genus text;
alter table public.species add column if not exists plant_type text;
alter table public.species add column if not exists origin text;
alter table public.species add column if not exists names_hindi text;
alter table public.species add column if not exists names_bengali text;
alter table public.species add column if not exists other_names text[] default '{}'::text[];

-- Botanical descriptions & morphology
alter table public.species add column if not exists description text;
alter table public.species add column if not exists identifying_features text[] default '{}'::text[];
alter table public.species add column if not exists habitat text;
alter table public.species add column if not exists distribution text;

-- Uses, care & safety (added in later schema revisions; e.g. is_toxic)
alter table public.species add column if not exists uses text[] default '{}'::text[];
alter table public.species add column if not exists care_tips text[] default '{}'::text[];
alter table public.species add column if not exists toxicity_note text;
alter table public.species add column if not exists is_toxic boolean not null default false;
alter table public.species add column if not exists fun_fact text;

-- Media, citations & metadata (added in later schema revisions; e.g. image_credit, sources)
alter table public.species add column if not exists reference_images text[] default '{}'::text[];
alter table public.species add column if not exists image_credit jsonb;
alter table public.species add column if not exists wikipedia_url text;
alter table public.species add column if not exists sources jsonb default '[]'::jsonb;
alter table public.species add column if not exists created_at timestamptz default now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Backfill safe defaults for any null values in newly added columns
-- ─────────────────────────────────────────────────────────────────────────────
update public.species set is_toxic = false where is_toxic is null;
update public.species set sources = '[]'::jsonb where sources is null;
update public.species set other_names = '{}'::text[] where other_names is null;
update public.species set identifying_features = '{}'::text[] where identifying_features is null;
update public.species set uses = '{}'::text[] where uses is null;
update public.species set care_tips = '{}'::text[] where care_tips is null;
update public.species set reference_images = '{}'::text[] where reference_images is null;

-- Ensure default expressions match current schema
alter table public.species alter column other_names set default '{}'::text[];
alter table public.species alter column identifying_features set default '{}'::text[];
alter table public.species alter column uses set default '{}'::text[];
alter table public.species alter column care_tips set default '{}'::text[];
alter table public.species alter column is_toxic set default false;
alter table public.species alter column reference_images set default '{}'::text[];
alter table public.species alter column sources set default '[]'::jsonb;
alter table public.species alter column created_at set default now();

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Idempotently update check constraints (e.g. support 'epiphyte' & origins)
-- ─────────────────────────────────────────────────────────────────────────────

-- Plant Type: must accept 'epiphyte' (needed for Orchid, Phalaenopsis amabilis [id 121], etc.)
do $$
declare
  c_name text;
begin
  for c_name in (
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'species'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%plant_type%'
  ) loop
    execute format('alter table public.species drop constraint if exists %I', c_name);
  end loop;
end $$;

alter table public.species add constraint species_plant_type_check
  check (plant_type in ('herb','shrub','tree','climber','grass','succulent','aquatic','crop','epiphyte'));

-- Origin: ensure 'indian', 'global', 'both' are allowed
do $$
declare
  c_name text;
begin
  for c_name in (
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'species'
      and con.contype = 'c'
      and pg_get_constraintdef(con.oid) like '%origin%'
  ) loop
    execute format('alter table public.species drop constraint if exists %I', c_name);
  end loop;
end $$;

alter table public.species add constraint species_origin_check
  check (origin in ('indian','global','both'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Verification query: Confirm all 25 columns and constraints are ready
-- ─────────────────────────────────────────────────────────────────────────────
select
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns
where table_schema = 'public'
  and table_name = 'species'
order by ordinal_position;

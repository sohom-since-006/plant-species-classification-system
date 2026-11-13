-- Supabase Schema for Plant Species Classification System
-- Reference: docs/BACKEND_SCHEMA.md
-- Fully public, anonymous application: No user accounts, no profiles, no cloud prediction storage.

create extension if not exists "pgcrypto";

-- 1. Species Catalog (Single source of truth for botanical taxonomy & content)
create table if not exists public.species (
  id                   int primary key,              -- matches class index in labels.json (0..111)
  slug                 text unique not null,
  common_name          text not null,
  scientific_name      text not null,
  family               text not null,
  genus                text not null,
  plant_type           text not null check (plant_type in
                       ('herb','shrub','tree','climber','grass','succulent','aquatic','crop','epiphyte')),
  origin               text not null check (origin in ('indian','global','both')),
  names_hindi          text,
  names_bengali        text,
  other_names          text[] default '{}',
  description          text not null,
  identifying_features text[] not null default '{}',
  habitat              text,
  distribution         text,
  uses                 text[] default '{}',
  care_tips            text[] default '{}',
  toxicity_note        text,
  is_toxic             boolean not null default false,
  fun_fact             text,
  reference_images     text[] default '{}',
  image_credit         jsonb,
  wikipedia_url        text,
  sources              jsonb default '[]'::jsonb,
  created_at           timestamptz default now()
);

-- 2. Species Look-Alikes (Curated "how to tell apart" pairs)
create table if not exists public.species_look_alikes (
  species_id        int references public.species(id) on delete cascade,
  look_alike_id     int references public.species(id) on delete cascade,
  how_to_tell_apart text not null,
  primary key (species_id, look_alike_id),
  check (species_id <> look_alike_id)
);

-- 3. Model Versions (Tracks accuracy, calibration, and training metadata)
create table if not exists public.model_versions (
  version     text primary key,
  top1        numeric,
  top5        numeric,
  macro_f1    numeric,
  ece         numeric,
  num_species int,
  trained_at  timestamptz,
  notes       text
);

-- 4. User Feedback / Ground Truth Corrections (Anonymous only, rate-limited)
create table if not exists public.feedback (
  id                uuid primary key default gen_random_uuid(),
  predicted_species int references public.species(id),
  correct_species   int references public.species(id),
  was_correct       boolean not null,
  comment           text check (char_length(comment) <= 500),
  confidence        numeric,
  model_version     text,
  created_at        timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security (RLS)
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.species              enable row level security;
alter table public.species_look_alikes  enable row level security;
alter table public.model_versions       enable row level security;
alter table public.feedback             enable row level security;

-- Public read-only reference data
drop policy if exists "species readable" on public.species;
create policy "species readable"
  on public.species for select
  using (true);

drop policy if exists "lookalikes readable" on public.species_look_alikes;
create policy "lookalikes readable"
  on public.species_look_alikes for select
  using (true);

drop policy if exists "models readable" on public.model_versions;
create policy "models readable"
  on public.model_versions for select
  using (true);

-- Feedback: anonymous submission permitted, client read disabled
drop policy if exists "feedback insert" on public.feedback;
create policy "feedback insert"
  on public.feedback for insert
  with check (true);

-- Supabase Schema for Plant Species Classification System
-- Reference: docs/BACKEND_SCHEMA.md

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
  fun_fact             text,
  reference_images     text[] default '{}',
  wikipedia_url        text,
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

-- 3. User Profiles (Extends auth.users, optional account sync)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  theme        text default 'dark' check (theme in ('dark','light')),
  created_at   timestamptz default now()
);

-- 4. Model Versions (Tracks accuracy, calibration, and training metadata)
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

-- 5. Saved Predictions (Field history for logged-in users)
-- Note: "similar" is quoted because SIMILAR is a reserved SQL keyword in PostgreSQL
create table if not exists public.predictions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  species_id    int references public.species(id),
  confidence    numeric not null check (confidence between 0 and 1),
  tier          text not null check (tier in ('high','medium','low','unknown')),
  top3          jsonb not null,            -- [{species_id, prob}]
  "similar"     jsonb,                     -- [{species_id, ml, visual, final}]
  image_path    text,                      -- storage path, nullable (opt-in)
  model_version text references public.model_versions(version),
  created_at    timestamptz default now()
);

create index if not exists idx_predictions_user_created on public.predictions (user_id, created_at desc);

-- 6. User Feedback / Ground Truth Corrections (Guests allowed, rate-limited)
create table if not exists public.feedback (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
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
alter table public.profiles             enable row level security;
alter table public.predictions          enable row level security;
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

-- User profiles: own row only
drop policy if exists "profile select own" on public.profiles;
create policy "profile select own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profile upsert own" on public.profiles;
create policy "profile upsert own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profile update own" on public.profiles;
create policy "profile update own"
  on public.profiles for update
  using (auth.uid() = id);

-- Predictions: per-user isolation
drop policy if exists "pred select own" on public.predictions;
create policy "pred select own"
  on public.predictions for select
  using (auth.uid() = user_id);

drop policy if exists "pred insert own" on public.predictions;
create policy "pred insert own"
  on public.predictions for insert
  with check (auth.uid() = user_id);

drop policy if exists "pred delete own" on public.predictions;
create policy "pred delete own"
  on public.predictions for delete
  using (auth.uid() = user_id);

-- Feedback: guests & users may submit, client read disabled
drop policy if exists "feedback insert" on public.feedback;
create policy "feedback insert"
  on public.feedback for insert
  with check (user_id is null or auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Storage Bucket Policies (Private User Uploads)
-- ─────────────────────────────────────────────────────────────────────────────

-- Bucket `uploads`: private, max 5 MB per object, allowed types image/jpeg, image/png, image/webp
-- Path format: {user_id}/{uuid}.jpg
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('uploads', 'uploads', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "uploads insert own" on storage.objects;
create policy "uploads insert own"
  on storage.objects for insert
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "uploads read own" on storage.objects;
create policy "uploads read own"
  on storage.objects for select
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "uploads delete own" on storage.objects;
create policy "uploads delete own"
  on storage.objects for delete
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);

-- ─────────────────────────────────────────────────────────────────────────────
-- Auth Triggers (Auto-provision Profile on Signup)
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

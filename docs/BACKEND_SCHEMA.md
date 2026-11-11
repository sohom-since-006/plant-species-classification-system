# BACKEND SCHEMA (Supabase / Postgres)

## Tables
- `species`: one row per supported species (content source of truth)
- `species_look_alikes`: curated "how to tell apart" notes
- `profiles`: extends `auth.users` (optional login)
- `predictions`: saved results (logged-in users only)
- `feedback`: user corrections (guests allowed, rate-limited)
- `model_versions`: which model produced what

## schema.sql
```sql
create extension if not exists "pgcrypto";

create table public.species (
  id               int primary key,              -- matches class index in labels.json
  slug             text unique not null,
  common_name      text not null,
  scientific_name  text not null,
  family           text not null,
  genus            text not null,
  plant_type       text not null check (plant_type in
                   ('herb','shrub','tree','climber','grass','succulent','aquatic','crop','epiphyte')),
  origin           text not null check (origin in ('indian','global','both')),
  names_hindi      text,
  names_bengali    text,
  other_names      text[] default '{}',
  description      text not null,
  identifying_features text[] not null default '{}',
  habitat          text,
  distribution     text,
  uses             text[] default '{}',
  care_tips        text[] default '{}',
  toxicity_note    text,
  fun_fact         text,
  reference_images text[] default '{}',
  wikipedia_url    text,
  created_at       timestamptz default now()
);

create table public.species_look_alikes (
  species_id       int references public.species(id) on delete cascade,
  look_alike_id    int references public.species(id) on delete cascade,
  how_to_tell_apart text not null,
  primary key (species_id, look_alike_id),
  check (species_id <> look_alike_id)
);

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  theme       text default 'dark' check (theme in ('dark','light')),
  created_at  timestamptz default now()
);

create table public.model_versions (
  version     text primary key,
  top1        numeric, top5 numeric, macro_f1 numeric, ece numeric,
  num_species int, trained_at timestamptz, notes text
);

create table public.predictions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  species_id    int references public.species(id),
  confidence    numeric not null check (confidence between 0 and 1),
  tier          text not null check (tier in ('high','medium','low','unknown')),
  top3          jsonb not null,            -- [{species_id, prob}]
  similar       jsonb,                     -- [{species_id, ml, visual, final}]
  image_path    text,                      -- storage path, nullable (opt-in)
  model_version text references public.model_versions(version),
  created_at    timestamptz default now()
);
create index on public.predictions (user_id, created_at desc);

create table public.feedback (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid references auth.users(id) on delete set null,
  predicted_species  int references public.species(id),
  correct_species    int references public.species(id),
  was_correct        boolean not null,
  comment            text check (char_length(comment) <= 500),
  confidence         numeric,
  model_version      text,
  created_at         timestamptz default now()
);
```

## Row Level Security
```sql
alter table public.species              enable row level security;
alter table public.species_look_alikes  enable row level security;
alter table public.model_versions       enable row level security;
alter table public.profiles             enable row level security;
alter table public.predictions          enable row level security;
alter table public.feedback             enable row level security;

-- public read-only reference data
create policy "species readable"   on public.species             for select using (true);
create policy "lookalikes readable" on public.species_look_alikes for select using (true);
create policy "models readable"    on public.model_versions      for select using (true);

-- profiles: own row only
create policy "profile select own" on public.profiles for select using (auth.uid() = id);
create policy "profile upsert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profile update own" on public.profiles for update using (auth.uid() = id);

-- predictions: own rows only
create policy "pred select own" on public.predictions for select using (auth.uid() = user_id);
create policy "pred insert own" on public.predictions for insert with check (auth.uid() = user_id);
create policy "pred delete own" on public.predictions for delete using (auth.uid() = user_id);

-- feedback: anyone may insert, nobody may read via the client
create policy "feedback insert" on public.feedback for insert
  with check (user_id is null or auth.uid() = user_id);
```
No client write access to `species`, `species_look_alikes`, or `model_versions`. Edit these via the SQL editor or seed files.

## Storage
- Bucket `uploads`: **private**, max 5 MB per object, allowed types `image/jpeg, image/png, image/webp`.
- Path format: `{user_id}/{uuid}.jpg`.
```sql
create policy "uploads insert own" on storage.objects for insert
  with check (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "uploads read own" on storage.objects for select
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "uploads delete own" on storage.objects for delete
  using (bucket_id = 'uploads' and (storage.foldername(name))[1] = auth.uid()::text);
```

## Auth
Email + password and Google OAuth. Guests are allowed everywhere except cloud history. A trigger creates a `profiles` row on signup:
```sql
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email,'@',1)));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```

## seed.sql format
One `insert` per species, ids matching `labels.json`. Example:
```sql
insert into public.species (id, slug, common_name, scientific_name, family, genus,
  plant_type, origin, names_hindi, names_bengali, description, identifying_features,
  habitat, uses, care_tips) values
(0, 'tulsi', 'Tulsi (Holy Basil)', 'Ocimum tenuiflorum', 'Lamiaceae', 'Ocimum',
 'herb', 'indian', 'तुलसी', 'তুলসী',
 'A fragrant, sacred herb widely grown in Indian homes and used in traditional remedies.',
 array['Oval, slightly toothed, aromatic leaves','Purple-green stems','Small purple flower spikes'],
 'Warm, sunny areas; cultivated across India',
 array['Herbal tea','Traditional medicine (educational note only)','Religious worship'],
 array['Full sun','Water when the top soil is dry','Pinch flower spikes to keep it bushy']);
```

## Query Patterns
- Library: `select id, slug, common_name, scientific_name, family, plant_type, origin from species order by common_name`.
- Detail: species by slug plus `species_look_alikes` joined to `species`.
- History: `predictions` where `user_id = auth.uid()` order by `created_at desc` limit 50, with pagination.
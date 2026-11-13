# BACKEND SCHEMA (Supabase / Postgres)

## Tables
- `species`: one row per supported species (content source of truth)
- `species_look_alikes`: curated "how to tell apart" notes
- `model_versions`: which model produced what
- `feedback`: anonymous user corrections (rate-limited, no user identifiers)

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
  is_toxic         boolean not null default false,
  fun_fact         text,
  reference_images text[] default '{}',
  image_credit     jsonb,
  wikipedia_url    text,
  sources          jsonb default '[]'::jsonb,
  created_at       timestamptz default now()
);

create table public.species_look_alikes (
  species_id       int references public.species(id) on delete cascade,
  look_alike_id    int references public.species(id) on delete cascade,
  how_to_tell_apart text not null,
  primary key (species_id, look_alike_id),
  check (species_id <> look_alike_id)
);

create table public.model_versions (
  version     text primary key,
  top1        numeric, top5 numeric, macro_f1 numeric, ece numeric,
  num_species int, trained_at timestamptz, notes text
);

create table public.feedback (
  id                 uuid primary key default gen_random_uuid(),
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
alter table public.feedback             enable row level security;

-- public read-only reference data
create policy "species readable"   on public.species             for select using (true);
create policy "lookalikes readable" on public.species_look_alikes for select using (true);
create policy "models readable"    on public.model_versions      for select using (true);

-- feedback: anyone may insert anonymously, nobody may read via the client
create policy "feedback insert" on public.feedback for insert with check (true);
```
No client write access to `species`, `species_look_alikes`, or `model_versions`. Edit these via the SQL editor or seed files.

## Query Patterns
- Library: `select id, slug, common_name, scientific_name, family, plant_type, origin from species order by common_name`.
- Detail: species by slug plus `species_look_alikes` joined to `species`.
- Feedback: insert-only from client with 500-char max comment length.
- History: stored strictly in client-side `sessionStorage` (no database queries).

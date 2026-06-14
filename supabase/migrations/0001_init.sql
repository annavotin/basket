-- Basket — accounts + cloud sync schema (run once in the Supabase SQL editor).
-- Every table is owned per-user via `user_id` and protected by Row Level Security:
-- a signed-in client (using only the public anon/publishable key) can read & write
-- ONLY its own rows. `updated_at` drives last-write-wins; `deleted_at` is a soft
-- delete so removals propagate to other devices.
--
-- Note: `updated_at` is set by the CLIENT (so cross-device last-write-wins compares
-- real edit times) and defaults to now() for any direct insert. We deliberately do
-- NOT force-overwrite it with a trigger, which would clobber the client's timestamp.

-- ============================================================ profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================ preferences
create table if not exists public.preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  name text,
  default_days int,
  units jsonb,
  theme text,
  accent jsonb,
  macro_targets jsonb,
  daily_goal int,
  updated_at timestamptz not null default now()
);

-- ============================================================ cycles
create table if not exists public.cycles (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  start_date date,
  end_date date,
  items jsonb not null default '[]'::jsonb,
  pantry_overrides jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists cycles_user_updated_idx on public.cycles (user_id, updated_at);

-- ============================================================ extra_meals
create table if not exists public.extra_meals (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  date date,
  name text,
  kcal int,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists extra_meals_user_updated_idx on public.extra_meals (user_id, updated_at);

-- ============================================================ pantry_items
create table if not exists public.pantry_items (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  emoji text,
  kcal_per_100g numeric,
  daily_g numeric,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index if not exists pantry_items_user_updated_idx on public.pantry_items (user_id, updated_at);

-- ============================================================ Row Level Security
-- Enable RLS and add an own-rows policy (select/insert/update/delete) to every table.
do $$
declare t text;
begin
  foreach t in array array['profiles', 'preferences', 'cycles', 'extra_meals', 'pantry_items']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists own_rows on public.%I;', t);
    execute format(
      'create policy own_rows on public.%I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());',
      t
    );
  end loop;
end $$;

-- ============================================================ Account deletion (App Store requirement)
-- Cascade-deletes the caller's data and their auth user. Security definer so it can
-- reach auth.users; it only ever acts on auth.uid(), so a user can only delete themselves.
create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.cycles where user_id = auth.uid();
  delete from public.extra_meals where user_id = auth.uid();
  delete from public.pantry_items where user_id = auth.uid();
  delete from public.preferences where user_id = auth.uid();
  delete from public.profiles where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;

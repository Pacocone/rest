-- v13.4 — Esquema mínimo para flujo simple (Instagram-like)
create table if not exists public.profiles ( id uuid primary key references auth.users(id) on delete cascade, username text unique, display_name text, avatar_url text, created_at timestamp with time zone default now(), updated_at timestamp with time zone default now() );
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));
create table if not exists public.summaries ( owner_id uuid primary key references auth.users(id) on delete cascade, items jsonb not null default '[]'::jsonb, updated_at timestamp with time zone default now() );
alter table public.profiles enable row level security; alter table public.summaries enable row level security;
drop policy if exists profiles_read_public on public.profiles; create policy profiles_read_public on public.profiles for select using (true);
drop policy if exists profiles_upsert_self on public.profiles; create policy profiles_upsert_self on public.profiles for insert with check (auth.uid() = id);
drop policy if exists profiles_update_self on public.profiles; create policy profiles_update_self on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
drop policy if exists summaries_read_public on public.summaries; create policy summaries_read_public on public.summaries for select using (true);
drop policy if exists summaries_upsert_self on public.summaries; create policy summaries_upsert_self on public.summaries for insert with check (auth.uid() = owner_id);
drop policy if exists summaries_update_self on public.summaries; create policy summaries_update_self on public.summaries for update using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
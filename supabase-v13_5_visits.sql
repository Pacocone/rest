
-- v13.5: tabla VISITS para sincronización privada por usuario
create table if not exists public.visits (
  id text primary key,
  owner_id uuid references auth.users(id) on delete cascade,
  restaurant text not null,
  city text,
  date date not null,
  diners integer not null default 1,
  total numeric not null default 0,
  avg numeric not null default 0,
  rating integer not null default 0,
  notes text,
  maps_url text,
  updated_at timestamp with time zone not null default now(),
  created_at timestamp with time zone not null default now()
);
alter table public.visits enable row level security;
drop policy if exists "visits_select_own" on public.visits;
create policy "visits_select_own" on public.visits for select using (auth.uid() = owner_id);
drop policy if exists "visits_insert_own" on public.visits;
create policy "visits_insert_own" on public.visits for insert with check (auth.uid() = owner_id);
drop policy if exists "visits_update_own" on public.visits;
create policy "visits_update_own" on public.visits for update using (auth.uid() = owner_id);
drop policy if exists "visits_delete_own" on public.visits;
create policy "visits_delete_own" on public.visits for delete using (auth.uid() = owner_id);
create index if not exists visits_owner_updated_idx on public.visits(owner_id, updated_at desc);

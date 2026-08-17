-- VIAO_DATABASE.md, sección 3 — trips
-- Agrupación de un viaje del usuario ("Mi viaje").

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  destination text not null,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_dates_check check (end_date is null or start_date is null or end_date >= start_date)
);

create index trips_user_id_idx on public.trips (user_id);

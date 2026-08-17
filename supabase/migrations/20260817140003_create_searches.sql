-- VIAO_DATABASE.md, sección 5 — searches
-- Registro de búsquedas realizadas, para analytics y como contexto de la
-- recomendación de IA.

create table public.searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  destination text not null,
  check_in date not null,
  check_out date not null,
  guests integer not null default 1,
  rooms integer not null default 1,
  results_count integer,
  created_at timestamptz not null default now(),
  constraint searches_dates_check check (check_out > check_in),
  constraint searches_guests_check check (guests > 0),
  constraint searches_rooms_check check (rooms > 0)
);

create index searches_user_id_idx on public.searches (user_id);
create index searches_created_at_idx on public.searches (created_at);

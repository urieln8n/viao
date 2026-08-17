-- VIAO_DATABASE.md, sección 6 — bookings
-- Reservas realizadas, con la trazabilidad económica pedida. Los campos
-- económicos son NULL mientras no se conozcan (no se fijan valores todavía).

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  property_id uuid not null references public.properties (id) on delete restrict,
  search_id uuid references public.searches (id) on delete set null,
  provider_booking_reference text,
  check_in date not null,
  check_out date not null,
  guests integer not null default 1,
  status text not null default 'pending',
  booking_value numeric(10, 2),
  currency text not null default 'EUR',
  provider_commission numeric(10, 2),
  viao_revenue numeric(10, 2),
  reward_cost numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_dates_check check (check_out > check_in),
  constraint bookings_guests_check check (guests > 0),
  constraint bookings_status_check check (status in ('pending', 'confirmed', 'cancelled'))
);

create index bookings_user_id_idx on public.bookings (user_id);
create index bookings_trip_id_idx on public.bookings (trip_id);
create index bookings_status_idx on public.bookings (status);
create index bookings_property_id_idx on public.bookings (property_id);

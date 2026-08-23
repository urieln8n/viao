-- FPR-04.6 — booking_intents: idempotencia real a nivel de Postgres para
-- el futuro flujo de reserva real de Hotelbeds (todavía sin
-- HotelbedsProvider.book(), diseño cerrado en FPR-04.3). Protege contra
-- doble clic, dos pestañas simultáneas, reintentos concurrentes y
-- timeout tras una futura llamada al proveedor — nunca una comprobación
-- en memoria/JavaScript.
--
-- No sustituye ni modifica `bookings` (la reserva ya persistida de
-- verdad): vive como tabla aparte, el "ancla" de la intención de
-- reservar mientras book() todavía no se ha llamado, o su resultado
-- todavía no se sabe con certeza (timeout) o no se pudo persistir
-- (Hotelbeds confirmó, Supabase falló).
--
-- `booking_id` referencia la fila real en `bookings` SOLO cuando el
-- intent llega a `completed` — mientras está `in_progress`/`failed`/
-- `provider_confirmed_orphaned` queda NULL (nunca se inventa una
-- relación con una reserva que no existe).

create table public.booking_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  provider_name text not null,
  provider_property_id text not null,
  check_in date not null,
  check_out date not null,
  guests integer not null,
  rooms integer not null,
  client_reference text not null,
  status text not null default 'in_progress',
  booking_id uuid references public.bookings (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint booking_intents_dates_check check (check_out > check_in),
  constraint booking_intents_guests_check check (guests > 0),
  constraint booking_intents_rooms_check check (rooms > 0),
  constraint booking_intents_status_check check (
    status in ('in_progress', 'completed', 'failed', 'provider_confirmed_orphaned')
  ),
  -- `clientReference` (Hotelbeds, maxLength 20, FPR-04.3/04.4) debe ser
  -- único en sí mismo: aunque se genera de forma determinista a partir
  -- del propio `id` (ver lib/bookings/create-booking-intent.ts), esta
  -- constraint es la red de seguridad real ante una colisión teórica de
  -- truncamiento — Postgres la rechazaría con 23505 en vez de permitir
  -- dos intents con la misma referencia enviada a Hotelbeds.
  constraint booking_intents_client_reference_key unique (client_reference)
);

create index booking_intents_user_id_idx on public.booking_intents (user_id);
create index booking_intents_booking_id_idx on public.booking_intents (booking_id);

-- Idempotencia real (FPR-04.3, sección 5): índice único PARCIAL, activo
-- SOLO mientras status='in_progress'. Dos INSERT concurrentes con la
-- misma tupla (mismo usuario+alojamiento+fechas+ocupación) nunca pueden
-- coexistir ambos como 'in_progress' — Postgres garantiza esa exclusión
-- de forma atómica, sin ninguna ventana de carrera entre un SELECT y un
-- INSERT posteriores (por eso el código nunca hace esa comprobación
-- previa, ver create-booking-intent.ts). En cuanto un intent sale de
-- 'in_progress' (completed/failed/provider_confirmed_orphaned), la MISMA
-- tupla vuelve a estar libre para una intención nueva y legítima más
-- adelante — una UNIQUE global (sin el WHERE) bloquearía para siempre
-- volver a reservar las mismas fechas, algo que FPR-04.3 descartó
-- explícitamente.
create unique index booking_intents_dedup
  on public.booking_intents (
    user_id,
    provider_name,
    provider_property_id,
    check_in,
    check_out,
    guests,
    rooms
  )
  where status = 'in_progress';

-- RLS activo siempre (VIAO_DATABASE.md: "postura por defecto"), Patrón B
-- (igual que `bookings`/`properties`): ninguna policy para
-- authenticated/anon — la única vía de acceso es service_role, nunca el
-- cliente. Alcance del GRANT igual que `bookings` (SELECT+INSERT+UPDATE,
-- sin DELETE: un intent nunca se borra, solo transiciona de estado).
alter table public.booking_intents enable row level security;

grant select, insert, update on public.booking_intents to service_role;

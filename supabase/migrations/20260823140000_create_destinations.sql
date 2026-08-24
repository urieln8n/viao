-- FPR-HOTELS-02 — Caché normalizada del catálogo de destinos de
-- Hotelbeds (Content API, `GET /hotel-content-api/1.0/locations/
-- destinations`), verificado real en FPR-HOTELS-01: España tiene 74
-- destinos, cada uno con un `code` propio (p. ej. BCN=Barcelona,
-- MAD=Madrid) que `HotelbedsProvider.search()` necesita para consultar
-- Availability por destino real, no por los 2 hoteles fijos actuales.
--
-- Mismo patrón exacto que `properties` (20260817140002_create_
-- properties.sql): caché local necesaria porque el Content API no
-- permite buscar por texto libre (confirmado en FPR-HOTELS-01) — hay que
-- sincronizar el catálogo y buscar en la copia local, nunca en vivo.
--
-- `raw_data`: mismo criterio que `properties.raw_data` — conserva la
-- respuesta completa de Hotelbeds (zonas, isoCode, groupZones...) sin
-- modelar cada campo como columna propia; ninguna pantalla de VIAO los
-- consume todavía (autocomplete/resolver solo necesitan code/name), pero
-- quedan disponibles sin coste ni migración extra para cuando se decida
-- usarlos.
--
-- `provider_name` (no solo `code`): mismo criterio que
-- `properties.provider_name` — aunque hoy solo exista Hotelbeds, evita
-- una colisión de namespace si algún día se añade otro proveedor con su
-- propio código de destino.
--
-- `synced_at` (distinto de `updated_at`): `upsert-destination-cache.ts`
-- lo fija explícitamente en cada sync — a diferencia de `updated_at`
-- (sin trigger automático en toda la base, ver update-booking-status.ts),
-- `synced_at` sí refleja de verdad "cuándo se sincronizó por última vez".

create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  code text not null,
  name text not null,
  country_code text not null,
  raw_data jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint destinations_provider_unique unique (provider_name, code)
);

-- RLS Patrón B (mismo criterio que properties): lectura abierta a
-- cualquier authenticated; Search funciona también para usuarios
-- anónimos, así que la lectura real (autocomplete/resolver) pasa por
-- service_role, igual que get-cached-properties.ts ya hace con
-- properties — nunca por el cliente de sesión directamente.
alter table public.destinations enable row level security;

grant select on public.destinations to authenticated;
-- service_role: SELECT (lectura del catálogo) + INSERT/UPDATE (sync) —
-- mismo alcance exacto que properties, sin repetir aquí el ciclo de
-- "descubrir el GRANT que falta" (F5-05/F6-02): ya se sabe que
-- service_role nunca tiene privilegios por defecto sobre una tabla nueva.
grant select, insert, update on public.destinations to service_role;

create policy destinations_select_all
  on public.destinations for select
  to authenticated
  using (true);

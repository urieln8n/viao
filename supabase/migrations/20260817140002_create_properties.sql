-- VIAO_DATABASE.md, sección 4 — properties
-- Caché normalizada de alojamientos devueltos por HotelProvider. No es la
-- fuente de verdad del inventario, sino una copia local necesaria para
-- mostrar detalles y para que bookings tenga a qué referenciarse.

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  provider_property_id text not null,
  name text not null,
  city text,
  country text,
  latitude numeric,
  longitude numeric,
  main_photo_url text,
  rating numeric,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint properties_provider_unique unique (provider_name, provider_property_id)
);

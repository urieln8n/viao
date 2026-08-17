-- VIAO_DATABASE.md, sección 11 — photos
-- Imágenes que el usuario decide explícitamente conservar (de un viaje, o
-- derivadas de un escaneo de Vision).

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid not null references public.trips (id) on delete cascade,
  vision_scan_id uuid references public.vision_scans (id) on delete set null,
  storage_path text not null,
  caption text,
  created_at timestamptz not null default now(),
  constraint photos_storage_path_key unique (storage_path)
);

create index photos_user_id_idx on public.photos (user_id);
create index photos_trip_id_idx on public.photos (trip_id);

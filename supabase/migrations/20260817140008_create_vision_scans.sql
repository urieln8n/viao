-- VIAO_DATABASE.md, sección 10 — vision_scans
-- Registro del procesamiento de VIAO Vision, conceptualmente separado de si
-- la imagen se conserva o no. Esta tabla no almacena la imagen, solo el
-- resultado textual del procesamiento.

create table public.vision_scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  trip_id uuid references public.trips (id) on delete set null,
  source_language text,
  target_language text not null default 'es',
  translated_text text,
  explanation text,
  image_retained boolean not null default false,
  created_at timestamptz not null default now()
);

create index vision_scans_user_id_idx on public.vision_scans (user_id);
create index vision_scans_trip_id_idx on public.vision_scans (trip_id);

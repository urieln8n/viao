-- VIAO_DATABASE.md, sección 2 — profiles
-- Datos de perfil de VIAO asociados 1:1 a un usuario de Supabase Auth.

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  avatar_url text,
  referral_code text not null,
  locale text not null default 'es',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_referral_code_key unique (referral_code)
);

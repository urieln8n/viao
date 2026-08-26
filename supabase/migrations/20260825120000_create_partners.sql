-- PB1 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — partners: identidad mínima
-- del negocio piloto (Restaurante/Experiencia, L2), alta manual/curada (L3).
--
-- `access_token`: mecanismo de acceso Beta del Partner a su propio panel
-- (LOCKED, P7 — Decision Lock Económico Final, 25/08/2026) — sin Supabase
-- Auth, sin contraseña, sin tabla de usuarios de Partner. Generado por VIAO
-- en el alta, nunca por el propio Partner.
--
-- Sin GRANT DELETE (ver sección "RLS y permisos" del pre-flight PB1): un
-- Partner se desactiva vía `status`, nunca se borra — mismo criterio que
-- toda tabla económica/ledger del proyecto (rewards_transactions,
-- mission_completions, booking_intents), ninguna de las cuales concede
-- DELETE a service_role.
--
-- RLS: activa, sin ninguna policy de cliente (ni siquiera `authenticated`).
-- A diferencia de `destinations` (que sí tiene `to authenticated using
-- (true)`), `partners` nunca debe exponer `access_token` a un usuario de
-- sesión de VIAO — la lectura real (mini-web pública, panel del Partner)
-- pasa siempre por `service_role` server-side, igual que
-- `get-cached-destinations.ts` ya hace para el caso verdaderamente
-- anónimo. Una policy `authenticated` filtraría esa columna sensible sin
-- necesidad real (ningún flujo de cliente-directo la necesita).

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  category text not null,
  status text not null default 'active',
  access_token uuid not null default gen_random_uuid(),
  contact_email text,
  contact_phone text,
  address text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partners_slug_key unique (slug),
  constraint partners_access_token_key unique (access_token),
  constraint partners_category_check check (category in ('restaurant', 'experience')),
  constraint partners_status_check check (status in ('active', 'inactive'))
);

alter table public.partners enable row level security;

-- Sin policies de cliente (ni `authenticated` ni `anon`) — toda lectura
-- pasa por `service_role`. Sin DELETE: alta/baja manual vía `status`,
-- nunca un borrado real.
grant select, insert, update on public.partners to service_role;

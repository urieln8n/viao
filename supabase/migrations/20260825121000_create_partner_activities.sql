-- PB1 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — partner_activities:
-- registro append-only de actividad económica real con un Partner, puente
-- B2C/B2B. Deliberadamente SIN columna `status` (LOCKED, PMM10 — Decision
-- Lock Económico Final, 25/08/2026): cada fila nace ya confirmada por
-- construcción; refunds/correcciones se resuelven vía una transacción
-- compensatoria en `rewards_transactions`, nunca editando esta tabla.
--
-- `points_awarded` (LOCKED, P5/P6): Points realmente otorgados, decidido
-- una única vez en el INSERT (PB2, `complete_partner_activity()`) y nunca
-- actualizado después — `0` no es un estado "pendiente", es el valor
-- final cuando el pool mensual de Partners estaba agotado en ese momento.
--
-- `partner_id` sin `on delete cascade` (a diferencia de `user_id`):
-- `partners` nunca concede DELETE a `service_role` (ver migración
-- anterior) — RESTRICT (comportamiento por defecto sin especificar
-- on delete) protege el ledger histórico de Actividades si alguna vez,
-- por error operativo, alguien intentara un DELETE manual sobre
-- `partners` fuera de la aplicación.
--
-- Append-only real: se garantiza por ausencia de GRANT UPDATE/DELETE a
-- service_role, no por trigger — mismo mecanismo exacto ya verificado en
-- rewards_transactions (20260818110000_*.sql) y mission_completions
-- (20260824100000_*.sql).
--
-- RLS: Patrón B puro, igual que rewards_transactions/mission_completions/
-- booking_intents — cero policies de cliente. El único escritor futuro
-- será el RPC `complete_partner_activity()` (PB2, SECURITY DEFINER,
-- invocado por service_role) — PB1 no lo crea todavía.

create table public.partner_activities (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners (id),
  user_id uuid not null references public.profiles (id) on delete cascade,
  attribution_mechanism text not null,
  declared_amount_eur numeric(10, 2) not null,
  amount_confidence text not null,
  points_awarded integer not null default 0,
  reservation_reference text,
  attempt_id uuid not null,
  created_at timestamptz not null default now(),
  constraint partner_activities_attempt_id_key unique (attempt_id),
  constraint partner_activities_attribution_mechanism_check check (
    attribution_mechanism in ('qr', 'reservation')
  ),
  constraint partner_activities_amount_confidence_check check (
    amount_confidence in ('declared', 'confirmed_by_reservation')
  ),
  constraint partner_activities_declared_amount_eur_check check (declared_amount_eur > 0)
);

create index partner_activities_partner_id_idx on public.partner_activities (partner_id);
create index partner_activities_user_id_idx on public.partner_activities (user_id);
create index partner_activities_created_at_idx on public.partner_activities (created_at);

alter table public.partner_activities enable row level security;

-- Append-only: SELECT+INSERT únicamente, sin UPDATE ni DELETE. Sin
-- policies de cliente — ni `authenticated` ni `anon` pueden leer ni
-- escribir directamente, coherente con rewards_transactions.
grant select, insert on public.partner_activities to service_role;

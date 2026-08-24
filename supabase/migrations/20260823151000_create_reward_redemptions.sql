-- Bloque 1 (VIAO_V1_LOOP_DECISION.md) — reward_redemptions.
--
-- Registro de cada canje de un Reward. `points_spent` es SIEMPRE
-- POSITIVO — representa el coste del Reward en Points, nunca el signo
-- del movimiento. El signo negativo del canje vive ÚNICAMENTE en
-- `rewards_transactions.amount` (columna distinta, tabla distinta) —
-- nunca se mezclan ambas semánticas en esta tabla.
--
-- RLS Patrón B completo, igual que `rewards_transactions`
-- (VIAO_DATABASE.md sección 7, "nunca desde el cliente, bajo ninguna
-- circunstancia"): el usuario autenticado solo puede LEER sus propias
-- redenciones. Toda escritura (crear, marcar fulfilled, cancelar) pasa
-- exclusivamente por `service_role`, nunca por una policy de INSERT/
-- UPDATE para `authenticated`.

create table public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_catalog_id uuid not null references public.rewards_catalog (id),
  points_spent integer not null check (points_spent > 0),
  status text not null default 'pending' check (status in ('pending', 'fulfilled', 'cancelled')),
  redemption_code text not null,
  redemption_attempt_id uuid not null,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  cancelled_at timestamptz,
  expires_at timestamptz,
  constraint reward_redemptions_code_key unique (redemption_code),
  -- Idempotencia de reintento (timeout de red + reintento del cliente,
  -- ver 20260823152000_create_redeem_reward_rpc.sql): mismo attempt_id
  -- nunca puede generar una segunda fila.
  constraint reward_redemptions_attempt_key unique (redemption_attempt_id)
);

create index reward_redemptions_user_id_idx on public.reward_redemptions (user_id);
create index reward_redemptions_reward_catalog_id_idx on public.reward_redemptions (reward_catalog_id);
-- Usado por el kill-switch del pool VIAO para acotar la suma al mes en
-- curso sin escanear toda la tabla.
create index reward_redemptions_created_at_idx on public.reward_redemptions (created_at);

alter table public.reward_redemptions enable row level security;

grant select on public.reward_redemptions to authenticated;
-- service_role SÍ tiene UPDATE aquí (a diferencia de rewards_transactions):
-- reward_redemptions no es el ledger económico en sí, es el registro de
-- estado de una redención (pending/fulfilled/cancelled) — transicionar su
-- estado es una operación legítima, distinta de editar un movimiento de
-- Points ya escrito.
grant select, insert, update on public.reward_redemptions to service_role;

create policy reward_redemptions_select_own
  on public.reward_redemptions for select
  to authenticated
  using (user_id = auth.uid());

-- Bloque 1 (VIAO_V1_LOOP_DECISION.md) — goals, modelo híbrido.
--
-- Un único Goal activo por usuario (constraint única parcial, mismo
-- patrón exacto que `booking_intents_dedup`,
-- 20260820120000_create_booking_intents.sql). Patrón A (VIAO_DATABASE.md
-- sección 1) — el usuario crea/lee/cancela su propio Goal directamente
-- bajo RLS, igual que `trips`: no es una operación puramente económica
-- de ledger, es metadata de producto de bajo riesgo.
--
-- `points_at_goal_creation`: NUNCA se confía en el valor que el cliente
-- envíe en su propio INSERT (aunque técnicamente pueda escribir
-- cualquier número, la columna es `not null`) — un trigger
-- `security definer` (mismo mecanismo que handle_new_user()) lo
-- SOBRESCRIBE siempre con el saldo real calculado en ese instante. El
-- usuario sigue insertando directamente (UX simple, sin Server Action
-- dedicada solo para esto), pero el dato económico crítico nunca es
-- manipulable desde fuera.
--
-- Progreso (modelo híbrido, Decision Lock del bloque — corrige la
-- versión anterior "progreso = saldo actual", que retrocedía al canjear
-- y generaba una señal desmotivadora): "Ganado para tu objetivo" se
-- calcula en lectura (lib/goals/get-goal.ts) como
-- `points_at_goal_creation + SUM(earned desde created_at)` — solo
-- avanza, nunca baja al canjear. "Disponible ahora" sigue siendo el
-- saldo real de `rewards_wallets`, mostrado siempre como una cifra
-- SEPARADA — nunca se presentan como si fueran lo mismo.

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  target_points integer not null check (target_points > 0),
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'cancelled')),
  points_at_goal_creation integer not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index goals_user_id_idx on public.goals (user_id);

-- Idempotencia real a nivel Postgres, mismo criterio que
-- booking_intents_dedup: como máximo un Goal 'active' por usuario a la
-- vez. En cuanto uno sale de 'active' (completed/cancelled), la tupla
-- vuelve a estar libre para un Goal nuevo.
create unique index goals_one_active_per_user_idx
  on public.goals (user_id)
  where status = 'active';

alter table public.goals enable row level security;

grant select, insert, update on public.goals to authenticated;

create policy goals_select_own
  on public.goals for select
  to authenticated
  using (user_id = auth.uid());

create policy goals_insert_own
  on public.goals for insert
  to authenticated
  with check (user_id = auth.uid());

-- Update: solo para que el propio usuario pueda cancelar su Goal
-- (status -> cancelled) — cancelar no tiene ninguna implicación
-- económica que proteger (no se tocan Points), así que no necesita
-- pasar por service_role. `target_points`/`points_at_goal_creation` no
-- tienen ninguna vía de edición desde el cliente en este bloque (nunca
-- se pidió "editar objetivo", solo crear/cancelar).
create policy goals_update_own
  on public.goals for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create or replace function public.set_goal_points_at_creation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(sum(amount), 0) into new.points_at_goal_creation
  from public.rewards_transactions
  where user_id = new.user_id;
  return new;
end;
$$;

create trigger goals_set_points_at_creation
  before insert on public.goals
  for each row
  execute function public.set_goal_points_at_creation();

revoke execute on function public.set_goal_points_at_creation() from public, anon, authenticated;

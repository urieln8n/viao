-- P14.4-F (F4 — Goal Completion, VIAO_P14_4_F_CORE_EXPERIENCE_FINAL_AUDIT.md
-- §21/F4) — `complete_goal_if_threshold_met()`.
--
-- Hasta este bloque, `goals.status` NUNCA transicionaba a 'completed' en
-- ningún flujo real (confirmado explícitamente en P14.4-D §7 y por el
-- propio test `cancel-goal.test.ts`, que prueba que un UPDATE directo a
-- 'completed' es rechazado). Este RPC es la primera y única vía real de
-- esa transición.
--
-- ⚠️ HALLAZGO DURANTE LA IMPLEMENTACIÓN (documentado explícitamente, no
-- silenciado — mismo criterio que el encargo pide para cualquier cambio
-- de RLS/trigger imprescindible): al probar el RPC inicial contra
-- Postgres real, `goal_invalid_status_transition` lo rechazaba siempre.
-- Causa raíz: `protect_goal_immutable_fields()`
-- (20260824090000_protect_goals_immutable_fields.sql) bloquea
-- INCONDICIONALMENTE cualquier transición de `status` que no sea
-- exactamente `active -> cancelled` — deliberado en su momento, antes de
-- que existiera ningún mecanismo real de completion. Sin modificar este
-- trigger, F4 es IMPOSIBLE de implementar tal como se pidió (la propia
-- transición a 'completed' es el requisito central del bloque). Se
-- resuelve con el MISMO patrón exacto ya usado y ya auditado en este
-- proyecto para el problema idéntico en Partners
-- (`protect_partners_immutable_fields()` + `set_partner_status()`,
-- 20260901100000_add_partner_status_approval.sql): una señal
-- transaccional (`current_setting`/`set_config`, `is_local=true`, se
-- resetea sola al terminar la transacción) que SOLO este RPC escribe
-- justo antes de su propio UPDATE — un UPDATE directo del cliente
-- (`sessionClient.from("goals").update({status:'completed'})`) sigue
-- bloqueado exactamente igual que antes, porque nunca puede establecer
-- esa señal. `active -> cancelled` (ya expuesto al cliente vía
-- `cancelGoal()`, Patrón A, sin cambios) NO requiere la señal — sigue
-- permitido incondicionalmente, como siempre.
--
-- Por qué un RPC nuevo, y no una migración "por comodidad": la condición
-- de completion (`earnedPoints >= target_points`, modelo P14.4-E) debe
-- evaluarse de forma atómica y autoritativa server-side — exactamente el
-- mismo criterio "nunca confiar en que el cliente ya lo comprobó" ya
-- aplicado en `redeem_reward()`/`complete_mission()`/`set_partner_status()`.
-- No existe ningún RPC existente que pueda reutilizarse (ninguno de
-- Goals toca `rewards_transactions`, ninguno de Rewards/Missions toca
-- `goals`) — auditado explícitamente antes de escribir este archivo.
--
-- Fórmula IDÉNTICA a `getEarnedPointsTowardGoal()`
-- (lib/goals/get-earned-points.ts, P14.4-E): `points_at_goal_creation +
-- SUM(rewards_transactions.amount WHERE type='earned' AND
-- reason<>'redemption_refund' AND created_at > goals.created_at)`. DEBE
-- mantenerse sincronizada a mano con esa función TypeScript — mismo
-- criterio ya aceptado en el proyecto para Missions/Rewards.
--
-- Atomicidad: `for update` sobre la fila del Goal serializa cualquier
-- llamada concurrente para el MISMO Goal — solo una ejecuta el UPDATE
-- real; las demás ven `status <> 'active'` tras esperar el lock y
-- devuelven `just_completed = false` sin volver a escribir nada. El
-- propio UPDATE lleva `where status = 'active'` como segunda capa
-- (defensa en profundidad, mismo patrón que `cancel_redemption()`).
--
-- Autorización: `p_user_id` SIEMPRE debe venir de la sesión real
-- resuelta server-side por quien llama — el RPC solo actúa sobre un Goal
-- cuyo `user_id` coincide exactamente; en caso contrario, `not_found`
-- (anti-enumeración, mismo criterio ya usado en el resto del proyecto).
--
-- Consecuencias explícitas ya garantizadas por este diseño, sin lógica
-- adicional: una `redemption` posterior NUNCA puede devolver el Goal a
-- 'active' (ningún código del proyecto escribe `status='active'` sobre
-- una fila ya 'completed'). Un `redemption_refund` posterior nunca puede
-- alterar retroactivamente un Goal ya 'completed' (el guard `where
-- status = 'active'` bloquea cualquier reevaluación una vez completado).
--
-- Nota de implementación (encontrada al probar contra Postgres real): la
-- columna de salida se llama `goal_status`, NUNCA `status` a secas —
-- PL/pgSQL crea una variable OUT implícita por cada columna de `returns
-- table (...)`, y llamarla `status` colisionaba (ambigüedad real,
-- confirmada empíricamente: "column reference \"status\" is ambiguous")
-- con `goals.status` dentro del propio UPDATE de esta función.

create or replace function public.protect_goal_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.points_at_goal_creation is distinct from old.points_at_goal_creation
    or new.target_points is distinct from old.target_points
    or new.title is distinct from old.title
    or new.target_date is distinct from old.target_date
    or new.user_id is distinct from old.user_id
    or new.created_at is distinct from old.created_at
  then
    raise exception 'goal_immutable_field_change';
  end if;

  if new.status is distinct from old.status then
    if (old.status = 'active' and new.status = 'cancelled') then
      -- Sin cambios: sigue permitido incondicionalmente, expuesto al
      -- cliente vía cancelGoal() (Patrón A), como siempre.
      null;
    elsif (
      old.status = 'active' and new.status = 'completed'
      and coalesce(current_setting('viao.goal_completion_authorized', true), 'false') = 'true'
    ) then
      -- P14.4-F — únicamente complete_goal_if_threshold_met() establece
      -- esta señal, justo antes de su propio UPDATE. Un UPDATE directo
      -- del cliente nunca puede establecerla: sigue bloqueado.
      null;
    else
      raise exception 'goal_invalid_status_transition';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.complete_goal_if_threshold_met(
  p_goal_id uuid,
  p_user_id uuid
)
returns table (goal_status text, just_completed boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_goal public.goals;
  v_earned_points integer;
  v_updated_count integer;
begin
  select * into v_goal
  from public.goals
  where id = p_goal_id and user_id = p_user_id
  for update;

  if not found then
    return query select 'not_found'::text, false;
    return;
  end if;

  if v_goal.status <> 'active' then
    -- Ya 'completed' (incluida una llamada concurrente que ganó la
    -- carrera) o 'cancelled' — nunca se reevalúa ni se vuelve a escribir.
    return query select v_goal.status, false;
    return;
  end if;

  select v_goal.points_at_goal_creation + coalesce(sum(rt.amount), 0)
    into v_earned_points
  from public.rewards_transactions rt
  where rt.user_id = v_goal.user_id
    and rt.type = 'earned'
    and rt.reason <> 'redemption_refund'
    and rt.created_at > v_goal.created_at;

  if v_earned_points < v_goal.target_points then
    return query select 'active'::text, false;
    return;
  end if;

  perform set_config('viao.goal_completion_authorized', 'true', true);
  update public.goals
  set status = 'completed', completed_at = now()
  where id = p_goal_id and status = 'active';
  perform set_config('viao.goal_completion_authorized', 'false', true);

  get diagnostics v_updated_count = row_count;

  if v_updated_count = 1 then
    return query select 'completed'::text, true;
  else
    return query select 'completed'::text, false;
  end if;
end;
$$;

revoke execute on function public.complete_goal_if_threshold_met(uuid, uuid) from public, anon, authenticated;
grant execute on function public.complete_goal_if_threshold_met(uuid, uuid) to service_role;

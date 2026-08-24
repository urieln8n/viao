-- Bloque Missions (Prompt Maestro 24/08/2026) — complete_mission().
--
-- Mismo patrón arquitectónico ya auditado en `redeem_reward()`
-- (20260823152000_create_redeem_reward_rpc.sql): SECURITY DEFINER,
-- `set search_path=''`, invocable solo por `service_role` (nunca
-- `anon`/`authenticated` directamente) — el Server Action que la invoca
-- ya resolvió el usuario real vía `auth.getUser()` antes de llamar
-- aquí, exactamente igual que Rewards. `p_user_id` nunca es "lo que el
-- cliente dice que es": es lo que el propio backend de VIAO ya validó.
--
-- Points por Mission: fuente de verdad EN SQL (el CASE de abajo), no en
-- TypeScript — mismo criterio ya usado para
-- `REGISTRATION_REWARD_POINTS_PROVISIONAL`/`v_monthly_pool_limit_eur`:
-- SQL no puede importar una constante de TS, así que se declara aquí
-- también y se sincroniza a mano con `lib/missions/rules.ts`. Así,
-- aunque `lib/missions/complete-mission.ts` tuviera un bug de cálculo,
-- el valor que realmente se otorga sigue siendo el que decide esta
-- función, nunca un valor calculado en TypeScript.
--
-- Concurrencia: UN ÚNICO advisory lock global
-- (`hashtext('viao_missions_pool')`) — DISTINTO del de Rewards
-- (`hashtext('viao_reward_pool')`), nunca compartido, presupuestos
-- independientes. A diferencia de Rewards (que separa lock por-usuario
-- de lock del pool porque hay muchas redemptions no-VIAO-financiadas
-- que no deben bloquearse entre sí), aquí el volumen esperado es mucho
-- menor (como mucho 4 Missions/usuario/semana) y TODA operación de
-- Missions comparte el mismo presupuesto — un único lock global es
-- correcto y más simple, sin coste de rendimiento real a esta escala.
-- Bajo ese único lock: idempotencia (SELECT), techo mensual, y el doble
-- INSERT (`mission_completions` + `rewards_transactions`) quedan
-- completamente serializados frente a cualquier otra completion de
-- Missions, de cualquier usuario — evita cualquier necesidad de
-- "deshacer" una completion ya insertada si el pool resultara agotado
-- (el orden aquí comprueba el pool ANTES de insertar nada).

create or replace function public.complete_mission(
  p_user_id uuid,
  p_mission_key text,
  p_period_key text
)
returns public.mission_completions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_points integer;
  v_monthly_pool_limit_points constant integer := 3000;
  v_pool_spent_this_month integer;
  v_completion_id uuid := gen_random_uuid();
  v_existing public.mission_completions;
  v_new_completion public.mission_completions;
begin
  perform 1 from public.profiles where id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  -- Points por Mission — ver nota de cabecera. Cualquier `mission_key`
  -- no reconocida se rechaza explícitamente (fail-closed), nunca se
  -- asume un valor por defecto ni "sin límite".
  v_points := case p_mission_key
    when 'search_started' then 10
    when 'return_visit' then 10
    when 'hotel_viewed' then 10
    when 'goal_created' then 50
    else null
  end;
  if v_points is null then
    raise exception 'mission_not_found';
  end if;

  perform pg_advisory_xact_lock(hashtext('viao_missions_pool'));

  -- Idempotencia: si esta Mission ya se completó en este periodo, se
  -- devuelve la fila existente sin generar Points de más — nunca un
  -- error; un reintento nunca debe comportarse distinto de un éxito.
  select * into v_existing
  from public.mission_completions
  where user_id = p_user_id and mission_key = p_mission_key and period_key = p_period_key;

  if found then
    return v_existing;
  end if;

  -- Kill-switch: techo mensual de EMISIÓN vía Missions, independiente
  -- del pool de canje de Rewards (nunca se suman ni se comparten).
  select coalesce(sum(points_awarded), 0) into v_pool_spent_this_month
  from public.mission_completions
  where date_trunc('month', created_at) = date_trunc('month', now());

  if v_pool_spent_this_month + v_points > v_monthly_pool_limit_points then
    raise exception 'missions_pool_exhausted';
  end if;

  -- INSERT atómico: completion (append-only) + ledger (append-only). Si
  -- cualquier paso falla, toda la función hace rollback — nunca una
  -- completion sin su transacción correspondiente, ni al revés.
  insert into public.mission_completions (id, user_id, mission_key, period_key, points_awarded)
  values (v_completion_id, p_user_id, p_mission_key, p_period_key, v_points)
  on conflict (user_id, mission_key, period_key) do nothing
  returning * into v_new_completion;

  if v_new_completion.id is null then
    -- Defensa en profundidad: el SELECT de arriba, bajo el mismo lock,
    -- ya debería haber detectado cualquier fila existente. Si aun así
    -- se llegara aquí, se devuelve la fila real, nunca se inventa una.
    select * into v_new_completion
    from public.mission_completions
    where user_id = p_user_id and mission_key = p_mission_key and period_key = p_period_key;
    return v_new_completion;
  end if;

  insert into public.rewards_transactions (user_id, amount, type, reason, reference_type, reference_id)
  values (p_user_id, v_points, 'earned', 'mission:' || p_mission_key, 'mission_completion', v_completion_id);

  return v_new_completion;
end;
$$;

revoke execute on function public.complete_mission(uuid, text, text) from public, anon, authenticated;
grant execute on function public.complete_mission(uuid, text, text) to service_role;

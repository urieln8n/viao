-- FASE J-B4 (Core Reset — Dependency Exit, Product Decision Lock
-- 2026-08-27) — sustituye en complete_mission() las dos Missions que
-- dependían de Travel (`hotel_viewed`, `search_started`, ya sin entrada
-- de navegación desde J-B1) por sus reemplazos aprobados:
-- `partner_activity_registered` (reemplaza `hotel_viewed`) y
-- `profile_completed` (reemplaza `search_started`). `return_visit` y
-- `goal_created` no cambian. Ver lib/missions/rules.ts para el
-- razonamiento completo — este archivo solo sincroniza a mano el CASE
-- de Points, mismo criterio ya documentado en
-- 20260824101000_create_complete_mission_rpc.sql (SQL no puede importar
-- una constante de TypeScript).
--
-- CREATE OR REPLACE FUNCTION sobre la función ya existente — no se edita
-- la migración histórica 20260824101000_*.sql, no se toca
-- mission_completions (schema/RLS/GRANTs sin cambios), no se toca
-- rewards_transactions. Idempotencia, kill-switch de pool mensual y
-- locking de concurrencia: idénticos, sin cambios respecto a la versión
-- anterior de esta función.
--
-- Compatibilidad histórica: filas ya existentes en mission_completions
-- con mission_key='hotel_viewed'/'search_started' (si las hubiera)
-- permanecen intactas — mission_completions no tiene ninguna FK ni CHECK
-- que ate mission_key a un enum fijo, así que simplemente dejan de
-- corresponder a ninguna Mission actualmente reconocida por
-- lib/missions/rules.ts, sin generar ningún error ni inconsistencia.

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
    when 'profile_completed' then 10
    when 'return_visit' then 10
    when 'partner_activity_registered' then 10
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

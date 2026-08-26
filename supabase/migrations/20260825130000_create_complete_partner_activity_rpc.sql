-- PB2 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — complete_partner_activity().
--
-- Mismo patrón arquitectónico que complete_mission()
-- (20260824101000_create_complete_mission_rpc.sql): SECURITY DEFINER,
-- set search_path='', invocable solo por service_role. p_user_id nunca es
-- "lo que el cliente dice que es" — la Server Action de PB4 resolverá
-- auth.getUser() antes de llamar aquí (PB2 no implementa esa capa).
--
-- Diferencia deliberada frente a complete_mission() (LOCKED, P5 —
-- Decision Lock Económico Final, 25/08/2026): captura de Actividad y
-- emisión de Points NO son atómicas entre sí. Missions completa y
-- recompensa son el mismo evento por definición; Partners separa
-- Actividad (dato económico/operativo real, siempre se registra) de
-- Points (incentivo financiado por VIAO, condicionado al pool mensual).
-- El agotamiento del pool no debe borrar ni impedir registrar la
-- Actividad.
--
-- `attribution_mechanism` no es un parámetro propio (mismo criterio ya
-- fijado en VIAO_PARTNERS_TECHNICAL_SPEC.md §10: la firma del RPC no lo
-- incluye) — se deriva de `p_amount_confidence`, la única distinción real
-- que el llamante conoce en el momento de la llamada:
-- 'confirmed_by_reservation' implica el flujo de Reserva ('reservation'),
-- 'declared' implica el flujo de QR ('qr'). Es la misma correlación 1:1
-- que ya describe el Master V2 §8 (Restaurantes->QR->'declared',
-- Experiencias->Reserva->'confirmed_by_reservation').
--
-- Concurrencia: un único advisory lock global
-- (hashtext('viao_partners_pool')) — DISTINTO de Missions
-- (hashtext('viao_missions_pool')) y de Rewards
-- (hashtext('viao_reward_pool')), nunca compartido, presupuestos
-- independientes. Bajo ese único lock: idempotencia (SELECT por
-- attempt_id), kill-switch diario (P3, COUNT), kill-switch mensual (P4,
-- SUM) y el INSERT/INSERT condicional quedan completamente serializados
-- frente a cualquier otra Actividad de Partners.
--
-- P3 (kill-switch diario, LOCKED): máx. 2 Actividades/(user_id,
-- partner_id)/día — medido en Actividades, NO en Points. Al superarse,
-- raise exception ANTES de insertar nada — bloqueo completo, sin filas
-- parciales. A diferencia de P4, este SÍ bloquea la Actividad.
--
-- P4/P5/P6 (pool mensual, LOCKED): 3.000 Points/mes, propio e
-- independiente. Al agotarse: partner_activities se inserta SIEMPRE;
-- rewards_transactions se inserta SOLO si hay margen; points_awarded=0 si
-- no lo hay, decidido una única vez en este INSERT; sin backfill ni
-- emisión retroactiva posterior.
--
-- P1/P2 (tasa, LOCKED): 2 Points/€ si amount_confidence=
-- 'confirmed_by_reservation', 1 Point/€ si 'declared'. floor() sobre el
-- importe declarado, constante en SQL (no en TypeScript) — mismo
-- criterio ya usado para el CASE de complete_mission().
--
-- Ledger único (LOCKED, L7): reason='partner_activity',
-- reference_type='partner_activity', reference_id=id de la fila de
-- partner_activities — mismo mecanismo exacto ya usado para
-- 'mission:*'/'redemption'/'redemption_refund'. rewards_transactions no
-- cambia de estructura.

create or replace function public.complete_partner_activity(
  p_user_id uuid,
  p_partner_id uuid,
  p_attempt_id uuid,
  p_declared_amount_eur numeric,
  p_amount_confidence text,
  p_reservation_reference text default null
)
returns public.partner_activities
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_points integer;
  v_attribution_mechanism text;
  v_monthly_pool_limit_points constant integer := 3000;
  v_daily_activity_limit constant integer := 2;
  v_pool_spent_this_month integer;
  v_activities_today integer;
  v_has_margin boolean;
  v_activity_id uuid := gen_random_uuid();
  v_existing public.partner_activities;
  v_new_activity public.partner_activities;
begin
  -- Validación de parámetros — fail-closed, nunca asumir importe/coste
  -- cero ante un valor inválido (mismo criterio ya aplicado en
  -- redeem_reward() para real_cost_eur). Revalida aquí como defensa en
  -- profundidad, aunque las CHECK de la tabla ya lo exigirían al INSERT.
  if p_declared_amount_eur is null or p_declared_amount_eur <= 0 then
    raise exception 'invalid_declared_amount';
  end if;

  if p_amount_confidence not in ('declared', 'confirmed_by_reservation') then
    raise exception 'invalid_amount_confidence';
  end if;

  -- Validar usuario y Partner ANTES de tomar el lock — mismo orden que
  -- complete_mission() (valida usuario antes de bloquear).
  perform 1 from public.profiles where id = p_user_id;
  if not found then
    raise exception 'user_not_found';
  end if;

  perform 1 from public.partners where id = p_partner_id and status = 'active';
  if not found then
    raise exception 'partner_not_found_or_inactive';
  end if;

  v_attribution_mechanism := case p_amount_confidence
    when 'confirmed_by_reservation' then 'reservation'
    else 'qr'
  end;

  perform pg_advisory_xact_lock(hashtext('viao_partners_pool'));

  -- Idempotencia: si este attempt_id ya se procesó, se devuelve la fila
  -- existente sin volver a evaluar nada — nunca un error; un reintento
  -- nunca debe comportarse distinto de un éxito.
  select * into v_existing
  from public.partner_activities
  where attempt_id = p_attempt_id;

  if found then
    return v_existing;
  end if;

  -- P3 — kill-switch diario: cuenta Actividades, no Points. Bloqueo
  -- completo, ninguna fila se crea si se supera.
  select count(*) into v_activities_today
  from public.partner_activities
  where user_id = p_user_id
    and partner_id = p_partner_id
    and created_at::date = now()::date;

  if v_activities_today >= v_daily_activity_limit then
    raise exception 'partner_daily_limit_exceeded';
  end if;

  -- P1/P2 — tasa según el nivel de confianza del importe.
  v_points := floor(
    p_declared_amount_eur * case p_amount_confidence
      when 'confirmed_by_reservation' then 2
      else 1
    end
  )::integer;

  -- P4 — kill-switch mensual del pool propio de Partners (independiente
  -- de Missions/Rewards). NO bloquea la Actividad — solo determina si hay
  -- margen para emitir Points (P5).
  select coalesce(sum(points_awarded), 0) into v_pool_spent_this_month
  from public.partner_activities
  where date_trunc('month', created_at) = date_trunc('month', now());

  v_has_margin := (v_pool_spent_this_month + v_points) <= v_monthly_pool_limit_points;

  -- P5/P6 — INSERT en partner_activities SIEMPRE, exista o no margen.
  -- points_awarded refleja exactamente lo otorgado, decidido una única
  -- vez aquí, nunca actualizado después.
  insert into public.partner_activities (
    id, partner_id, user_id, attribution_mechanism, declared_amount_eur,
    amount_confidence, points_awarded, reservation_reference, attempt_id
  )
  values (
    v_activity_id, p_partner_id, p_user_id, v_attribution_mechanism,
    p_declared_amount_eur, p_amount_confidence,
    case when v_has_margin then v_points else 0 end,
    p_reservation_reference, p_attempt_id
  )
  returning * into v_new_activity;

  -- INSERT en rewards_transactions SOLO si hay margen (P5) — mismo
  -- ledger único, sin cambios de estructura.
  if v_has_margin then
    insert into public.rewards_transactions (user_id, amount, type, reason, reference_type, reference_id)
    values (p_user_id, v_points, 'earned', 'partner_activity', 'partner_activity', v_activity_id);
  end if;

  return v_new_activity;
end;
$$;

revoke execute on function public.complete_partner_activity(uuid, uuid, uuid, numeric, text, text)
  from public, anon, authenticated;
grant execute on function public.complete_partner_activity(uuid, uuid, uuid, numeric, text, text)
  to service_role;

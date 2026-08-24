-- Bloque 1 (VIAO_V1_LOOP_DECISION.md) — redeem_reward() / cancel_redemption().
--
-- Primer uso en el proyecto de una función invocada explícitamente vía
-- `.rpc()` desde supabase-js (hasta ahora todas las funciones
-- `security definer` del proyecto son triggers, ver
-- 20260817180000_create_profiles_trigger.sql y siguientes) — el
-- mecanismo interno (security definer, transacción atómica, generación
-- de código corto) reutiliza el mismo patrón ya auditado.
--
-- Concurrencia — dos locks con propósitos DISTINTOS, ninguno sustituye
-- al otro:
--   1. `profiles ... for update` (SIEMPRE): serializa los canjes
--      concurrentes del MISMO usuario — garantiza que el saldo nunca
--      queda negativo bajo doble clic/dos pestañas/reintentos reales.
--   2. `pg_advisory_xact_lock('viao_reward_pool')` (SOLO cuando
--      funding_type='viao'): serializa el acceso al recurso GLOBAL del
--      pool mensual — sin este lock, dos usuarios distintos canjeando a
--      la vez podrían ambos leer el mismo "gasto acumulado del mes" y
--      superar el techo juntos.
--
-- Idempotencia de reintento (timeout de red, no concurrencia genuina):
-- `redemption_attempt_id` lo genera el LLAMANTE (Server Action, vía
-- `crypto.randomUUID()`, mismo mecanismo ya usado para nombres de
-- archivo en app/trips/[id]/add-photo-form.tsx/app/vision/vision-view.tsx)
-- — a diferencia de `booking_intents.client_reference`, que se deriva
-- server-side del propio id de la fila. La diferencia es deliberada:
-- `book()` protege contra la ambigüedad de un PROVEEDOR EXTERNO
-- (Hotelbeds) cuya respuesta se puede perder; `redeem_reward` es 100%
-- interno a Postgres, sin proveedor externo — la única ambigüedad
-- posible es que el CLIENTE no sepa si su petición llegó, no que
-- Postgres no sepa si la comprometió. La constraint única sobre
-- `redemption_attempt_id` (migración anterior) resuelve exactamente eso.
--
-- Kill-switch (fail-closed): el techo mensual vive como constante en
-- esta función — mismo patrón ya aceptado en el proyecto para
-- `REGISTRATION_REWARD_POINTS_PROVISIONAL` (100, hardcodeado en el
-- trigger SQL Y en lib/rewards/rules.ts, sincronizados manualmente).
-- Si `real_cost_eur` faltara para un Reward `funding_type='viao'` (no
-- debería ocurrir, la constraint de la tabla ya lo exige, pero se
-- revalida aquí como defensa en profundidad), el canje se RECHAZA en vez
-- de asumir coste cero — nunca "sin límite" por defecto.

create or replace function public.redeem_reward(
  p_user_id uuid,
  p_reward_catalog_id uuid,
  p_attempt_id uuid
)
returns public.reward_redemptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.reward_redemptions;
  v_reward public.rewards_catalog;
  v_balance integer;
  v_prior_redemptions integer;
  v_pool_spent_this_month numeric(10,2);
  v_monthly_pool_limit_eur constant numeric(10,2) := 100.00;
  v_redemption_code text;
  v_redemption_id uuid := gen_random_uuid();
  v_new_redemption public.reward_redemptions;
begin
  -- Paso 1: lock del usuario.
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'user_not_found';
  end if;

  -- Paso 2: idempotencia — mismo intento nunca descuenta dos veces.
  select * into v_existing
  from public.reward_redemptions
  where redemption_attempt_id = p_attempt_id;

  if found then
    return v_existing;
  end if;

  -- Paso 3: cargar y validar el Reward.
  select * into v_reward from public.rewards_catalog where id = p_reward_catalog_id;
  if not found or not v_reward.active then
    raise exception 'reward_not_available';
  end if;

  if v_reward.limit_per_user is not null then
    select count(*) into v_prior_redemptions
    from public.reward_redemptions
    where user_id = p_user_id
      and reward_catalog_id = p_reward_catalog_id
      and status <> 'cancelled';

    if v_prior_redemptions >= v_reward.limit_per_user then
      raise exception 'limit_per_user_exceeded';
    end if;
  end if;

  -- Paso 4: saldo real — misma fuente de verdad que rewards_wallets
  -- (SUM sobre rewards_transactions), nunca una segunda fuente.
  select coalesce(sum(amount), 0) into v_balance
  from public.rewards_transactions
  where user_id = p_user_id;

  -- Paso 5: comprobar saldo. Nunca se escribe nada si esto falla.
  if v_balance < v_reward.points_cost then
    raise exception 'insufficient_balance';
  end if;

  -- Paso 6: kill-switch del pool VIAO-financiado.
  if v_reward.funding_type = 'viao' then
    perform pg_advisory_xact_lock(hashtext('viao_reward_pool'));

    if v_reward.real_cost_eur is null then
      -- Fail-closed: nunca se asume coste cero ni "sin límite".
      raise exception 'reward_missing_real_cost';
    end if;

    select coalesce(sum(rc.real_cost_eur), 0) into v_pool_spent_this_month
    from public.reward_redemptions rr
    join public.rewards_catalog rc on rc.id = rr.reward_catalog_id
    where rc.funding_type = 'viao'
      and rr.status <> 'cancelled'
      and date_trunc('month', rr.created_at) = date_trunc('month', now());

    if v_pool_spent_this_month + v_reward.real_cost_eur > v_monthly_pool_limit_eur then
      raise exception 'pool_exhausted';
    end if;
  end if;

  -- Paso 7: código de un solo uso, mismo patrón que referral_code
  -- (handle_new_user()).
  v_redemption_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));

  -- Paso 8: INSERT atómico — ledger (negativo, append-only) + redemption
  -- (pending). Si cualquier paso anterior falló, nada de esto se ejecuta
  -- (rollback automático de toda la función).
  insert into public.rewards_transactions (user_id, amount, type, reason, reference_type, reference_id)
  values (p_user_id, -v_reward.points_cost, 'spent', 'redemption', 'reward_redemption', v_redemption_id);

  insert into public.reward_redemptions (
    id, user_id, reward_catalog_id, points_spent, status, redemption_code, redemption_attempt_id
  )
  values (
    v_redemption_id, p_user_id, p_reward_catalog_id, v_reward.points_cost, 'pending', v_redemption_code, p_attempt_id
  )
  returning * into v_new_redemption;

  return v_new_redemption;
end;
$$;

revoke execute on function public.redeem_reward(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.redeem_reward(uuid, uuid, uuid) to service_role;

-- cancel_redemption(): pending -> cancelled + refund positivo nuevo en
-- el ledger (nunca se edita la transacción original — append-only).
-- Idempotente: cancelar una redención ya cancelada devuelve la misma
-- fila sin generar un segundo refund; cancelar una `fulfilled` se
-- rechaza explícitamente (el Reward ya se entregó).
create or replace function public.cancel_redemption(
  p_redemption_id uuid,
  p_user_id uuid
)
returns public.reward_redemptions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_redemption public.reward_redemptions;
begin
  select * into v_redemption
  from public.reward_redemptions
  where id = p_redemption_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'redemption_not_found';
  end if;

  if v_redemption.status = 'cancelled' then
    return v_redemption;
  end if;

  if v_redemption.status = 'fulfilled' then
    raise exception 'cannot_cancel_fulfilled_redemption';
  end if;

  update public.reward_redemptions
  set status = 'cancelled', cancelled_at = now()
  where id = p_redemption_id
  returning * into v_redemption;

  -- Defensa en profundidad adicional: reutiliza la MISMA constraint de
  -- idempotencia ya existente en rewards_transactions
  -- (UNIQUE(user_id, reason, reference_type, reference_id),
  -- 20260818150000_*.sql) — un segundo intento de refund para la misma
  -- redención nunca duplica la transacción, aunque el chequeo de estado
  -- de arriba ya debería impedirlo por sí solo.
  insert into public.rewards_transactions (user_id, amount, type, reason, reference_type, reference_id)
  values (p_user_id, v_redemption.points_spent, 'earned', 'redemption_refund', 'reward_redemption', p_redemption_id)
  on conflict (user_id, reason, reference_type, reference_id) do nothing;

  return v_redemption;
end;
$$;

revoke execute on function public.cancel_redemption(uuid, uuid) from public, anon, authenticated;
grant execute on function public.cancel_redemption(uuid, uuid) to service_role;

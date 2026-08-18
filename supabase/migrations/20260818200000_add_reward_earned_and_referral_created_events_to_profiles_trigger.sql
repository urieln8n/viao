-- F12-02 (VIAO_ROADMAP.md) — Cierra dos huecos de la taxonomía
-- (VIAO_MVP_v0.1.md sección 13) que solo pueden originarse dentro de
-- `handle_new_user()` (SECURITY DEFINER, sin ninguna Server Action de
-- registro a la que enganchar esto desde TypeScript — mismo motivo ya
-- documentado en 20260817190000_*.sql/20260818120000_*.sql/
-- 20260818140000_*.sql):
--
-- 1. `reward_earned` para la recompensa de registro (100 Points,
--    REGISTRATION_REWARD_POINTS_PROVISIONAL, lib/rewards/rules.ts) — hasta
--    ahora esa recompensa se creaba sin ningún evento de analytics
--    asociado.
-- 2. `referral_created` cuando el trigger crea la fila `referrals` (código
--    de referido válido) — se atribuye a `referrer_profile_id`: la métrica
--    de negocio relevante es "referidos generados" por usuario (MVP
--    sección 19, señales complementarias), así que el `user_id` del evento
--    es el referrer; `referred_id` va en `metadata` para no perder la
--    relación completa.
--
-- Quinta extensión de handle_new_user() vía CREATE OR REPLACE FUNCTION —
-- nunca se editan las migraciones históricas (20260817180000_*.sql,
-- 20260817190000_*.sql, 20260818120000_*.sql, 20260818140000_*.sql). El
-- cuerpo de la función es idéntico al de 20260818140000_*.sql, solo con
-- estos dos INSERT adicionales.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_referral_code text;
  used_referral_code text;
  referrer_profile_id uuid;
begin
  loop
    new_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
    begin
      insert into public.profiles (id, referral_code)
      values (new.id, new_referral_code);
      exit;
    exception when unique_violation then
      continue;
    end;
  end loop;

  insert into public.analytics_events (event_name, user_id)
  values ('registered', new.id);

  insert into public.rewards_transactions (user_id, amount, type, reason)
  values (new.id, 100, 'earned', 'registration')
  on conflict (user_id) where reason = 'registration' do nothing;

  insert into public.analytics_events (event_name, user_id, metadata)
  values ('reward_earned', new.id, jsonb_build_object('reason', 'registration', 'amount', 100));

  used_referral_code := upper(trim(new.raw_user_meta_data ->> 'referral_code'));
  if used_referral_code is not null and used_referral_code <> '' then
    select id into referrer_profile_id
    from public.profiles
    where referral_code = used_referral_code;

    if referrer_profile_id is not null then
      insert into public.referrals (referrer_id, referred_id, referral_code_used, status)
      values (referrer_profile_id, new.id, used_referral_code, 'pending')
      on conflict (referred_id) do nothing;

      insert into public.analytics_events (event_name, user_id, metadata)
      values ('referral_created', referrer_profile_id, jsonb_build_object('referred_id', new.id));
    end if;
  end if;

  return new;
end;
$$;

-- Restated por claridad/idempotencia de esta migración considerada de
-- forma aislada; CREATE OR REPLACE FUNCTION ya preserva el ACL existente.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- F8-02 (VIAO_ROADMAP.md) — Creación de la fila `referrals` durante el
-- registro, cuando el usuario se registra con un `referral_code` válido.
--
-- Auditoría previa (Paso 0 de F8): igual que F7-04 (recompensa de
-- registro), `app/(auth)/register/page.tsx` llama a
-- `supabase.auth.signUp()` directamente desde un Client Component — NO
-- existe ninguna Server Action de registro. El enunciado de F8 prohíbe
-- inventar una si no es necesaria, y confirma explícitamente: "Nunca
-- confíes en un referrer_id enviado por el cliente. El cliente solo
-- puede proporcionar: referral_code. El backend debe resolver:
-- referral_code -> usuario propietario -> referrer_id."
--
-- Mecanismo elegido (verificado empíricamente antes de esta migración):
-- `supabase.auth.signUp({..., options: { data: { referral_code } } })`
-- guarda ese valor en `auth.users.raw_user_meta_data` (columna `jsonb` ya
-- existente, gestionada por Supabase Auth) — confirmado con una
-- comprobación real (signUp con `options.data.referral_code` -> el valor
-- aparece en `raw_user_meta_data->>'referral_code'`). El trigger
-- `handle_new_user()` (F3-02, ya extendido en F3-07 para el evento
-- `registered` y en F7-04 para la recompensa de registro) se extiende una
-- tercera vez, mediante `CREATE OR REPLACE FUNCTION` (nunca se editan las
-- migraciones históricas 20260817180000_*.sql, 20260817190000_*.sql ni
-- 20260818120000_*.sql) — la resolución código -> `referrer_id` ocurre
-- enteramente server-side, dentro de la MISMA transacción atómica que
-- crea `profiles`: el cliente nunca envía ni puede enviar un
-- `referrer_id`, solo el texto del código.
--
-- Código inválido/inexistente: no se crea ninguna fila `referrals` y el
-- registro sigue teniendo éxito con normalidad — "comportamiento claro y
-- seguro" (F8-02) sin bloquear el alta de cuenta por un código erróneo.
--
-- Normalización: los códigos generados por este mismo trigger
-- (`new_referral_code`) son siempre mayúsculas
-- (`upper(substr(replace(gen_random_uuid()::text,'-',''),1,10))`), así
-- que el código recibido se normaliza con `upper(trim(...))` antes de
-- comparar — coincidencia robusta con el formato ya establecido, no una
-- regla de negocio nueva.
--
-- Antifraude mínimo (F8-05): NO se añade ninguna comprobación explícita
-- de autorreferencia aquí — es estructuralmente imposible en este flujo
-- (`referred_id = new.id` es siempre un usuario recién creado en esta
-- misma transacción, por lo que nunca puede coincidir con un
-- `profiles.id` ya existente que devuelva la búsqueda del código). La
-- constraint real `referrals_no_self_referral_check` (ya existente desde
-- la creación de la tabla, F1-06) queda como defensa en profundidad. El
-- `ON CONFLICT (referred_id) DO NOTHING` es la misma defensa en
-- profundidad barata ya usada en F7-04 para la recompensa de registro
-- (este trigger solo puede dispararse una vez por usuario por
-- construcción — `AFTER INSERT ON auth.users` — así que tampoco hace
-- falta más protección de duplicados).

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

  used_referral_code := upper(trim(new.raw_user_meta_data ->> 'referral_code'));
  if used_referral_code is not null and used_referral_code <> '' then
    select id into referrer_profile_id
    from public.profiles
    where referral_code = used_referral_code;

    if referrer_profile_id is not null then
      insert into public.referrals (referrer_id, referred_id, referral_code_used, status)
      values (referrer_profile_id, new.id, used_referral_code, 'pending')
      on conflict (referred_id) do nothing;
    end if;
  end if;

  return new;
end;
$$;

-- Restated por claridad/idempotencia de esta migración considerada de
-- forma aislada; CREATE OR REPLACE FUNCTION ya preserva el ACL existente
-- de F3-02/F3-07/F7-04 (ningún rol de cliente puede invocar esta función
-- directamente).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

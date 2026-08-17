-- F3-07 (VIAO_ROADMAP.md) — Registrar evento `registered`.
-- "El evento `registered` se registra inmediatamente tras la creación
-- exitosa del perfil (justo después del trigger de F3-02), no en una fase
-- posterior."
--
-- No se crea un trigger nuevo ni una Server Action: se extiende la MISMA
-- función `handle_new_user()` de F3-02 (CREATE OR REPLACE FUNCTION, sin
-- editar la migración histórica 20260817180000_*.sql) para insertar el
-- evento dentro de la MISMA transacción que crea `profiles`. Es la única
-- forma de garantizar atomicidad real: si el insert en analytics_events
-- fallara, todo el INSERT en auth.users (incluida la creación del perfil)
-- se revertiría — nunca queda un perfil sin su evento fundacional, ni al
-- revés. El resto del comportamiento (generación de referral_code) queda
-- exactamente igual, sin ningún cambio.
--
-- Duplicación: el trigger es AFTER INSERT ON auth.users, que solo puede
-- ocurrir una vez por usuario (alta de cuenta). Login/logout/visitas a
-- /profile no vuelven a insertar en auth.users, así que no pueden generar
-- un segundo `registered` — no hace falta ninguna constraint de unicidad
-- adicional sobre analytics_events (no exigida por VIAO_DATABASE.md).
--
-- Seguridad: analytics_events sigue con RLS activo y sin ningún GRANT para
-- `authenticated`/`anon` (Patrón B puro, F1-06) — este insert solo es
-- posible porque la función sigue siendo SECURITY DEFINER, propiedad de
-- postgres, exactamente igual que la creación de `profiles`.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_referral_code text;
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

  return new;
end;
$$;

-- Restated por claridad/idempotencia de esta migración considerada de forma
-- aislada; CREATE OR REPLACE FUNCTION ya preserva el ACL existente de
-- F3-02 (ningún rol de cliente puede invocar esta función directamente).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

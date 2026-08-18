-- F7-04 (VIAO_ROADMAP.md) — Recompensa PROVISIONAL de Points por registro.
--
-- Auditoría previa (Paso 0 de F7): `app/(auth)/register/page.tsx` llama a
-- `supabase.auth.signUp()` directamente desde un Client Component — NO
-- existe ninguna Server Action de registro en todo el proyecto. Por tanto
-- NO hay ningún punto server-side fiable en código de aplicación al que
-- enganchar "genera la recompensa justo después de que el registro tenga
-- éxito" sin depender de que el navegador vuelva a llamar a algo (lo que
-- el enunciado de F7 prohíbe explícitamente: "Las recompensas NO deben
-- depender de que el usuario llame manualmente a una función desde el
-- navegador").
--
-- El único mecanismo server-side realmente fiable ya existe: el trigger
-- `handle_new_user()` (F3-02, extendido una vez ya en F3-07 para el evento
-- `registered` de analytics_events, exactamente con este mismo
-- razonamiento). Se reutiliza ese precedente: se vuelve a extender la
-- MISMA función mediante `CREATE OR REPLACE FUNCTION` (nunca se edita la
-- migración histórica 20260817180000_*.sql ni la 20260817190000_*.sql) —
-- la recompensa de registro se crea en la MISMA transacción que crea
-- `profiles` y el evento `registered`, garantizando atomicidad real: si el
-- insert en `rewards_transactions` fallara, todo el alta de usuario se
-- revertiría, nunca queda un perfil sin su recompensa fundacional.
--
-- Exactamente una vez: este trigger es `AFTER INSERT ON auth.users`, que
-- solo puede dispararse una vez por alta de cuenta (login/logout/visitas
-- posteriores no vuelven a insertar en `auth.users`) — exactamente-una-vez
-- por construcción, sin necesitar ninguna comprobación de duplicados en
-- código de aplicación. Se añade además `ON CONFLICT ... DO NOTHING` sobre
-- el índice parcial `rewards_transactions_registration_once_idx`
-- (migración 20260818100000_*.sql) como defensa en profundidad barata,
-- ya que aquí (trigger escrito a mano) no hay ninguna limitación de
-- supabase-js/PostgREST para expresarlo.
--
-- Monto: 100 Points, EXPLÍCITAMENTE PROVISIONAL — mismo valor documentado
-- como `REGISTRATION_REWARD_POINTS_PROVISIONAL` en `lib/rewards/rules.ts`.
-- SQL no puede importar una constante de TypeScript: ambos valores deben
-- mantenerse sincronizados manualmente si se cambian (una migración
-- nueva, nunca editando esta). Ninguna conversión a EUR: es un número de
-- Points aislado, sin ningún tipo de cambio asociado.
--
-- reason='registration', reference_type/reference_id NULL: coincide
-- exactamente con el ejemplo ya documentado en VIAO_DATABASE.md sección 7
-- ("Origen categórico (`registration`, `booking`, `referral`,
-- `redemption`, …)") — no se inventa un valor nuevo.

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

  insert into public.rewards_transactions (user_id, amount, type, reason)
  values (new.id, 100, 'earned', 'registration')
  on conflict (user_id) where reason = 'registration' do nothing;

  return new;
end;
$$;

-- Restated por claridad/idempotencia de esta migración considerada de
-- forma aislada; CREATE OR REPLACE FUNCTION ya preserva el ACL existente
-- de F3-02/F3-07 (ningún rol de cliente puede invocar esta función
-- directamente).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

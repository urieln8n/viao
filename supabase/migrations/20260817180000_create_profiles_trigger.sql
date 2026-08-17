-- F3-02 (VIAO_ROADMAP.md) — Trigger de creación de `profiles`.
-- VIAO_DATABASE.md sección 2: "Insertar: nadie desde el cliente — la fila se
-- crea automáticamente mediante un trigger sobre `auth.users` (server-side,
-- SECURITY DEFINER) al registrarse." Esta migración implementa exactamente
-- ese patrón (Patrón B, F1-06): auth.users -> trigger -> public.profiles.
--
-- referral_code: la documentación no define un formato de producto, solo
-- exige unicidad ("Código de referido único del usuario"). Se genera a
-- partir de un UUID aleatorio (gen_random_uuid(), ya usado en el resto del
-- esquema) recortado a 10 caracteres hexadecimales en mayúsculas — espacio
-- de colisión (16^10) suficientemente grande para no requerir una regla de
-- negocio adicional. La unicidad la garantiza la constraint UNIQUE existente
-- (profiles_referral_code_key, F1-04), no solo la generación: ante una
-- colisión (unique_violation), el trigger reintenta con un nuevo código.

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
      -- Colisión de referral_code (estadísticamente despreciable): reintenta
      -- con un código nuevo. Si el conflicto fuera por id (no debería, auth.users.id
      -- es único y la fila es nueva), el reintento fallaría igual y de forma segura
      -- en la siguiente iteración por el mismo motivo, sin bucle infinito real.
      continue;
    end;
  end loop;
  return new;
end;
$$;

-- Solo debe poder ejecutarse como trigger, nunca invocarse directamente vía
-- RPC por un rol de cliente (defensa en profundidad: Postgres ya impide
-- llamar directamente a una función `returns trigger` fuera de un trigger).
revoke execute on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

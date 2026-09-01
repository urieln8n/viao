-- PARTNER APPROVAL V1 — cierra el gap confirmado empíricamente en esta
-- misma sesión: ningún código existente podía cambiar `partners.status`
-- (protect_partners_immutable_fields() lo bloqueaba incondicionalmente
-- para cualquier rol, incluida la conexión de Supabase Studio — el
-- Runbook Operativo describía "editar status en Studio" como el
-- procedimiento de aprobación, pero ese procedimiento nunca funcionó
-- desde que este trigger se instaló en
-- 20260831140000_add_partners_owner_id_identity.sql). Diseño auditado en
-- 3 fases previas de esta misma sesión antes de escribir una sola línea
-- de SQL (auditoría de traza del bloqueo real, auditoría de diseño de
-- alternativas, propuesta de implementación) — este archivo ejecuta esa
-- propuesta sin desviarse de ella.
--
-- Autoridad: auth.users.raw_app_meta_data->>'role' = 'partner_admin' —
-- campo nativo de Supabase Auth, escribible EXCLUSIVAMENTE por
-- service_role (ningún cliente, ni siquiera el propio usuario
-- autenticado, puede escribir raw_app_meta_data vía ningún endpoint de
-- Auth — es una garantía de la plataforma, no una convención de la
-- aplicación, y es lo que impide que un usuario normal se autopromueva).
-- Sin tabla `partner_admins` nueva ni columna en `profiles` — el volumen
-- actual (un único administrador) no lo justifica.
--
-- Seguridad del trigger (punto revisado explícitamente dos veces por
-- instrucción directa antes de escribir esto): un carve-out PURAMENTE
-- por valor (permitir cualquier UPDATE que aterrice en una de las 4
-- transiciones válidas, sin importar quién lo escriba) dejaría abierta
-- la puerta a que un futuro código con service_role -- sin pasar por
-- set_partner_status() ni por su comprobación de partner_admin -- pudiera
-- mover `status` con solo escribir un UPDATE ingenuo que casualmente
-- aterrice en una transición "válida". Para cerrar esa puerta, el
-- carve-out exige AMBAS cosas a la vez:
--   1. una señal transaccional
--      (current_setting('viao.partner_status_change_authorized', true)
--      = 'true') que ÚNICAMENTE set_partner_status() escribe, justo
--      antes de su propio UPDATE, con is_local=true — se resetea sola al
--      terminar la transacción, nunca puede "quedarse encendida" para
--      una escritura posterior no relacionada;
--   2. que la transición en sí sea una de las 4 permitidas.
-- Esa señal no es alcanzable por ningún cliente `authenticated`: no
-- existe ningún endpoint PostgREST que ejecute SQL arbitrario, y
-- `status` sigue excluido del GRANT UPDATE de columnas a `authenticated`
-- (20260831140000), así que ningún cliente puede ni siquiera intentar un
-- UPDATE directo de `status`, con o sin la señal. Esto no es infalible
-- contra un futuro desarrollador interno decidido a saltárselo a
-- propósito (mismo nivel de confianza que ya se deposita en
-- `service_role` en el resto del proyecto, Patrón B, sin que este bloque
-- cambie eso) — pero sí eleva mucho el listón frente a un bypass
-- accidental: un UPDATE ingenuo futuro (`UPDATE partners SET status =
-- 'active'`) queda bloqueado exactamente igual que hoy, en vez de
-- colarse silenciosamente solo por coincidir con una transición válida.
create or replace function public.protect_partners_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    new.status is distinct from old.status
    and (
      coalesce(current_setting('viao.partner_status_change_authorized', true), 'false') <> 'true'
      or not (
        (old.status = 'pending'  and new.status = 'active')   or
        (old.status = 'pending'  and new.status = 'inactive') or
        (old.status = 'active'   and new.status = 'inactive') or
        (old.status = 'inactive' and new.status = 'active')
      )
    )
  )
    or new.access_token is distinct from old.access_token
    or new.is_test is distinct from old.is_test
    or (old.owner_id is not null and new.owner_id is not null and new.owner_id is distinct from old.owner_id)
    or new.slug is distinct from old.slug
    or new.id is distinct from old.id
  then
    raise exception 'partners_immutable_field_change';
  end if;

  return new;
end;
$$;

-- RPC único y autoritativo para cambiar `partners.status`. Mismo patrón
-- exacto que link_partner_owner() (SECURITY DEFINER, search_path vacío,
-- resuelve auth.uid() internamente, nunca confía en nada que el
-- llamante afirme). Respuesta uniforme {"updated": boolean} para TODOS
-- los casos de fallo (sin sesión, sin rol partner_admin, Partner
-- inexistente, transición no permitida) — anti-enumeración, mismo
-- criterio que link_partner_owner(): un llamante no autorizado no puede
-- distinguir "no eres admin" de "ese Partner no existe" de "esa
-- transición no está permitida".
--
-- Validación de la máquina de estados duplicada aquí Y en el trigger
-- (defensa en profundidad, mismo criterio ya usado en el resto del
-- proyecto para columnas protegidas: el GRANT de columnas Y el allowlist
-- de aplicación en updatePartnerProfile() se validan ambos, ninguno
-- confía en que el otro sea la única barrera).
create or replace function public.set_partner_status(
  p_partner_id uuid,
  p_new_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_role text;
  v_current_status text;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('updated', false);
  end if;

  select raw_app_meta_data->>'role'
    into v_caller_role
    from auth.users
    where id = v_caller_id;

  if v_caller_role is distinct from 'partner_admin' then
    return jsonb_build_object('updated', false);
  end if;

  -- Nunca 'pending', nunca ningún valor fuera del CHECK real de
  -- partners.status — rechazado aquí antes de tocar la tabla.
  if p_new_status not in ('active', 'inactive') then
    return jsonb_build_object('updated', false);
  end if;

  select status into v_current_status
    from public.partners
    where id = p_partner_id;

  if v_current_status is null then
    return jsonb_build_object('updated', false);
  end if;

  if not (
    (v_current_status = 'pending'  and p_new_status = 'active')   or
    (v_current_status = 'pending'  and p_new_status = 'inactive') or
    (v_current_status = 'active'   and p_new_status = 'inactive') or
    (v_current_status = 'inactive' and p_new_status = 'active')
  ) then
    -- Cubre también los no-ops (mismo estado -> mismo estado): no son
    -- una transición real, se rechazan igual que una no permitida.
    return jsonb_build_object('updated', false);
  end if;

  perform set_config('viao.partner_status_change_authorized', 'true', true);
  update public.partners set status = p_new_status where id = p_partner_id;
  perform set_config('viao.partner_status_change_authorized', 'false', true);

  return jsonb_build_object('updated', true);
end;
$$;

revoke all on function public.set_partner_status(uuid, text) from public;
grant execute on function public.set_partner_status(uuid, text) to authenticated;

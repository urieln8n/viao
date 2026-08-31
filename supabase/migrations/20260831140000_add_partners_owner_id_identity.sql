-- UX-16.3 (Commerce Identity) — implementa PD-14 (LOCKED, UX-16.2): añade
-- `partners.owner_id`, referenciando `profiles(id)` (no `auth.users(id)`,
-- corrección de UX-16.1 respecto al primer borrador de UX-16) para
-- mantener el mismo patrón ya usado en `partner_activities.user_id`.
-- Nullable durante toda la transición Beta: todo Partner existente nace
-- con `owner_id = NULL`, sigue accediendo vía `access_token` sin ningún
-- cambio de comportamiento hasta que decida vincularse voluntariamente.
-- Sin UNIQUE (UX-16.1 §3E): una misma persona puede ser dueña de más de
-- un Commerce, sin evidencia que justifique restringirlo.
alter table public.partners
  add column owner_id uuid references public.profiles (id) on delete set null;

create index partners_owner_id_idx on public.partners (owner_id);

-- RLS de cliente para `partners` — por primera vez desde su creación
-- (20260825120000_create_partners.sql), que era Patrón B puro
-- (service_role-only). El SELECT usa columnas EXPLÍCITAS (nunca `grant
-- select on public.partners`, que expondría `access_token`/`contact_email`
-- incluso al propio dueño — UX-16.1, hallazgo principal): se excluyen
-- deliberadamente `access_token`, `contact_email` y `owner_id`, ninguno de
-- los tres necesario en un contexto de cliente. El UPDATE reutiliza
-- exactamente el mismo allowlist que `updatePartnerProfile()`
-- (lib/partners/update-partner-profile.ts) ya aplica a nivel de
-- aplicación desde UX-12 — defensa en profundidad, ningún campo nuevo
-- editable.
grant select (
  id, name, slug, category, status, description, address,
  image_url, contact_phone, is_test, created_at, updated_at
) on public.partners to authenticated;

grant update (
  name, category, description, contact_phone, address, image_url
) on public.partners to authenticated;

create policy partners_select_own
  on public.partners for select
  to authenticated
  using (owner_id = auth.uid());

create policy partners_update_own
  on public.partners for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- Protección de campos administrativos/de identidad — mismo patrón exacto
-- que `protect_goal_immutable_fields()`
-- (20260824090000_protect_goals_immutable_fields.sql): trigger
-- `security definer, before update` que rechaza cualquier cambio a estos
-- 6 campos, incluso en una fila que sí pertenece al `authenticated` que
-- intenta el UPDATE (el GRANT de columnas ya los excluye — esto es
-- defensa en profundidad, no la única barrera). `owner_id` en particular
-- SOLO puede asignarse mediante `link_partner_owner()` de abajo, nunca
-- por un UPDATE directo del cliente.
create or replace function public.protect_partners_immutable_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    or new.access_token is distinct from old.access_token
    or new.is_test is distinct from old.is_test
    -- `owner_id` es un caso especial (a diferencia de los demás campos de
    -- esta lista, que nunca deben cambiar bajo ninguna circunstancia):
    -- debe permitir NULL -> valor (primera vinculación, vía
    -- `link_partner_owner()`) y valor -> NULL (la propia cascada
    -- `ON DELETE SET NULL` de la FK a `profiles`, que internamente
    -- ejecuta un UPDATE real y por tanto SÍ dispara este trigger). Lo
    -- único que se bloquea es reasignar directamente de un owner a otro
    -- sin pasar por NULL — el único cambio que de verdad sería un
    -- secuestro de ownership.
    or (old.owner_id is not null and new.owner_id is not null and new.owner_id is distinct from old.owner_id)
    or new.slug is distinct from old.slug
    or new.id is distinct from old.id
  then
    raise exception 'partners_immutable_field_change';
  end if;

  return new;
end;
$$;

create trigger partners_protect_immutable_fields
  before update on public.partners
  for each row
  execute function public.protect_partners_immutable_fields();

revoke execute on function public.protect_partners_immutable_fields() from public, anon, authenticated;

-- RPC de vinculación (PD-14/PD-03, LOCKED, UX-16.2) — único camino que
-- puede escribir `owner_id`: el propio trigger de arriba bloquea
-- cualquier UPDATE directo de cliente sobre esa columna, así que esta
-- función necesita `security definer` para poder escribirla. Recibe
-- ÚNICAMENTE `p_access_token` (prefijo `p_`, mismo convenio ya usado en
-- `complete_partner_activity()` para evitar colisión entre el nombre del
-- parámetro y una columna real de `partners`) — nunca acepta `owner_id`
-- ni un email como parámetro: ambos se resuelven internamente a partir de
-- `auth.uid()` (sesión real) y de la fila de `partners` que corresponde
-- al token.
--
-- Anti-enumeración (UX-16.1 §5): token inexistente, Partner no `active`,
-- email no coincide, email no verificado, y Partner ya vinculado a OTRO
-- owner devuelven exactamente la misma respuesta genérica
-- `{"linked": false}` — mismo criterio que `resolvePartnerAccess()` ya
-- aplica (inactive/inexistente tratados igual, sin distinguir el motivo).
--
-- Atomicidad (UX-16.1, condición de carrera): el UPDATE es condicional
-- (`where owner_id is null`) — dos intentos simultáneos de reclamar el
-- mismo Partner no pueden ganar ambos, Postgres serializa el UPDATE por
-- fila.
--
-- Idempotencia: si el propio dueño ya vinculado repite la llamada con su
-- mismo token, se detecta que la fila ya le pertenece y se responde éxito,
-- no error (reintento de red/doble clic seguro).
create or replace function public.link_partner_owner(p_access_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_caller_id uuid;
  v_caller_email text;
  v_email_confirmed boolean;
  v_partner_id uuid;
  v_contact_email text;
  v_updated_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    return jsonb_build_object('linked', false);
  end if;

  select email, (email_confirmed_at is not null)
    into v_caller_email, v_email_confirmed
    from auth.users
    where id = v_caller_id;

  if v_caller_email is null or v_email_confirmed is not true then
    return jsonb_build_object('linked', false);
  end if;

  select id, contact_email
    into v_partner_id, v_contact_email
    from public.partners
    where access_token = p_access_token
      and status = 'active';

  if v_partner_id is null or v_contact_email is null
    or lower(trim(v_contact_email)) is distinct from lower(trim(v_caller_email))
  then
    return jsonb_build_object('linked', false);
  end if;

  update public.partners
    set owner_id = v_caller_id
    where id = v_partner_id
      and owner_id is null
    returning id into v_updated_id;

  if v_updated_id is not null then
    return jsonb_build_object('linked', true);
  end if;

  -- No se actualizó ninguna fila: o ya pertenece a otro owner (rechazo,
  -- misma respuesta genérica que cualquier otro fallo), o ya pertenece
  -- exactamente a quien llama (idempotencia: éxito, no error).
  if exists (
    select 1 from public.partners where id = v_partner_id and owner_id = v_caller_id
  ) then
    return jsonb_build_object('linked', true);
  end if;

  return jsonb_build_object('linked', false);
end;
$$;

revoke all on function public.link_partner_owner(uuid) from public;
grant execute on function public.link_partner_owner(uuid) to authenticated;

-- F10-00/F10-03/F10-04 (VIAO_ROADMAP.md) — Esquema de soporte para VIAO
-- Vision: consentimiento, GRANTs de service_role sobre vision_scans (vacío
-- recurrente ya visto en F5-05/F6-02/F7-01/F8-04/F9-03), y sincronización
-- automática de vision_scans.image_retained.
--
-- ============================================================
-- 1. vision_consents (F10-00)
-- ============================================================
--
-- Ninguna tabla de consentimiento existe todavía — el propio roadmap
-- asigna a F10-00 "tabla a definir para registrar el consentimiento
-- (dentro del alcance de VIAO_DATABASE.md)": esto NO es una decisión de
-- negocio inventada aquí, es el trabajo que F10-00 tiene explícitamente
-- encargado. El mecanismo EXACTO de consentimiento y el plazo de
-- conservación son "detalles de implementación pendientes" (arquitectura
-- secciones 21/34; MVP sección 18.7) — el propio roadmap autoriza
-- explícitamente avanzar F10-01→F10-05 "con una política provisional
-- conservadora" sin bloquear el desarrollo (solo bloquea exponer Vision a
-- producción/piloto real, Fase 15).
--
-- Modelo elegido: log de eventos append-only (mismo estilo que
-- analytics_events/rewards_transactions/ai_rate_limit_events, en vez de
-- una fila mutable con UPDATE) — el consentimiento "activo" de un usuario
-- es el `action` de su fila más reciente. Conceder de nuevo tras retirar
-- inserta una fila nueva (conserva el historial completo de
-- concesiones/retiradas, útil para auditoría de privacidad).
--
-- RLS Patrón A (como `photos`/`searches`): conceder/retirar consentimiento
-- es una acción directa, de bajo riesgo, del propio usuario sobre su
-- propio estado — no requiere pasar por el backend. La Server Action de
-- escaneo (F10-02) NUNCA confía en un booleano enviado por el cliente:
-- vuelve a consultar esta tabla server-side con el cliente de sesión
-- (mismo mecanismo de auth.getUser() de F3-06) antes de procesar.
create table public.vision_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('granted', 'withdrawn')),
  created_at timestamptz not null default now()
);

create index vision_consents_user_id_created_at_idx
  on public.vision_consents (user_id, created_at desc);

alter table public.vision_consents enable row level security;

grant select, insert on public.vision_consents to authenticated;

create policy vision_consents_select_own
  on public.vision_consents for select
  to authenticated
  using (user_id = auth.uid());

create policy vision_consents_insert_own
  on public.vision_consents for insert
  to authenticated
  with check (user_id = auth.uid());

-- Sin UPDATE/DELETE: log inmutable de eventos, igual que
-- analytics_events/ai_rate_limit_events.

-- ============================================================
-- 2. GRANTs de service_role sobre vision_scans (F10-02/F10-03/F10-04)
-- ============================================================
--
-- Mismo vacío recurrente descubierto en F5-05/F6-02/F7-01/F8-04/F9-03:
-- `service_role` tiene BYPASSRLS pero nunca recibe GRANT automático de
-- Postgres. VIAO_DATABASE.md sección 10 ya documenta "Insertar: nadie
-- desde el cliente — se crea en el backend" y "Eliminar: nadie
-- directamente vía RLS — la eliminación se ejecuta mediante una Server
-- Action que usa el rol de servicio" — ambas operaciones necesitan este
-- GRANT para ser posibles en absoluto. SELECT se concede para poder leer
-- de vuelta tras un insert/delete (patrón `.insert().select()` de
-- PostgREST) y para que la Server Action de borrado pueda confirmar
-- ownership antes de actuar. Sin UPDATE: "Modificar: nadie" (sección 10)
-- se respeta literalmente — la sincronización de `image_retained` se
-- hace mediante un trigger SECURITY DEFINER (más abajo), no mediante un
-- UPDATE de aplicación.
grant select, insert, delete on public.vision_scans to service_role;

-- ============================================================
-- 3. Sincronización automática de image_retained (F10-04)
-- ============================================================
--
-- "Modificar: nadie" en vision_scans (sección 10) es real: ni el cliente
-- ni service_role tienen GRANT de UPDATE sobre esta tabla. En vez de
-- añadir uno solo para poder marcar image_retained=true al guardar una
-- foto, se sincroniza automáticamente mediante un trigger SECURITY
-- DEFINER (mismo patrón ya establecido por handle_new_user(), F3-02,
-- extendido en F3-07/F7-04/F8-02) sobre INSERT/DELETE sobre `photos` —
-- una función de trigger, propiedad de `postgres`, no pasa por los
-- privilegios de `service_role` ni necesita GRANT propio.
--
-- Efecto: guardar una foto derivada de un escaneo (INSERT en `photos` con
-- `vision_scan_id` no nulo) marca automáticamente `image_retained=true`
-- en el escaneo de origen; borrar esa foto (por el propio usuario,
-- `photos_delete_own`, o por la Server Action de retirada de
-- consentimiento, F10-04) revierte automáticamente `image_retained=false`
-- — el flag queda siempre coherente con la existencia real de la fila en
-- `photos`, sin que ninguna Server Action tenga que recordar
-- mantenerlo sincronizado.
create or replace function public.sync_vision_scan_image_retained()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.vision_scan_id is not null then
      update public.vision_scans
        set image_retained = true
        where id = new.vision_scan_id;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.vision_scan_id is not null then
      update public.vision_scans
        set image_retained = false
        where id = old.vision_scan_id;
    end if;
    return old;
  end if;
  return null;
end;
$$;

create trigger photos_sync_vision_scan_image_retained
  after insert or delete on public.photos
  for each row
  execute function public.sync_vision_scan_image_retained();

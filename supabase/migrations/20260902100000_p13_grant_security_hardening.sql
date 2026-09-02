-- P13 (GRANT SYSTEMIC AUDIT / P13.1 Design Audit / P13.2 Config Validation) —
-- corrige el hallazgo confirmado con SQL directo en las tres auditorías
-- previas: `pg_default_acl` del schema `public` (grantor `postgres`,
-- comportamiento legacy de la CLI de Supabase asociado a
-- `auto_expose_new_tables`, ver supabase/config.toml) concede
-- automáticamente el set completo de privilegios de tabla
-- (SELECT/INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER) a `anon`,
-- `authenticated` y `service_role` en el momento de `CREATE TABLE` —
-- antes de que el propio GRANT explícito de cada migración se ejecute.
-- Como los privilegios de Postgres son aditivos, ningún GRANT restrictivo
-- posterior podía "restar" lo que el default ACL ya había concedido.
--
-- Esta migración NO es retroactiva sobre el default ACL en sí (eso lo
-- resuelve `auto_expose_new_tables = false` en supabase/config.toml, un
-- cambio de configuración de la CLI, no de SQL — ver P13.2, que descarta
-- explícitamente un `ALTER DEFAULT PRIVILEGES` manual como sustituto del
-- mecanismo oficial). Esta migración corrige exclusivamente las 14
-- entidades YA EXISTENTES, que el cambio de configuración nunca toca.
--
-- Patrón uniforme para cada entidad: `REVOKE ALL` (limpia tanto los
-- privilegios de tabla completa como cualquier privilegio de columna ya
-- concedido por el default ACL) seguido de exactamente el `GRANT` que su
-- migración de origen ya declaraba — reconstruido leyendo cada migración
-- real (ver P13.1 §8), nunca inventado. Ningún permiso nuevo, ninguno
-- ampliado: el objetivo es que el comportamiento OBSERVABLE de la
-- aplicación no cambie en absoluto, solo que lo que ya no debía ser
-- posible deje de serlo realmente.
--
-- Fuera de alcance, deliberadamente: RLS/policies (sin cambios — ya eran,
-- y siguen siendo, la barrera real para la mayoría de los 25 tests
-- afectados, confirmado en P13 §8 RLS vs GRANT), RPCs/SECURITY DEFINER
-- (su EXECUTE ya sigue su propio patrón correcto, no afectado por este
-- hallazgo), Auth, y cualquier otro schema (`auth`/`storage`/`realtime`
-- tienen sus propios default ACL independientes, no tocados aquí).

-- ── bookings ────────────────────────────────────────────────────────
-- Origen: 20260817150000 (authenticated: select), 20260818070000
-- (service_role: select, insert), 20260818090000 (service_role: +update).
-- service_role deliberadamente sin DELETE (ver P13 §7).
revoke all on table public.bookings from anon, authenticated, service_role;
grant select on public.bookings to authenticated;
grant select, insert, update on public.bookings to service_role;

-- ── booking_intents ─────────────────────────────────────────────────
-- Origen: 20260820120000. Sin GRANT a authenticated (patrón B puro).
-- service_role sin DELETE.
revoke all on table public.booking_intents from anon, authenticated, service_role;
grant select, insert, update on public.booking_intents to service_role;

-- ── analytics_events ────────────────────────────────────────────────
-- Origen: 20260817200000. "Sin lectura para nadie salvo backend" — sin
-- GRANT a authenticated, service_role sin UPDATE/DELETE.
revoke all on table public.analytics_events from anon, authenticated, service_role;
grant select, insert on public.analytics_events to service_role;

-- ── ai_rate_limit_events ────────────────────────────────────────────
-- Origen: 20260818160000. Mismo criterio que analytics_events.
revoke all on table public.ai_rate_limit_events from anon, authenticated, service_role;
grant select, insert on public.ai_rate_limit_events to service_role;

-- ── referrals ───────────────────────────────────────────────────────
-- Origen: 20260817150000 (authenticated: select), 20260818130000
-- (service_role: select, update). service_role deliberadamente sin
-- INSERT (la creación real ocurre vía el trigger handle_new_user(),
-- SECURITY DEFINER, que no depende de este GRANT) ni DELETE.
revoke all on table public.referrals from anon, authenticated, service_role;
grant select on public.referrals to authenticated;
grant select, update on public.referrals to service_role;

-- ── rewards_transactions ────────────────────────────────────────────
-- Origen: 20260817150000 (authenticated: select), 20260818110000
-- (service_role: select, insert). Ledger append-only por diseño —
-- service_role deliberadamente sin UPDATE ni DELETE.
revoke all on table public.rewards_transactions from anon, authenticated, service_role;
grant select on public.rewards_transactions to authenticated;
grant select, insert on public.rewards_transactions to service_role;

-- ── rewards_catalog ─────────────────────────────────────────────────
-- Origen: 20260823150000. authenticated deliberadamente solo lectura —
-- alta/edición de Rewards es manual/curada vía service_role, sin panel.
revoke all on table public.rewards_catalog from anon, authenticated, service_role;
grant select on public.rewards_catalog to authenticated;
grant select, insert, update on public.rewards_catalog to service_role;

-- ── rewards_wallets (VIEW, no tabla) ────────────────────────────────
-- Origen: 20260817150000. `REVOKE/GRANT ... ON TABLE` es válido también
-- sobre vistas en Postgres (misma palabra clave, sin sintaxis distinta
-- que adaptar) — confirmado antes de escribir esto, no asumido. Solo
-- SELECT para authenticated; ningún GRANT propio a service_role en la
-- migración original (accede a la tabla base rewards_transactions, no
-- necesita GRANT directo sobre la vista).
revoke all on table public.rewards_wallets from anon, authenticated, service_role;
grant select on public.rewards_wallets to authenticated;

-- ── searches ────────────────────────────────────────────────────────
-- Origen: 20260817150000. Sin GRANT propio a service_role en ninguna
-- migración encontrada.
revoke all on table public.searches from anon, authenticated, service_role;
grant select, insert on public.searches to authenticated;

-- ── trips ───────────────────────────────────────────────────────────
-- Origen: 20260817150000 (authenticated: select, insert, update,
-- delete — único Patrón A con delete de cliente, Goals/Trips lo
-- requieren), 20260818190000 (service_role: select).
revoke all on table public.trips from anon, authenticated, service_role;
grant select, insert, update, delete on public.trips to authenticated;
grant select on public.trips to service_role;

-- ── vision_consents ─────────────────────────────────────────────────
-- Origen: 20260818170000. Log inmutable — sin GRANT propio a
-- service_role encontrado en ninguna migración.
revoke all on table public.vision_consents from anon, authenticated, service_role;
grant select, insert on public.vision_consents to authenticated;

-- ── vision_scans ────────────────────────────────────────────────────
-- Origen: 20260817150000 (authenticated: select), 20260818170000
-- (service_role: select, insert, delete).
revoke all on table public.vision_scans from anon, authenticated, service_role;
grant select on public.vision_scans to authenticated;
grant select, insert, delete on public.vision_scans to service_role;

-- ── properties ──────────────────────────────────────────────────────
-- Origen: 20260817150000 (authenticated: select), 20260818070000
-- (service_role: select, insert, update). service_role sin DELETE.
revoke all on table public.properties from anon, authenticated, service_role;
grant select on public.properties to authenticated;
grant select, insert, update on public.properties to service_role;

-- ── partners ────────────────────────────────────────────────────────
-- CRÍTICO (P13 §5): sin este REVOKE, `access_token`/`contact_email`/
-- `owner_id` quedaban legibles/escribibles por `authenticated` (y
-- técnicamente por `anon`, aunque sin ninguna fila visible vía RLS) pese
-- a que 20260831140000 las excluyó explícitamente con GRANT
-- column-scoped. `REVOKE ALL` limpia tanto el privilegio de tabla
-- completa como el de columna heredados del default ACL; los dos GRANT
-- siguientes son EXACTAMENTE los mismos allowlists de columnas ya
-- declarados en 20260831140000_add_partners_owner_id_identity.sql,
-- copiados sin modificar ni un campo. `access_token`, `contact_email` y
-- `owner_id` permanecen deliberadamente fuera de ambos allowlists.
revoke all on table public.partners from anon, authenticated, service_role;
grant select (
  id, name, slug, category, status, description, address,
  image_url, contact_phone, is_test, created_at, updated_at
) on public.partners to authenticated;
grant update (
  name, category, description, contact_phone, address, image_url
) on public.partners to authenticated;
grant select, insert, update on public.partners to service_role;

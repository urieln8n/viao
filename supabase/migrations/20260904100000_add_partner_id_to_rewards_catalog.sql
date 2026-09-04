-- P14.4-E (Decision Lock OPCIÓN C, VIAO_P14_4_D_P0_DECISIONS.md §5/§8/§11,
-- aprobado por el propietario) — `rewards_catalog.partner_name` es texto
-- libre desde su creación (20260823150000_create_rewards_catalog.sql)
-- porque, en ese momento, la tabla `partners` todavía no existía (su
-- propio comentario lo dice explícitamente). Dos días después
-- `partners` sí se creó (20260825120000_create_partners.sql, `id uuid
-- primary key`) — la razón original de no tener FK ya no aplica hoy.
--
-- Additiva, reversible conceptualmente, de bajo riesgo:
--   - `nullable`: un Reward `funding_type='viao'` (financiado por VIAO,
--     sin comercio real detrás) debe seguir teniendo `partner_id = NULL`
--     siempre — nunca se fuerza un Partner donde no lo hay.
--   - Sin backfill: `partner_name` es texto libre, no debemos asumir
--     coincidencias exactas con `partners.name`. Las filas existentes de
--     `rewards_catalog` (`funding_type='partner'`) mantienen su
--     `partner_name` intacto y `partner_id = NULL` hasta que alguien
--     los asocie manualmente en un proceso controlado y separado (no
--     autorizado en este bloque).
--   - Sin cambios de RLS/GRANT: `rewards_catalog_select_all` ya usa
--     `using (true)` (20260823150000_create_rewards_catalog.sql) — una
--     columna nueva no necesita ninguna policy nueva. El GRANT de
--     `service_role` para INSERT/UPDATE ya cubre columnas nuevas
--     automáticamente, sin necesidad de un GRANT explícito por columna.
--   - Sin cambios de tipo ni eliminación de ninguna columna existente
--     (`partner_name` se conserva, coexiste indefinidamente).
--   - `on delete set null`: si un Partner alguna vez se borrara (hoy
--     `partners` no concede DELETE a ningún rol, ver
--     20260825120000_create_partners.sql — esto es defensa en
--     profundidad, no una operación que hoy pueda ocurrir), un Reward ya
--     asociado no debe quedar en un estado roto (FK violation) ni
--     arrastrar el borrado del propio Reward — simplemente pierde la
--     asociación, igual que `partner_activities.partner_id` no tiene
--     equivalente hoy (esa tabla no permite NULL porque una Actividad
--     siempre pertenece a un Partner real; un Reward, en cambio, puede
--     legítimamente no tener ninguno).

alter table public.rewards_catalog
  add column partner_id uuid references public.partners (id) on delete set null;

create index rewards_catalog_partner_id_idx on public.rewards_catalog (partner_id);

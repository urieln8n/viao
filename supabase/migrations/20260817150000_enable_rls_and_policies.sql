-- F1-06 — Row Level Security (Patrón A/B por tabla), según VIAO_DATABASE.md
-- secciones 1-12 y 14. Ninguna política menciona `service_role`: ese rol
-- sigue operando fuera de RLS por diseño (BYPASSRLS), como ya establece
-- VIAO_ARCHITECTURE.md secciones 6 y 20.
--
-- Antes de esta migración, `authenticated`/`anon` no tenían ningún privilegio
-- SELECT/INSERT/UPDATE/DELETE sobre estas tablas (solo REFERENCES/TRIGGER/
-- TRUNCATE, otorgados por defecto). Por eso cada bloque incluye tanto el
-- GRANT de base como las políticas RLS: el GRANT define qué operación es
-- posible en principio para `authenticated`, y la política RLS restringe
-- después a qué filas. Donde la matriz aprobada dice "ninguna política", no
-- se otorga ningún GRANT para esa operación — ausencia de privilegio y
-- ausencia de política son la misma denegación en Postgres, no se crean
-- políticas DENY explícitas. No se concede ningún privilegio a `anon`.

-- ============================================================
-- profiles (sección 2) — Patrón B para creación, edición acotada por columnas
-- ============================================================
alter table public.profiles enable row level security;

grant select on public.profiles to authenticated;
-- UPDATE de columnas específicas únicamente: el usuario nunca puede
-- modificar referral_code, aunque la fila le pertenezca.
grant update (name, avatar_url, locale) on public.profiles to authenticated;
-- Sin GRANT de INSERT/DELETE: la fila la crea un trigger SECURITY DEFINER
-- sobre auth.users (F3-02, fuera de alcance de F1-06); el borrado solo
-- ocurre en cascada administrativa.

create policy profiles_select_own
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ============================================================
-- trips (sección 3) — Patrón A, CRUD completo del propietario
-- ============================================================
alter table public.trips enable row level security;

grant select, insert, update, delete on public.trips to authenticated;

create policy trips_select_own
  on public.trips for select
  to authenticated
  using (user_id = auth.uid());

create policy trips_insert_own
  on public.trips for insert
  to authenticated
  with check (user_id = auth.uid());

create policy trips_update_own
  on public.trips for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy trips_delete_own
  on public.trips for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- properties (sección 4) — Patrón B, lectura abierta a cualquier autenticado
-- ============================================================
alter table public.properties enable row level security;

grant select on public.properties to authenticated;
-- Sin GRANT de INSERT/UPDATE/DELETE: solo el backend, tras llamar a
-- HotelProvider.

create policy properties_select_all
  on public.properties for select
  to authenticated
  using (true);

-- ============================================================
-- searches (sección 5) — Patrón A, solo INSERT/SELECT (log inmutable)
-- ============================================================
alter table public.searches enable row level security;

grant select, insert on public.searches to authenticated;
-- Sin GRANT de UPDATE/DELETE: log inmutable; results_count lo actualiza el
-- backend; política de retención no definida todavía (sección 15).

create policy searches_select_own
  on public.searches for select
  to authenticated
  using (user_id = auth.uid());

create policy searches_insert_own
  on public.searches for insert
  to authenticated
  with check (user_id = auth.uid());

-- ============================================================
-- bookings (sección 6) — Patrón B, solo lectura del propietario
-- ============================================================
alter table public.bookings enable row level security;

grant select on public.bookings to authenticated;
-- Sin GRANT de INSERT/UPDATE/DELETE: el backend crea y actualiza la reserva
-- a medida que avanza el flujo (pending → confirmed/cancelled), incluidos
-- los campos económicos.

create policy bookings_select_own
  on public.bookings for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- rewards_transactions (sección 7) — Patrón B sin excepciones
-- ============================================================
alter table public.rewards_transactions enable row level security;

grant select on public.rewards_transactions to authenticated;
-- Sin GRANT de INSERT/UPDATE/DELETE bajo ninguna circunstancia: fuente de
-- verdad de Points, exclusivamente escrita por el backend.

create policy rewards_transactions_select_own
  on public.rewards_transactions for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- rewards_wallets (sección 8) — VIEW existente (F1-04), sin modificar su
-- definición. security_invoker=true ya hereda la política de SELECT de
-- rewards_transactions; solo hace falta el GRANT de SELECT sobre la vista
-- para que sea consultable (antes de esta migración, ningún rol lo tenía).
-- ============================================================
grant select on public.rewards_wallets to authenticated;

-- ============================================================
-- referrals (sección 9) — Patrón B, lectura para ambas partes
-- ============================================================
alter table public.referrals enable row level security;

grant select on public.referrals to authenticated;
-- Sin GRANT de INSERT/UPDATE/DELETE: la fila se crea en el backend durante
-- el registro (validando código y unicidad) y el estado cambia a
-- 'rewarded' cuando el backend confirma la acción válida.

create policy referrals_select_participant
  on public.referrals for select
  to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid());

-- ============================================================
-- vision_scans (sección 10) — Patrón B, solo lectura del propietario
-- ============================================================
alter table public.vision_scans enable row level security;

grant select on public.vision_scans to authenticated;
-- Sin GRANT de INSERT/UPDATE/DELETE: se crea en el backend tras el
-- procesamiento server-side de OpenAI; la eliminación ("permitir
-- eliminación", MVP sección 10) ocurre vía Server Action con rol de
-- servicio tras validar propiedad, no mediante policy directa de RLS.

create policy vision_scans_select_own
  on public.vision_scans for select
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- photos (sección 11) — Patrón A, edición acotada a `caption`
-- ============================================================
alter table public.photos enable row level security;

grant select, insert, delete on public.photos to authenticated;
-- UPDATE de columna específica únicamente: guardar una foto es de bajo
-- riesgo, pero solo `caption` es editable tras guardarla.
grant update (caption) on public.photos to authenticated;

create policy photos_select_own
  on public.photos for select
  to authenticated
  using (user_id = auth.uid());

create policy photos_insert_own
  on public.photos for insert
  to authenticated
  with check (user_id = auth.uid());

create policy photos_update_own
  on public.photos for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy photos_delete_own
  on public.photos for delete
  to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- analytics_events (sección 12) — Patrón B, sin lectura ni escritura para
-- el cliente en ningún caso. Solo RLS activo, sin GRANT ni políticas.
-- ============================================================
alter table public.analytics_events enable row level security;

-- UX-9 (Partner Schema Foundation) — preparación mínima de `partners` para
-- poder empezar a incorporar Partners reales, sin construir todavía
-- ninguna UI, RLS pública ni sistema de moderación (UX-6/7/8, auditorías
-- previas: el verdadero cuello de botella no es de diseño ni de código de
-- interfaz, es que hoy no existe ni un solo Partner real que dar de alta
-- — confirmado por lectura directa, 1.284 filas, 0 reales).
--
-- Auditoría previa a esta migración (solo lectura, sin escribir nada):
-- los únicos valores reales presentes hoy en `partners.category` son
-- 'restaurant'/'experience', y en `partners.status` son 'active'/
-- 'inactive' — exactamente los dos únicos valores que ya permitían los
-- CHECK originales. Ampliar ambos CHECK a un conjunto que SIGUE
-- incluyendo esos mismos valores no puede violar ninguna fila existente
-- — no se requiere ningún backfill ni limpieza de datos.
--
-- Alcance estrictamente estos 4 cambios sobre `partners` (ninguna otra
-- tabla, ningún RPC, ninguna RLS, ningún GRANT):
--
-- 1. `category`: se sustituye el CHECK (DROP + ADD, mismo patrón ya usado
--    en 20260818150000_fix_rewards_transactions_idempotency_per_user.sql)
--    para admitir además 'barbershop'/'gym'/'shop'/'service' — el
--    experimento de los primeros 10 Partners (UX-7/8) necesita más
--    variedad que solo restaurantes/experiencias. No se crea ninguna
--    tabla `partner_categories`: sigue siendo un `text` con CHECK, mismo
--    nivel de simplicidad que hoy.
-- 2. `status`: se sustituye el CHECK para admitir además 'pending' —
--    precondición de cualquier moderación real (hoy solo existían
--    'active'/'inactive', sin ningún estado para "solicitud recibida,
--    todavía sin revisar"). Deliberadamente NO se añaden 'rejected'/
--    'suspended'/'under_review' — sin evidencia de necesidad real a este
--    volumen (UX-8 §10/§15).
-- 3. `image_url text`, nullable — mismo patrón exacto ya probado en
--    `profiles.avatar_url`: una URL de texto, sin bucket de Storage
--    nuevo, sin flujo de subida. A esta escala (10 Partners), la foto se
--    recibe por email/WhatsApp durante el alta manual y VIAO guarda solo
--    el enlace.
-- 4. `description text`, nullable — única pieza de contenido que faltaba
--    para el perfil mínimo ya diseñado conceptualmente en UX-7/8 (nombre
--    + categoría + foto + descripción + dirección). Sin límite de
--    longitud a nivel de constraint: es una descripción corta por
--    convención de producto, no por restricción técnica — introducir un
--    CHECK de longitud sin un caso real que lo exija sería la misma
--    sobre-ingeniería que este bloque pide evitar explícitamente.
--
-- Seguridad — sin cambios, a propósito: `partners` sigue sin ninguna
-- policy de cliente (RLS ya activa desde 20260825120000_*.sql, GRANT
-- limitado a `service_role`). Esta migración NO añade ningún GRANT ni
-- policy nueva — `access_token`, `contact_email` y `contact_phone` siguen
-- exactamente igual de inaccesibles para `authenticated`/`anon` que antes
-- de este cambio. Abrir una vía de lectura pública queda, deliberadamente,
-- para un bloque futuro y distinto (UX-8 §18/§29).

alter table public.partners
  drop constraint partners_category_check;

alter table public.partners
  add constraint partners_category_check
  check (category in ('restaurant', 'experience', 'barbershop', 'gym', 'shop', 'service'));

alter table public.partners
  drop constraint partners_status_check;

alter table public.partners
  add constraint partners_status_check
  check (status in ('pending', 'active', 'inactive'));

alter table public.partners
  add column image_url text,
  add column description text;

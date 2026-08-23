-- FPR-04.10 — Añade a `bookings` los campos que FPR-04.3/FPR-04.9 ya
-- definieron como parte de una reserva pero que la tabla real nunca llegó
-- a tener (verificado empíricamente contra Supabase local con
-- `\d public.bookings` antes de crear esta migración — ninguna de estas 5
-- columnas existía, y ninguna información equivalente vive ya en otro
-- campo):
--
-- - `provider_cost`: el `totalNet` real que devuelve el proveedor
--   (`BookingResult.providerCost`, FPR-04.3) — distinto de `booking_value`
--   (lo que VIAO cobra). Mientras no exista una decisión de markup,
--   `booking_value = provider_cost` (ver create-booking-record.ts), pero
--   son conceptos separados y ambos deben quedar persistidos.
-- - `provider_cancellation_reference`: referencia de cancelación del
--   proveedor (`BookingResult.providerCancellationReference`, FPR-04.3),
--   mismo criterio exacto que la ya existente `provider_booking_reference`
--   (mismo tipo, incluso el mismo nombre con un prefijo distinto).
-- - `holder_name`/`holder_surname`: titular de la reserva
--   (`BookingRequest.holder`, FPR-04.3) — Hotelbeds los exige para
--   reservar, y hoy no quedaban registrados en ningún sitio tras crear la
--   fila.
-- - `rooms`: número de habitaciones de la reserva (`BookingRequest.rooms`)
--   — discrepancia ya documentada desde F6-02 (ver la cabecera histórica
--   de create-booking-record.ts): se usaba para llamar al provider pero
--   nunca se persistía.
--
-- Todas nullable, sin DEFAULT: las filas ya existentes no tienen este dato
-- real disponible — nunca se inventa un valor de relleno (mismo criterio
-- que el resto del proyecto, p. ej. `booking_value`/`currency` en F6-02).
-- `rooms` recibe además el mismo tipo de CHECK que `guests`
-- (`bookings_guests_check`) y que `booking_intents.rooms`
-- (`booking_intents_rooms_check`): `CHECK (rooms > 0)` en una columna
-- nullable sigue aceptando NULL (Postgres evalúa la condición como
-- UNKNOWN, no FALSE), y solo rechaza un valor explícito inválido.
--
-- No se toca ninguna columna existente ni ninguna migración ya aplicada.
-- No se necesita ningún GRANT nuevo: `service_role` ya tiene
-- SELECT+INSERT+UPDATE sobre `bookings` desde F6-02/F6-03
-- (20260818070000_grant_service_role_bookings_properties.sql,
-- 20260818090000_grant_service_role_bookings_update.sql) — añadir
-- columnas a una tabla no exige un GRANT adicional sobre esas columnas
-- para un rol que ya tiene el privilegio a nivel de tabla.

alter table public.bookings
  add column provider_cost numeric(10, 2),
  add column provider_cancellation_reference text,
  add column holder_name text,
  add column holder_surname text,
  add column rooms integer;

alter table public.bookings
  add constraint bookings_rooms_check check (rooms > 0);

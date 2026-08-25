---
STATUS: HISTORICAL
ERA: V1 / FOUNDATIONAL
DOMAIN: Modelo de datos
AUTHORITY: Ninguna
SUPERSEDES: —
SUPERSEDED BY: supabase/migrations/*.sql (schema real)
LAST REVIEWED: UNKNOWN (documento sin fecha propia)
---

# VIAO — Modelo de datos del MVP

**Estado:** Borrador para aprobación — no crear migraciones ni código hasta confirmación.
**Fuentes:** [`VIAO_MVP_v0.1.md`](VIAO_MVP_v0.1.md) y [`VIAO_ARCHITECTURE.md`](VIAO_ARCHITECTURE.md). Este documento no añade funcionalidades ni tablas que no estén ya previstas allí.
**Motor:** PostgreSQL (Supabase). Row Level Security (RLS) activo en todas las tablas desde el inicio.

---

## Índice

0. [Principios de diseño aplicados](#0-principios-de-diseño-aplicados)
1. [Patrón de escritura: cliente vs backend](#1-patrón-de-escritura-cliente-vs-backend)
2. [profiles](#2-profiles)
3. [trips](#3-trips)
4. [properties](#4-properties)
5. [searches](#5-searches)
6. [bookings](#6-bookings)
7. [rewards_transactions](#7-rewards_transactions)
8. [rewards_wallets](#8-rewards_wallets)
9. [referrals](#9-referrals)
10. [vision_scans](#10-vision_scans)
11. [photos](#11-photos)
12. [analytics_events](#12-analytics_events)
13. [Relaciones principales](#13-relaciones-principales)
14. [Decisiones de seguridad / RLS](#14-decisiones-de-seguridad--rls)
15. [Decisiones pendientes](#15-decisiones-pendientes)
16. [Revisión de coherencia](#16-revisión-de-coherencia)

---

## 0. Principios de diseño aplicados

- **11 tablas, ninguna añadida de más.** Son exactamente las previstas en `VIAO_MVP_v0.1.md` (sección 17) y `VIAO_ARCHITECTURE.md` (sección 8). Donde ha hecho falta un ajuste (ver `rewards_wallets`), se explica y se justifica, no se improvisa.
- **UUID como clave primaria** en todas las tablas (`gen_random_uuid()`), consistente con Supabase Auth (que usa UUID para `auth.users.id`).
- **`rewards_transactions` es la única fuente de verdad de los puntos.** Ninguna tabla almacena un saldo editable (ver sección 8, `rewards_wallets`).
- **RLS por defecto = denegar.** Cada tabla concede explícitamente solo lo mínimo necesario; si una operación no se menciona, no está permitida para el rol `authenticated`.
- **Timestamps**: `created_at` en todas las tablas. `updated_at` solo en las entidades mutables (`profiles`, `trips`, `bookings`, `properties`). Las tablas de registro/ledger (`rewards_transactions`, `searches`, `analytics_events`, `vision_scans`) son de solo-inserción (append-only) y no tienen `updated_at`.
- **Sin soft-delete genérico.** No se añade una columna `deleted_at` a todas las tablas "por si acaso" — se define borrado explícito solo donde el producto lo pide (fotos, escaneos de Vision).
- **Sin claves foráneas polimórficas nativas.** Donde una relación puede apuntar a distintas tablas (`rewards_transactions.reference_id`), se documenta la relación pero se valida en el backend, no con un `FOREIGN KEY` de Postgres — Postgres no soporta FKs polimórficas de forma nativa sin añadir complejidad desproporcionada para el MVP.

---

## 1. Patrón de escritura: cliente vs backend

Para no repetir el razonamiento en cada tabla, se definen dos patrones de escritura:

**Patrón A — el usuario escribe directamente (bajo RLS)**
Datos propios, no financieros, de bajo riesgo si el usuario los gestiona él mismo: `trips`, `photos`, `searches` (solo `INSERT`/`SELECT`).

**Patrón B — solo el backend escribe (rol de servicio, RLS no concede escritura a `authenticated`)**
Datos financieros, de recompensas, o que dependen de una validación/proceso de negocio que debe ocurrir en el servidor: `profiles` (creación), `bookings`, `rewards_transactions`, `referrals`, `vision_scans`, `analytics_events`, `properties`.

Esto satisface directamente el requisito de seguridad: *"operaciones sensibles se realizan server-side"* y *"un usuario nunca puede modificar directamente movimientos de Rewards"*. Cuando el producto necesita que el usuario "elimine" algo sensible (p. ej. un escaneo de Vision), la eliminación se ejecuta a través de una Server Action del backend (que usa el rol de servicio tras comprobar que el usuario es el propietario) — no mediante una política RLS de `DELETE` abierta al cliente.

---

## 2. profiles

**Propósito:** datos de perfil de VIAO asociados 1:1 a un usuario de Supabase Auth.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | — | PK, igual a `auth.users.id` |
| `name` | text | NULL | — | Nombre visible del usuario |
| `avatar_url` | text | NULL | — | URL del avatar (Supabase Storage u otro) |
| `referral_code` | text | NOT NULL | generado al crear el perfil | Código de referido único del usuario |
| `locale` | text | NOT NULL | `'es'` | Idioma preferido (`es`/`en`, MVP sección 3) |
| `created_at` | timestamptz | NOT NULL | `now()` | Alta del perfil |
| `updated_at` | timestamptz | NOT NULL | `now()` | Última actualización |

- **Primary key:** `id`
- **Foreign keys:** `id` → `auth.users(id)` `ON DELETE CASCADE`
- **Índices:** único en `referral_code`
- **Constraints:** `referral_code` `UNIQUE NOT NULL`
- **Relaciones:** 1—1 con `auth.users`; referenciada por prácticamente todas las demás tablas (`trips`, `bookings`, `rewards_transactions`, `referrals`, `vision_scans`, `photos`, `searches`, `analytics_events`)
- **RLS:**
  - Leer: el propio usuario (`id = auth.uid()`)
  - Insertar: nadie desde el cliente — la fila se crea automáticamente mediante un trigger sobre `auth.users` (server-side, `SECURITY DEFINER`) al registrarse
  - Modificar: el propio usuario, limitado a `name`, `avatar_url`, `locale` (`id = auth.uid()`); `referral_code` no es editable por el usuario
  - Eliminar: nadie desde el cliente; solo en cascada si se elimina la cuenta de `auth.users` (operación administrativa, fuera de alcance del MVP)

---

## 3. trips

**Propósito:** agrupación de un viaje del usuario ("Mi viaje" — MVP sección 11). Un viaje puede contener una o varias reservas.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NOT NULL | — | Propietario del viaje |
| `destination` | text | NOT NULL | — | Destino principal del viaje |
| `start_date` | date | NULL | — | Fecha de inicio estimada/real |
| `end_date` | date | NULL | — | Fecha de fin estimada/real |
| `created_at` | timestamptz | NOT NULL | `now()` | — |
| `updated_at` | timestamptz | NOT NULL | `now()` | — |

- **Primary key:** `id`
- **Foreign keys:** `user_id` → `profiles(id)` `ON DELETE CASCADE`
- **Índices:** índice en `user_id`
- **Constraints:** `CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date)`
- **Relaciones:** 1 `trip` → N `bookings` (`bookings.trip_id`), 1 `trip` → N `vision_scans`, 1 `trip` → N `photos`
- **RLS (Patrón A):**
  - Leer: propietario (`user_id = auth.uid()`)
  - Insertar: propietario (`WITH CHECK user_id = auth.uid()`)
  - Modificar: propietario (`user_id = auth.uid()`)
  - Eliminar: propietario (`user_id = auth.uid()`) — ver sección 13 sobre qué ocurre con las reservas asociadas al eliminar un viaje

---

## 4. properties

**Propósito:** caché normalizada de alojamientos devueltos por `HotelProvider` (arquitectura, sección 9). No es la fuente de verdad del inventario — el proveedor externo lo es — sino una copia local necesaria para mostrar detalles y para que `bookings` tenga a qué referenciarse sin depender de una llamada en vivo constante.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK interna de VIAO |
| `provider_name` | text | NOT NULL | — | Identificador del `HotelProvider` de origen (aún sin decidir cuál, sección 9 de la arquitectura) |
| `provider_property_id` | text | NOT NULL | — | Id del alojamiento en el sistema del proveedor |
| `name` | text | NOT NULL | — | Nombre del alojamiento |
| `city` | text | NULL | — | — |
| `country` | text | NULL | — | — |
| `latitude` | numeric | NULL | — | — |
| `longitude` | numeric | NULL | — | — |
| `main_photo_url` | text | NULL | — | — |
| `rating` | numeric | NULL | — | Valoración tal como la exponga el proveedor |
| `raw_data` | jsonb | NOT NULL | `'{}'::jsonb` | Copia flexible de la respuesta del proveedor, para no fijar un esquema rígido antes de elegir proveedor |
| `created_at` | timestamptz | NOT NULL | `now()` | — |
| `updated_at` | timestamptz | NOT NULL | `now()` | — |

- **Primary key:** `id`
- **Foreign keys:** ninguna (tabla de referencia, no depende de otras)
- **Índices:** único compuesto en (`provider_name`, `provider_property_id`)
- **Constraints:** `UNIQUE (provider_name, provider_property_id)`
- **Relaciones:** referenciada por `bookings.property_id`
- **RLS (Patrón B, lectura abierta):**
  - Leer: cualquier usuario autenticado (`USING (true)`) — no es dato personal, es catálogo de alojamientos
  - Insertar/Modificar/Eliminar: solo el backend (rol de servicio), tras llamar a `HotelProvider` — nunca el cliente

---

## 5. searches

**Propósito:** registro de búsquedas realizadas, para analytics y como contexto de la recomendación de IA (MVP sección 6.4, arquitectura sección 12).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NOT NULL | — | Quién buscó |
| `destination` | text | NOT NULL | — | — |
| `check_in` | date | NOT NULL | — | — |
| `check_out` | date | NOT NULL | — | — |
| `guests` | integer | NOT NULL | `1` | — |
| `rooms` | integer | NOT NULL | `1` | — |
| `results_count` | integer | NULL | — | Nº de resultados devueltos (analytics) |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

- **Primary key:** `id`
- **Foreign keys:** `user_id` → `profiles(id)` `ON DELETE CASCADE`
- **Índices:** índice en `user_id`, índice en `created_at`
- **Constraints:** `CHECK (check_out > check_in)`, `CHECK (guests > 0)`, `CHECK (rooms > 0)`
- **Relaciones:** referenciada opcionalmente por `bookings.search_id` (para poder medir si la recomendación de IA mejora la conversión — MVP sección 20, criterio 2)
- **RLS (Patrón A, sin modificación):**
  - Leer: propietario (`user_id = auth.uid()`)
  - Insertar: propietario (`WITH CHECK user_id = auth.uid()`)
  - Modificar: nadie desde el cliente (log inmutable; `results_count` lo actualiza el backend si aplica)
  - Eliminar: nadie desde el cliente en el MVP (política de retención no definida — ver sección 15)

---

## 6. bookings

**Propósito:** reservas realizadas, con la trazabilidad económica pedida (`booking_value`, `provider_commission`, `viao_revenue`, `reward_cost`).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NOT NULL | — | Quién reserva |
| `trip_id` | uuid | NULL | — | Viaje al que pertenece (puede asignarse después) |
| `property_id` | uuid | NOT NULL | — | Alojamiento reservado |
| `search_id` | uuid | NULL | — | Búsqueda que originó la reserva, si se conoce |
| `provider_booking_reference` | text | NULL | — | Localizador del proveedor, si lo devuelve |
| `check_in` | date | NOT NULL | — | — |
| `check_out` | date | NOT NULL | — | — |
| `guests` | integer | NOT NULL | `1` | — |
| `status` | text | NOT NULL | `'pending'` | `pending` / `confirmed` / `cancelled` |
| `booking_value` | numeric(10,2) | NULL | — | Valor de la reserva — **NULL mientras no se conozca** |
| `currency` | text | NOT NULL | `'EUR'` | Mercado inicial España (MVP sección 3) |
| `provider_commission` | numeric(10,2) | NULL | — | Comisión del proveedor — **NULL hasta tener esa información** |
| `viao_revenue` | numeric(10,2) | NULL | — | Ingreso resultante para VIAO — **NULL hasta poder calcularlo** |
| `reward_cost` | numeric(10,2) | NULL | — | Snapshot del coste en Points asociado (ver nota) |
| `created_at` | timestamptz | NOT NULL | `now()` | — |
| `updated_at` | timestamptz | NOT NULL | `now()` | — |

> **Nota sobre `reward_cost`:** este campo es un **valor denormalizado de conveniencia**, sincronizado por el backend cuando se crea la transacción de Rewards correspondiente (sección 7). La fuente de verdad del coste en puntos sigue siendo `rewards_transactions` — `bookings.reward_cost` es solo una copia de lectura rápida para análisis económico agregado (para no tener que sumar transacciones cada vez que se calcula rentabilidad por reserva).

- **Primary key:** `id`
- **Foreign keys:**
  - `user_id` → `profiles(id)` `ON DELETE CASCADE`
  - `trip_id` → `trips(id)` `ON DELETE SET NULL` (si se borra el viaje, la reserva se conserva por integridad económica/auditoría, solo pierde la agrupación)
  - `property_id` → `properties(id)` `ON DELETE RESTRICT` (no se puede borrar un alojamiento con reservas asociadas)
  - `search_id` → `searches(id)` `ON DELETE SET NULL`
- **Índices:** índice en `user_id`, índice en `trip_id`, índice en `status`, índice en `property_id`
- **Constraints:** `CHECK (check_out > check_in)`, `CHECK (guests > 0)`, `CHECK (status IN ('pending','confirmed','cancelled'))`
- **Relaciones:** N `bookings` → 1 `trip`; referenciada por `rewards_transactions` vía `reference_type='booking'` (documentado, no FK real — ver sección 0)
- **RLS (Patrón B):**
  - Leer: propietario (`user_id = auth.uid()`)
  - Insertar/Modificar/Eliminar: **nadie desde el cliente** — el backend (rol de servicio) crea y actualiza la reserva a medida que avanza el flujo (`pending` → `confirmed`/`cancelled`), incluidos los campos económicos

---

## 7. rewards_transactions

**Propósito:** **fuente de verdad** de todos los movimientos de VIAO Points (ganados y gastados).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NOT NULL | — | A quién pertenece el movimiento |
| `amount` | integer | NOT NULL | — | Positivo si se gana, negativo si se gasta |
| `type` | text | NOT NULL | — | `earned` / `spent` |
| `reason` | text | NOT NULL | — | Origen categórico (`registration`, `booking`, `referral`, `redemption`, …) |
| `reference_type` | text | NULL | — | Tipo de entidad que originó el movimiento (`booking`, `referral`, …) |
| `reference_id` | uuid | NULL | — | Id de esa entidad (sin FK real — ver sección 0) |
| `created_at` | timestamptz | NOT NULL | `now()` | Momento del movimiento (la tabla es append-only, sin `updated_at`) |

- **Primary key:** `id`
- **Foreign keys:** `user_id` → `profiles(id)` `ON DELETE CASCADE`
- **Índices:** índice en `user_id`, índice compuesto en (`user_id`, `created_at`) para el historial ordenado, índice en `reference_id`
- **Constraints:**
  - `CHECK (amount <> 0)`
  - `CHECK (type IN ('earned','spent'))`
  - `CHECK ((type = 'earned' AND amount > 0) OR (type = 'spent' AND amount < 0))`
- **Relaciones:** relacionada (sin FK de Postgres) con `bookings` y `referrals` vía `reference_type`/`reference_id`; agregada por la vista `rewards_wallets` (sección 8)
- **RLS (Patrón B, sin excepciones):**
  - Leer: propietario (`user_id = auth.uid()`)
  - Insertar/Modificar/Eliminar: **nunca desde el cliente, bajo ninguna circunstancia** — exclusivamente el backend (rol de servicio). No existe ninguna política que conceda escritura a `authenticated` sobre esta tabla.

---

## 8. rewards_wallets

**Decisión de diseño:** en vez de una tabla con una columna de saldo editable, `rewards_wallets` se define como una **vista** (`VIEW`) calculada sobre `rewards_transactions`. Esto garantiza, a nivel de esquema, el requisito explícito de que *"el saldo nunca se almacena como un número editable"* — no existe ninguna columna de saldo que se pueda actualizar directamente porque no existe una tabla base con esa columna.

**Definición conceptual** (sin SQL de migración, solo la lógica):

```
rewards_wallets(user_id, balance) =
    SELECT user_id, SUM(amount) AS balance
    FROM rewards_transactions
    GROUP BY user_id
```

| Columna (vista) | Tipo | Descripción |
|---|---|---|
| `user_id` | uuid | Usuario |
| `balance` | integer | Suma de todos los `amount` de `rewards_transactions` de ese usuario |

- **Primary key / Foreign keys:** no aplica (es una vista, no una tabla base)
- **Índices:** no aplica directamente; el rendimiento depende del índice en `rewards_transactions(user_id)` (sección 7)
- **Constraints:** no aplica (no hay datos que insertar)
- **Relaciones:** derivada 1—1 de `rewards_transactions` agrupada por `user_id`
- **RLS:** la vista se define con `security_invoker` (ejecuta con los permisos del usuario que consulta), por lo que **hereda automáticamente** la política de `rewards_transactions`: cada usuario solo puede calcular su propio saldo, nunca el de otro. No requiere política propia adicional.
  - Leer: propietario (heredado)
  - Insertar/Modificar/Eliminar: no aplica — no se puede escribir en una vista de agregación

---

## 9. referrals

**Propósito:** trazabilidad del sistema de referidos (MVP sección 12).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `referrer_id` | uuid | NOT NULL | — | Quién invita |
| `referred_id` | uuid | NOT NULL | — | Quién fue invitado |
| `referral_code_used` | text | NOT NULL | — | Código utilizado en el registro (snapshot) |
| `status` | text | NOT NULL | `'pending'` | `pending` / `rewarded` / `invalid` |
| `valid_action_completed_at` | timestamptz | NULL | — | Cuándo se cumplió la "acción válida" (definición pendiente, MVP sección 18) |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

- **Primary key:** `id`
- **Foreign keys:** `referrer_id` → `profiles(id)` `ON DELETE CASCADE`, `referred_id` → `profiles(id)` `ON DELETE CASCADE`
- **Índices:** índice en `referrer_id`, índice único en `referred_id`
- **Constraints:**
  - `CHECK (referrer_id <> referred_id)` — evita auto-referirse a nivel de base de datos
  - `UNIQUE (referred_id)` — un usuario solo puede haber sido referido una vez (validación antifraude mínima pedida)
  - `CHECK (status IN ('pending','rewarded','invalid'))`
- **Relaciones:** referenciada por `rewards_transactions` (dos filas, una por cada parte, cuando `status = 'rewarded'`) vía `reference_type='referral'`
- **RLS (Patrón B):**
  - Leer: quien participa en la fila, como referidor o como referido (`referrer_id = auth.uid() OR referred_id = auth.uid()`)
  - Insertar/Modificar/Eliminar: **nadie desde el cliente** — la fila se crea en el backend durante el registro (validando el código y la unicidad) y el estado cambia a `rewarded` cuando el backend confirma la acción válida

---

## 10. vision_scans

**Propósito:** registro del procesamiento de VIAO Vision — **conceptualmente separado** de si la imagen se conserva o no (MVP sección 10, arquitectura secciones 13/19/21).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NOT NULL | — | Quién escaneó |
| `trip_id` | uuid | NULL | — | Viaje asociado, si lo hay |
| `source_language` | text | NULL | — | Idioma detectado en la imagen |
| `target_language` | text | NOT NULL | `'es'` | Idioma de salida (locale del usuario) |
| `translated_text` | text | NULL | — | Resultado de la traducción |
| `explanation` | text | NULL | — | Explicación devuelta por VIAO Vision |
| `image_retained` | boolean | NOT NULL | `false` | Si el usuario decidió conservar la imagen (existirá una fila en `photos`) |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

**Nota:** esta tabla **no almacena la imagen**, solo el resultado textual del procesamiento. Si `image_retained = true`, existe una fila correspondiente en `photos` con `vision_scan_id` apuntando aquí.

- **Primary key:** `id`
- **Foreign keys:** `user_id` → `profiles(id)` `ON DELETE CASCADE`, `trip_id` → `trips(id)` `ON DELETE SET NULL`
- **Índices:** índice en `user_id`, índice en `trip_id`
- **Constraints:** ninguno adicional
- **Relaciones:** 1 `vision_scan` → 0..1 `photo` (relación inversa: `photos.vision_scan_id`)
- **RLS (Patrón B):**
  - Leer: propietario (`user_id = auth.uid()`)
  - Insertar: **nadie desde el cliente** — se crea en el backend tras el procesamiento server-side de OpenAI (arquitectura sección 13)
  - Modificar: nadie
  - Eliminar: nadie directamente vía RLS — la eliminación ("permitir eliminación", MVP sección 10) se ejecuta mediante una Server Action que usa el rol de servicio tras validar que el solicitante es el propietario

---

## 11. photos

**Propósito:** imágenes que el usuario **decide explícitamente conservar** (de un viaje, o derivadas de un escaneo de Vision). No se asume que todas las imágenes deban guardarse.

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `user_id` | uuid | NOT NULL | — | Propietario |
| `trip_id` | uuid | NOT NULL | — | Viaje al que pertenece la foto |
| `vision_scan_id` | uuid | NULL | — | Escaneo de Vision del que procede, si aplica |
| `storage_path` | text | NOT NULL | — | Ruta en Supabase Storage (no la imagen en sí) |
| `caption` | text | NULL | — | Descripción opcional |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

- **Primary key:** `id`
- **Foreign keys:** `user_id` → `profiles(id)` `ON DELETE CASCADE`, `trip_id` → `trips(id)` `ON DELETE CASCADE`, `vision_scan_id` → `vision_scans(id)` `ON DELETE SET NULL`
- **Índices:** índice en `user_id`, índice en `trip_id`
- **Constraints:** `UNIQUE (storage_path)`
- **Relaciones:** N `photos` → 1 `trip`; 0..1 `photos` → 1 `vision_scan`
- **RLS (Patrón A):**
  - Leer: propietario (`user_id = auth.uid()`)
  - Insertar: propietario (`WITH CHECK user_id = auth.uid()`) — guardar una foto es una acción directa y de bajo riesgo del usuario
  - Modificar: propietario, limitado a `caption`
  - Eliminar: propietario (`user_id = auth.uid()`) — satisface "permitir eliminación" también para fotos ya guardadas

> Las políticas de la tabla deben mantenerse alineadas con las políticas del bucket de Supabase Storage correspondiente (arquitectura, sección 19) — el acceso al archivo real depende de esas políticas de Storage, no solo de esta tabla de metadatos.

---

## 12. analytics_events

**Propósito:** copia auditable, server-side, de los eventos de negocio críticos de la taxonomía del MVP (sección 13) — complementa a PostHog sin depender de él (arquitectura sección 18).

| Columna | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | PK |
| `event_name` | text | NOT NULL | — | Uno de los eventos de la taxonomía cerrada (ver constraint) |
| `user_id` | uuid | NULL | — | Usuario, cuando esté disponible |
| `session_id` | text | NULL | — | Id de sesión (cliente/PostHog), cuando corresponda |
| `metadata` | jsonb | NOT NULL | `'{}'::jsonb` | Datos mínimos del evento (p. ej. `search_id`, `booking_id`) — sin datos personales |
| `created_at` | timestamptz | NOT NULL | `now()` | — |

- **Primary key:** `id`
- **Foreign keys:** `user_id` → `profiles(id)` `ON DELETE SET NULL`
- **Índices:** índice en `event_name`, índice en `user_id`, índice en `created_at`
- **Constraints:** `CHECK (event_name IN ('registered','search_started','search_completed','hotel_viewed','recommendation_requested','booking_clicked','booking_completed','vision_used','reward_earned','reward_redeemed','referral_created','return_visit'))` — mantiene la taxonomía cerrada y alineada con el MVP
- **Relaciones:** ninguna FK adicional; `metadata` puede contener ids de otras entidades sin forzar integridad referencial (es un log, no una tabla operativa)
- **RLS (Patrón B, sin lectura para el cliente):**
  - Leer: nadie desde el cliente — no hay ninguna funcionalidad de producto que exponga esta tabla al usuario final; solo el backend/reporting interno
  - Insertar: solo el backend (rol de servicio)
  - Modificar/Eliminar: nadie

---

## 13. Relaciones principales

```
auth.users (Supabase Auth)
      │ 1:1
      ▼
   profiles ──────────────────────────────────────────────────────────┐
      │ 1:N                    │ 1:N              │ 1:N               │ 1:N
      ▼                        ▼                   ▼                   ▼
    trips                  searches          rewards_transactions  referrals
      │ 1:N                    │ 0/1:N                                (referrer/referred)
      ▼                        ▼
   bookings ◄──────────── (search_id opcional)
      │ N:1
      ▼
  properties

   trips 1:N vision_scans ──0/1:1── photos ──N:1── trips
```

- **Usuario → viaje → reserva(s):** `profiles (1) → trips (N) → bookings (N)`, tal como se pidió. Una reserva puede quedarse sin `trip_id` temporalmente (nullable) si el flujo de reserva ocurre antes de asignarla a un viaje concreto.
- **Rewards:** cualquier acción que otorgue o consuma puntos (registro, reserva, referido) crea una fila en `rewards_transactions`; el saldo (`rewards_wallets`) siempre se deriva de ahí, nunca al revés.
- **Vision → Photos:** un escaneo no implica una foto guardada; una foto guardada puede (opcionalmente) venir de un escaneo.
- **Properties** es la única tabla sin relación de propiedad de usuario — es catálogo compartido, alimentado por el backend desde `HotelProvider`.

---

## 14. Decisiones de seguridad / RLS

- Todas las tablas tienen RLS **activo** (`ENABLE ROW LEVEL SECURITY`), incluidas `properties` y `analytics_events`, aunque su política de lectura sea permisiva o inexistente para `authenticated` — activarlo siempre es la postura por defecto, nunca una excepción.
- **Un usuario nunca puede leer datos de otro usuario**: todas las políticas de `SELECT` sobre datos personales usan `auth.uid()` contra la columna de propiedad (`user_id`, o `referrer_id`/`referred_id` en `referrals`).
- **Nunca puede modificar directamente movimientos de Rewards**: `rewards_transactions` no tiene ninguna política de escritura para `authenticated`; `rewards_wallets` ni siquiera es una tabla escribible (es una vista).
- **Nunca puede consultar viajes/reservas de otro usuario**: políticas de `SELECT` en `trips` y `bookings` restringidas a `user_id = auth.uid()`.
- **Operaciones sensibles server-side**: `bookings`, `rewards_transactions`, `referrals`, `vision_scans`, `analytics_events` y la creación de `profiles` no tienen ninguna vía de escritura para el cliente — solo el backend, usando el rol de servicio de Supabase (que opera fuera de RLS, tal como ya se estableció en `VIAO_ARCHITECTURE.md`, secciones 6 y 20).
- **Patrón A vs B (sección 1)** hace explícito, tabla por tabla, por qué unas permiten escritura directa del cliente (bajo RLS, para acciones de bajo riesgo) y otras no.

---

## 15. Decisiones pendientes

Estas decisiones no bloquean el modelo de datos definido aquí — están aisladas en columnas/reglas concretas:

1. **Valores cerrados de `reason`** en `rewards_transactions` (más allá de `registration`/`booking`/`referral`/`redemption`) — depende de la economía de Points aún no fijada (MVP sección 18).
2. **Definición exacta de "acción válida"** que activa `referrals.status = 'rewarded'` (MVP sección 18).
3. **Política de retención de `searches`** (¿el usuario puede borrar su historial de búsquedas?) — no definida.
4. **Política tras baja de cuenta de usuario**: actualmente todo hace `CASCADE`/`SET NULL` desde `profiles`; no se ha definido si `bookings`/`rewards_transactions` deben conservarse por motivos contables incluso tras eliminar la cuenta.
5. **Detalle de las políticas del bucket de Supabase Storage** para `photos` y las imágenes en tránsito de Vision — deben diseñarse en paralelo a estas tablas, no están cubiertas por este documento (que es solo de Postgres).
6. **Valores cerrados de `reference_type`** en `rewards_transactions` (`booking`, `referral`, ¿algún otro futuro?) — se ampliará según se necesite, sin romper el diseño actual.

---

## 16. Revisión de coherencia

- **Con `VIAO_MVP_v0.1.md`**: las 11 tablas corresponden exactamente a las previstas en la sección 17 del MVP. Los campos de `bookings` (`booking_value`, `provider_commission`, `viao_revenue`, `reward_cost`) son nullable, tal como se pidió, para no bloquear el registro de una reserva antes de conocer esos datos. `rewards_transactions` sigue siendo la fuente de verdad, sin fijar conversión Points → euros. Vision separa explícitamente el registro del procesamiento (`vision_scans`) de la imagen conservada (`photos`).
- **Con `VIAO_ARCHITECTURE.md`**: el listado de tablas de la sección 8 de la arquitectura se respeta sin añadidos. El patrón "todo pasa por el backend" (arquitectura, sección 20) se traduce aquí en el Patrón B de escritura. La flexibilidad de `properties.raw_data` (jsonb) es consistente con no haber seleccionado todavía un `HotelProvider` (arquitectura, sección 9).
- **Sin contradicciones detectadas.**
- **Único desvío señalado explícitamente:** `rewards_wallets` se implementa como **vista**, no como tabla con columna de saldo — es una interpretación más estricta del requisito "no almacenar un saldo editable como fuente de verdad", no una contradicción con él. Se marca aquí para que se apruebe conscientemente, no como un cambio silencioso.

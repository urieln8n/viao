---
STATUS: CURRENT
ERA: Partners/V2 (esta sesión)
DOMAIN: Partners
AUTHORITY: Fuente de verdad técnica de Partners — P1-P8 LOCKED
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO PARTNERS — TECHNICAL SPECIFICATION
### Estado: DISEÑO TÉCNICO — NO IMPLEMENTADO
### Fuente de verdad de producto: `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`

> Este documento traduce el Master V2 a arquitectura técnica concreta, auditando primero el schema/código real de VIAO (no supuesto). Ninguna decisión `LOCKED` del Master V2 se reabre salvo contradicción técnica real encontrada durante la auditoría — ninguna se encontró. Cero código, cero migraciones, cero cambios de Supabase. Cada afirmación está etiquetada `EXISTENTE`, `PROPUESTO`, `LOCKED`, `OPEN`, `BLOCKED` o `NO IMPLEMENTADO`.

---

## 1. Estado y alcance

Este documento resuelve únicamente lo necesario para implementar **Partners Beta** (3-5 Partners, Restaurantes+Experiencias, QR+reserva, gratis). No diseña V1/V1.1/V2 más allá de dejar el modelo evolucionable hacia ellos. Resuelve explícitamente el punto **B1** del Master V2 (dónde vive el importe en euros), que estaba `BLOCKED`.

## 2. Fuentes de verdad

- `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` — producto/negocio, no se reabre.
- `supabase/migrations/*` — schema real, auditado en este documento, no asumido.
- `lib/rewards/create-reward-transaction.ts`, `lib/missions/complete-mission.ts` (patrón de referencia) — código real, leído directamente antes de proponer nada.

---

## 3. Arquitectura actual relevante (`EXISTENTE`, verificado directamente contra el repositorio)

### 3.1 `rewards_transactions` (verificado: `20260817140005_create_rewards_transactions.sql`)
```sql
id uuid PK (gen_random_uuid())
user_id uuid NOT NULL → profiles(id)
amount integer NOT NULL          -- SIEMPRE Points, nunca euros
type text NOT NULL CHECK (type in ('earned','spent'))
reason text NOT NULL
reference_type text
reference_id uuid
created_at timestamptz
CHECK amount<>0, CHECK (type='earned' AND amount>0) OR (type='spent' AND amount<0)
UNIQUE (user_id, reason, reference_type, reference_id)   -- idempotencia real
```
`service_role`: SELECT+INSERT únicamente (append-only, sin UPDATE/DELETE). Sin ninguna policy para `authenticated`/`anon` — Patrón B puro.

### 3.2 Único escritor: `lib/rewards/create-reward-transaction.ts` (verificado, leído completo)
Función TypeScript simple (`service_role`, sin lock, sin kill-switch) — usada para casos SIN contención de pool (ej. registro). **No es el patrón adecuado para Partners**, que sí necesita pool/kill-switch — ver 3.4.

### 3.3 `mission_completions` + `complete_mission()` RPC (verificado, leído completo — **plantilla directa para Partners**)
- Tabla append-only: `id, user_id, mission_key, period_key, points_awarded, created_at`, `UNIQUE(user_id, mission_key, period_key)`.
- RPC `SECURITY DEFINER`, `set search_path=''`, solo `service_role`:
  1. Valida usuario.
  2. `pg_advisory_xact_lock(hashtext('viao_missions_pool'))` — **un único lock global**, justificado explícitamente en el propio código por bajo volumen esperado.
  3. Idempotencia: `SELECT` por clave única bajo el lock → si existe, la devuelve tal cual (nunca error).
  4. Kill-switch: `SUM` del mes actual + nuevo valor > techo (constante SQL) → `raise exception`.
  5. `INSERT ... ON CONFLICT DO NOTHING` + `INSERT` en `rewards_transactions` — **misma transacción, rollback atómico si algo falla**.

### 3.4 `booking_intents` (verificado, leído completo — **plantilla para state machine + idempotencia de doble-submit externo**)
- `status text CHECK (status in ('in_progress','completed','failed','provider_confirmed_orphaned'))`.
- Índice único **parcial** (`WHERE status='in_progress'`) — la fila deja de bloquear en cuanto cambia de estado.
- Patrón B puro: RLS activa, cero policies de cliente, `service_role` con SELECT+INSERT+UPDATE (sin DELETE).

### 3.5 `redeem_reward()` / `cancel_redemption()` (verificado, leído completo)
- Dos tipos de lock con propósito distinto: lock por-usuario (`profiles ... for update`) + lock de pool global (`pg_advisory_xact_lock`), **solo cuando aplica** (aquí, solo `funding_type='viao'`).
- Idempotencia de reintento: `attempt_id` **generado por el llamante** (`crypto.randomUUID()`) — patrón usado porque el canje es 100% interno a Postgres (sin proveedor externo cuya respuesta se pueda perder, a diferencia de `booking_intents`).
- Kill-switch: constante SQL, fail-closed si falta el dato de coste.

### 3.6 `goals` (verificado en sesiones anteriores del proyecto)
Confirma el patrón de triggers `SECURITY DEFINER` para proteger campos inmutables y transiciones de estado — **no necesario para Partners** (ver sección 17: Partners no expone ningún UPDATE de cliente).

### 3.7 Generación de IDs
`EXISTENTE`, consistente en todo el proyecto: `gen_random_uuid()` en SQL. Ningún otro mecanismo (ULID, nanoid, etc.) se usa en ningún sitio del schema actual.

### 3.8 Lo que NO existe (`EXISTENTE` como ausencia, verificado, no asumido)
- Ninguna tabla `partners`.
- Ninguna tabla `partner_activities` ni equivalente.
- Ningún campo de importe en euros en ningún lugar de `rewards_transactions` ni de ninguna tabla relacionada con Rewards.
- Ningún sistema de reserva genérico para negocios locales — `bookings`/`booking_intents` son estructuralmente específicos de Hotelbeds/`MockHotelProvider` (`provider_name`, `provider_property_id`, `check_in`/`check_out` de hotel) — **no reutilizables tal cual para una reserva de Experiencia con un Partner local** (ver sección 9).
- Ningún sistema de autenticación/login de Partner (ver sección 11.4).

---

## 4. Decisiones heredadas del Master V2 (no reabiertas)

Ver Master V2 secciones 21-23 completas. Resumen operativo: `LOCKED` — 3-5 Partners, Restaurantes+Experiencias, onboarding manual, 6-8 semanas, QR+reserva, Beta gratis, reutilizar `rewards_transactions`, `reason='partner_activity'`, sin OCR en Beta, sin POS/API, CRM mínimo, antifraude reutilizando patrones existentes, 6 métricas, sin descuentos, sin catálogo abierto, sin ledger paralelo. `OPEN` — % comisión, umbral de cobro, OCR V1 vs V1.1, pricing Premium/Pro. `BLOCKED` (resuelto en este documento, sección 7) — schema del importe en euros.

**Ninguna contradicción técnica real encontrada entre el Master V2 y el schema actual.**

---

## 5. Modelo de Partner (`PROPUESTO`)

Mínimo necesario para Beta — nada "por si acaso":

```
partners
  id                uuid PK (gen_random_uuid())
  name              text NOT NULL
  slug              text NOT NULL UNIQUE      -- para la futura mini-web /partners/[slug]
  category          text NOT NULL CHECK (category in ('restaurant','experience'))
  status            text NOT NULL DEFAULT 'active' CHECK (status in ('active','inactive'))
  contact_email     text
  contact_phone     text
  address           text                       -- texto libre; sin geo/mapa real en Beta
  created_at        timestamptz NOT NULL DEFAULT now()
  updated_at        timestamptz NOT NULL DEFAULT now()
```

Explícitamente excluido de Beta (`NO IMPLEMENTADO`): multi-ubicación, coordenadas geográficas estructuradas, horarios estructurados, catálogo de productos/servicios como entidad propia (texto libre dentro de la mini-web es suficiente para Beta, sin tabla), campos de facturación/pago.

`category` fija el mecanismo de atribución por diseño (Restaurantes→QR, Experiencias→Reserva) — ver sección 8-9.

---

## 6. Modelo de Activity (`PROPUESTO`)

```
partner_activities
  id                    uuid PK (gen_random_uuid())
  partner_id            uuid NOT NULL → partners(id)
  user_id               uuid NOT NULL → profiles(id)
  attribution_mechanism text NOT NULL CHECK (attribution_mechanism in ('qr','reservation'))
  declared_amount_eur   numeric(10,2) NOT NULL       -- ver sección 7
  amount_confidence     text NOT NULL CHECK (amount_confidence in ('declared','confirmed_by_reservation'))
  points_awarded        integer NOT NULL DEFAULT 0    -- ver sección 10, `LOCKED` P5/P6
  reservation_reference text                          -- opcional, texto libre, ver sección 9
  attempt_id            uuid NOT NULL UNIQUE           -- idempotencia de reintento, ver sección 11
  created_at            timestamptz NOT NULL DEFAULT now()
```

**Sin columna `status`** (`PROPUESTO`, justificado): cada fila se crea ya confirmada por construcción — el flujo exige confirmación humana (Partner/operador) **antes** de que la Actividad se cree (sección 8-9), no después. Beta no incluye disputa ni cancelación de una Actividad — si se necesitara en V1+, se añadiría entonces, no ahora (`NO IMPLEMENTADO`).

**`points_awarded`** (`LOCKED`, P5/P6 — Decision Lock Económico Final, 25/08/2026): representa los Points **realmente otorgados** por esa Actividad concreta, decidido una única vez en el momento del INSERT (sección 10) y nunca actualizado después — coherente con el resto de la tabla (append-only, sin UPDATE). `points_awarded = 0` significa exclusivamente que la Actividad fue válida y se registró, pero el pool mensual de Partners (sección 12) ya estaba agotado en ese momento. **No representa Points pendientes, no representa Points prometidos, no implica ninguna deuda futura de VIAO** — no existe backfill automático ni emisión retroactiva cuando el pool se resetea al mes siguiente. Distinto de `declared_amount_eur`: la venta ocurrió y se registra siempre; el incentivo en Points es lo único condicionado al presupuesto disponible.

`attribution_mechanism` es técnicamente derivable de `partners.category` hoy, pero se almacena explícitamente en la fila para que cada Actividad sea auditable de forma independiente, aunque la categoría del Partner cambiara en el futuro — una sola columna, coste mínimo.

`amount_confidence` codifica **directamente** la nomenclatura honesta ya fijada en el Master V2 (L15): `'declared'` → panel muestra "Ventas declaradas"; `'confirmed_by_reservation'` → panel muestra "Ventas confirmadas por reserva". Deja espacio evolutivo explícito para un futuro valor `'validated'` (OCR, V1.1+) **sin ningún cambio de estructura** — solo un nuevo valor de CHECK y, entonces sí, un campo de evidencia asociado (`NO IMPLEMENTADO` ahora).

---

## 7. Modelo monetario — resolución de B1 (`PROPUESTO`, decisión de esta especificación)

### Alternativas evaluadas

| Opción | Ventajas | Desventajas |
|---|---|---|
| A. Columna en `partner_activities` | Simple, una sola tabla nueva, coherente con el resto del proyecto (append-only, sin relaciones extra) | Ninguna relevante para Beta |
| B. Tabla separada (`partner_activity_amounts`) | Permitiría versionar/corregir importes con historial propio | Sobre-ingeniería para Beta: las Actividades son append-only por diseño, igual que el resto de VIAO — no hay caso de uso real de "corregir" un importe ya declarado en esta fase |
| C. Reutilizar `rewards_transactions.amount` | Ninguna — está explícitamente descartado por el Master V2 y por el propio CHECK de la tabla (representa Points, no euros) | Rompería la semántica ya auditada de esa columna |

### Decisión: **Opción A — columna `declared_amount_eur` en `partner_activities`**

- **Tipo de dato**: `numeric(10,2)` — **exactamente el mismo tipo ya usado en el proyecto** para importes monetarios (`rewards_catalog.real_cost_eur`, `v_monthly_pool_limit_eur` en `redeem_reward()`), sin inventar uno nuevo.
- **Precisión**: 2 decimales, suficiente para euros — coherente con lo ya existente.
- **Currency**: `PROPUESTO` — **sin columna `currency` en Beta**. VIAO opera únicamente en Barcelona/España en Beta/V1/V1.1; añadir una columna de moneda hoy sería sobre-ingeniería sin caso de uso real. `FUTURE`: si VIAO opera fuera de la eurozona, añadir `currency text DEFAULT 'EUR'` es un cambio trivial y no rompe nada de lo diseñado aquí.
- **Nullability**: `NOT NULL` — toda Actividad de Beta, por los dos mecanismos definidos (QR+declarado, Reserva+confirmado), produce siempre un importe. Un futuro mecanismo sin importe (si llegara a existir) requeriría su propio diseño, no doblegar este.
- **Cuándo se escribe**: una única vez, en el momento de creación de la Actividad, dentro de la misma transacción que la Actividad y que la `rewards_transaction` correspondiente (ver sección 10) — nunca se actualiza después (append-only, coherente con el resto del ledger de VIAO).
- **Quién puede escribirlo**: únicamente el RPC `SECURITY DEFINER` propuesto en la sección 10, invocado solo por `service_role` — nunca el cliente directamente, mismo Patrón B que `rewards_transactions`/`mission_completions`/`booking_intents`.
- **Quién puede leerlo**: `service_role` (backend de VIAO). El acceso de un Partner a su propio dato agregado depende de una decisión no cerrada — ver sección 11.4 (`OPEN`).
- **Cómo evitar manipulación**: el importe es una **declaración**, no una prueba — el Master V2 ya lo llama por su nombre honesto ("Ventas declaradas"). Este documento no promete antifraude sobre el importe en sí en Beta (ver sección 12) — la mitigación real llega con evidencia verificable (OCR, V1.1+).
- **Preparación para OCR futuro**: cuando exista evidencia verificable, se añade un nuevo valor de `amount_confidence` (`'validated'`) y, entonces, un campo de referencia a la evidencia (ej. `evidence_reference`) — **cambio aditivo, no requiere rediseñar `partner_activities`**.

---

## 8. QR attribution flow (`PROPUESTO`, contrato técnico — no implementación de UI/hardware)

```
Usuario → muestra QR (identifica al Partner, ej. un código fijo por Partner)
Partner → escanea (dispositivo del propio Partner, sin hardware nuevo)
Partner → confirma la interacción + declara un importe
  → Server Action (client-side, con `attempt_id` generado por el llamante,
     mismo patrón que redeem_reward() — es un flujo 100% interno a
     Postgres, sin proveedor externo cuya respuesta se pueda perder)
  → invoca el RPC `complete_partner_activity()` (sección 10)
```

- **Cómo identificar al Partner**: el QR codifica (mínimo) el `partner_id` — el mecanismo exacto de generación/impresión del QR físico es `NO IMPLEMENTADO` en este documento (fuera de alcance: eso es UI/operación, no arquitectura de datos).
- **Cómo identificar la Actividad**: el `id` generado por el propio INSERT (`gen_random_uuid()`), nunca por el cliente.
- **Cómo impedir reutilización problemática del QR físico**: el QR en sí es solo un identificador de Partner, no un token de un solo uso — la protección real contra abuso no viene de invalidar el QR, sino del `attempt_id` (doble-submit) + el límite diario (sección 12) + el kill-switch mensual (sección 12).
- **Qué ocurre si se repite una petición** (doble clic, reintento de red): el RPC devuelve la fila ya existente para el mismo `attempt_id`, nunca crea una segunda (idéntico a `redeem_reward()`).
- **Qué ocurre si falla Rewards después de crear la Actividad**: no puede ocurrir de forma inconsistente — Actividad y `rewards_transaction` se insertan en la **misma función `SECURITY DEFINER`**, misma transacción implícita; un fallo en cualquiera de los dos pasos revierte ambos (mismo comportamiento ya documentado y auditado en `complete_mission()`).

---

## 9. Experience/reservation flow (`PROPUESTO`)

**Hallazgo de auditoría explícito**: VIAO no tiene hoy ningún sistema de reserva genérico reutilizable para Experiencias de Partners. `bookings`/`booking_intents` están estructuralmente acoplados a Hotelbeds/`MockHotelProvider` (`provider_name`, `provider_property_id`, semántica de `check_in`/`check_out` de alojamiento) — **no se reutilizan, no se tocan, no se acoplan a Partners** (cumple explícitamente la instrucción de no inventar integración con Hotelbeds).

**Diseño para Beta**: la "Reserva" de una Experiencia **no es un sistema de reservas real** — es, técnicamente, el mismo flujo que el QR (sección 8), con dos diferencias: `attribution_mechanism='reservation'` y `amount_confidence='confirmed_by_reservation'` (el importe ya se conocía de antemano porque el precio de la experiencia estaba fijado, no se "declara" ad-hoc como en un restaurante). El campo `reservation_reference` (texto libre, sección 6) permite al Partner/operador anotar cualquier referencia que ya tengan (nombre de la reserva, fecha/hora) — **no es una clave foránea a ninguna tabla**, es puramente informativo, coherente con el nivel de madurez de Beta.

---

## 10. Rewards integration (`PROPUESTO`, reutiliza los patrones de lock/idempotencia/kill-switch de `complete_mission()` — **con una diferencia deliberada, `LOCKED` P5**: captura de Actividad y emisión de Points dejan de ser estrictamente atómicas entre sí)

**IMPORTANTE**: no copiar literalmente la semántica de `complete_mission()` en este punto. Missions completa y recompensa son el mismo evento por definición (no existe "misión completada sin recompensa"). Partners **sí** tiene esa separación, explícita desde el Decision Lock Económico Final (25/08/2026, P5): Actividad = dato económico/operativo real; Points = incentivo financiado por VIAO. El agotamiento del pool de Points no debe borrar ni impedir registrar la Actividad.

```sql
create or replace function public.complete_partner_activity(
  p_user_id uuid,
  p_partner_id uuid,
  p_attempt_id uuid,
  p_declared_amount_eur numeric,
  p_amount_confidence text,
  p_reservation_reference text default null
)
returns public.partner_activities
language plpgsql
security definer
set search_path = ''
as $$
-- (pseudocódigo de contrato, no una migración)
begin
  -- 1. Validar usuario y Partner (existente, activo).
  -- 2. pg_advisory_xact_lock(hashtext('viao_partners_pool'))
  --    — un único lock global, mismo criterio que Missions:
  --    bajo volumen esperado (3-5 Partners en Beta).
  -- 3. Idempotencia: SELECT por attempt_id bajo el lock → si existe, devolverla.
  -- 4. Kill-switch diario (`LOCKED` P3): COUNT de Actividades
  --    (user_id, partner_id, hoy) >= 2 → raise exception, NINGUNA fila
  --    se crea. Mecanismo anti-farming por conteo, independiente de
  --    Points — a diferencia del kill-switch mensual (pasos 7-9), este
  --    SÍ bloquea la Actividad por completo.
  -- 5. Calcular p_declared_amount_eur (importe ya recibido del llamante,
  --    validado > 0).
  -- 6. Calcular Points según amount_confidence (`LOCKED` P1/P2):
  --      'confirmed_by_reservation' → floor(p_declared_amount_eur * 2)
  --      'declared'                 → floor(p_declared_amount_eur * 1)
  --    (no confundir con POINTS_PERCENTAGE_OF_COMMISSION, que es una
  --    cifra de comisión de negocio V1+, no esta tasa de Beta).
  -- 7. Comprobar pool mensual (`LOCKED` P4): SUM(points_awarded) de
  --    partner_activities este mes + Points calculados en el paso 6,
  --    contra el techo de 3000 Points/mes (pool propio de Partners,
  --    independiente de Rewards/Missions/Referidos).
  --      v_hay_margen := (Points del paso 6) <= (3000 - SUM ya otorgado este mes)
  -- 8. INSERT en partner_activities — SIEMPRE (`LOCKED` P5), exista o no
  --    margen en el paso 7:
  --      si v_hay_margen:     points_awarded = Points calculados (paso 6)
  --      si NOT v_hay_margen: points_awarded = 0
  -- 9. INSERT en rewards_transactions — SOLO si v_hay_margen (`LOCKED` P5/P6):
  --      reason='partner_activity'
  --      reference_type='partner_activity'
  --      reference_id=<id de la fila insertada en el paso 8>
  --    Si NOT v_hay_margen: no se inserta ninguna fila en rewards_transactions.
  --    No existe backfill posterior ni emisión retroactiva cuando el pool
  --    se resetea el mes siguiente (`LOCKED` P5/P6).
  -- 10. return la fila de partner_activities — commit atómico: los pasos
  --     8-9 ocurren en la misma transacción/lock que el resto de la
  --     función, pero "atómico" ya no significa "ambos inserts o
  --     ninguno" (como en complete_mission()), sino "un único commit
  --     consistente" que siempre incluye el paso 8 y condicionalmente el 9.
end;
$$;

revoke execute on function public.complete_partner_activity from public, anon, authenticated;
grant execute on function public.complete_partner_activity to service_role;
```

**Qué ocurre ante retries**: cubierto en su totalidad por el `attempt_id` (paso 3) — comportamiento idéntico, ya probado, de `redeem_reward()`.
**Qué pasa si Activity existe pero no se emitió Reward**: **ya no es imposible — es el comportamiento esperado y aprobado (`LOCKED` P5)** cuando el pool mensual está agotado (paso 7 sin margen): la Actividad existe con `points_awarded = 0` y no existe fila correspondiente en `rewards_transactions`. Esto no es un fallo, es el diseño.
**Qué pasa si Reward existe pero la petición se repite**: sigue cubierto por `attempt_id` (paso 3) — sin cambios; "Reward" aquí solo existe cuando el paso 7 encontró margen.
**Qué pasa si se supera el kill-switch diario (paso 4)**: comportamiento sin cambios respecto al diseño original — `raise exception` antes de cualquier INSERT, ninguna fila parcial. Es el único de los dos kill-switches que sigue bloqueando la Actividad por completo, porque protege contra farming/abuso (conteo), no contra coste en Points.

**Reutilización explícita, sin ledger paralelo** (`LOCKED`, Master V2 L7): `rewards_transactions` no se modifica en su estructura — solo recibe un `reason` nuevo (`'partner_activity'`), exactamente como ya ocurrió con `'mission:*'`/`'redemption'`/`'redemption_refund'`/`'referral_created'`.

---

## 11. RLS / security (`PROPUESTO`, comportamiento esperado — no se escriben policies)

### 11.1 `partners`
- Lectura pública/anónima necesaria (la mini-web debe funcionar para alguien que llega desde Instagram sin sesión de VIAO — mismo requisito ya resuelto para `destinations` con el mismo patrón). **Patrón B para lectura**: RLS activa, sin policies de cliente, lecturas server-side vía `service_role` (mismo criterio exacto que `get-cached-destinations.ts`).
- `service_role`: SELECT+INSERT+UPDATE (edición de datos del Partner por parte de VIAO — alta manual/curada), sin DELETE.

### 11.2 `partner_activities`
- Patrón B puro, igual que `rewards_transactions`/`mission_completions`/`booking_intents`: RLS activa, **cero policies para `authenticated`/`anon`**.
- `service_role`: SELECT+INSERT únicamente (append-only, sin UPDATE ni DELETE — coherente con la ausencia de columna `status`, sección 6). `points_awarded` no rompe esta disciplina: se decide una única vez dentro del mismo INSERT (sección 10, paso 8) y nunca se actualiza después — no requiere GRANT de UPDATE.

### 11.3 Quién nunca debe poder modificar nada como cliente
Ni `partners` ni `partner_activities` conceden ningún GRANT a `authenticated`/`anon` — toda escritura pasa exclusivamente por el RPC de la sección 10 o por herramientas internas de VIAO (`service_role`).

### 11.4 `LOCKED` (P7, Decision Lock Económico Final, 25/08/2026) — modelo de acceso del Partner a su propio panel
El Master V2 describe **qué** debe ver el Partner (sección 10 del Master V2); esta sección fija **cómo** accede a verlo durante Beta.

**Decisión aprobada**: enlace único por Partner, con un token opaco no adivinable (`access_token`, tipo `uuid`, columna nueva en `partners`, sección 5). Sin Supabase Auth para Partners, sin contraseña, sin tabla de usuarios de Partner. El enlace (`/partners/ops/<access_token>`, ruta ilustrativa — la ruta exacta es `NO IMPLEMENTADO`, fuera de alcance de este documento) permite exclusivamente: (1) confirmar Actividades vía el RPC de la sección 10, (2) consultar el panel de solo lectura propio del Partner (sección 14).

- `partners.access_token`: `uuid NOT NULL UNIQUE DEFAULT gen_random_uuid()` — generado por VIAO en el alta manual/curada del Partner (`LOCKED`, Master V2 L3), nunca por el propio Partner.
- Nivel de seguridad: bajo pero suficiente para el volumen de Beta (3-5 Partners) — el token no es adivinable, el enlace no permite ninguna operación destructiva, y no expone datos de otros Partners ni de usuarios de VIAO fuera de lo agregado por `partner_id`.
- **Esta es una solución exclusivamente Beta** (`LOCKED`, P7) — no debe interpretarse como arquitectura definitiva para V1/V2. La arquitectura de autenticación de Partner para V1+ permanece explícitamente `OPEN`, no decidida por este documento.

---

## 12. Anti-fraud (`PROPUESTO`, reutilización exclusiva de patrones existentes)

| Riesgo | Mitigación técnica reutilizada |
|---|---|
| Reintento/doble-submit del mismo evento | `UNIQUE(attempt_id)` + comprobación bajo lock — mismo patrón que `redeem_reward()` |
| Múltiples Actividades del mismo `(usuario, Partner)` en poco tiempo | Kill-switch diario por `COUNT`, mismo principio que el techo mensual de `complete_mission()` — **máximo 2 Actividades/día por `(user_id, partner_id)`, medido en Actividades, no en Points (`LOCKED`, P3)**. Al superarse, bloquea la Actividad por completo (sección 10, paso 4) |
| Abuso de Points a nivel de sistema | Kill-switch mensual con `pg_advisory_xact_lock(hashtext('viao_partners_pool'))`, pool propio e independiente de Missions/Rewards — **3000 Points/mes, reset mensual (`LOCKED`, P4)**. Al superarse, la Actividad se registra igualmente con `points_awarded = 0`, sin emitir `rewards_transaction` (`LOCKED`, P5 — sección 10, pasos 7-9) |
| Partner declarando ventas inexistentes | **No resuelto técnicamente en Beta — riesgo aceptado explícitamente** (Master V2, sección 14). Se resuelve con evidencia verificable en V1.1+ (OCR) |
| Staff introduciendo un importe incorrecto | **No resuelto técnicamente en Beta — riesgo aceptado explícitamente**, mismo motivo |

No se diseña ninguna arquitectura antifraude nueva — todo lo anterior reutiliza mecanismos ya auditados en Rewards/Missions/Booking.

---

## 13. Backend responsibilities (`PROPUESTO`)

- Un único punto de escritura para Partners, mismo criterio que `create-reward-transaction.ts` para Rewards: toda creación de Actividad pasa por el RPC de la sección 10, invocado desde una Server Action que ya resolvió `auth.getUser()` antes de llamar (mismo patrón que Missions/Rewards — `p_user_id` nunca es "lo que el cliente dice que es").
- Lectura del panel del Partner (sección 15): agregaciones `SUM`/`COUNT` sobre `partner_activities`, ejecutadas server-side vía `service_role` — sin necesidad de ninguna tabla de analytics dedicada (coherente con el Master V2, sección "no dashboards sin volumen").

---

## 14. Dashboard data contract (`PROPUESTO`, solo datos — sin UI)

```
GET (server-side) datos-de-panel-de-partner(partner_id):
  ventas_declaradas_eur      = SUM(declared_amount_eur) WHERE amount_confidence='declared'
  ventas_confirmadas_reserva_eur = SUM(declared_amount_eur) WHERE amount_confidence='confirmed_by_reservation'
  clientes_nuevos             = COUNT(DISTINCT user_id cuya PRIMERA Actividad con este partner_id
                                 cae en el período consultado)
  clientes_recurrentes        = COUNT(DISTINCT user_id con ≥2 Actividades con este partner_id
                                 en el período consultado)
  actividad_reciente          = últimas N filas de partner_activities para este partner_id
  partner_activo              = EXISTS(Actividad con este partner_id en los últimos 14 días)
```

Sin vanity metrics (seguidores, badges, visitas de página sin conversión) — coherente con Master V2 sección 10.

---

## 15. Metrics — verificación de que el modelo las soporta (`PROPUESTO`)

| Métrica LOCKED (Master V2) | Calculable con este modelo |
|---|---|
| Partners activos | `COUNT(partners)` con ≥1 Actividad en 14 días — sí, directo sobre `partner_activities` |
| Tiempo de onboarding | `MIN(partner_activities.created_at) − partners.created_at`, por Partner — sí |
| Clientes nuevos atribuidos | Ver sección 14 — sí |
| Ventas declaradas/confirmadas € | `SUM(declared_amount_eur)` agrupado por `amount_confidence` — sí, y con la distinción de nivel de confianza ya incorporada en el propio schema |
| Recurrencia | `COUNT` de usuarios con ≥2 Actividades por Partner, sobre el total de clientes de ese Partner — sí |
| Retención del Partner a 60 días | Booleano derivado de `partner_activities.created_at` en la ventana correspondiente — sí |

Ninguna métrica adicional requiere una tabla o columna no ya cubierta en las secciones 5-6.

---

## 16. State machines (`PROPUESTO`, deliberadamente mínimas)

- **`partners.status`**: `active` ⇄ `inactive` — transición libre, gestionada manualmente por `service_role` (alta manual/curada), sin trigger de protección (no hay campo económico inmutable que proteger aquí, a diferencia de `goals`).
- **`partner_activities`**: **sin state machine** — cada fila nace ya en su estado final (append-only), por diseño (sección 6). No hay transición porque no hay estado. `points_awarded` no introduce una máquina de estados: se decide una única vez en el INSERT (sección 10, paso 8) y no cambia después — `0` no es un estado "pendiente", es un valor final.

No se diseña ninguna máquina de estados para QR/reserva como entidades propias — no lo son; son solo el valor de `attribution_mechanism` sobre una Actividad ya creada.

---

## 17. Error / retry behavior (`PROPUESTO`, resumen consolidado de las secciones 8 y 10)

| Escenario | Comportamiento definido |
|---|---|
| Usuario/Partner pulsa dos veces | Mismo `attempt_id` → misma fila devuelta, sin duplicar |
| Retry de red tras timeout | Igual — idempotencia por `attempt_id` |
| Dos requests simultáneas (concurrencia real) | Serializadas por `pg_advisory_xact_lock` — nunca ambas pasan el kill-switch a la vez |
| Activity registrada sin Reward (pool mensual agotado) | **Comportamiento esperado y aprobado (`LOCKED` P5)** — `points_awarded = 0`, sin fila en `rewards_transactions`. No es un fallo |
| Reward creada pero la request de Activity se repite | Imposible de forma independiente — mismo razonamiento que arriba, cubierto por `attempt_id` |
| Kill-switch diario superado | La función `raise exception` **antes** de insertar nada — ninguna fila parcial (bloqueo completo, `LOCKED` P3) |
| Kill-switch mensual (pool de Points) superado | **No** hay `raise exception` — la Actividad se inserta igualmente con `points_awarded = 0` (`LOCKED` P5), solo se omite el INSERT en `rewards_transactions` |

---

## 18. Future OCR compatibility (`NO IMPLEMENTADO`, solo verificación de que el modelo lo permite)

El modelo de `amount_confidence` (`'declared'` | `'confirmed_by_reservation'`) está diseñado para aceptar un tercer valor futuro (`'validated'`) sin ningún cambio estructural — solo una ampliación del `CHECK` y, entonces, un campo adicional de referencia a la evidencia (`NO IMPLEMENTADO` ahora, ni siquiera nombrado en firme). No se diseña ningún proveedor OCR, ningún flujo de imagen, ningún almacenamiento de recibo en este documento.

---

## 19. Migration scope — NOT IMPLEMENTED

*(Diseño únicamente — ninguna de estas migraciones se crea en este turno)*

1. `create_partners.sql` — tabla `partners` (sección 5), `enable row level security`, sin policies de cliente, `grant select, insert, update to service_role`.
2. `create_partner_activities.sql` — tabla `partner_activities` (sección 6, incluye `points_awarded integer NOT NULL DEFAULT 0`), índices sobre `partner_id`, `user_id`, `created_at`; `UNIQUE(attempt_id)`; `enable row level security`, sin policies de cliente, `grant select, insert to service_role`.
3. `create_complete_partner_activity_rpc.sql` — función `SECURITY DEFINER` (sección 10), `revoke ... from public, anon, authenticated`, `grant execute to service_role`.

Ninguna migración toca `rewards_transactions`, `bookings`, `booking_intents`, `mission_completions` ni ninguna tabla existente.

---

## 20. Open questions

| # | Pregunta | Estado | Bloquea Beta técnicamente |
|---|---|---|---|
| 1 | % de comisión (Master V2 O1) | `OPEN` | No |
| 2 | Umbral de resultado sostenido (Master V2 O2) | `OPEN` | No |
| 3 | OCR V1 vs V1.1 (Master V2 O3) | `OPEN` | No |
| 4 | Cuota Premium/Pro (Master V2 O4) | `OPEN` | No |
| 5 | Tasa de Points por euro declarado (sección 10, paso 6) | **`LOCKED` P1/P2 — 2 Points/€ (confirmed_by_reservation), 1 Point/€ (declared)** | Resuelta |
| 6 | Umbral del kill-switch diario por `(usuario, Partner)` (sección 12) | **`LOCKED` P3 — 2 Actividades/día** | Resuelta |
| 7 | Umbral del kill-switch mensual del pool de Partners, incl. comportamiento al agotarse (sección 12) | **`LOCKED` P4/P5 — 3000 Points/mes; Actividad se registra igualmente con `points_awarded=0`** | Resuelta |
| 8 | Modelo de acceso del Partner a su panel (sección 11.4) | **`LOCKED` P7 — token opaco sin login, exclusivo Beta** | Resuelta |

Fuente de las resoluciones 5-8: Decision Lock Económico Final, aprobación explícita del propietario — 25/08/2026. Ver Sección 25 (Decision Register).

---

## 21. Implementation prerequisites

Antes de escribir la primera migración real:
1. ~~Cerrar las preguntas 5-7 de la sección 20 (tasas/umbrales)~~ — **Resuelto** (`LOCKED` P1-P6, 25/08/2026).
2. ~~Decidir 11.4 (acceso del Partner)~~ — **Resuelto** (`LOCKED` P7, 25/08/2026); "Backend responsibilities" (sección 13) no necesita más que agregaciones server-side, sin autenticación de Partner separada.
3. Aprobación explícita de Andrés sobre este documento en su conjunto. **Parcialmente satisfecho**: P1-P8 (parámetros económicos, comportamiento del pool mensual, acceso Beta, neutralidad FREE/PREMIUM) están `LOCKED` con aprobación explícita (Decision Lock Económico Final, 25/08/2026). Las preguntas 1-4 de la sección 20 (comisión V1, umbral de resultado sostenido, OCR, pricing Premium) permanecen `OPEN` — no bloquean la primera migración (ver tabla, sección 20), pero sí deben resolverse antes de V1.

---

## 22. Final architecture diagram

```
                    ┌─────────────┐
                    │   partners   │  (nueva tabla, Patrón B lectura)
                    └──────┬──────┘
                           │ partner_id
                           ▼
Usuario ──QR/Reserva──▶ ┌──────────────────────┐
                        │ complete_partner_      │  RPC SECURITY DEFINER
                        │ activity()             │  (patrones de
                        │  - lock pool Partners   │   complete_mission(),
                        │  - idempotencia attempt_id  con emisión de Points
                        │  - kill-switch diario   │  desacoplada — P5)
                        │  - kill-switch mensual  │
                        └──────┬─────────┬───────┘
                               │         │
                    (misma transacción; INSERT en partner_activities
                     SIEMPRE, INSERT en rewards_transactions SOLO si
                     hay margen en el pool mensual — LOCKED P5)
                               │         │
                               ▼         ▼ (condicional, P5)
                  ┌────────────────┐  ┌───────────────────────┐
                  │partner_activities│  │  rewards_transactions  │  (EXISTENTE,
                  │  (nueva tabla,   │  │  reason='partner_      │   sin cambios
                  │   append-only,   │  │  activity'              │   de estructura)
                  │   points_awarded)│  └───────────┬────────────┘
                  └────────────────┘
                                                    │
                                                    ▼
                                          rewards_wallets (view, EXISTENTE)
                                                    │
                                                    ▼
                                    calculateGoalProgressPercent() (EXISTENTE,
                                    sin cambios — el Goal ya progresa con
                                    cualquier Points del wallet, sin importar
                                    su origen)
```

---

## 24. FREE/PREMIUM — Nota de extensibilidad futura (`LOCKED` la neutralidad arquitectónica — P8, Decision Lock Económico Final, 25/08/2026; el diseño de Premium en sí permanece `FUTURE`/`OPEN`, nada implementado ni diseñado en detalle)

VIAO tendrá en el futuro dos tipos de usuario (FREE / PREMIUM mediante suscripción). Esta sección documenta, sin diseñar nada, que **Partners Beta permanece completamente neutral respecto a esa segmentación** — no porque se haya excluido deliberadamente algo ya existente, sino porque **el concepto de tier/suscripción no existe hoy en ningún punto del schema de VIAO** (verificado por auditoría directa: cero referencias a tier/premium/subscription/plan/membership en `supabase/migrations/`, y `profiles` — `20260817140000_create_profiles.sql` — no tiene ningún campo de este tipo).

**Por qué esta Technical Spec no bloquea introducir Premium después**:
- Ni `partners` ni `partner_activities` (secciones 5-6) tienen ningún campo, constraint ni relación dependiente de tier de usuario.
- La tasa de Points por euro y ambos kill-switches (preguntas `OPEN` #5-#7, sección 20) se calculan dentro de la lógica procedural de `complete_partner_activity()` (sección 10) — igual que el techo de `complete_mission()` es una variable declarada en la función, no una columna de tabla. Un futuro multiplicador o umbral diferenciado por tier sería un cambio interno a esa función en una migración futura, no una reestructuración de las tablas de Partners.
- El modelo económico de Partners (lo que paga el **Partner** a VIAO — comisión/SaaS, Master V2 sección 15) y un futuro Premium (lo que pagaría el **usuario final** a VIAO) son dos ejes de monetización independientes (B2B vs. B2C) sin dependencia estructural entre sí.

**`OPEN` / `FUTURE`, explícitamente no resuelto aquí ni en ningún otro documento**:
- Dónde vivirá el propio concepto de tier de usuario (columna en `profiles`, tabla `subscriptions` nueva, u otro mecanismo) — no es una decisión de Partners, queda fuera de alcance de este documento.
- Si un futuro multiplicador Premium se aplicará *sobre* la tasa Points-por-euro que se fije para Partners (pregunta `OPEN` #5) o de forma independiente — nota de contexto para quien resuelva esa pregunta, no una restricción nueva.
- Cualquier beneficio Premium relacionado con Partners (multiplicadores, Partners exclusivos, mejores condiciones) — **no diseñado, no propuesto, sin cifras ni porcentajes** — la dirección posible descrita conceptualmente por el propietario queda registrada aquí solo como referencia futura, no como especificación.

**No se crea ninguna tabla, columna, migración ni lógica para Premium en este documento ni en ningún código.**

---

## 25. Decision Register — Parámetros económicos y acceso Beta (P1-P8)

Fuente única para todas las filas: **Aprobación explícita del propietario — 25/08/2026** (Decision Lock Económico Final). Resuelve las preguntas 5-8 de la Sección 20.

| ID | Decisión | Estado | Sección de referencia |
|---|---|---|---|
| P1 | Points/€ para `confirmed_by_reservation` = 2 | `LOCKED` | Sección 10, paso 6 |
| P2 | Points/€ para `declared` = 1 | `LOCKED` | Sección 10, paso 6 |
| P3 | Kill-switch diario = 2 Actividades por `(user_id, partner_id, día)`, medido en Actividades | `LOCKED` | Sección 10, paso 4; Sección 12 |
| P4 | Pool mensual de Partners = 3000 Points/mes, independiente de Rewards/Missions/Referidos, reset mensual | `LOCKED` | Sección 10, paso 7; Sección 12 |
| P5 | Al agotarse el pool mensual: la Actividad se registra igualmente, no se interrumpe la captura, no se inserta `rewards_transaction`, `points_awarded=0`, sin backfill posterior ni emisión retroactiva | `LOCKED` | Sección 10, pasos 8-9; Sección 17 |
| P6 | `partner_activities.points_awarded integer NOT NULL DEFAULT 0` — Points realmente otorgados; no representa Points pendientes ni prometidos; no implica deuda futura de VIAO | `LOCKED` | Sección 6 |
| P7 | Acceso Partner Beta: enlace único, token opaco (`access_token`), sin Supabase Auth, sin contraseña, sin sistema de usuarios Partner — exclusivo Beta, no es arquitectura definitiva para V1/V2 | `LOCKED` | Sección 11.4 |
| P8 | Partners Beta arquitectónicamente neutral respecto a FREE/PREMIUM — sin `tier_id`, sin `premium_multiplier`, sin lógica condicionada a Premium en Beta | `LOCKED` | Sección 24 |

**Permanecen `OPEN`** (no cerradas por este Decision Lock, ver Sección 20, preguntas 1-4): % de comisión V1, umbral de resultado sostenido, OCR V1 vs V1.1, pricing Premium/Pro, arquitectura definitiva de autenticación Partner para V1+, eventual multiplicador Premium, ubicación futura del concepto de tier de usuario.

---

## Documentos relacionados

- `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` — fuente de verdad de producto/negocio.
- `docs/VIAO_PARTNERS_MASTER.md` — v1, histórica.
- `supabase/migrations/20260817140005_create_rewards_transactions.sql`, `20260824100000_create_mission_completions.sql`, `20260824101000_create_complete_mission_rpc.sql`, `20260820120000_create_booking_intents.sql`, `20260823152000_create_redeem_reward_rpc.sql` — patrones reutilizados, todos leídos directamente para este documento.
- `lib/rewards/create-reward-transaction.ts` — patrón de referencia (no el mecanismo final para Partners, que necesita RPC con lock/kill-switch).

---

**Fin del documento. Ningún código, componente, migración, configuración de Supabase, RLS, tabla, campo, dependencia ni ruta fue creado o modificado para producir este documento.**

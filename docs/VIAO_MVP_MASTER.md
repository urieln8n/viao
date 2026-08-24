# VIAO — MVP MASTER
## Official Product & Engineering State

> Este documento es la referencia operativa global del estado actual de VIAO. Consolida decisiones aprobadas, estado real del código, documentación, tests, bloqueos y próximos pasos. No sustituye los Decision Locks ni documentos técnicos especializados — ver sección "Documentos especializados" al final.

**Última auditoría:** 2026-08-24
**Último commit auditado:** `25bde807a60d2a37355b5f123a08d9d4c76a6628` — "feat: complete missions v1" (este documento se actualiza inmediatamente antes del commit `feat: implement goals v1 wallet balance`, que lo sucede — ver Git Checkpoint para el hash exacto una vez creado)
**Branch:** `main`
**Estado Git:** `ahead 3` de `origin/main` en el momento de esta edición (pasará a `ahead 4` tras el commit de este bloque), sin push.
**Estado global MVP:** `[PARCIAL]` — Core + Rewards + Goals (WALLET_BALANCE, aprobado e implementado en este bloque) + Missions implementados y probados; Partners no iniciado; Hotelbeds congelado externamente.

---

## ¿Qué es VIAO?

Plataforma de viajes + loyalty + fintech ligera. Tesis de producto: *"Tu actividad cotidiana te acerca a tu próximo viaje."* Loop V1 aprobado:

```
USUARIO → ELIGE OBJETIVO → ACTIVIDAD COTIDIANA → PARTNERS →
COMPRA ATRIBUIDA → VIAO GENERA COMISIÓN → POINTS →
GOAL (guardar) / REWARD (canjear) → REPETIR
```

Dirección de producto: **Travel Premium + Fintech + Loyalty** — explícitamente no una OTA genérica, no una app de puntos infantil, no gamificación. Proyecto exclusivo de Andrés (`fa.andres18@hotmail.com` / usuario Git `urlen8n`).

---

## Estado del MVP — tabla global

| Área | Estado real | Estado producto | Tests | Dependencias | Próximo paso |
|---|---|---|---|---|---|
| Core (Search/Booking/Trips/Auth/Profiles) | `[IMPLEMENTADO]` | `[IMPLEMENTADO]` | Sí, verdes | Supabase, `MockHotelProvider` | Ninguno en este ciclo |
| Rewards (Wallet/Ledger/Catálogo/Canje) | `[IMPLEMENTADO]` | `[IMPLEMENTADO]`, commiteado | Sí, verdes | `rewards_transactions` | Auditar antes de tocar (no reconstruir) |
| Goals — código | `[IMPLEMENTADO]` (modelo WALLET_BALANCE) | `[IMPLEMENTADO]` — decisión aprobada (`VIAO_GOALS_V1_DECISION_LOCK.md`) | Sí, verdes (reescritos para WALLET_BALANCE + auto-cancelación + concurrencia) | `rewards_transactions` (lectura de saldo), Rewards | Ninguno — `GOAL_COMPLETION_SEMANTICS` sigue abierta, sin bloquear nada |
| Missions | `[IMPLEMENTADO]`, commiteado (`25bde80`) | `[IMPLEMENTADO]` | Sí, 14 tests verdes | Ledger, eventos reales | Ninguno — E2E visual `[BLOQUEADO EXTERNAMENTE]` |
| Vision / VIAO Scan | `[IMPLEMENTADO]` | `[IMPLEMENTADO]`, fuera del loop económico principal | Sí, verdes | Storage, OpenAI (config) | Ninguno — se mantiene funcional, no se diseña alrededor |
| Referidos | `[IMPLEMENTADO]` | `[IMPLEMENTADO]` | Sí, verdes | Ledger, trigger de registro | Ninguno en este ciclo |
| Partners | `[PENDIENTE]` | `[DECISIÓN PENDIENTE]` (mecanismo QR/atribución sin formalizar) | N/A | Ledger, Rewards | Formalizar mecanismo antes de diseñar código |
| Antifraude / Caducidad | `[PENDIENTE]` | `[DIFERIDO]` (fase posterior a Partners) | Parcial (`lib/rate-limit/` existe, no aplicado a Points) | Partners | Ninguno hasta cerrar Partners |
| Hotelbeds | `[PARCIAL]` (código existe, inactivo) | `[BLOQUEADO EXTERNAMENTE]` | Sí (aislados, sin red real) | Respuesta de Hotelbeds al caso `#60019483` | Ninguno hasta respuesta oficial |
| Flights | `[NO AUTORIZADO]` | `[DIFERIDO]` | N/A | — | Ninguno |
| Destinations (catálogo Hotelbeds) | `[IMPLEMENTADO]`, sin commit | `[IMPLEMENTADO]` | Sí, verdes | Hotelbeds Content API | Pendiente de su propio commit (fuera de alcance de Missions) |

---

## Inventario funcional completo

### Core

- **Home** (`app/page.tsx`): saldo de Points, `GoalCard`, `MissionsSummary`, buscador de destinos (viaje destacado o `HomeSearchForm`). `[IMPLEMENTADO]`.
- **Search / Search Results** (`app/search/`): formulario con destino (autocomplete real vía catálogo `destinations`), fechas, huéspedes, habitaciones → `searchAction()` → `MockHotelProvider`/`HotelbedsProvider` según `TRAVEL_PROVIDER`. `[IMPLEMENTADO]`.
- **Properties** (`app/properties/[id]/`): detalle de alojamiento, `hotel_viewed` analítica + Mission. `[IMPLEMENTADO]`.
- **Booking** (`app/booking/[propertyId]/`): flujo de reserva con `booking_intents` (idempotencia/concurrencia), Points por reserva confirmada (2%). `[IMPLEMENTADO]`.
- **Trips** (`app/trips/`): viajes del usuario, fotos, detalle. `[IMPLEMENTADO]`.
- **Authentication** (`app/(auth)/`: login, register, recover): Supabase Auth, `enable_confirmations=false` en local (sesión inmediata tras `signUp`). Registro redirige a `/onboarding` (Goal opcional, "Ahora no" disponible). `[IMPLEMENTADO]`.
- **Profiles**: tabla `profiles` + trigger `handle_new_user()` (bono de registro 100 Points, código de referido). `[IMPLEMENTADO]`.

### Rewards

- **Wallet**: `rewards_wallets` (view, `security_invoker=true`, `SUM(rewards_transactions.amount) GROUP BY user_id`) — nunca una tabla con saldo editable.
- **Ledger**: `rewards_transactions`, único escritor de aplicación real (`lib/rewards/create-reward-transaction.ts`, `service_role`, sin GRANT de escritura para `authenticated`/`anon`). Missions usa su propio RPC `SECURITY DEFINER` con el mismo aislamiento, nunca escribe por otra vía.
- **Points**: `100 Points = 1€` (`[CONFIRMADO EN CÓDIGO]`), bono de registro 100 Points (`[CONFIRMADO EN CÓDIGO]`).
- **Rewards Catalog** (`rewards_catalog`): `funding_type` (`'viao'`/`'partner'`), `real_cost_eur` (obligatorio si `funding_type='viao'`), `partner_name` (texto libre — **no existe todavía una tabla `partners`, no hay FK**).
- **Redemption** (`reward_redemptions` + RPC `redeem_reward()`): lock de usuario + lock global del pool VIAO (`pg_advisory_xact_lock`), idempotencia por `redemption_attempt_id`, kill-switch mensual (100,00€, `[CONFIRMADO EN CÓDIGO]`).
- **Cancellation / Refund** (RPC `cancel_redemption()`): `pending→cancelled` + refund append-only (`reason='redemption_refund'`), idempotente, rechaza cancelar una `fulfilled`.
- **Idempotencia/Concurrencia/Kill-switch/RLS**: `[IMPLEMENTADO]` y probado con tests de concurrencia real.

### Goals

**`GOAL_PROGRESS_MODEL = WALLET_BALANCE` — aprobado por el propietario e implementado** (`docs/VIAO_GOALS_V1_DECISION_LOCK.md`, estado `APPROVED / IMPLEMENTED`):

- **Progreso**: `progress_percent = min(100, round(wallet_balance / target_points * 100))` — `calculateGoalProgressPercent()` (`lib/goals/calculate-progress.ts`, función pura, sin dependencias `next/headers`, separada de `get-goal.ts` a propósito para no romper el bundle de Client Components). Earn sube el progreso, redeem lo baja, refund lo devuelve — sin ninguna excepción por `reason`.
- **Creación**: Patrón A (RLS directa, `goals_insert_own`), sin cambios. Trigger `set_goal_points_at_creation()` sigue congelando `points_at_goal_creation`, pero esa columna **ya no participa en el cálculo de progreso** (se conserva sin uso, no se eliminó).
- **Auto-cancelación**: **implementado**. Nuevo trigger `BEFORE INSERT` `cancel_active_goal_before_insert()` (`supabase/migrations/20260824110000_goals_auto_cancel_active_on_create.sql`) cancela automáticamente el Goal `active` anterior del mismo usuario antes de insertar el nuevo — no fue necesario modificar `protect_goal_immutable_fields()` (ya permitía `active→cancelled` sin importar el origen del UPDATE). Verificado con un test de concurrencia real (`Promise.all`): nunca dos Goals `active` simultáneos.
- **Cancelación manual**: sin cambios (`cancelGoal()`).
- **Relación con Wallet**: `app/goal-card.tsx` muestra ahora una única cifra ("Disponible ahora: {wallet} / {target} Points") — las dos filas anteriores ("Ganado para tu objetivo" / "Disponible ahora") se colapsaron en una, porque bajo WALLET_BALANCE son el mismo número.
- **Relación con Rewards**: canjear reduce visiblemente el progreso; un refund lo devuelve — consecuencia real de la bifurcación GUARDAR/REDEEM del loop V1. `lib/rewards/` no se modificó (ya escribía correctamente el ledger).
- **Múltiples Goals**: con el trigger de auto-cancelación, un segundo Goal ya no se rechaza — cancela al anterior. `already_has_active_goal` (`23505`) sigue siendo posible solo en el caso residual de dos creaciones concurrentes cuando el usuario no tenía ningún Goal previo.
- **Estado `completed`**: sigue **imposible** — `protect_goal_immutable_fields()` no se tocó, sigue bloqueando explícitamente cualquier transición a `completed`. "Meta alcanzada" es un estado puramente derivado en lectura (progreso llegando a 100%), nunca persistido. `GOAL_COMPLETION_SEMANTICS` sigue **`OPEN / DERIVED ONLY / NO AUTOMATIC PERSISTENCE`**.
- **Expiración** (`target_date` pasada): sin lógica automática — sin cambios, coincide con lo esperado en V1.

Tests reescritos: `lib/goals/get-goal.test.ts` (8 tests nuevos, casos A-J de la matriz aprobada, extremo a extremo contra Rewards real), `lib/goals/create-goal.test.ts` (auto-cancelación K, concurrencia real L). `lib/goals/cancel-goal.test.ts` sin cambios, sigue verde.

### Missions (post-commit `25bde80`)

4 Missions, todas hardcodeadas (sin motor configurable):

| Mission key | Points | Periodicidad | Wireada en | Estado |
|---|---|---|---|---|
| `search_started` | 10 | Semanal (`isoWeekKey`) | `app/search/actions.ts` (hook presente EN WORKING TREE, **no commiteado** — quedó fuera del commit de Missions por estar entrelazado con trabajo de Hotelbeds/Destinations no autorizado en ese commit) | Código listo, **pendiente de commit** |
| `return_visit` | 10 | Semanal | `lib/analytics/record-return-visit.ts` | `[IMPLEMENTADO]`, commiteado |
| `hotel_viewed` | 10 | Semanal | `app/properties/[id]/resolve.ts` | `[IMPLEMENTADO]`, commiteado |
| `goal_created` | 50 | `lifetime` (anti-farming: `period_key` fijo) | `lib/goals/create-goal.ts` | `[IMPLEMENTADO]`, commiteado |

**`vision_used` NO forma parte de Missions V1.** Razón documentada: `docs/VIAO_V1_LOOP_DECISION.md` (versión anterior) lo proponía como candidato; el `VIAO_V1_EXECUTION_LOCK.md` fijó explícitamente que Vision no es una dependencia del loop económico de Missions V1 — decisión definitiva, no un olvido pendiente de corregir.

- **RPC `complete_mission()`**: `SECURITY DEFINER`, `search_path=''`, invocable solo por `service_role`.
- **RLS**: `mission_completions` — SELECT propio para `authenticated`; SELECT+INSERT para `service_role` (nunca UPDATE/DELETE).
- **Idempotencia**: `UNIQUE(user_id, mission_key, period_key)` a nivel de constraint real.
- **Anti-farming**: `period_key='lifetime'` para `goal_created` — verificado con test dedicado (3 disparos reales del evento → 1 sola fila).
- **Concurrencia**: advisory lock global (`hashtext('viao_missions_pool')`), probado con 10 llamadas `Promise.all` reales → exactamente 1 completion + 1 transacción.
- **Kill-switch**: 3000 Points/mes, independiente del pool de Rewards.
- **Tests**: 14, todos verdes (detalle: Checkpoint técnico previo).
- **E2E**: `[PENDIENTE / BLOQUEADO POR TOOLING]`. **No declarado PASS.** Diagnóstico: el crash ocurre en el propio daemon del navegador (`browse`), incluso sin interacción con Search — no es atribuible a código de VIAO.

### Vision / VIAO Scan

Existe, está completo, y **no se elimina, no se oculta, no se rompe**. Flag `VISION_ENABLED` (`lib/openai/config.ts`). Código: `lib/vision/` (consentimiento, registro de escaneo, validación de imagen, borrado — 4 archivos + 4 test files, todos verdes), `app/vision/` (página + Server Actions + vista). Tabla `vision_scans` (RLS: lectura/inserción propia, sin UPDATE de cliente — `image_retained` solo vía trigger; sin DELETE de cliente). Decisión vigente (`VIAO_V1_EXECUTION_LOCK.md`): **Vision permanece como activo diferenciado de VIAO, pero no es una dependencia del loop económico de Missions V1** — ninguna Mission depende de `vision_used`, y no se crean Missions basadas en Vision en esta etapa.

### Partners

`[PENDIENTE]` — cero código implementado. No existe tabla `partners`; `rewards_catalog.partner_name` es texto libre, no una FK. Modelo conceptual fijado (no implementado):

```
PARTNER → QR → COMPRA ATRIBUIDA → COMISIÓN → POINTS
```

Dos métricas económicas que **no deben confundirse**:
1. Co-financiación Partner/Reward (50% Partner / 50% VIAO en el canje) — `[DECISIÓN APROBADA, VIAO_V1_LOOP_DECISION.md, no implementada en código]`.
2. `POINTS_PERCENTAGE_OF_COMMISSION = 0.25` (25%, no 50%) — `[CONFIRMADO EN CÓDIGO, lib/rewards/rules.ts, pero sin ningún flujo real que lo ejercite todavía]`.

**`[DECISIÓN PENDIENTE / POR FORMALIZAR]`**: el mecanismo exacto de atribución QR (validación antifraude en el momento de la visita, quién confirma el importe, qué pasa ante disputa) no está formalizado en ningún documento. No se inventan detalles adicionales.

### Hotelbeds

Estado: 🟡 **CONGELADO** — caso `#60019483` (`docs/HOTELBEDS_CERTIFICATION_STATUS.md`). `MockHotelProvider` es el único provider activo en local (`TRAVEL_PROVIDER` sin definir → fail-safe a mock, `lib/travel-provider/index.ts`). Código de `HotelbedsProvider` existe y tiene tests aislados (sin red real), pero está inactivo. **`[BLOQUEADO EXTERNAMENTE]`** — cero llamadas reales, sin tocar credenciales/certificados/endpoints/Vercel/producción hasta respuesta oficial de Hotelbeds. Trabajo de catálogo de Destinations (`lib/destinations/`, `lib/hotelbeds/destinations*.ts`, `lib/hotelbeds/sync-destinations.ts`) ya implementado y probado, pero **sin commit todavía** — no forma parte de Missions ni de este documento's alcance de decisión.

### Flights

`[NO AUTORIZADO]` / `[DIFERIDO]`. Cero código.

### Referidos

`[IMPLEMENTADO]`. Código: `lib/referrals/rules.ts` (+ test), `lib/referrals/complete-referral-action.ts` (+ test), `lib/referrals/referral-registration.test.ts`. Tabla `referrals` (migración `20260817140007`), código de referido generado en el trigger `handle_new_user()`, recompensa vía `createRewardTransaction()` (`reason='referral_created'`, idempotencia por `UNIQUE(user_id, reason, reference_type, reference_id)`, permite recompensar a referrer y referred sobre la misma referral — hallazgo empírico F8-04). Wireado en `app/(auth)/register/page.tsx` (aceptar código al registrarse), `app/profile/page.tsx` (mostrar código propio), `app/rewards/page.tsx`, `app/booking/actions.ts`. Missions V1 **no** incluye `referral_created` deliberadamente (ya genera recompensa propia sustancial — evita doble recompensa por la misma acción).

---

## Database — schema real vigente

`docs/VIAO_DATABASE.md` y `docs/VIAO_ARCHITECTURE.md` son **`[DOCUMENTACIÓN HISTÓRICA / DESACTUALIZADA]`** (17 de agosto de 2026, anteriores a los bloques de Rewards/Goals/Missions/Destinations de los días 23-24). No se modifican en este documento. El schema real vigente es el de las 41 migraciones en `supabase/migrations/`.

**Tablas originales/fundacionales** (17 de agosto): `profiles`, `trips`, `properties`, `searches`, `bookings`, `rewards_transactions`, `referrals`, `vision_scans`, `photos`, `analytics_events`, `ai_rate_limit_events`.

**Tablas/vistas añadidas después** (bloques V1, 20-24 de agosto):
- `booking_intents` (idempotencia/concurrencia de reservas).
- `destinations` (catálogo Hotelbeds, sin commit todavía).
- `rewards_catalog`, `reward_redemptions` (Bloque Rewards).
- `goals` (Bloque Goals).
- `mission_completions` (Bloque Missions).

**Vistas**: `rewards_wallets` (`security_invoker=true`, sobre `rewards_transactions`).

**RPCs `SECURITY DEFINER` invocables vía `.rpc()`** (patrón compartido, distinto de los triggers): `redeem_reward()`, `cancel_redemption()`, `complete_mission()`.

**Triggers `SECURITY DEFINER`**: `handle_new_user()` (registro, bono, código de referido), `set_goal_points_at_creation()`, `protect_goal_immutable_fields()`.

---

## Security / RLS

Dos patrones arquitectónicos consistentes en todo el proyecto:

- **Patrón A — RLS directa**: el cliente autenticado lee/escribe su propia fila bajo policies `USING/WITH CHECK (user_id = auth.uid())`. Usado en `trips`, `goals`, `vision_scans` (lectura/inserción propia). Apropiado para metadata de producto de bajo riesgo, sin implicación económica directa en la escritura.
- **Patrón B — `service_role` + RPC `SECURITY DEFINER`**: usado para toda operación con implicación económica real (`rewards_transactions`, `redeem_reward()`, `cancel_redemption()`, `complete_mission()`). El cliente nunca tiene GRANT de escritura directa; el RPC valida el usuario real (resuelto server-side vía `auth.getUser()` por quien invoca, nunca confiado del payload del cliente).

**Seguridad implementada** (no solo recomendada): idempotencia real vía constraints `UNIQUE` (nunca solo lógica de aplicación), locks explícitos (`FOR UPDATE`, `pg_advisory_xact_lock`) para concurrencia real, kill-switches con techo hardcodeado en SQL (fail-closed), `EXECUTE` revocado explícitamente a `public`/`anon`/`authenticated` en cada RPC sensible, ledger estrictamente append-only (ningún GRANT de UPDATE/DELETE para `service_role` en `rewards_transactions`/`mission_completions`).

**Storage**: buckets + políticas propias (migraciones `20260817160000`/`170000`/`20260818180000`/`20260819100000`) — ownership reforzado sobre el path de inserción, no solo sobre el nombre de bucket.

---

## Economía vigente

| Cifra | Valor | Estado |
|---|---|---|
| Points por euro | 100 Points = 1€ | `[CONFIRMADO EN CÓDIGO]` — `lib/rewards/rules.ts` |
| Reward por reserva confirmada | 2% del importe | `[CONFIRMADO EN CÓDIGO]` — `HOTEL_BOOKING_REWARD_RATE` |
| Bono de registro | 100 Points | `[CONFIRMADO EN CÓDIGO]` — trigger `handle_new_user()` |
| % comisión Partner → Points | 25% (`POINTS_PERCENTAGE_OF_COMMISSION`) | `[CONFIRMADO EN CÓDIGO]`, pero sin flujo real que lo ejercite — no confundir con la co-financiación 50/50 |
| Coste real máx. de un Reward `funding_type='viao'` | 30% del valor nominal | `[CONFIRMADO EN CÓDIGO]` — `MAX_REWARD_REAL_COST_PERCENT` + CHECK real en `rewards_catalog` |
| Techo mensual pool Rewards (VIAO) | 100,00€ | `[CONFIRMADO EN CÓDIGO]` — kill-switch SQL real |
| Techo mensual pool Missions | 3000 Points | `[CONFIRMADO EN CÓDIGO]` — independiente del pool de Rewards |
| Co-financiación Partner/Reward | 50% Partner / 50% VIAO | `[DECISIÓN APROBADA]` — `VIAO_V1_LOOP_DECISION.md`, no implementada en código |
| Caducidad de Points (saldo) | 12-18 meses | `[HIPÓTESIS]` — no implementado. Existe `reward_redemptions.expires_at`, pero es la caducidad del código de canje, no del saldo |

---

## Roadmap real

| Fase/Bloque | Descripción | Estado | Evidencia | Dependencia | Próximo paso |
|---|---|---|---|---|---|
| Core | Search/Booking/Trips/Auth | `[IMPLEMENTADO]` | Commits previos, tests verdes | — | Ninguno |
| Rewards | Catálogo + canje + ledger | `[IMPLEMENTADO]` | Commit `e0c39ea` | — | Auditar antes de tocar |
| Goals — código | Creación/cancelación/progreso WALLET_BALANCE + auto-cancelación | `[IMPLEMENTADO]` | Commits `e0c39ea`/`76f0947` + commit `feat: implement goals v1 wallet balance` | Rewards | — |
| Goals — modelo V1 | WALLET_BALANCE | `[IMPLEMENTADO]` | `VIAO_GOALS_V1_DECISION_LOCK.md` (`APPROVED / IMPLEMENTED`) | — | `GOAL_COMPLETION_SEMANTICS` sigue abierta, sin bloquear nada |
| Missions | 4 Missions mínimas | `[IMPLEMENTADO]` (3/4 commiteadas) | Commit `25bde80` | Ledger, eventos reales | Commitear hook `search_started` cuando se autorice el bloque Destinations |
| Missions E2E | Validación visual | `[BLOQUEADO EXTERNAMENTE]` | Informes de intento previos | Tooling de navegador | Ninguno — no forzar |
| Destinations | Catálogo Hotelbeds para autocomplete | `[IMPLEMENTADO]`, sin commit | Working tree | Hotelbeds Content API (evaluación) | Su propio commit, fuera de Missions |
| Partners | QR/atribución/comisión | `[PENDIENTE]` | Solo diseño conceptual | Formalizar mecanismo | No iniciar código todavía |
| Antifraude/Caducidad | Límites, detección de abuso | `[DIFERIDO]` | — | Partners | Definir después de Partners |
| Hotelbeds real | Certificación/producción | `[BLOQUEADO EXTERNAMENTE]` | Caso `#60019483` | Respuesta de Hotelbeds | Ninguno |
| Flights | — | `[NO AUTORIZADO]` | — | — | Ninguno |

---

## Git Checkpoint

```
Branch: main
HEAD (antes de este bloque): 25bde807a60d2a37355b5f123a08d9d4c76a6628 "feat: complete missions v1"
main...origin/main: ahead 3 -> ahead 4 tras el commit `feat: implement goals v1 wallet balance` (sin push)
```

Últimos commits tras este bloque (más reciente primero): `feat: implement goals v1 wallet balance` → `25bde80` (Missions) → `76f0947` (fix cancelación Goal) → `e0c39ea` (Rewards+Goals Bloque 1) → `a4c9fd7` (flujo de reserva).

**Archivos incluidos en el commit de este bloque** (Goals V1, scope estrictamente auditado): `lib/goals/get-goal.ts`, `lib/goals/create-goal.ts`, `lib/goals/calculate-progress.ts` (nuevo), `app/goal-card.tsx`, `lib/goals/get-goal.test.ts`, `lib/goals/create-goal.test.ts`, `supabase/migrations/20260824110000_goals_auto_cancel_active_on_create.sql` (nuevo), `docs/VIAO_GOALS_V1_DECISION_LOCK.md`, `docs/VIAO_MVP_MASTER.md` (este archivo).

**Resto del working tree** (sin tocar por este bloque, sigue pendiente): trabajo de Destinations/Hotelbeds ya en curso (`app/search/*`, `components/search/destination-input.tsx`, `lib/hotelbeds/*`, `lib/destinations/`, `types/travel.ts`, migración `20260823140000_create_destinations.sql`), el resto del bloque de Goal-en-onboarding (`app/(auth)/register/page.tsx`, `app/onboarding/`), otros documentos sin commitear (`docs/VIAO_V1_EXECUTION_LOCK.md`, `VIAO_V1_PRODUCT_LOOP_CHECKPOINT.md`, `VIAO_V1_LOOP_DECISION.md`, `VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md`, `HOTELBEDS_CERTIFICATION_STATUS.md`), y el artefacto de tooling `.gstack/`. `.gitignore` verificado sin alterar.

**No se hizo push.**

---

## Calidad técnica (verificado en este mismo turno, no reutilizado de auditorías previas)

| Check | Resultado |
|---|---|
| `npm test` | **747 tests, 743 pass, 0 fail, 4 skip** (+6 respecto al checkpoint anterior: reescritura de Goals para WALLET_BALANCE + auto-cancelación + concurrencia) |
| `npm run build` | ✅ compilación completa, sin errores (tras corregir un error real de límite Client/Server Component — ver informe del bloque) |
| `tsc --noEmit` | ✅ limpio |
| `eslint` | ✅ limpio |
| E2E visual (Missions) | `[PENDIENTE / BLOQUEADO POR TOOLING]` — no declarado PASS, sin cambios en este bloque |

---

## DECISIONES BLOQUEADAS / APROBADAS

| Decisión | Fecha aprox. | Documento fuente | Impacto |
|---|---|---|---|
| Missions V1 mínima (4, sin ampliar) | 2026-08-24 | `VIAO_V1_EXECUTION_LOCK.md` | No se añaden más Missions ni motor configurable |
| `vision_used` fuera de Missions V1 | 2026-08-24 | `VIAO_V1_EXECUTION_LOCK.md` (corrige propuesta anterior de `VIAO_V1_LOOP_DECISION.md`) | Vision permanece funcional pero sin acoplarse económicamente |
| Rewards no se toca/reconstruye | 2026-08-24 | `VIAO_V1_EXECUTION_LOCK.md` | Cualquier cambio futuro exige auditoría previa del ledger |
| Flights diferido | (fundacional, reafirmado) | `VIAO_V1_LOOP_DECISION.md`, `VIAO_V1_EXECUTION_LOCK.md` | Cero código |
| Hotelbeds congelado | 2026-08-23/24 | `HOTELBEDS_CERTIFICATION_STATUS.md`, `VIAO_V1_EXECUTION_LOCK.md` | Cero llamadas reales hasta respuesta del caso `#60019483` |
| E2E de Missions nunca declarado PASS | 2026-08-24 | Informes de validación E2E previos | Queda como `[PENDIENTE / BLOQUEADO POR TOOLING]` de forma permanente hasta resolverse |
| `GOAL_PROGRESS_MODEL = WALLET_BALANCE` | 2026-08-24 | `VIAO_GOALS_V1_DECISION_LOCK.md` | **`APPROVED / IMPLEMENTED`** — aprobado por el propietario e implementado en el commit `feat: implement goals v1 wallet balance` |
| `AUTO_CANCEL_ACTIVE_GOAL` (Goals) | 2026-08-24 | `VIAO_GOALS_V1_DECISION_LOCK.md` | **`APPROVED / IMPLEMENTED`** — trigger `cancel_active_goal_before_insert()` |

---

## DECISIONES QUE EL PROPIETARIO DEBE APROBAR

1. **Semántica de `completed` en Goals** — explícitamente abierta (`docs/VIAO_GOALS_V1_DECISION_LOCK.md`, sección 11: `OPEN / DERIVED ONLY / NO AUTOMATIC PERSISTENCE`).
2. **Mecanismo exacto de atribución Partner/QR** — sin formalizar en ningún documento.
3. **Cuándo se autoriza el commit del hook `search_started`** — depende de cuándo se autorice el commit del bloque Destinations/Hotelbeds (están entrelazados en `app/search/actions.ts`).
4. **`HISTORICAL_EARNED_POINTS`** (estadística separada de mérito histórico, propuesta como tercera vía en la Product Decision Master Audit) — `FUTURE / NOT V1 CORE`, no decidida.
5. **Mensaje transaccional de canje en Goals** ("Usaste 300 Points de tu objetivo Roma...") — mitigación UX recomendada en `VIAO_GOALS_V1_DECISION_LOCK.md` sección 12, no implementada (requeriría tocar la UI de Rewards/redención, fuera del scope del bloque Goals ya cerrado).

---

## NO HACER

- No tocar Rewards sin autorización explícita del turno concreto.
- No reabrir ni ampliar Missions.
- No introducir `vision_used` como Mission.
- No tocar Flights.
- No reactivar Hotelbeds sin la resolución externa del caso `#60019483`.
- No conectar un proveedor hotelero real antes de esa resolución.
- No hacer cambios de arquitectura innecesarios (p. ej. mover Goals a Patrón B sin necesidad real).
- No modificar ninguna decisión ya aprobada sin un nuevo Decision Lock explícito.
- No implementar Partners ni QR todavía.
- No crear un segundo ledger, en ningún bloque futuro.

---

# HANDOFF — PARA ABRIR UN NUEVO CHAT

1. **Qué es VIAO**: plataforma de viajes + loyalty + fintech ligera, loop `Goal → actividad → Partner → comisión → Points → guardar/canjear → repetir`. Proyecto exclusivo de Andrés.
2. **Dónde estamos**: Core, Rewards, Goals (WALLET_BALANCE, aprobado e implementado) y Missions implementados y probados. `main` va 4 commits por delante de `origin/main`, sin push.
3. **Qué acabamos de terminar**: commit `25bde80` "feat: complete missions v1", seguido de una Product Decision Master Audit sobre Goals (`docs/VIAO_GOALS_V1_DECISION_LOCK.md`), aprobada por el propietario e implementada en el commit `feat: implement goals v1 wallet balance` — nuevo modelo de progreso (`lib/goals/calculate-progress.ts`), auto-cancelación (nueva migración, trigger `cancel_active_goal_before_insert()`), tests reescritos.
4. **Estado de cada bloque**: ver tabla "Estado del MVP" al principio de este documento.
5. **Decisiones aprobadas**: ver sección "DECISIONES BLOQUEADAS / APROBADAS".
6. **Decisiones pendientes**: ver sección "DECISIONES QUE EL PROPIETARIO DEBE APROBAR" — la más urgente ahora es la semántica de `completed` en Goals.
7. **Qué está bloqueado**: Hotelbeds (externamente, caso `#60019483`), E2E visual de Missions (tooling de navegador).
8. **Qué NO debe tocarse**: ver sección "NO HACER".
9. **Próxima acción autorizada**: ver abajo.

## PRÓXIMA ACCIÓN AUTORIZADA

**Goals V1 (WALLET_BALANCE) queda cerrado** — implementado, probado, documentado. Ninguna otra acción de código está autorizada todavía por defecto. Dos vías posibles, ninguna implica a la otra: (1) resolver `GOAL_COMPLETION_SEMANTICS` (decisión abierta, sin bloquear nada mientras tanto) si se quiere avanzar ahí; (2) autorizar el commit del bloque Destinations/Hotelbeds-catálogo (que además liberaría el hook `search_started` de Missions, todavía sin commitear). Ninguna de las dos está autorizada por este documento — requiere instrucción explícita del propietario en un turno propio.

---

## Historial de cambios del Master

| Fecha | Cambio | Motivo |
|---|---|---|
| 2026-08-24 | Creación inicial de `VIAO_MVP_MASTER.md` | Consolidar por primera vez el estado real de VIAO tras el commit de Missions (`25bde80`) y la Goals Reconciliation Audit, como referencia operativa única para futuras conversaciones |
| 2026-08-24 | Goals V1 (`GOAL_PROGRESS_MODEL = WALLET_BALANCE`) aprobado por el propietario e implementado; auto-cancelación de Goal activo implementada; `GOAL_COMPLETION_SEMANTICS` confirmada como sigue abierta | Cerrar el bloque Goals V1 tras la aprobación explícita del propietario sobre `VIAO_GOALS_V1_DECISION_LOCK.md` |

---

## Documentos especializados

Este Master indica dónde está la información detallada — no la duplica:

- **Decisión concreta de Goals**: `docs/VIAO_GOALS_V1_DECISION_LOCK.md`.
- **Fuente de verdad operativa previa (Missions/roadmap general)**: `docs/VIAO_V1_EXECUTION_LOCK.md`.
- **Checkpoint técnico detallado (RPC/RLS/tests línea por línea)**: `docs/VIAO_V1_PRODUCT_LOOP_CHECKPOINT.md`.
- **Razonamiento estratégico/económico original de V1**: `docs/VIAO_V1_LOOP_DECISION.md`.
- **Investigación de mercado/competencia**: `docs/VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md`.
- **Arquitectura (histórico, desactualizado)**: `docs/VIAO_ARCHITECTURE.md`.
- **Schema/base de datos (histórico, desactualizado)**: `docs/VIAO_DATABASE.md`.
- **Planificación original**: `docs/VIAO_ROADMAP.md`.
- **Estado operativo Hotelbeds**: `docs/HOTELBEDS_CERTIFICATION_STATUS.md`.
- **MVP fundacional original**: `docs/VIAO_MVP_v0.1.md`.

---
STATUS: HISTORICAL
ERA: V1 checkpoint
DOMAIN: Estado operativo/Meta
AUTHORITY: Ninguna — snapshot puntual, superado por el siguiente checkpoint
SUPERSEDES: —
SUPERSEDED BY: docs/VIAO_MVP_MASTER.md (mismo día, commit posterior — en revisión, ver REVIEW REQUIRED) y en última instancia docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md
LAST REVIEWED: 2026-08-24 (fecha propia)
---

# VIAO V1 — Product Loop Checkpoint

**Fecha:** 2026-08-24
**HEAD:** `76f0947` — "fix: complete goal cancellation flow"
**Relación con otros documentos:** este archivo es el **checkpoint de estado** (qué existe realmente, ahora mismo, en código y en git). No repite el razonamiento estratégico ya fijado en [`VIAO_V1_LOOP_DECISION.md`](./VIAO_V1_LOOP_DECISION.md) (el "por qué" de los 5 bloques y su orden) ni en [`VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md`](./VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md) — ambos siguen siendo la referencia de la decisión de producto. Este documento se actualiza en cada checkpoint; los otros dos son decisiones ya cerradas y no deberían reabrirse salvo contradicción real encontrada en auditoría.

---

## 1. Estado del checkpoint

**Git:**
```
HEAD: 76f0947 "fix: complete goal cancellation flow"
main...origin/main: ahead 2
Working tree: 45 entradas (20 modificadas + 25 sin trackear)
```

**COMMITEADO** (2 commits, ya en `main`, no en `origin/main`):
- `e0c39ea` — "feat: close rewards and goals block 1": catálogo Rewards, canje, cancelación, refund; Goals crear/leer/cancelar; 6 migraciones SQL; i18n.
- `76f0947` — "fix: complete goal cancellation flow": botón "Cancelar objetivo" en la UI, conectado al backend ya existente.

**PENDIENTE (en working tree, sin commit):**
- Bloque Missions completo: `lib/missions/`, `app/missions-summary.tsx`, 2 migraciones SQL, hooks en `app/search/actions.ts` / `app/properties/[id]/resolve.ts` / `lib/analytics/record-return-visit.ts` / `lib/goals/create-goal.ts`.
- Bloque Goal-en-onboarding: `app/onboarding/`, cambios en `app/(auth)/register/page.tsx`, refactor de `app/goal-card.tsx` (extracción de `GoalForm`).
- Trabajo de Destinations/Hotelbeds-catálogo previo a este checkpoint (`lib/destinations/`, `lib/hotelbeds/destinations*.ts`, `lib/hotelbeds/sync-destinations.ts`, migración `20260823140000_create_destinations.sql`) — no forma parte de ningún bloque de este documento, no tocar sin bloque propio.
- Documentación: `docs/01_CURRENT/providers/HOTELBEDS_CERTIFICATION_STATUS.md`, `docs/02_DECISION_LOCKS/product/VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md`, `docs/VIAO_V1_LOOP_DECISION.md` (sin commitear).

**BLOQUEADO EXTERNAMENTE:**
- Validación visual E2E de Missions — el tooling de navegador (`browse`) presenta crashes del daemon no atribuibles a VIAO (ver sección 4).

**NO AUTORIZADO (regla absoluta, vigente):**
- **Hotelbeds está CONGELADO** (caso `#60019483`). 0 llamadas reales. No reservas/cancelaciones reales, no cambios de credenciales/endpoints, no certificación, no producción. El provider de evaluación permanece aislado. `TRAVEL_PROVIDER` sigue sin definirse en local → `MockHotelProvider` es el único activo (verificado, `lib/travel-provider/index.ts`).
- Flights, Premium, B2B, Stripe, Partner Dashboard, OCR, TPV, Admin, Dream Trip, streak diario, motor configurable de Missions.

---

## 2. Loop estratégico V1

```
USUARIO
   │
   ▼
ELIGE UN OBJETIVO (Goal)
   │
   ▼
HACE SU VIDA NORMAL
   ☕  🥖  💈  🍕  🎬
   │
   ▼
PARTNERS
   │
   ▼
ACTIVIDAD / COMPRA ATRIBUIDA
   │
   ▼
VIAO GENERA COMISIÓN
   │
   ▼
POINTS
   │
   ├──────────────┐
   ▼              ▼
GUARDAR        REDEEM
PARA VIAJE     REWARD
   │              │
   └──────┬───────┘
          ▼
       REPETIR
```

**Por qué este loop es la tesis de producto**: la propuesta de valor a validar es *"Tu actividad cotidiana te acerca a tu próximo viaje"*. VIAO no compite como OTA (no gana por transacción de viaje) ni como app de puntos genérica (los Points no son el producto, son el mecanismo) ni como gamificación infantil (Missions son mínimas, instrumentales, no el centro de la experiencia). El loop completo — Goal → actividad real con Partners → comisión real → Points → decisión del usuario (guardar o gastar) → repetir — es lo único que demuestra que el modelo económico (comisión de Partner financia Points, Points financian Rewards/Goal) puede sostenerse sin inventar dinero. Ningún bloque tiene valor si no acerca a demostrar este ciclo completo con datos reales.

---

## 3. Estado real de cada bloque

| Bloque | Estado | Código | Tests | Dependencias | Siguiente acción |
|---|---|---|---|---|---|
| **Rewards** | Implementado, commiteado (`e0c39ea`) | `lib/rewards/*` (rules, redeem-reward, cancel-redemption, mark-redemption-fulfilled, get-rewards-catalog, create-reward-transaction, get-wallet-balance) | Sí, incluidos en la suite verde | Ledger (`rewards_transactions`), `rewards_wallets` (view) | Auditoría de ledger antes de tocarlo de nuevo (ver sección 6) — no hay trabajo pendiente propio |
| **Goals** | Implementado, commiteado (`e0c39ea`, `76f0947`) | `lib/goals/*` (create-goal, cancel-goal, get-goal) | Sí, incluidos en la suite verde | Ledger (lectura, vía `rewards_transactions`) | Ninguna — ver discrepancias en sección 7 antes de asumir comportamiento no verificado en código |
| **Missions** | Implementado, **NO commiteado** | `lib/missions/*`, RPC `complete_mission()` | 14 tests, verdes (ver sección 4) | Ledger (mismo escritor de eventos vía RPC propio), eventos reales (`search_started`/`return_visit`/`hotel_viewed`/`goal_created`) | Commit cuando se autorice (FASE A) — E2E visual queda como seguimiento, no bloquea |
| **Partners** | No implementado | Ninguno | N/A | Requiere: tabla `partners`, QR con token rotativo, antifraude de canje físico | Diseño detallado + pre-flight propio antes de cualquier código (Bloque 4) |
| **Antifraude / Caducidad** | Parcial | `lib/rate-limit/check-rate-limit.ts` (usado hoy solo en IA/Vision), kill-switches de pool ya presentes en Rewards y Missions | Sí, para lo que existe | Ninguna nueva de por sí | No hay "caducidad de Points" implementada todavía (columna `expires_at` solo existe para el *código de redención*, `reward_redemptions.expires_at` — no para el saldo de Points) |
| **Hotelbeds** | Congelado por decisión de negocio | `lib/travel-provider/hotelbeds-provider.ts` existe pero inactivo (`TRAVEL_PROVIDER` no definido) | Sí (aislados, no ejercitan red real) | — | Ninguna hasta nueva autorización explícita |
| **Flights** | No implementado, fuera de alcance V1 | — | — | — | Ninguna |
| **Vision** | Implementado (bloque anterior), fuera del loop principal por decisión | `lib/vision/*`, flag `VISION_ENABLED` | Sí | — | Ninguna — se mantiene funcional, no se diseña alrededor de él (Decisión B, ya resuelta) |
| **Referidos** | Implementado (bloque anterior) | `lib/referrals/*` | Sí | Ledger (`reason='referral_created'`, vía `createRewardTransaction`) | Ninguna en este checkpoint — Missions deliberadamente NO incluye `referral_created` para evitar doble recompensa por la misma acción |
| **Wallet / Ledger** | Implementado, único escritor | `rewards_transactions` (tabla), `rewards_wallets` (view `security_invoker`), `createRewardTransaction()` (único punto de INSERT desde código de aplicación; Missions usa su propio RPC `SECURITY DEFINER` que inserta directamente, ver sección 4) | Sí | — | Es el activo más sensible del sistema — cualquier bloque que lo toque exige su propio pre-flight (regla ya vigente) |

---

## 4. Missions — checkpoint técnico

- **`completeMission()`** (`lib/missions/complete-mission.ts`): único punto de la aplicación que invoca el RPC. Resuelve `period_key` server-side — `isoWeekKey()` (ISO-8601, verificado con 8 casos de referencia en ambos sentidos de frontera de año) para las 3 Missions semanales; el literal fijo `'lifetime'` para `goal_created`. Nunca confía en un `period_key` del cliente.
- **RPC `complete_mission()`**: `SECURITY DEFINER`, `search_path=''`. `EXECUTE` revocado a `public`/`anon`/`authenticated` — solo `service_role`. Points por Mission hardcodeados en el propio SQL (fuente de verdad económica real, independiente de `lib/missions/rules.ts`).
- **RLS**: `mission_completions` da SELECT propio a `authenticated` (nunca de otro usuario), SELECT+INSERT a `service_role` (nunca UPDATE/DELETE — append-only).
- **Idempotencia**: garantizada por la constraint real `UNIQUE(user_id, mission_key, period_key)`, no por lógica de aplicación. Un reintento devuelve la fila existente, nunca duplica ni lanza error.
- **Concurrencia**: un único advisory lock global (`hashtext('viao_missions_pool')`, distinto del de Rewards) serializa idempotencia + kill-switch + el doble INSERT (`mission_completions` + `rewards_transactions`) bajo una misma transacción — probado con 10 llamadas `Promise.all` reales contra Supabase local: exactamente 1 completion + 1 transacción.
- **`period_key`**: semanal (ISO week) para `search_started`/`return_visit`/`hotel_viewed`; `'lifetime'` fijo para `goal_created` — cierra por construcción el vector de abuso "cancelar Goal y recrearlo para volver a cobrar", verificado con un test dedicado de 3 disparos reales del evento.
- **Kill-switch**: techo mensual de 3000 Points vía Missions, independiente del pool de canje de Rewards (nunca se suman ni se comparten). Comprobado bajo el mismo lock, antes de insertar nada — fail-closed.
- **Ledger**: cada completion inserta en `rewards_transactions` con `reason='mission:<mission_key>'`, `reference_type='mission_completion'`, `reference_id`=id de la fila de completion.
- **Atomicidad**: completion + transacción de ledger se insertan en la misma función SQL, bajo el mismo lock — si cualquiera falla, ambas hacen rollback.
- **Eventos conectados a la acción real** (nunca a apertura de formulario, escritura, intento fallido, cancelación o edición):
  - `search_started` → `app/search/actions.ts`, tras pasar la validación server-side de `searchAction()`.
  - `return_visit` → `lib/analytics/record-return-visit.ts`, solo en la rama que devuelve `recorded:true`.
  - `hotel_viewed` → `app/properties/[id]/resolve.ts`, solo en la rama `found`.
  - `goal_created` → `lib/goals/create-goal.ts`, solo tras un INSERT real y exitoso en `goals`.
- **Tests**: 14 en `lib/missions/complete-mission.test.ts`, verdes — cubren primera completación, mission_key desconocida, reason/reference_type/reference_id, Mission lifetime, retry sin duplicar, anti-farming de `goal_created`, acumulación en periodos distintos, concurrencia real (10 llamadas), RLS de lectura, bloqueo de INSERT directo desde cliente, bloqueo de invocación directa del RPC, kill-switch agotado, kill-switch en el límite exacto.
- **E2E visual**: **la validación E2E permanece inconclusa por limitación del tooling de navegador — no está validada visualmente.** El pre-flight de esta misma fecha encontró además que los intentos previos de E2E nunca habían llegado a enviar un submit válido (faltaban `checkIn`/`checkOut`/`guests`/`rooms`, obligatorios en `app/search/search-form.tsx`), independientemente del crash del daemon. No se afirma un PASS visual bajo ninguna circunstancia.

**Conclusión textual, para no reinterpretar**: *Missions está técnicamente lista para commit, pero la validación visual E2E permanece inconclusa por limitación del tooling.*

---

## 5. Decisión sobre Missions

**Missions NO se rediseña ni se amplía ahora.** Explícitamente fuera de alcance en este momento:
- motor configurable de Missions;
- más Missions que las 4 ya definidas;
- streak diario;
- economía nueva o pool adicional;
- tablas nuevas no necesarias para lo ya definido.

Se mantienen las 4 Missions mínimas ya implementadas (`search_started`, `return_visit`, `hotel_viewed`, `goal_created` — dentro del rango "3-5" aprobado). El objetivo de Missions es **generar actividad recurrente suficiente para alimentar el loop sin convertir VIAO en una app de gamificación** — no maximizar engagement por sí mismo.

---

## 6. Rewards — próximo bloque de auditoría (no de implementación)

Rewards ya está implementado (`e0c39ea`) — lo que queda pendiente no es construir Rewards desde cero, sino **auditar su estado antes de que cualquier bloque futuro (Partners, Antifraude/caducidad) vuelva a tocar el ledger que Rewards ya usa.**

Rewards toca el único escritor real del ledger (`lib/rewards/create-reward-transaction.ts`, `service_role`, único punto de INSERT en `rewards_transactions` desde código de aplicación — Missions usa su propio RPC `SECURITY DEFINER` con el mismo criterio de aislamiento). Antes de implementar cualquier extensión de Rewards, auditar:
- `createRewardTransaction()` — comportamiento de idempotencia con y sin `referenceType`/`referenceId`.
- constraints reales (`rewards_transactions_amount_sign_check`, `rewards_transactions_user_reference_reason_unique`).
- `get-wallet-balance.ts` / vista `rewards_wallets` (`security_invoker`).
- `redeem-reward.ts` / `cancel-redemption.ts` / `mark-redemption-fulfilled.ts` — atomicidad, RLS, kill-switch mensual (`VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR`).
- refund (`reason='redemption_refund'`) y su exclusión explícita del progreso de Goal (ver sección 7).
- analytics conectados.
- caducidad — no existe hoy para Points (solo `reward_redemptions.expires_at`, el código de canje, no el saldo).

No se implementa nada de esto en este checkpoint.

---

## 7. Goals — estado real y discrepancias encontradas

Estado confirmado en código (`lib/goals/get-goal.ts`, `create-goal.ts`, `cancel-goal.ts`):
- Un único Goal activo por usuario — garantizado por índice único parcial `goals_one_active_per_user_idx` (`WHERE status='active'`), a nivel de base de datos, no de aplicación.
- Progreso (`earnedTowardGoal`) = `points_at_goal_creation` (saldo congelado en el momento de crear el Goal) + `SUM` de transacciones `type='earned'` desde la creación del Goal, **excluyendo explícitamente `reason='redemption_refund'`**.
- Goal expirado: no existe ningún mecanismo de cancelación automática — confirmado, coincide con lo esperado.

**⚠️ Discrepancias encontradas entre el enunciado de este checkpoint y el código real** (reportadas, no corregidas silenciosamente):

1. **"Progreso = saldo actual del Wallet / target"** — el código NO calcula el progreso así. El progreso es una cifra acumulativa e independiente del saldo gastable (`Wallet`/`rewards_wallets`), documentada explícitamente en el propio archivo como una decisión de diseño (Fase F, hallazgo HIGH): mostrar ambas cifras por separado, "nunca presentarlas como si fueran lo mismo".
2. **"Canjear Reward reduce el progreso"** — el código hace explícitamente lo contrario: canjear un Reward (`type='spent'`) no resta del progreso del Goal, porque el progreso solo suma transacciones `earned`. Un refund de una cancelación tampoco lo aumenta (exclusión explícita de `redemption_refund`) — precisamente para que el ciclo canjear→cancelar no infle el progreso sin Points nuevos reales.
3. **"Crear nuevo Goal cancela el anterior"** — el código hace lo contrario: mientras exista un Goal `active`, el índice único bloquea el INSERT de uno nuevo (`already_has_active_goal`). El usuario debe cancelar el Goal activo primero; crear uno nuevo nunca cancela automáticamente el anterior.

Estas tres discrepancias deben resolverse como **decisión de producto explícita** (¿se cambia el código para que coincida con la intención de este documento, o se corrige el documento para reflejar el código ya validado y testeado?) antes de que cualquier bloque futuro asuma uno u otro comportamiento como cierto.

---

## 8. Partners — futuro bloque comercial (sin implementar)

Piloto de 3-5 Partners, 0€/mes durante el piloto (validación antes que ingreso). Explícitamente excluido en el piloto: Partner Dashboard, TPV, app de comercio, OCR.

**QR**: token rotativo diario (codifica `partner_id` + token del día) — evita que el Partner necesite hardware propio y evita el fraude trivial de reutilizar una foto del QR desde casa (obliga presencia física ese día). Objetivo: validar actividad física atribuible a un Partner real.

Ningún código de Partners existe todavía. Este bloque requiere su propio pre-flight antes de cualquier implementación (regla general de la sección 12).

---

## 9. Economía — cifras y su estado de verificación

| Cifra | Valor | Estado | Fuente |
|---|---|---|---|
| Points por euro | 100 Points = 1 € | **[CONFIRMADO EN CÓDIGO]** | `lib/rewards/rules.ts`, `POINTS_PER_EURO` |
| Reward por reserva de hotel confirmada | 2% del importe | **[CONFIRMADO EN CÓDIGO]** | `lib/rewards/rules.ts`, `HOTEL_BOOKING_REWARD_RATE` |
| Bono de registro | 100 Points (provisional) | **[CONFIRMADO EN CÓDIGO]** | `lib/rewards/rules.ts`, `REGISTRATION_REWARD_POINTS_PROVISIONAL`; otorgado vía trigger `handle_new_user()`, no desde código de aplicación |
| % de la comisión de Partner que se convierte en Points | 25% (no 50%) | **[CONFIRMADO EN CÓDIGO, pero sin flujo real que lo ejercite]** | `lib/rewards/rules.ts`, `POINTS_PERCENTAGE_OF_COMMISSION` — documentado como "informativo/documental... todavía no existe ningún flujo de earning ligado a comisión de Partner" |
| Coste real máximo de un Reward financiado por VIAO | 30% de su valor nominal en Points | **[CONFIRMADO EN CÓDIGO]** | `lib/rewards/rules.ts` `MAX_REWARD_REAL_COST_PERCENT` + CHECK constraint real en `rewards_catalog` |
| Techo mensual del pool de Rewards financiados por VIAO | 100,00 € | **[CONFIRMADO EN CÓDIGO]** | `lib/rewards/rules.ts` `VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR` + kill-switch SQL real |
| Techo mensual del pool de Missions | 3000 Points | **[CONFIRMADO EN CÓDIGO]** | `lib/missions/rules.ts` `MISSIONS_POOL_MONTHLY_LIMIT_POINTS` + kill-switch SQL real; presupuesto independiente del de Rewards |
| Co-financiación 50/50 Partner en el canje de un Reward | 50% Partner / 50% VIAO | **[DECISIÓN APROBADA — `VIAO_V1_LOOP_DECISION.md`, NO implementado en código todavía]** | `rewards_catalog.funding_split` (`partner_50_50`/`viao_capped`) está diseñado, no construido — no confundir con `POINTS_PERCENTAGE_OF_COMMISSION` (25%), que mide algo distinto (conversión comisión→Points, no reparto de coste de canje) |
| Caducidad de Points (saldo) | 12-18 meses | **[HIPÓTESIS — `VIAO_V1_LOOP_DECISION.md`]** | No implementado. Existe `reward_redemptions.expires_at`, pero es la caducidad del *código de redención ya canjeado*, no del saldo de Points |

---

## 10. Sistema visual V1 — especificación conceptual (no implementado en este turno)

Dirección: **Travel premium + Fintech + Loyalty.** Ni OTA genérica, ni app de puntos infantil.

Características objetivo para los próximos bloques (ninguna aplicada todavía):
- Fondo claro/crema suave, texto oscuro, color principal VIAO.
- Verde/teal reservado para progreso (Goal).
- Acentos cálidos para Rewards.
- Mucho espacio en blanco, cards suaves, sombras ligeras.
- Points mostrados con números grandes (protagonismo del saldo).
- Fotografía real de destinos.
- Animaciones discretas, nunca lúdicas/infantiles.

**Criterio de Home (objetivo, no implementado)**: comunicar en ~3 segundos "Tienes X Points" / "Tu próximo objetivo: [destino]" / "X% conseguido" / "Te faltan X Points". No se modifica UI en este checkpoint.

---

## 11. Qué NO hacer

Explícitamente fuera de alcance hasta nueva autorización:
- Hotelbeds real (congelado, caso `#60019483`).
- Flights.
- OCR.
- Admin.
- Premium.
- Partner Dashboard.
- Dream Trip.
- Streak diario.
- Motor configurable de Missions.
- Infraestructura no necesaria para validar el loop mínimo.

---

## 12. Siguiente secuencia

- **FASE A** — Cerrar/commitear Missions cuando se considere procedente (técnicamente lista; E2E visual pendiente por tooling, no bloqueante).
- **FASE B** — Antes de implementar cualquier extensión de Rewards: auditoría técnica específica del ledger (sección 6).
- **FASE C** — Diseñar la implementación de esa extensión de Rewards (sin construir).
- **FASE D** — Implementar solo tras aprobación explícita.
- **FASE E** — Validar tests.
- **FASE F** — Continuar con Goals/Missions/Partners según el estado real del repositorio en ese momento, no según lo asumido aquí.

Ningún bloque anterior se asume "perfecto" por haber sido implementado ya — cada bloque nuevo exige su propio pre-flight, incluida la resolución de las discrepancias de Goals (sección 7) antes de que un bloque futuro dependa de un comportamiento no verificado.

---

## 13. Reglas de trabajo (vigentes desde este checkpoint)

1. Auditar antes de modificar.
2. Proponer antes de implementar.
3. No tocar código sin autorización explícita.
4. Un bloque a la vez.
5. Tests antes de afirmar PASS — nunca inventar un resultado.
6. No convertir hipótesis económicas en hechos — mantener el etiquetado `[CONFIRMADO EN CÓDIGO]` / `[DECISIÓN APROBADA]` / `[HIPÓTESIS]` en cualquier cifra nueva.
7. No tocar Hotelbeds mientras esté congelado.
8. No ampliar el alcance por iniciativa propia.
9. No hacer commits ni push salvo autorización explícita.
10. Mantener el working tree controlado (nunca `git add .`/`git add -A` sin revisar).
11. Cada bloque debe cerrarse con: archivos afectados, migraciones, tests, riesgos, rollback, estado Git.

---

## 14. Criterio de calidad

El objetivo no es acumular funcionalidades. El objetivo es demostrar:

*"Una persona puede entrar en VIAO, elegir un objetivo de viaje, realizar actividad normal, ganar Points, decidir entre guardarlos para su viaje o gastarlos en un Reward, y repetir."*

Todo lo que no acerque a demostrar ese comportamiento debe cuestionarse antes de construirse.

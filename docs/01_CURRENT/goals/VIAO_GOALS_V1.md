---
STATUS: CURRENT
ERA: V1 (implementado)
DOMAIN: Goals
AUTHORITY: Current technical/product-domain document for Goals V1. El código real, las migraciones y los tests siguen siendo la autoridad técnica última; el Decision Lock (`VIAO_GOALS_V1_DECISION_LOCK.md`) tiene precedencia sobre este documento en cualquier decisión bloqueada. Este documento explica cómo funciona Goals V1 hoy, no crea ni reinterpreta decisiones.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO Goals V1 — Documento técnico CURRENT

### Jerarquía aplicada: código + migraciones + tests > `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md` > este documento > documentos globales/históricos.
### Relación con el Decision Lock: el Decision Lock fija `GOAL_PROGRESS_MODEL=WALLET_BALANCE` y `AUTO_CANCEL_ACTIVE_GOAL`, y deja `GOAL_COMPLETION_SEMANTICS` explícitamente abierta. Este documento describe cómo funciona eso hoy en código, sin reinterpretar ninguna de las tres.

---

## 2. Propósito

Un Goal es el ancla emocional del loop de VIAO: un objetivo de Points libre, definido por el usuario (título en texto libre, sin acoplamiento a viaje), hacia el que su saldo de Points progresa en tiempo real. Solo puede existir un Goal activo por usuario a la vez.

---

## 3. Scope exacto

Este documento cubre: la tabla `goals`, sus 3 triggers, y los 4 archivos de `lib/goals/` (`create-goal.ts`, `get-goal.ts`, `cancel-goal.ts`, `calculate-progress.ts`), más sus call-sites reales en `app/`. No cubre Rewards ni Missions más allá de su punto de integración (secciones 12-13, 29-30).

---

## 4-6. Modelo de Goal, tipos y estados

**Modelo** (`supabase/migrations/20260823153000_create_goals.sql`): `id`, `user_id`, `title` (texto libre, `NOT NULL`, sin ninguna validación temática — soporta viaje, compra, experiencia o cualquier otro objetivo), `target_points` (`CHECK > 0`), `target_date` (opcional), `status`, `points_at_goal_creation` (conservada en el schema, **ya no participa en el cálculo de progreso** — ver sección 9-11), `created_at`, `completed_at`.

**Tipos de Goal**: uno solo — no existe ninguna categorización ni tipo de Goal en el schema. `title` es texto libre sin enum ni FK.

**Estados**: `CHECK status IN ('active', 'completed', 'cancelled')` a nivel de columna, pero **`completed` nunca es alcanzable en la práctica** — ningún trigger ni código de aplicación lo escribe jamás. `protect_goal_immutable_fields()` (sección 7) solo permite la transición `active → cancelled`; cualquier intento de `active → completed` se rechaza explícitamente (`raise exception 'goal_invalid_status_transition'`, test-verificado: `cancel-goal.test.ts:107-143`). "Meta alcanzada" es un estado puramente derivado en lectura (`progress_percent` llegando a 100), nunca persistido — `GOAL_COMPLETION_SEMANTICS` permanece `OPEN / DERIVED ONLY` (Decision Lock, sección 11), sin cambios desde entonces.

---

## 7. Creación de Goals

`createGoal()` (`lib/goals/create-goal.ts:45-115`), Patrón A: el usuario inserta directamente bajo RLS (`goals_insert_own`), nunca vía `service_role` — a diferencia de Rewards, crear un Goal no tiene implicación económica que proteger.

**3 triggers `BEFORE INSERT`/`BEFORE UPDATE`, todos `SECURITY DEFINER`**:
1. `set_goal_points_at_creation()` (`BEFORE INSERT`, `20260823153000_*.sql:76-93`): sobrescribe siempre `points_at_goal_creation` con el saldo real (`SUM(rewards_transactions.amount)`) en el momento del INSERT, ignorando cualquier valor enviado por el cliente.
2. `cancel_active_goal_before_insert()` (`BEFORE INSERT`, `20260824110000_*.sql:27-39`): cancela automáticamente el Goal `active` anterior del mismo usuario, si existe, justo antes del INSERT.
3. `protect_goal_immutable_fields()` (`BEFORE UPDATE`, `20260824090000_*.sql:25-50`): bloquea cualquier cambio a `points_at_goal_creation`, `target_points`, `title`, `target_date`, `user_id`, `created_at`; permite únicamente la transición de `status` `active → cancelled`.

---

## 8. Validaciones

Aplicación (antes de tocar Supabase): `title` no vacío (trim), `targetPoints > 0` — código puro, test-verificado directamente (`create-goal.test.ts:65-73`, sin tocar Supabase). Base de datos: `CHECK (target_points > 0)`, `NOT NULL` en `title`, `RLS WITH CHECK (user_id = auth.uid())` (impide suplantación — test-verificado, `create-goal.test.ts:210-223`).

---

## 9-11. Progress model — `GOAL_PROGRESS_MODEL = WALLET_BALANCE`, confirmado vigente

**Sí, sigue confirmado por código y por el Decision Lock, sin desviación.**

```
progress_percent = min(100, round(wallet_balance / target_points * 100))
```

`calculateGoalProgressPercent(walletBalance, targetPoints)` — `lib/goals/calculate-progress.ts:19-24`, función pura, sin ninguna dependencia de `next/headers`/Supabase. `targetPoints <= 0` devuelve `0`, nunca `NaN`/`Infinity` (defensivo, aunque la constraint de tabla ya lo impide).

**Precisión arquitectónica importante**: `getActiveGoal()` (`lib/goals/get-goal.ts:33-64`) **no calcula el progreso** — solo devuelve los campos crudos del Goal (`id`, `title`, `targetPoints`, `targetDate`, `createdAt`). El cálculo real ocurre en la capa de UI: `app/goal-card.tsx:58`, `calculateGoalProgressPercent(walletBalance, goal.targetPoints)`, donde `walletBalance` llega como prop independiente (obtenida vía `get-wallet-balance.ts` a nivel de página, `app/page.tsx`). `calculate-progress.ts` vive en su propio archivo precisamente para que este Client Component pueda importarlo sin arrastrar el árbol de `next/headers` a su bundle (confirmado por el propio comentario de cabecera del archivo, motivado por un fallo real de build documentado).

**`points_at_goal_creation`**: la columna se conserva en el schema (nunca se eliminó) pero `get-goal.ts` **ya no la lee en absoluto** para el cálculo de progreso — confirmado por lectura directa: `getActiveGoal()` ni siquiera la selecciona en su `SELECT`.

---

## 12. Relación del progreso con Rewards

El progreso es una lectura directa del Wallet (`rewards_wallets`/`SUM(rewards_transactions.amount)`), la misma cifra que "Points disponibles ahora" en el resto de la app — no hay una segunda contabilidad. Earn sube el progreso, redeem lo baja, refund lo devuelve — **sin ningún caso especial por `reason`**. Verificado extremo a extremo contra Rewards real (`get-goal.test.ts`):
- Redeem 300 sobre wallet=1000 → progreso 70% (`:107-122`).
- Redeem 800 sobre wallet=1000 → progreso 20% (`:124-138`).
- Redeem 1000 sobre wallet=1000 → progreso 0%, sin promesa falsa de meta alcanzada (`:140-158`).
- Refund tras redeem → el progreso vuelve exactamente a donde estaba (`:161-187`).

## 13. Relación con Missions — `goal_created`

`createGoal()` invoca `completeMission(user.id, "goal_created")` tras un INSERT real y exitoso (`create-goal.ts:108-112`), best-effort (un fallo aquí nunca impide que el Goal ya creado se devuelva como éxito). La auto-cancelación (sección 7, trigger #2) provoca que `goal_created` pueda intentar dispararse en cada creación de Goal, no solo en la primera — pero la protección real vive en la constraint `UNIQUE(user_id, mission_key, period_key)` con `period_key='lifetime'` (Missions Decision Lock, MI4): cualquier llamada adicional golpea el camino idempotente ya probado, sin generar Points de más. Ver `docs/02_DECISION_LOCKS/missions/VIAO_MISSIONS_V1_DECISION_LOCK.md`.

---

## 14-15. Qué ocurre al crear / al alcanzar un Goal

**Al crear**: el Goal `active` anterior (si existe) se cancela automáticamente (trigger `cancel_active_goal_before_insert()`); `points_at_goal_creation` se congela con el saldo real (sin uso posterior); se dispara `goal_created` (Missions). El progreso inicial refleja el saldo **actual** del Wallet, no parte de 0 — test-verificado explícitamente (`get-goal.test.ts:190-216`, caso J: Goal creado con wallet ya en 500/1000 objetivo → 50% desde el primer instante).

**Al alcanzar el 100%**: no ocurre nada a nivel de persistencia — ningún trigger escribe `completed`. Es un estado puramente derivado en lectura (sección 4-6).

---

## 16-18. Qué ocurre al canjear / cancelar un canje — verificación explícita de `redemption_refund`

**Al canjear un Reward**: el progreso baja visiblemente (consecuencia real de la bifurcación GUARDAR/REDEEM, sección 12).

**Al cancelar un canje** (`cancel_redemption()`, Rewards): se genera un refund positivo en el ledger (`reason='redemption_refund'`) — el progreso sube de vuelta.

**Verificación específica pedida — el progreso NO se infla mediante `redemption_refund`**: confirmado, sigue vigente. El modelo WALLET_BALANCE no tiene ninguna exclusión ni caso especial por `reason` — es una suma pura sobre `rewards_transactions`. Un ciclo redeem→refund devuelve el wallet **exactamente** al valor anterior, nunca por encima: test-verificado explícitamente (`get-goal.test.ts:161-187`, caso G — wallet 1000 → redeem 300 → 700 (70%) → refund → 1000 (100%), "sin exclusión especial de reason"). Esto contrasta con el modelo HYBRID anterior (congelado en `docs/99_ARCHIVE_V1/checkpoints/VIAO_V1_EXECUTION_LOCK.md`), que sí necesitaba excluir explícitamente `redemption_refund` de su suma para no inflarse a sí mismo tras un ciclo canjear→cancelar — esa exclusión ya no existe en el código actual porque el modelo actual no la necesita (confirmado también por el propio Decision Lock, sección 8).

---

## 19. Persistencia y modelo de datos

Ver sección 4-6. Sin tablas adicionales — un único Goal por fila, `goals_one_active_per_user_idx` (índice único parcial `WHERE status='active'`) como garantía final de "máximo un Goal activo", a nivel de Postgres, independiente de la auto-cancelación.

---

## 20-21. RLS / Ownership / Seguridad

| Garantía | Evidencia (A) | Test (B) |
|---|---|---|
| Lectura propia | Policy `goals_select_own` | — |
| Inserción propia, sin suplantación | Policy `goals_insert_own`, `WITH CHECK (user_id = auth.uid())` | `create-goal.test.ts:210-223` |
| `points_at_goal_creation` no manipulable por el cliente en INSERT | Trigger `set_goal_points_at_creation()` | `create-goal.test.ts:181-207` |
| Campos inmutables tras creación (`points_at_goal_creation`, `target_points`, `title`, `target_date`, `user_id`, `created_at`) no editables vía UPDATE | Trigger `protect_goal_immutable_fields()` | `cancel-goal.test.ts:71-105` (ataque reproducido explícitamente) |
| `status` solo `active → cancelled` | Mismo trigger | `cancel-goal.test.ts:107-143` (`completed` y reactivación, ambos rechazados) |
| Máximo 1 Goal `active` por usuario, incluso bajo concurrencia real | Índice único parcial + trigger de auto-cancelación | `create-goal.test.ts:141-178` (5 creaciones concurrentes reales, `Promise.all`) |
| Cancelar no genera movimiento de Points | `cancelGoal()` solo hace `UPDATE status` | `cancel-goal.test.ts:152-183`; también `create-goal.test.ts:128-138` para la auto-cancelación |

---

## 22-24. Tests reales, cobertura y archivos sin test propio

| Archivo | Test propio |
|---|---|
| `lib/goals/create-goal.ts` | `create-goal.test.ts` — cobertura alta (validación, creación real, auto-cancelación K, concurrencia L, tamper-proofing, RLS) |
| `lib/goals/get-goal.ts` | Sin archivo de test dedicado propio — `getActiveGoal()` en sí (la función que lee `next/headers`) **no se invoca directamente** en ningún test (misma limitación que otros módulos server-only del proyecto); sus reglas de negocio (progreso) se prueban vía `calculate-progress.ts` y contra Supabase directo dentro de `get-goal.test.ts` |
| `lib/goals/cancel-goal.ts` | `cancel-goal.test.ts` cubre el mismo UPDATE que ejecuta la función, pero mediante llamadas directas a Supabase, no invocando `cancelGoal()` en sí — cobertura equivalente, no idéntica |
| `lib/goals/calculate-progress.ts` | `get-goal.test.ts` (casos H/I puramente aritméticos, A/B/C base, D-G integración real con Rewards, J con Goal recién creado) |

**Se declara explícitamente**: ni `getActiveGoal()` ni `cancelGoal()` tienen una llamada directa a la función TypeScript dentro de su suite de tests — ambas se validan ejercitando el mismo camino de Supabase (RLS + triggers) que esas funciones usan internamente, no invocando la función en sí. Esto es cobertura funcional equivalente, no cobertura de la función exacta — se registra la distinción para no inflar la afirmación.

---

## 25-28. Implemented / Not implemented / Future / Frozen

**`IMPLEMENTED`**: creación, cancelación, auto-cancelación, `GOAL_PROGRESS_MODEL=WALLET_BALANCE`, los 3 triggers, integración con Missions (`goal_created`), integración con Rewards (lectura del Wallet).

**`NOT IMPLEMENTED`**: edición de un Goal existente (ningún código lo permite, ninguna policy lo concede); persistencia de `status='completed'`; caducidad automática por `target_date` vencida (columna existe, sin lógica asociada); mensaje transaccional en el canje ("Usaste 300 Points de tu objetivo...") — mencionado en el Decision Lock (sección 12) como mitigación UX recomendada, nunca implementado, fuera del scope de Goals.

**`FUTURE`**: `GOAL_COMPLETION_SEMANTICS` — explícitamente `OPEN / DERIVED ONLY / NO AUTOMATIC PERSISTENCE` (Decision Lock, sección 11), sin resolver desde su aprobación. `HISTORICAL_EARNED_POINTS` (estadística de mérito histórico separada del progreso en vivo) — `FUTURE / NOT V1 CORE` (Decision Lock, sección 20).

**`FROZEN`**: ninguno directamente en el dominio de Goals — Goals no depende de Travel/Hotelbeds/Vision (confirmado: `title` es texto libre sin FK a `trips`).

---

## 29-30. Relación con Rewards y Missions

- **Rewards**: relación de lectura pura — Goals nunca escribe en `rewards_transactions`, solo lee el Wallet derivado (sección 12). Ningún cambio en Rewards fue necesario para implementar WALLET_BALANCE (confirmado, Decision Lock sección 8).
- **Missions**: relación unidireccional — Goals dispara `goal_created` (sección 13), Missions nunca escribe ni lee `goals`.

---

## 31. Límites de Goals V1

Un único Goal activo por usuario. Sin edición de Goal existente. Sin categorías/tipos. Sin persistencia de estado `completed`. Sin caducidad automática. Sin ninguna relación con Partners (no implementado en ningún dominio todavía).

---

## 32. Qué NO debe tocarse sin nueva decisión explícita

El índice único parcial `goals_one_active_per_user_idx`, los 3 triggers (`set_goal_points_at_creation()`, `cancel_active_goal_before_insert()`, `protect_goal_immutable_fields()`), la fórmula `calculateGoalProgressPercent()`, y la ausencia de exclusión de `redemption_refund` (sección 16-18) — reintroducirla sería revertir silenciosamente la decisión V1 ya aprobada.

---

## 33. Evidencia técnica — bibliografía

**Migraciones**: `20260823153000_create_goals.sql`, `20260824090000_protect_goals_immutable_fields.sql`, `20260824110000_goals_auto_cancel_active_on_create.sql`.
**Código**: `lib/goals/create-goal.ts`, `lib/goals/get-goal.ts`, `lib/goals/cancel-goal.ts`, `lib/goals/calculate-progress.ts`.
**Call-sites**: `app/page.tsx` (lee `getActiveGoal()`, pasa `activeGoal`/`balance` a `GoalCard`), `app/goal-card.tsx` (calcula progreso, dispara `createGoalAction`/`cancelGoalAction`), `app/goals/actions.ts` (Server Actions, capa fina sobre `lib/goals/`), `app/onboarding/page.tsx` (reutiliza `GoalForm` de `goal-card.tsx`, sin segunda implementación).
**Tests**: `lib/goals/create-goal.test.ts`, `lib/goals/get-goal.test.ts`, `lib/goals/cancel-goal.test.ts`.

---

## Nota de precisión — comentario histórico en la migración original

El comentario de cabecera de `supabase/migrations/20260823153000_create_goals.sql` (líneas 19-26) describe el **modelo HYBRID** original ("Ganado para tu objetivo" = `points_at_goal_creation + SUM(earned)`, mostrado como cifra separada de "Disponible ahora"). Este comentario nunca se editó (las migraciones históricas no se reescriben, por convención del proyecto) y por tanto describe un comportamiento que ya **no** es el vigente. No es una contradicción sin resolver: el propio Decision Lock (secciones 3 y 8) documenta explícitamente esta supersession, y el código actual (`get-goal.ts`, `calculate-progress.ts`) implementa inequívocamente WALLET_BALANCE, confirmado por los tests citados en la sección 12 y 16-18 de este documento. Se registra aquí únicamente para que quien lea la migración directamente no confunda su comentario original con el comportamiento actual.

---

## Referencias

- `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md` — decisión bloqueada (`GOAL_PROGRESS_MODEL`, `AUTO_CANCEL_ACTIVE_GOAL`), este documento no la reinterpreta.
- `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md` / `docs/01_CURRENT/rewards/VIAO_REWARDS_V1.md` — ledger del que Goals lee el Wallet.
- `docs/02_DECISION_LOCKS/missions/VIAO_MISSIONS_V1_DECISION_LOCK.md` / `docs/01_CURRENT/missions/VIAO_MISSIONS_V1.md` — integración de `goal_created`.
- `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` — autoridad de producto/estrategia global.
- `docs/00_VIAO_HANDOFF.md` — punto de entrada de continuidad.

---

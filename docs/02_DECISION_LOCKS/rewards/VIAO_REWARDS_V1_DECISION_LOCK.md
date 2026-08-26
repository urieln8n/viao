---
STATUS: LOCKED
ERA: V1 (implementado, esta consolidación es de la sesión de reorganización documental)
DOMAIN: Rewards
AUTHORITY: Decision Lock formal de Rewards V1 — consolida decisiones ya implementadas y probadas, no crea decisiones nuevas
SUPERSEDES: la cofinanciación 50/50 histórica citada en `docs/VIAO_V1_LOOP_DECISION.md` (ver sección 9)
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO Rewards V1 — Decision Lock

### Scope: exclusivamente el sistema Rewards (ledger, wallet, catálogo, canje, cancelación/refund). Missions se audita y documenta por separado — no se toca aquí.
### Relación con documentos anteriores: ver sección 11.

---

## 1. Identidad del documento

- **Título**: VIAO Rewards V1 — Decision Lock.
- **STATUS**: `LOCKED`.
- **AUTHORITY**: fuente de verdad para las decisiones económicas y de seguridad de Rewards V1 listadas en el Decision Register (sección 4) — no para el sistema Rewards en su totalidad conceptual, eso corresponde al futuro `VIAO_REWARDS_V1.md` (documento técnico `CURRENT`, no creado en este bloque).
- **Fecha**: 2026-08-25.
- **Scope**: `rewards_transactions`, `rewards_wallets`, `rewards_catalog`, `reward_redemptions`, `redeem_reward()`, `cancel_redemption()`, `lib/rewards/*`. Explícitamente fuera: Missions, Partners, Goals (solo se referencian donde la evidencia lo exige).
- **Relación con documentos anteriores**: no sustituye ni reescribe ningún documento existente — deroga formalmente una única decisión puntual (la cofinanciación 50/50, sección 9). El resto de la documentación histórica de Rewards permanece donde está.

---

## 2. Propósito

Este documento consolida en un único lugar las decisiones `LOCKED`, `FUTURE` y `DEPRECATED` del sistema Rewards V1, verificadas directamente contra el código real, las migraciones y los tests — no contra lo que la documentación anterior decía que se iba a construir. No introduce ninguna decisión nueva: cada afirmación de este documento tiene una línea de código, una migración o un test que la respalda, citados en la sección 8.

---

## 3. Estado actual

Rewards V1 está **implementado y probado end-to-end contra Supabase local** (no mockeado): catálogo de Rewards, canje (`redeem_reward()`), cancelación con refund (`cancel_redemption()`), transición a `fulfilled`, ledger append-only y wallet derivada. Cada regla crítica (idempotencia, concurrencia, kill-switch, ownership, fail-closed) tiene al menos un test real que la demuestra — no una afirmación sin verificar. No existe ninguna contradicción entre el código y los tests; las únicas contradicciones detectadas están entre documentos antiguos y el código (ver sección 9), nunca dentro del propio código.

---

## 4. Decision Register

| ID | Decisión | Estado | Evidencia técnica | Autoridad | Implicación |
|---|---|---|---|---|---|
| RW1 | `POINTS_PER_EURO = 100` | `LOCKED` | `lib/rewards/rules.ts:24`; `lib/rewards/rules.test.ts:21-24` | Código + test | Base de toda conversión Points↔€ mostrada al usuario; nunca implica dinero real |
| RW2 | Ledger append-only (`rewards_transactions`) | `LOCKED` | `supabase/migrations/20260818110000_grant_service_role_rewards_transactions.sql:28` (solo `SELECT, INSERT` a `service_role`, sin `UPDATE`/`DELETE`) | Código | Ningún movimiento de Points se edita ni se borra jamás; una corrección siempre es una fila nueva |
| RW3 | `rewards_wallets` como VIEW derivada, nunca tabla con saldo editable | `LOCKED` | `supabase/migrations/20260817140006_create_rewards_wallets_view.sql` (`security_invoker=true`, `SUM(amount) GROUP BY user_id`) | Código | El saldo no puede divergir del ledger por construcción — no hay copia que sincronizar |
| RW4 | Idempotencia vía `UNIQUE(user_id, reason, reference_type, reference_id)` | `LOCKED` | `supabase/migrations/20260818150000_fix_rewards_transactions_idempotency_per_user.sql`; `lib/rewards/create-reward-transaction.test.ts:127-160` (idempotencia real vía UNIQUE) y `:162-183` (idempotencia bajo llamadas concurrentes) | Código + test | Reintentos de red (doble clic, timeout) nunca duplican Points |
| RW5 | `MAX_REWARD_REAL_COST_PERCENT = 30%`, solo `funding_type='viao'` | `LOCKED` | `lib/rewards/rules.ts:70-89`; `supabase/migrations/20260824091000_add_rewards_catalog_real_cost_limit.sql` (constraint `rewards_catalog_viao_real_cost_within_30_percent`, `NOT VALID`) | Código (DB constraint, verificado directamente en migración) | Un Reward `funding_type='viao'` no puede costar más del 30% de su valor nominal en Points |
| RW6 | Pool VIAO mensual = 100 €/mes | `LOCKED` | `lib/rewards/rules.ts:91-102` (`VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR`, documental); `redeem_reward()` línea 59 (`v_monthly_pool_limit_eur := 100.00`, aplicación real); `redeem-reward.test.ts:261-287`, `:320-371` | Código + test | Techo agregado de coste real que VIAO asume al mes en Rewards `funding_type='viao'` |
| RW7 | `POINTS_PERCENTAGE_OF_COMMISSION = 25%` | `FUTURE` / dormant | `lib/rewards/rules.ts:58-68` — comentario propio del código: "todavía no existe ningún flujo de earning ligado a comisión de Partner"; cero referencias fuera de `rules.ts` en todo `lib/` | Código (auto-declarado) | Constante centralizada a propósito para cuando exista el bloque de Partners+QR; no activa hoy, no debe presentarse como funcionalidad viva |
| RW8 | Cofinanciación 50/50 Partner/VIAO | `DEPRECATED` | `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` (formalmente deroga el modelo) | Decision Lock (autoridad vigente) | Nunca implementada en schema real; no debe reactivarse ni reinterpretarse — ver sección 9 |

---

## 5. Arquitectura económica

Seis conceptos, verificados como no equivalentes entre sí — ninguno se deriva de otro salvo donde se indica explícitamente:

- **Points emitidos**: gobernado por `POINTS_PER_EURO` y `HOTEL_BOOKING_REWARD_RATE` (`calculateHotelBookingRewardPoints()`). Determina cuántos Points recibe el usuario por un evento.
- **Coste real del Reward** (`rewards_catalog.real_cost_eur`): dato introducido manualmente al crear la fila del catálogo. **Nunca se deriva de `points_cost`** — son columnas independientes, verificado directamente en el comentario de `20260823150000_create_rewards_catalog.sql`: *"Es un dato DISTINTO de `points_cost`... nunca se deriva el uno del otro"*.
- **Financiación** (`funding_type`): decide quién paga el coste real al canjear — `'viao'` (acotado por RW5+RW6) o `'partner'` (sin techo de VIAO, coste asunto del propio Partner).
- **Comisión Partner** (`POINTS_PERCENTAGE_OF_COMMISSION`): RW7, dormant. No presentado aquí como funcionalidad activa.
- **Pools mensuales**: presupuestos de Rewards y Missions, ver sección 6.
- **Cofinanciación histórica** (50/50): RW8, `DEPRECATED`, no vigente.

**Regla explícita de este documento**: Points ≠ euros. `POINTS_PER_EURO` es una conversión de visualización/cálculo interno — los Points nunca son retirables ni transferibles a una cuenta bancaria (`lib/rewards/rules.ts:10-11`). Confirmado además por `rules.test.ts:51-61`, que verifica explícitamente que `create-reward-transaction.ts` no contiene ningún cálculo de comisión ni de revenue.

---

## 6. Pools

| Pool | Techo | Mide | `funding_type` afectado | Lock | Independiente de |
|---|---|---|---|---|---|
| **Rewards** | 100 €/mes | Coste real en EUR de canjes | Solo `'viao'` | `pg_advisory_xact_lock(hashtext('viao_reward_pool'))` | Missions |
| **Missions** | 3.000 Points/mes | Points emitidos por Missions | N/A (no pasa por `rewards_catalog`) | `pg_advisory_xact_lock(hashtext('viao_missions_pool'))` | Rewards |

Ambos pools están denominados en unidades distintas (EUR vs. Points), usan locks distintos y nunca se suman ni se comparten — confirmado en el comentario de `supabase/migrations/20260824101000_create_complete_mission_rpc.sql`: *"DISTINTO del de Rewards... nunca compartido, presupuestos independientes"*.

---

## 7. Seguridad e invariantes

Garantías ya verificadas — ninguna se crea en este documento, todas preexisten en código y tests:

- **Ledger append-only**: sin GRANT de `UPDATE`/`DELETE` para `service_role` (§4, RW2) — verificado además por un test dedicado que ejercita directamente ambos rechazos: `lib/rewards/create-reward-transaction.test.ts:253-270` ("service_role NO tiene GRANT de UPDATE ni DELETE sobre rewards_transactions").
- **Idempotencia**: constraint `UNIQUE` real, nunca solo lógica de aplicación (§4, RW4) — test-verificada en `lib/rewards/create-reward-transaction.test.ts:127-183`.
- **Concurrencia**: `profiles ... for update` (por usuario, siempre) + `pg_advisory_xact_lock('viao_reward_pool')` (solo `funding_type='viao'`) — dos locks con propósitos distintos, verificados con 10 llamadas concurrentes reales (`redeem-reward.test.ts:221-258`) y con una carrera real entre dos usuarios (`:320-371`).
- **Fail-closed — dos capas distintas, con dos niveles de evidencia distintos**:
  - La constraint de tabla `rewards_catalog_viao_requires_real_cost` (`real_cost_eur IS NOT NULL` obligatorio si `funding_type='viao'`) está implementada en DB **y** test-verificada: `redeem-reward.test.ts:374-390` demuestra que Postgres rechaza el INSERT de esa fila.
  - La defensa interna del RPC (`redeem_reward()`, `raise exception 'reward_missing_real_cost'`) está implementada en SQL como defensa en profundidad, pero **no tiene test directo** — el test citado arriba nunca llega a invocar el RPC, porque la fila inválida ya es rechazada antes, por la constraint de tabla. No se elimina esta garantía del documento; se deja explícito que es Código sin test propio, no Código + test.
- **Límite del 30%**: la regla existe en DB, impuesta por la constraint `rewards_catalog_viao_real_cost_within_30_percent` (`supabase/migrations/20260824091000_*.sql`), verificada directamente leyendo la migración. **No existe ningún test dedicado** que inserte un `real_cost_eur` fuera de ratio y espere el rechazo — los tests existentes (`redeem-reward.test.ts:261-287`, `:320-371`) construyen deliberadamente sus datos de prueba DENTRO del 30% para no activarla, exactamente para probar el pool mensual, no esta regla (así lo declaran sus propios comentarios). Se documenta como `Código (DB constraint)`, nunca como `Código + test`.
- **RLS/ownership**: `reward_redemptions_select_own` (RLS), y `cancel_redemption()` filtra por `user_id` — cancelar la redención de otro usuario se trata igual que "no existe" (`cancel-redemption.test.ts:139-155`).
- **Refund**: cancelar una redención `pending` genera una transacción positiva nueva (`reason='redemption_refund'`), nunca edita la original; cancelar dos veces nunca duplica el refund (`cancel-redemption.test.ts:94-116`).
- **Cancelación vs. `fulfilled`**: cancelar una redención ya `fulfilled` se rechaza explícitamente (`cancel-redemption.test.ts:119-136`); una carrera real entre cancelación y `markRedemptionFulfilled()` siempre termina en un estado consistente, verificado empíricamente en ambos órdenes posibles (`cancel-redemption.test.ts:175-220`).
- **`limit_per_user`**: cuenta redenciones `fulfilled`, no solo `pending` (`status <> 'cancelled'`) — verificado explícitamente, no solo inferido (`redeem-reward.test.ts:200-218`).

---

## 8. Evidencia

Migraciones: `20260817140005_create_rewards_transactions.sql`, `20260817140006_create_rewards_wallets_view.sql`, `20260817150000_enable_rls_and_policies.sql` (policy `rewards_transactions_select_own` y GRANT de `rewards_wallets` a `authenticated`), `20260818100000_add_idempotency_to_rewards_transactions.sql`, `20260818110000_grant_service_role_rewards_transactions.sql`, `20260818150000_fix_rewards_transactions_idempotency_per_user.sql`, `20260823150000_create_rewards_catalog.sql`, `20260823151000_create_reward_redemptions.sql`, `20260823152000_create_redeem_reward_rpc.sql`, `20260824091000_add_rewards_catalog_real_cost_limit.sql`.

RPCs: `redeem_reward()`, `cancel_redemption()` (ambas en `20260823152000_create_redeem_reward_rpc.sql`).

Código de aplicación: `lib/rewards/rules.ts`, `lib/rewards/create-reward-transaction.ts`, `lib/rewards/redeem-reward.ts`, `lib/rewards/cancel-redemption.ts`, `lib/rewards/mark-redemption-fulfilled.ts`, `lib/rewards/get-wallet-balance.ts`, `lib/rewards/get-rewards-catalog.ts`.

Tests: `lib/rewards/rules.test.ts`, `lib/rewards/redeem-reward.test.ts`, `lib/rewards/cancel-redemption.test.ts`, `lib/rewards/create-reward-transaction.test.ts`, `lib/rewards/get-wallet-balance.test.ts`, `lib/rewards/get-rewards-catalog.test.ts`.

---

## 9. Supersession / histórico

**RW8 — Cofinanciación 50/50 Partner/VIAO — `DEPRECATED`.**

Origen: `docs/VIAO_V1_LOOP_DECISION.md`, que proponía que el earning vía Partner se financiara al 50% entre el Partner y VIAO en el momento del canje. Esta cofinanciación **nunca se implementó en el schema real** — verificado directamente: `rewards_catalog.funding_type` es un binario (`'viao'`/`'partner'`), sin ninguna columna de porcentaje de reparto en ninguna tabla.

**Autoridad vigente**: `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`, que deroga formalmente el modelo 50/50 como parte de su propio Decision Lock (PMM4). Este documento no reactiva ni reinterpreta esa decisión histórica — solo la reconoce como `DEPRECATED`, consistente con la autoridad ya establecida.

**RW7 — `POINTS_PERCENTAGE_OF_COMMISSION`** sigue exactamente donde estaba: `FUTURE`/dormant, sin cambios respecto a su clasificación en `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` (donde se le da el mismo tratamiento en el contexto de Partners).

No se detectó ninguna otra decisión de Rewards que requiera marcarse como superseded.

---

## 10. Límites del documento

Explícitamente fuera de alcance — nada de lo siguiente se autoriza por este documento:

- Activar `POINTS_PERCENTAGE_OF_COMMISSION` / comisión de Partner.
- Implementar cualquier earning real vía Partner.
- Crear la tabla `partners`.
- Implementar el pool de Partners (P4).
- Modificar `lib/rewards/` o cualquier migración de Rewards.
- Modificar Missions.
- Cambiar `POINTS_PER_EURO`, `MAX_REWARD_REAL_COST_PERCENT`, `VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR` o `MISSIONS_POOL_MONTHLY_LIMIT_POINTS`.
- Cambiar la lógica de `redeem_reward()`/`cancel_redemption()`.

---

## 11. Dependencias

Este documento es autoridad exclusivamente para las decisiones Rewards V1 listadas en el Decision Register (sección 4). No sustituye ni tiene precedencia sobre:

- **Código real + tests + migraciones** — autoridad técnica última en cualquier discrepancia (principio 1, `docs/00_GOVERNANCE.md`).
- **`docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md`** — autoridad de producto/estrategia global.
- **`docs/VIAO_MVP_MASTER.md`** — autoridad de estado técnico/ingeniería granular (checkpoint), complementario a este documento, no sustituido por él.
- **`docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`** — autoridad del modelo económico de Partners (RW7/RW8 se alinean con ella, no la reemplazan).

---

## 12. Regla de no implementación

Este bloque es exclusivamente documental. Ningún código, migración, test, componente ni configuración fue creado o modificado para producir este documento.

---

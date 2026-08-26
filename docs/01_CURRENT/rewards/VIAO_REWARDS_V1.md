---
STATUS: CURRENT
ERA: V1 (implementado)
DOMAIN: Rewards
AUTHORITY: Current technical/product-domain document for Rewards V1. El código real, las migraciones y los tests siguen siendo la autoridad técnica última (principio 1, `docs/00_GOVERNANCE.md`) — este documento explica cómo funciona Rewards V1 hoy, no sustituye a esa autoridad ni al Decision Lock.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO Rewards V1 — Documento técnico CURRENT

### Relación con el Decision Lock: `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md` responde "qué está bloqueado". Este documento responde "cómo funciona Rewards V1 y cuál es su estado técnico real". Ninguna decisión del Decision Lock se reinterpreta ni se modifica aquí.

---

## 3. Propósito

Rewards es el sistema que otorga, almacena y permite gastar los **VIAO Points** dentro del loop actual del producto (`Usuario → actividad → Points → Goal/Reward → repetición`, `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` §4-5). Es el **único ledger económico** de VIAO — Missions, la recompensa de reserva confirmada y la recompensa de registro escriben todas sobre el mismo ledger, nunca sobre uno propio. Rewards no decide qué genera Points (eso lo decide cada dominio que lo consume: Booking, Missions, registro) — decide cómo se registran, se leen y se gastan de forma segura.

---

## 4. Estado actual

**`FACT`** (implementado y verificado directamente en código/migraciones/tests):
- Ledger (`rewards_transactions`), wallet derivada (`rewards_wallets`), catálogo (`rewards_catalog`), redenciones (`reward_redemptions`), RPCs `redeem_reward()`/`cancel_redemption()`, y los 7 servicios TS de `lib/rewards/`.

**`LOCKED`** (decisión de producto ya implementada, ver Decision Lock RW1-RW6):
- `POINTS_PER_EURO=100`, ledger append-only, wallet como vista, idempotencia del ledger, límite del 30% del coste real, pool VIAO de 100€/mes.

**`FUTURE`**:
- `POINTS_PERCENTAGE_OF_COMMISSION=25%` (RW7) — dormant, sin flujo que lo consuma.

**`DEPRECATED`**:
- Cofinanciación 50/50 Partner/VIAO (RW8) — nunca implementada, formalmente retirada por `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`.

**`NOT IMPLEMENTED`** (confirmado por ausencia real, no asumido — ver sección 17).

Este documento no mezcla estas categorías: cada afirmación de las secciones siguientes indica a cuál pertenece.

---

## 5. Arquitectura

```
rewards_transactions (ledger, append-only, fuente de verdad)
        │
        ├── rewards_wallets (VIEW, SUM(amount) GROUP BY user_id)
        │
        ├── escrito por:
        │     - lib/rewards/create-reward-transaction.ts (booking, registration genérico)
        │     - trigger handle_new_user() (registro real, SQL directo)
        │     - RPC redeem_reward() (canje, SQL directo)
        │     - RPC cancel_redemption() (refund, SQL directo)
        │     - RPC complete_mission() (Missions — fuera de alcance de este documento)
        │
        └── leído por:
              - lib/rewards/get-wallet-balance.ts
              - lib/rewards/get-reward-transactions.ts

rewards_catalog (catálogo, lectura abierta a authenticated)
        │
        └── reward_redemptions (estado de cada canje: pending/fulfilled/cancelled)
                  │
                  ├── creado/cancelado por: redeem_reward() / cancel_redemption()
                  └── fulfilled por: lib/rewards/mark-redemption-fulfilled.ts (UPDATE directo, sin RPC dedicado)
```

**Servicios TS** (`lib/rewards/`): `rules.ts` (constantes), `create-reward-transaction.ts`, `redeem-reward.ts`, `cancel-redemption.ts`, `mark-redemption-fulfilled.ts`, `get-wallet-balance.ts`, `get-reward-transactions.ts`, `get-rewards-catalog.ts`. Ninguno de estos archivos escribe en `rewards_transactions` fuera del patrón descrito arriba — confirmado por lectura directa de cada uno.

---

## 6. Earning

Earning real, verificado en código — nada inventado:

| Fuente | Regla | Estado | Evidencia |
|---|---|---|---|
| Reserva de hotel confirmada | `HOTEL_BOOKING_REWARD_RATE=0.02` (2% del importe), vía `calculateHotelBookingRewardPoints()` | `LOCKED`/`FACT` | `lib/rewards/rules.ts:27,37-39` |
| Registro de usuario | `REGISTRATION_REWARD_POINTS_PROVISIONAL=100`, monto fijo, explícitamente etiquetado `PROVISIONAL` | `FACT` (activo), no es un `RW` del Decision Lock | `lib/rewards/rules.ts:46-56`; trigger `handle_new_user()`, `supabase/migrations/20260818120000_*.sql`; `lib/rewards/registration-reward.test.ts` (2 tests: exactamente una vez, sin duplicado en reintento) |
| Missions | 10/10/10/50 Points según Mission | `FACT` — fuera de alcance de este documento, ver el futuro `VIAO_MISSIONS_V1.md` | `complete_mission()` RPC |
| Partner (actividad comercial real) | — | **`NOT IMPLEMENTED`** — ver sección 17 | Ausencia confirmada |

**No existe** ningún earning de Partner en el código actual — no se inventa ni se diseña aquí.

---

## 7. Ledger

`rewards_transactions` (`supabase/migrations/20260817140005_create_rewards_transactions.sql`):

| Columna | Regla |
|---|---|
| `amount` | `integer`, `CHECK (amount <> 0)`, signo obligatorio: `(type='earned' AND amount>0) OR (type='spent' AND amount<0)` |
| `type` | `CHECK IN ('earned','spent')` |
| `reason` | texto libre (`'registration'`, `'booking'`, `'redemption'`, `'redemption_refund'`, `'mission:'+key`, …) |
| `reference_type`/`reference_id` | opcionales; cuando ambos están presentes, participan en la constraint de idempotencia |

**Append-only**: `service_role` tiene únicamente `SELECT, INSERT` (`20260818110000_*.sql:28`) — sin `UPDATE`/`DELETE` en ninguna migración (confirmado por grep exhaustivo sobre `supabase/migrations/`, no solo por lectura puntual). Verificado además por test dedicado: `create-reward-transaction.test.ts:253-270` intenta un `UPDATE` y un `DELETE` directos con `service_role` y confirma que ambos son rechazados por Postgres.

**Idempotencia**: `UNIQUE(user_id, reason, reference_type, reference_id)` (`20260818150000_*.sql`, corrigiendo una constraint anterior sin `user_id` que bloqueaba incorrectamente recompensar a dos usuarios distintos sobre la misma referencia — hallazgo empírico documentado en la propia migración). Test-verificada en `create-reward-transaction.test.ts:127-160` (idempotencia real) y `:162-183` (bajo llamadas concurrentes).

**Permisos**: `authenticated` solo `SELECT` de sus propias filas (`rewards_transactions_select_own`, `20260817150000_enable_rls_and_policies.sql`); ningún rol de cliente tiene INSERT — confirmado por `create-reward-transaction.test.ts:219-251` (ni `anon` ni `authenticated` pueden insertar directamente).

---

## 8. Wallet

`rewards_wallets` (`20260817140006_create_rewards_wallets_view.sql`) es una **VIEW**, no una tabla: `SELECT user_id, SUM(amount)::integer AS balance FROM rewards_transactions GROUP BY user_id`, con `security_invoker=true` (hereda la RLS de `rewards_transactions`, cada usuario ve solo su propio saldo). **No existe ningún saldo editable independiente** — el balance no puede divergir del ledger porque no hay una segunda copia que sincronizar; es literalmente la misma suma, recalculada en cada consulta. Lectura vía `lib/rewards/get-wallet-balance.ts` (cliente de sesión, nunca `service_role`).

---

## 9. Rewards Catalog

`rewards_catalog` (`20260823150000_create_rewards_catalog.sql`):

| Columna | Regla |
|---|---|
| `points_cost` | `integer`, `CHECK (points_cost > 0)` — valor nominal en Points |
| `funding_type` | `CHECK IN ('viao','partner')` |
| `real_cost_eur` | `numeric(10,2)`, obligatorio si `funding_type='viao'` (constraint `rewards_catalog_viao_requires_real_cost`); puede ser `NULL` si `funding_type='partner'` — coste asunto del propio Partner, no contabilizado contra ningún pool de VIAO |
| `partner_name` | texto libre — **no es FK**; la tabla `partners` no existe (ver sección 17) |
| `limit_per_user` | opcional |
| `active` | boolean, controla visibilidad en el catálogo |

**Restricción adicional** (`20260824091000_*.sql`): `real_cost_eur <= 0.30 * (points_cost/100)` cuando `funding_type='viao'` (constraint `rewards_catalog_viao_real_cost_within_30_percent`, `NOT VALID` — solo filas nuevas). `points_cost` y `real_cost_eur` son columnas independientes: `real_cost_eur` nunca se deriva de `points_cost`, se introduce manualmente al crear la fila.

**Qué NO existe todavía en este schema**: ninguna columna de tier/plan de suscripción, ninguna columna de porcentaje de cofinanciación, ninguna FK a una tabla `partners` real.

---

## 10. Redemption

`redeem_reward(p_user_id, p_reward_catalog_id, p_attempt_id)` (`20260823152000_create_redeem_reward_rpc.sql`), `SECURITY DEFINER`, invocable solo por `service_role`:

1. Lock del usuario (`profiles ... for update`) — serializa canjes concurrentes del mismo usuario.
2. Idempotencia por `redemption_attempt_id` (mismo intento nunca descuenta dos veces).
3. Valida que el Reward exista y esté `active`.
4. `limit_per_user`: cuenta redenciones `status <> 'cancelled'` — **incluye `fulfilled`, no solo `pending`** (test-verificado, `redeem-reward.test.ts:200-218`).
5. Comprueba saldo real (misma fuente que `rewards_wallets`, nunca una segunda fuente).
6. Si `funding_type='viao'`: lock del pool (`pg_advisory_xact_lock('viao_reward_pool')`), fail-closed si falta `real_cost_eur` (`reward_missing_real_cost`), comprueba el techo mensual de 100€ (`v_monthly_pool_limit_eur := 100.00`, hardcodeado en la función).
7. INSERT atómico: ledger (negativo) + `reward_redemptions` (`pending`).

**Concurrencia**: 10 llamadas simultáneas reales → exactamente 1 éxito, saldo nunca negativo (`redeem-reward.test.ts:221-258`); dos usuarios distintos compitiendo por el mismo remanente del pool → exactamente 1 éxito (`:320-371`).

**Límite del 30%**: existe como constraint de tabla (`rewards_catalog_viao_real_cost_within_30_percent`), verificada directamente en la migración. **No existe ningún test dedicado** que inserte un `real_cost_eur` fuera de ratio y compruebe el rechazo — los tests de pool (`:261-287`, `:320-371`) construyen sus datos deliberadamente dentro del 30% para no activarla (así lo declaran sus propios comentarios), porque prueban el pool mensual, no esta regla.

**Fail-closed — dos capas con evidencia distinta**: la constraint de tabla `real_cost_eur IS NOT NULL` está test-verificada (`redeem-reward.test.ts:374-390`, Postgres rechaza el INSERT). La defensa interna del RPC (`reward_missing_real_cost`) existe en SQL pero **nunca es alcanzada por ningún test** — el test citado nunca llega a invocar el RPC, porque la fila inválida ya es rechazada antes por la tabla.

---

## 11. Cancellation / Refund

`cancel_redemption(p_redemption_id, p_user_id)` (mismo archivo): filtra por `user_id` (cancelar la redención de otro usuario se trata igual que "no existe", `cancel-redemption.test.ts:139-155`); cancelar una `pending` genera un refund append-only (`type='earned', reason='redemption_refund'`, nunca edita la transacción original); cancelar dos veces la misma redención nunca duplica el refund (`:94-116`, reutiliza la constraint de idempotencia del ledger como defensa en profundidad); cancelar una `fulfilled` se rechaza explícitamente (`:119-136`). Una carrera real entre `cancel_redemption()` y `markRedemptionFulfilled()` sobre la misma redención siempre termina en un estado consistente, verificado empíricamente en ambos órdenes posibles (`:175-220`).

`lib/rewards/mark-redemption-fulfilled.ts`: `UPDATE` directo (no RPC dedicado — la transición `pending→fulfilled` no toca el ledger, solo el estado de la redención). **No tiene archivo de test propio** — se ejercita indirectamente dentro de `redeem-reward.test.ts` (el caso de `limit_per_user` con una redención `fulfilled`) y de `cancel-redemption.test.ts` (la carrera cancel/fulfill). Código listo, sin ningún flujo de Partner real que lo dispare todavía (comentario propio del archivo).

---

## 12. Seguridad

Garantías realmente existentes, cada una con su tipo de evidencia:

| Garantía | DB/RPC (Categoría A) | Test (Categoría B) |
|---|---|---|
| Ledger append-only | Sí — sin GRANT UPDATE/DELETE | Sí — `create-reward-transaction.test.ts:253-270` |
| Idempotencia del ledger | Sí — `UNIQUE(user_id,reason,reference_type,reference_id)` | Sí — `create-reward-transaction.test.ts:127-183` |
| Idempotencia de canje (retry) | Sí — `UNIQUE(redemption_attempt_id)` | Sí — `redeem-reward.test.ts:155-176` |
| Concurrencia de canje | Sí — lock usuario + `pg_advisory_xact_lock` | Sí — `redeem-reward.test.ts:221-258`, `:320-371` |
| Límite 30% coste real | Sí — CHECK `NOT VALID` | **No** — sin test dedicado |
| Fail-closed (tabla, `real_cost_eur`) | Sí — CHECK | Sí — `redeem-reward.test.ts:374-390` |
| Fail-closed (RPC, `reward_missing_real_cost`) | Sí — `raise exception` en SQL | **No** — nunca alcanzado por ningún test |
| RLS/ownership | Sí — policies `_select_own` | Sí — `cancel-redemption.test.ts:139-155` |
| Refund exactamente una vez | Sí — reutiliza constraint del ledger | Sí — `cancel-redemption.test.ts:94-116` |
| `limit_per_user` cuenta `fulfilled` | Sí — `status <> 'cancelled'` | Sí — `redeem-reward.test.ts:200-218` |
| GRANT/EXECUTE revocado a cliente | Sí — `revoke execute ... from public, anon, authenticated` | Sí — `create-reward-transaction.test.ts:219-251` |

---

## 13. Economía

| Concepto | Unidad | Estado | Implementado | Fuente |
|---|---|---|---|---|
| Points (emisión) | Points | `LOCKED` | Sí | `POINTS_PER_EURO=100`, `HOTEL_BOOKING_REWARD_RATE=0.02` |
| Reward cost (coste real) | EUR | `LOCKED` | Sí | `rewards_catalog.real_cost_eur`, independiente de `points_cost` |
| `funding_type` | — | `LOCKED` | Sí | binario `viao`/`partner` |
| VIAO Reward pool | EUR/mes | `LOCKED` | Sí | 100€/mes, `pg_advisory_xact_lock('viao_reward_pool')` |
| Missions pool | Points/mes | `LOCKED` | Sí (fuera de alcance de este documento) | 3.000 Points/mes, `pg_advisory_xact_lock('viao_missions_pool')` |
| Partner commission | % | `FUTURE`/dormant | No (constante sin consumidor) | `POINTS_PERCENTAGE_OF_COMMISSION=0.25` |
| Cofinanciación 50/50 | % | `DEPRECATED` | No, nunca | `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` |
| Partner subscription/tiers | — | `NOT IMPLEMENTED` | No | Ausencia confirmada en schema |

**Explícito**: Rewards pool (100 EUR/mes) y Missions pool (3.000 Points/mes) **no son el mismo presupuesto**, no se suman, y no comparten advisory lock — locks distintos (`viao_reward_pool` vs. `viao_missions_pool`), unidades distintas (EUR vs. Points).

---

## 14. Tests

Ver citas exactas en las secciones 7, 10-12. Resumen de lo que cada bloque de tests demuestra realmente, sin atribuir a un test una garantía que no prueba:

- **Idempotencia del ledger (RW4)**: `create-reward-transaction.test.ts`, no `redeem-reward.test.ts:155-176` (ese archivo prueba `redemption_attempt_id`, una constraint distinta sobre `reward_redemptions`).
- **Límite del 30% (RW5)**: constraint real en DB, **sin test dedicado** — no se afirma lo contrario.
- **Fail-closed**: constraint de tabla test-verificada; defensa interna del RPC (`reward_missing_real_cost`) sin test directo.

Archivos de test de `lib/rewards/`: `rules.test.ts`, `create-reward-transaction.test.ts`, `redeem-reward.test.ts`, `cancel-redemption.test.ts`, `registration-reward.test.ts`, `get-wallet-balance.test.ts`, `get-rewards-catalog.test.ts`. `mark-redemption-fulfilled.ts` no tiene archivo de test propio.

---

## 15. Future

`POINTS_PERCENTAGE_OF_COMMISSION=25%` (`lib/rewards/rules.ts:68`) permanece `FUTURE`/dormant: comentario propio del código confirma que "todavía no existe ningún flujo de earning ligado a comisión de Partner"; cero referencias fuera de `rules.ts` en todo `lib/` (confirmado por grep). No se activa, no se diseña su implementación en este documento.

---

## 16. Deprecated

La cofinanciación 50/50 Partner/VIAO (origen: `docs/VIAO_V1_LOOP_DECISION.md`) nunca se implementó en el schema real — `rewards_catalog.funding_type` es y siempre ha sido un binario, sin ninguna columna de reparto porcentual. Formalmente retirada por `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`. No se presenta en ningún punto de este documento como economía vigente.

---

## 17. Not implemented

Confirmado por ausencia real (grep directo sobre `.ts`/`.sql` de todo el repositorio, no asumido):

- **Flujo real de Partner commission** — cero código que consuma `POINTS_PERCENTAGE_OF_COMMISSION`.
- **Tabla `partners`** — no existe; `rewards_catalog.partner_name` es texto libre sin FK.
- **`partner_activities` / `complete_partner_activity()`** — cero coincidencias en todo el repositorio.
- **Pool de Partners (P4, 3.000 Points/mes)** — decidido a nivel de documento (`VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`), sin ningún `pg_advisory_xact_lock` correspondiente en código.
- **Schema de tiers/suscripción** — ninguna columna de plan/tier en ninguna tabla del proyecto.

---

## 18. Dependencias

- **Missions**: pool independiente (sección 13), RPC independiente (`complete_mission()` vs. `redeem_reward()`), sin llamada cruzada entre ambos. Ambos escriben al mismo ledger (`rewards_transactions`) con `reason` distinto.
- **Goals**: `GOAL_PROGRESS_MODEL=WALLET_BALANCE` está `LOCKED` (`VIAO_GOALS_V1_DECISION_LOCK.md`) — el progreso del Goal **se deriva directamente** del saldo del Wallet (`progress_percent = round(wallet_balance/target_points*100)`). No se afirma que sean independientes: es una relación de derivación intencional, no un acoplamiento accidental.
- **Partners**: sin integración real todavía (sección 17). El único vínculo hoy es conceptual (`funding_type='partner'` en el catálogo, con `partner_name` de texto libre).
- **Travel/Vision**: sin relación de código con Rewards más allá de que una reserva confirmada dispara `calculateHotelBookingRewardPoints()`.

---

## 19. Referencias

- `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md` — decisiones bloqueadas (RW1-RW8), este documento no las reinterpreta.
- `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` — autoridad de producto/estrategia global.
- `docs/VIAO_MVP_MASTER.md` — checkpoint técnico anterior (commit `25bde807`), complementario, no autoridad superior a este documento ni al código.
- `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` — autoridad del modelo económico de Partners (RW7/RW8).

---

## 20. Handoff — para abrir un nuevo chat

1. **CURRENT Rewards**: este documento, `docs/01_CURRENT/rewards/VIAO_REWARDS_V1.md` — cómo funciona Rewards V1 hoy.
2. **Decision Lock Rewards**: `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md` — qué está bloqueado (RW1-RW8), ya auditado independientemente y corregido.
3. **Autoridad técnica última**: código real + tests + migraciones de `lib/rewards/` y `supabase/migrations/`. Ante cualquier discrepancia, el código gana.
4. **Qué NO debe modificarse sin una nueva decisión explícita**: `POINTS_PER_EURO`, `MAX_REWARD_REAL_COST_PERCENT`, `VIAO_REWARD_POOL_MONTHLY_LIMIT_EUR`, el ledger append-only, `redeem_reward()`/`cancel_redemption()`, y no activar `POINTS_PERCENTAGE_OF_COMMISSION` ni reactivar la cofinanciación 50/50.

---

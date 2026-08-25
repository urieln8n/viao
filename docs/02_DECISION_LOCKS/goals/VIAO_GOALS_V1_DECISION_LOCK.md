---
STATUS: LOCKED
ERA: V1 checkpoint
DOMAIN: Goals
AUTHORITY: Fuente de verdad de Goals — APPROVED / IMPLEMENTED, confirmado directamente en código (lib/goals/get-goal.ts, lib/goals/calculate-progress.ts)
SUPERSEDES: Modelo HYBRID de progreso, congelado en docs/99_ARCHIVE_V1/checkpoints/VIAO_V1_EXECUTION_LOCK.md
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-24 (fecha propia)
---

# VIAO — Goals V1 Decision Lock

**Estado:** DECISION LOCK — **APPROVED / IMPLEMENTED**
**Fecha:** 2026-08-24 (propuesto) — aprobado e implementado 2026-08-24
**HEAD en el momento de este documento:** `25bde80` ("feat: complete missions v1") — implementación en el commit `feat: implement goals v1 wallet balance`

**Nota de implementación (post-aprobación)**: el propietario aprobó explícitamente `GOAL_PROGRESS_MODEL = WALLET_BALANCE`. Quedó implementado tal como se diseñó en este documento, sin desviaciones: `lib/goals/calculate-progress.ts` (función pura `calculateGoalProgressPercent()`), `lib/goals/get-goal.ts` simplificado (ya no lee `rewards_transactions`), `app/goal-card.tsx` con una única cifra de progreso, y la auto-cancelación vía el nuevo trigger `cancel_active_goal_before_insert()` (`supabase/migrations/20260824110000_goals_auto_cancel_active_on_create.sql`). **No fue necesario modificar `protect_goal_immutable_fields()`** — ya permitía `active → cancelled` sin importar el origen del UPDATE, verificado con una transacción de prueba real antes de escribir ningún test. La semántica de `completed` sigue **OPEN / DERIVED ONLY / NO AUTOMATIC PERSISTENCE** — no se tocó el trigger que la bloquea, tal como exigía este documento.

---

## 1. Executive Summary

Se propone fijar `GOAL_PROGRESS_MODEL = WALLET_BALANCE` para VIAO V1, sustituyendo al modelo híbrido actualmente commiteado (`e0c39ea`/`76f0947`). La razón central: el loop V1 (`GUARDAR PARA VIAJE` vs `REDEEM REWARD`) solo funciona como una decisión real si canjear tiene un coste visible sobre el objetivo de viaje — el modelo híbrido actual elimina ese coste. El modelo híbrido no fue un error: fue una decisión de producto anterior, tomada para evitar una señal desmotivadora al canjear. Esa decisión queda **superada** por la tesis V1 posterior, más deliberada: la bifurcación guardar/gastar debe tener consecuencia real.

Este documento congela la decisión y su razonamiento. **No implementa nada.** La implementación, si se aprueba, es un bloque propio y posterior (sección 19).

---

## 2. Current State

Verificado contra el código real en el momento de este documento (HEAD `25bde80`):

- **`lib/goals/get-goal.ts`**: `earnedTowardGoal = points_at_goal_creation + SUM(rewards_transactions.amount WHERE type='earned' AND reason<>'redemption_refund' AND created_at >= goal.created_at)`. Monotónico, nunca baja.
- **`supabase/migrations/20260823153000_create_goals.sql`**: trigger `set_goal_points_at_creation()` (`BEFORE INSERT`, `SECURITY DEFINER`) congela `points_at_goal_creation` con el saldo real en el momento de creación, ignorando cualquier valor enviado por el cliente.
- **`supabase/migrations/20260824090000_protect_goals_immutable_fields.sql`**: trigger `protect_goal_immutable_fields()` (`BEFORE UPDATE`) permite ÚNICAMENTE la transición `active → cancelled`. Cualquier otra transición de `status` (incluida `active → completed`) se rechaza explícitamente (`raise exception 'goal_invalid_status_transition'`).
- **`goals_one_active_per_user_idx`**: índice único parcial `ON goals(user_id) WHERE status='active'` — sigue siendo la garantía real de "máximo un Goal activo", a nivel de base de datos.
- **`lib/rewards/redeem-reward.ts`** / **RPC `redeem_reward()`**: ya inserta `type='spent', amount=-points_cost` en `rewards_transactions`, leyendo el saldo real (`SUM(amount)`) antes de autorizar el canje. Sin cambios necesarios.
- **`lib/rewards/cancel-redemption.ts`** / **RPC `cancel_redemption()`**: ya inserta el refund como `type='earned', reason='redemption_refund'`. Sin cambios necesarios.
- **`lib/goals/create-goal.ts`**: tras un INSERT real y exitoso, invoca `completeMission(user.id, "goal_created")` — hook de Missions ya commiteado (`25bde80`), con `periodicity: "lifetime"`.
- **Tests existentes** (`lib/goals/get-goal.test.ts`, `create-goal.test.ts`) codifican exactamente el comportamiento HYBRID actual como comportamiento correcto — incluyen aserciones que, bajo WALLET_BALANCE, pasarían a ser incorrectas (detalle en sección 16).
- **`app/goal-card.tsx`**: ya recibe `walletBalance` como prop separada de `goal.earnedTowardGoal` y ya la muestra en UI bajo la etiqueta "Disponible ahora" — el dato que necesita WALLET_BALANCE **ya llega a la UI hoy**, solo no se usa para calcular el `progressPercent` de la barra.

---

## 3. Historical Decision

El propio comentario de `20260823153000_create_goals.sql` documenta que un modelo basado en saldo (`progress = saldo actual`) **ya existió antes** y fue sustituido por el modelo híbrido porque *"retrocedía al canjear y generaba una señal desmotivadora"*.

Esto **no fue un bug ni una decisión errónea** — fue una respuesta de producto legítima a un problema de UX real y observado. Se documenta aquí explícitamente como tal, no como "código incorrecto".

Esa decisión queda **superada** para V1 por una tesis de producto posterior y más deliberada: la propia bifurcación `GUARDAR vs REDEEM`, columna vertebral del loop V1 (`VIAO_V1_LOOP_DECISION.md`, `VIAO_V1_EXECUTION_LOCK.md`, `VIAO_V1_PRODUCT_LOOP_CHECKPOINT.md`), exige que gastar tenga una consecuencia real y visible — algo que el modelo híbrido, por diseño, impide. El problema de comunicación que originó HYBRID sigue siendo real, pero tiene una mitigación conocida que no requiere falsear el dato (sección 12), a diferencia de HYBRID, que evita la incomodidad ocultando información económica real al usuario.

---

## 4. V1 Decision

```
GOAL_PROGRESS_MODEL = WALLET_BALANCE
```

```
progress_percent = min(100, round(wallet_balance / target_points * 100))
```

Donde `wallet_balance` es el saldo real derivado exclusivamente de `rewards_transactions` — la misma fuente que ya usa `rewards_wallets`/`get-wallet-balance.ts` en el resto de la app. No se crea ningún segundo ledger, ninguna segunda contabilidad, ninguna tabla nueva.

Comportamiento oficial V1:

| Evento | Wallet | Goal |
|---|---|---|
| Earn | ↑ | ↑ |
| Redeem | ↓ | ↓ |
| Refund | ↑ | ↑ |

---

## 5. Goal semantics

Un Goal en VIAO V1 **no** representa "todo lo que el usuario ha ganado históricamente". Representa:

**"Cuántos Points tiene actualmente disponibles para acercarse a su objetivo de viaje."**

Esto encaja directamente con el loop V1:

```
USUARIO
  ↓
ACTIVIDAD COTIDIANA
  ↓
PARTNERS
  ↓
COMPRA ATRIBUIDA
  ↓
COMISIÓN
  ↓
POINTS
  ↓
GOAL
  ↓
GUARDAR / REDEEM
  ↓
REPETIR
```

La bifurcación `GUARDAR vs REDEEM` debe ser una decisión real, con una consecuencia real y visible sobre el Goal — de lo contrario, no es una bifurcación, es una ilusión de elección.

---

## 6. Progress formula

```
progress_percent = min(100, round(wallet_balance / target_points * 100))
```

`wallet_balance` se deriva en cada lectura, nunca se almacena — mismo principio ya usado por `rewards_wallets` (vista, no tabla materializada).

---

## 7. Wallet / Ledger relationship

```
rewards_transactions
        ↓
   wallet_balance
        ↓
   goal_progress
```

`rewards_transactions` sigue siendo la **única fuente de verdad económica** de todo VIAO. Goals no crea otro ledger, otra contabilidad, otra tabla de Points, ni otra suma paralela de saldo — solo consume el Wallet real para calcular el progreso, en lectura.

---

## 8. Rewards interaction

**No se modifica ahora**: `lib/rewards/redeem-reward.ts`, `lib/rewards/cancel-redemption.ts`.

El comportamiento económico que WALLET_BALANCE necesita ya existe en Rewards tal como está: `redeem` ya escribe `-N` (`type='spent'`), `refund` ya escribe `+N` (`type='earned', reason='redemption_refund'`). La reconciliación de Goals no requiere ningún cambio en Rewards.

Con WALLET_BALANCE, la exclusión especial de `reason='redemption_refund'` (necesaria hoy en `get-goal.ts` para que el modelo híbrido no se infle a sí mismo tras un ciclo canjear→cancelar) **deja de ser necesaria** — el saldo real ya refleja correctamente la operación sin ningún caso especial. Esto es una simplificación arquitectónica que resulta de la decisión, no un objetivo en sí mismo.

---

## 9. Goal creation / auto-cancel

Decisión V1: **crear un nuevo Goal cancela automáticamente el Goal activo anterior.**

```
Goal "Roma" = active
usuario crea Goal "París"
        ↓
Roma → cancelled
París → active
```

**Máximo 1 Goal `active` por usuario, sin excepción.** La garantía final sigue siendo el índice único parcial `goals_one_active_per_user_idx` (`user_id`, `WHERE status='active'`) — no se elimina ni se debilita esa protección bajo ninguna circunstancia.

**IMPLEMENTADO**: trigger `BEFORE INSERT` `cancel_active_goal_before_insert()` (`supabase/migrations/20260824110000_goals_auto_cancel_active_on_create.sql`), mismo patrón `SECURITY DEFINER` ya usado en esta tabla, que cancela cualquier Goal `active` existente del mismo `user_id` antes de que el INSERT proceda. Mantiene Goals en su Patrón A actual (RLS directo, sin mover a `service_role`/RPC) — el cliente sigue haciendo un `.insert()` plano, sin cambios en `lib/goals/create-goal.ts`.

---

## 10. Concurrency

Ante dos creaciones simultáneas de Goal para el mismo usuario:

- El trigger de auto-cancelación debe ser seguro bajo concurrencia real de Postgres (`READ COMMITTED`): el `UPDATE` que cancela el Goal previo se serializa de forma natural sobre cualquier fila existente.
- El índice único parcial sigue siendo la **garantía final e irrenunciable**: incluso en el peor caso de una carrera genuina, nunca puede confirmarse más de un Goal `active` por usuario — el segundo INSERT concurrente fallaría con `23505` si ambas transacciones parten de un estado sin Goal activo aún.
- **Nunca deben existir dos Goals `active` simultáneamente** — esta invariante no cambia respecto al comportamiento actual, solo cambia si el segundo intento requiere un paso manual de cancelación previo (hoy) o queda resuelto automáticamente (V1 propuesto).

**IMPLEMENTADO y verificado**: probado con un test de concurrencia real (`Promise.all`, 5 creaciones simultáneas contra Supabase local) — resultado: nunca más de un Goal `active` para el usuario, verificado directamente contra la DB tras la carrera. Comportamiento residual conocido y aceptado (no viola ninguna invariante exigida): en una carrera genuina con un Goal previo existente, el Goal creado por la llamada que pierde la carrera puede quedar `cancelled` momentos después de haberse creado con éxito (nunca dos activos a la vez, pero el "ganador" final es quien ejecuta último, no necesariamente quien empezó primero) — documentado en el comentario de cabecera de la migración.

---

## 11. Goal completion — OPEN DECISION

`wallet_balance >= target_points` significa, conceptualmente, "objetivo alcanzado". **Esta sección queda explícitamente abierta — no se resuelve en este documento.**

Preguntas sin resolver:
- ¿Se persiste `status='completed'` (requiere migrar `protect_goal_immutable_fields()` para permitir esa transición, hoy explícitamente prohibida), o se muestra como estado derivado en lectura, sin escribir nada?
- Si se persiste: tras `1.000/1.000 → completed`, si el usuario canjea 500 después, ¿el Goal sigue `completed`? ¿vuelve a `active`? ¿se considera "completado históricamente" de forma permanente vía un campo separado (`completed_at`), independiente de que el progreso en vivo pueda volver a bajar del 100%?

**Recomendación registrada, no decidida**: no introducir todavía una transición automática irreversible a `completed`. Definir primero la semántica exacta antes de escribir cualquier migración. Estado: **OPEN / DERIVED ONLY / NO AUTOMATIC PERSISTENCE.**

**Confirmado en la implementación de Goals V1**: `protect_goal_immutable_fields()` no se tocó — sigue rechazando explícitamente cualquier transición a `completed`. "Meta alcanzada" (`wallet_balance >= target_points`) es hoy puramente un estado derivado en lectura (el propio `progress_percent` llegando a 100), nunca escrito en `status`. Ninguna dependencia técnica encontrada que obligara a resolver esta decisión — tal como anticipaba este documento.

---

## 12. UX mitigation

Riesgo principal identificado de WALLET_BALANCE: que el usuario perciba la caída de la barra al canjear como un castigo, en vez de como el resultado de su propia elección informada.

Mitigación recomendada (dirección UX):
- Mensaje transaccional explícito en el momento del canje: *"Usaste 300 Points de tu objetivo Roma."* o *"Reward conseguido. Te quedan 700 Points para Roma."*
- El copy principal del progreso debería priorizar la disponibilidad sobre el porcentaje desnudo: *"700 / 1.000 Points disponibles"* antes que depender únicamente de *"70%"*.

Esto resuelve el problema histórico (sección 3) explicando la causalidad en el momento en que el propio usuario decide gastar — en vez de ocultar el número real.

**Implementado (parcialmente, dentro del scope estricto de Goals)**: `app/goal-card.tsx` ahora muestra una única fila "Disponible ahora: {wallet} / {target} Points" (reemplaza las dos filas anteriores "Ganado para tu objetivo" + "Disponible ahora", que bajo WALLET_BALANCE serían el mismo número mostrado dos veces). **No implementado**: el mensaje transaccional en el momento del canje ("Usaste 300 Points...") — requeriría tocar la UI de Rewards/redención, fuera del scope de este bloque (Goals). Queda como follow-up, no como parte de esta implementación.

---

## 13. Missions interaction

**Confirmado, sin modificar Missions**: la decisión de Goals no requiere ningún cambio en `lib/missions/`. En particular, `goal_created` sigue protegido por `period_key='lifetime'` + `UNIQUE(user_id, mission_key, period_key)` — la protección vive en la constraint de base de datos del RPC `complete_mission()`, no en cuántas veces se invoque `completeMission()` desde TypeScript. Aunque la auto-cancelación (sección 9) haga que el evento `goal_created` se dispare en cada creación de Goal (no solo en la primera vez), cada llamada adicional golpea el camino idempotente ya probado (`if found then return v_existing`) sin tocar el ledger de nuevo. Crear/cancelar/recrear Goals no permite farmear la Mission de forma indefinida.

Missions ya está commiteada en `25bde807a60d2a37355b5f123a08d9d4c76a6628` — este documento no modifica ese bloque.

---

## 14. Partners interaction

No se implementa Partners en este documento. Se documenta que WALLET_BALANCE encaja coherentemente con el futuro modelo:

```
Partner
  ↓
compra atribuida
  ↓
comisión
  ↓
Points
  ↓
Wallet
  ↓
Goal
```

Los Points generados por la actividad de un Partner siguen contando hacia el Goal mientras permanezcan en el Wallet. En el momento en que se gastan (en un Reward, en cualquier otro Partner), dejan de financiar ese Goal — la cadena de atribución económica se mantiene honesta de principio a fin. Bajo el modelo híbrido, un Point generado por un Partner seguiría "contando como progreso hacia Roma" incluso después de gastado en otra cosa, rompiendo esa cadena de atribución.

---

## 15. Database impact

| Elemento | Impacto |
|---|---|
| `goals.points_at_goal_creation` | **IMPLEMENTADO tal como se propuso**: sin cambio de schema, columna conservada sin uso en el cálculo de progreso |
| `set_goal_points_at_creation()` (trigger) | Sin cambio — no se eliminó |
| `protect_goal_immutable_fields()` (trigger) | **Sin cambio — confirmado innecesario**: ya permitía `active→completed` seguir bloqueado y `active→cancelled` seguir permitido, sin ninguna modificación |
| Nuevo trigger `BEFORE INSERT` `cancel_active_goal_before_insert()` (auto-cancelar, sección 9) | **IMPLEMENTADO** — `supabase/migrations/20260824110000_goals_auto_cancel_active_on_create.sql` |
| `goals_one_active_per_user_idx` | Sin cambio — se conserva como garantía final |
| `rewards_transactions` / `rewards_wallets` | Sin cambio — siguen siendo la única fuente de verdad |
| Backfill de datos existentes | No fue necesario — confirmado: el cálculo de progreso es de lectura, no una columna almacenada; no se ejecutó ningún backfill |

---

## 16. Test implications

**Implementado.** `lib/goals/get-goal.test.ts` fue reescrito por completo (las 3 aserciones HYBRID reemplazadas por 8 tests WALLET_BALANCE: casos A/B/C/D/E/F/G/H/I/J de la matriz aprobada, extremo a extremo contra Rewards real donde aplica). `lib/goals/create-goal.test.ts`: el test que esperaba rechazo (`23505`) fue reemplazado por uno que confirma la auto-cancelación (K), más un test nuevo de concurrencia real con `Promise.all` (L). Ningún test de Rewards ni de Missions requirió cambios (secciones 8 y 13, confirmado). `lib/goals/cancel-goal.test.ts` no requirió ningún cambio — sus tests (incluido el de `active→completed` bloqueado) siguen pasando sin modificación.

---

## 17. Implementation boundary

Este documento es de decisión y arquitectura únicamente. La implementación real (migraciones, cambios de código, reescritura de tests) es un bloque propio, posterior, y requiere su propia autorización explícita — no arranca automáticamente al aprobar este documento.

---

## 18. Explicit non-goals (NO hacer ahora)

- No tocar Rewards.
- No tocar Missions.
- No tocar Vision.
- No tocar Hotelbeds.
- No tocar Flights.
- No construir Partners.
- No implementar QR.
- No añadir antifraude.
- No rediseñar toda la UI.
- No crear nueva economía.
- No crear un segundo ledger.
- No eliminar `points_at_goal_creation` todavía.
- No hacer backfill innecesario.
- No hacer cambios fuera de Goals.

---

## 19. Next implementation sequence

1. Aprobar este documento (`VIAO_GOALS_V1_DECISION_LOCK.md`).
2. Implementar únicamente Goals V1 (fórmula de progreso + auto-cancelación) — nada más.
3. Migraciones necesarias (trigger de auto-cancelación; migración de `completed` solo si la sección 11 se resuelve antes).
4. Tests completos (reescritura de los identificados en la sección 16 + nuevos casos de la tabla de escenarios).
5. Build.
6. Typecheck.
7. Lint.
8. Auditoría de concurrencia/RLS del nuevo trigger.
9. Validación técnica final.
10. Commit.
11. Revisar estado Git.
12. Solo después, pasar al siguiente bloque — no saltar directamente a Partners.

---

## 20. Decision status

| Decisión | Estado |
|---|---|
| `GOAL_PROGRESS_MODEL` | **APROBADO E IMPLEMENTADO: WALLET_BALANCE** |
| `AUTO_CANCEL_ACTIVE_GOAL` | **APROBADO E IMPLEMENTADO** |
| `GOAL_COMPLETION_SEMANTICS` | ABIERTA — sin cambios, no tocada por esta implementación |
| `HISTORICAL_EARNED_POINTS` (estadística separada, sección 5 de la Product Decision Master Audit previa) | FUTURO |
| `PARTNERS` | FUTURO |

---

## OWNER DECISIONS REQUIRED

**A. GOAL_PROGRESS_MODEL**
→ WALLET_BALANCE — **APPROVED / IMPLEMENTED** (2026-08-24)

**B. GOAL_COMPLETION_SEMANTICS**
→ OPEN / DERIVED ONLY / NO AUTOMATIC PERSISTENCE

**C. HISTORICAL_EARNED_POINTS**
→ FUTURE / NOT V1 CORE

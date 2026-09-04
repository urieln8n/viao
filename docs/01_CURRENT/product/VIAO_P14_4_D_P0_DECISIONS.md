---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem
DOMAIN: Producto + Datos (Goal, Wallet, Rewards, Partners)
AUTHORITY: Auditoría de decisión — no autoriza implementación por sí misma. Requiere aprobación explícita del propietario para cada decisión antes de cualquier turno de implementación.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-04 (creación — P14.4-D P0 Product + Data Decision Audit)
---

# VIAO — P14.4-D P0 PRODUCT + DATA DECISION AUDIT

**Fecha**: 2026-09-04. **Metodología**: lectura completa de las migraciones y RPCs reales que gobiernan Goal/Wallet/Rewards/Partners (lista exacta abajo) — cero suposiciones, cada afirmación está citada. Sin cambios de código/DB en este bloque.

**Archivos y migraciones inspeccionados**: `lib/goals/get-goal.ts`, `lib/goals/calculate-progress.ts`, `lib/goals/create-goal.ts`, `lib/goals/cancel-goal.ts`, `lib/goals/cancel-goal.test.ts`, `lib/rewards/get-wallet-balance.ts`, `lib/rewards/get-rewards-catalog.ts`, `lib/rewards/get-reward-redemptions.ts` (referenciado), `app/rewards/page.tsx`, `supabase/migrations/20260823153000_create_goals.sql`, `20260817140005_create_rewards_transactions.sql`, `20260817140006_create_rewards_wallets_view.sql`, `20260823150000_create_rewards_catalog.sql`, `20260823151000_create_reward_redemptions.sql`, `20260823152000_create_redeem_reward_rpc.sql`, `20260824101000_create_complete_mission_rpc.sql`, `20260825120000_create_partners.sql`, `20260825130000_create_complete_partner_activity_rpc.sql`, `20260827140000_update_complete_mission_rpc_core_reset.sql`.

---

## 1. Executive Decision Summary

**Hallazgo central de este bloque, que cambia el marco de la decisión P0-1**: el modelo recomendado a evaluar (Sección 4 del encargo — progreso = Points acumulados, nunca baja al canjear) **no es una propuesta nueva: ya se construyó, se desplegó y luego se abandonó deliberadamente**. La tabla `goals` todavía tiene la columna `points_at_goal_creation` y el trigger `security definer` que la rellena (`20260823153000_create_goals.sql`), y el propio comentario de cabecera de esa migración describe exactamente la fórmula del "modelo híbrido" que la Sección 4 de este encargo pide evaluar. `lib/goals/get-goal.ts` documenta explícitamente que ese modelo fue sustituido por el actual (`GOAL_PROGRESS_MODEL=WALLET_BALANCE`, Decision Lock aprobado por el propietario) y que la columna "se conserva en la tabla sin usarse aquí... no eliminar todavía". **Esto reduce drásticamente el riesgo/coste de revertir**: no hay que diseñar ni migrar nada nuevo — hay que decidir si se reactiva un mecanismo que ya existe, ya fue probado, y nunca se borró.

**Recomendación P0-1**: **Opción B** (modelo híbrido/acumulado) — reactivar `points_at_goal_creation + SUM(earned excluyendo redemption_refund desde la creación)`. Ver Sección 5 para el porqué exacto y qué se pierde al hacerlo.

**Recomendación P0-2**: **Opción C** (`partner_id` nullable en `rewards_catalog`) — nunca obligatorio, coexiste con `partner_name` durante la transición. Ver Sección 8.

Ambas decisiones son reversibles y de bajo riesgo de migración (Sección 11) — ninguna requiere tocar `rewards_transactions` (el ledger, la pieza más sensible del sistema) ni ningún RLS/RPC existente de forma destructiva.

---

## 2. Current Data Model

```text
rewards_transactions (ledger, append-only, fuente de verdad)
  user_id, amount, type ('earned'|'spent'), reason, reference_type, reference_id

reason reales en uso HOY (confirmado en las 4 RPCs que escriben el ledger):
  'registration'         (trigger de alta, earned)
  'referral'              (trigger de referido, earned)
  'mission:<mission_key>' (complete_mission(), earned)     — ej. 'mission:goal_created'
  'partner_activity'      (complete_partner_activity(), earned)
  'redemption'            (redeem_reward(), spent, negativo)
  'redemption_refund'     (cancel_redemption(), earned, positivo — REVIERTE una redemption)

rewards_wallets (VIEW, security_invoker) = SUM(amount) GROUP BY user_id
  -> walletBalance actual, usado por Home/Wallet/GoalCard hoy

goals
  id, user_id, title, target_points, target_date, status ('active'|'completed'|'cancelled'),
  points_at_goal_creation (existe, trigger la rellena, HOY SIN USAR en la lectura),
  created_at, completed_at (existe, NUNCA se escribe — ver Sección 7)

reward_redemptions
  id, user_id, reward_catalog_id, points_spent, status ('pending'|'fulfilled'|'cancelled'),
  redemption_code, redemption_attempt_id

rewards_catalog
  id, title, points_cost, funding_type ('viao'|'partner'), real_cost_eur,
  partner_name (TEXT LIBRE, sin FK — el propio comentario de la migración dice
  explícitamente: "NO es FK a una tabla `partners` — esa tabla no existe todavía",
  escrito ANTES de que `partners` existiera; hoy `partners` sí existe)

partners
  id (uuid), name, slug, category, status ('active'|'inactive'), access_token, ...
```

---

## 3. P0-1 Goal ↔ Wallet Analysis

`lib/goals/calculate-progress.ts`: `calculateGoalProgressPercent(walletBalance, targetPoints) = min(100, round(walletBalance/targetPoints*100))`. `walletBalance` viene de `getWalletBalance()` (`rewards_wallets`, SUM de TODO el historial, earned y spent). `get-goal.ts` ya no lee `rewards_transactions` en absoluto para el progreso — solo trae `target_points`/`target_date`/`title` del propio Goal; el cálculo vive en `app/goal-card.tsx`, que recibe `walletBalance` como prop desde `app/page.tsx`.

**Confirmado, no supuesto**: un `redemption` (`redeem_reward()`) inserta `amount` NEGATIVO en `rewards_transactions` con `type='spent'` — ese movimiento SÍ está incluido en el `SUM` que calcula `rewards_wallets.balance`, y por tanto reduce directamente `walletBalance`, y por tanto reduce `calculateGoalProgressPercent()`. No hay ninguna excepción de código para el caso "el usuario ya tenía un Goal activo cuando canjeó" — el efecto es automático e indiscriminado.

---

## 4. P0-1 Options

**Opción A (actual)**: `walletBalance/targetPoints`. Simple, una sola fuente de verdad, cero riesgo de doble contabilidad (el balance siempre refleja el ledger completo, sin filtros). Coste: el progreso puede bajar.

**Opción B (histórica, ya construida, hoy desactivada)**: `earnedTowardGoal = points_at_goal_creation + SUM(rewards_transactions.amount WHERE type='earned' AND reason <> 'redemption_refund' AND created_at > goal.created_at) `, dividido entre `target_points`. Solo sube. Requiere excluir `redemption_refund` explícitamente (Sección 6).

**Opción C (no evaluada en detalle, mencionada por completitud)**: mostrar AMBAS cifras simultáneamente sin fusionarlas — "Ganado para tu objetivo" (B) y "Disponible ahora" (A/walletBalance) como dos números separados, sin un único "% de progreso" fusionado. Es, de hecho, literalmente lo que la migración original de `goals` ya preveía en su comentario de cabecera ("dos cifras SEPARADAS — nunca se presentan como si fueran lo mismo") antes de que V1 las fusionara en una sola. Técnicamente es una variante de UI sobre el mismo modelo de datos que B (necesita el mismo `earnedTowardGoal`), no una tercera fuente de datos.

---

## 5. P0-1 Recommended Decision

**Opción B**, con la variante de presentación de Opción C como recomendación de UX adicional (no solo un % fusionado, sino "Ganado: X" + "Disponible: Y" cuando difieran). Por qué:

1. **Ya existe**: `points_at_goal_creation` + su trigger `security definer` (`set_goal_points_at_creation()`) siguen en el schema, sin usarse. Reactivar el cálculo en `get-goal.ts` es una consulta, no una migración nueva.
2. **El propio proyecto ya lo intentó, lo abandonó y documentó por qué NO fue un error técnico** ("no fue un error, fue una decisión de producto previa, superada por la decisión V1") — es decir, el cambio a Opción A fue una decisión consciente en su momento, no un descubrimiento de que B estuviera mal. Este bloque re-abre esa decisión con la evidencia nueva de P14.4 (Home promete "cada Point te acerca a tu objetivo" — B cumple esa promesa literalmente, A no).
3. **Resuelve exactamente el hallazgo P0 de P14.4** sin inventar nada: un canje deja de retroceder el Goal.
4. **El riesgo de doble contabilidad (Sección 6) ya estaba resuelto en la versión histórica** (`excluyendo redemption_refund`, confirmado también de forma independiente por mí a partir del propio código de `cancel_redemption()`, no solo por el comentario) — no hay trabajo de diseño nuevo, solo reincorporar una regla ya probada.

**Lo que se pierde al elegir B**: Wallet dejaría de ser "el mismo número" que el progreso del Goal — hoy son literalmente idénticos, lo cual es simple de entender pero, como demuestra P14.4, también es la fuente de la contradicción. Con B, "Disponible ahora" (Wallet) y "Ganado para tu objetivo" (Goal) pueden divergir — esto exige comunicarlo bien en el copy (ya lo exige la Sección 10, UX Consequences).

---

## 6. Evitar doble contabilidad — verificación exacta

Regla: `earnedTowardGoal` debe sumar `type='earned'` **excluyendo `reason='redemption_refund'`**. Verificado independientemente contra el código real de `cancel_redemption()` (no solo contra el comentario de `goals`): un refund inserta `type='earned', reason='redemption_refund'` — si se incluyera en la suma, un ciclo canjear→cancelar volvería a sumar Points que nunca se restaron de `earnedTowardGoal` en primer lugar (los `spent` no entran en el filtro `type='earned'`), inflando el progreso artificialmente cada vez que alguien cancele una redención. Excluir `redemption_refund` hace que el ciclo completo (canjear + refund) tenga efecto neto CERO sobre `earnedTowardGoal` — correcto.

**Casos simulados** (Goal creado con `walletBalance=0` en ese instante → `points_at_goal_creation=0`, `targetPoints=500`):

| Caso | Movimientos | Wallet (Opción A hoy) | `earnedTowardGoal` (Opción B) | Progreso A | Progreso B |
|---|---|---|---|---|---|
| 1 | +100 (mission) | 100 | 100 | 20% | 20% |
| 2 | +100, luego -50 (redemption) | 50 | 100 (spent no cuenta) | **10%** | **20%** ← diferencia real |
| 3 | +100, luego -100 (redemption) | 0 | 100 | **0%** | **20%** ← diferencia real |
| 4 | +300, -150, +50 | 200 | 350 (300+50, -150 excluido) | 40% | **70%** ← diferencia real |
| 5 | (desde caso 3) refund de la redemption: +100 (`redemption_refund`, EXCLUIDO de B) | 100 | 100 (sin cambio, correcto — no se duplica) | 20% | 20% (nunca se movió durante el ciclo completo canjear→refund) |

El caso 5 confirma la corrección de la regla: con la exclusión, el ciclo completo canjear+refund nunca afecta a `earnedTowardGoal` (se mantuvo en 100 durante los 3 pasos), mientras que sin la exclusión pasaría a 200 tras el refund — doble contabilidad real, evitada correctamente por la regla ya usada en la versión histórica.

**Nota de implementación no trivial detectada en este bloque** (nueva, no estaba en P14.4): `reason` para Missions no es un valor fijo, es `'mission:' || mission_key` (ej. `'mission:goal_created'`) — cualquier futura implementación de la Opción B debe filtrar por *patrón* (`reason NOT LIKE 'redemption_refund'` es insuficiente si se compara con igualdad exacta contra un valor incorrecto) o, más robusto, por lista blanca de prefijos válidos (`'mission:%'`, `'partner_activity'`, `'registration'`, `'referral'`) en vez de una lista negra — evita que un futuro `reason` nuevo (no anticipado hoy) se cuele sin decisión explícita. Esto también reveló, de forma incidental, que `app/rewards/page.tsx` (`REASON_LABEL_KEY`) **no tiene entradas para `mission:*` ni `partner_activity`** — hoy el historial de Wallet muestra literalmente el string interno (ej. "mission:return_visit") para esas dos fuentes de Points, en vez de una etiqueta traducida. No es parte de la decisión P0-1 en sí, pero es un hallazgo real, verificado, que cualquier trabajo posterior sobre Wallet debería corregir.

---

## 7. Goal completado — estado actual real

**Confirmado por código, no supuesto**: `status` de `goals` NUNCA transiciona a `'completed'` en ningún flujo actual. `lib/goals/cancel-goal.test.ts:107` prueba explícitamente que un intento directo de `UPDATE ... SET status='completed'` es RECHAZADO — el propio test se titula "status solo puede transicionar de active a cancelled — nunca a completed, y un Goal cancelado nunca se reactiva". La columna `completed_at` existe en el schema pero ningún INSERT/UPDATE del código auditado la escribe jamás. **Consecuencia real**: alcanzar el 100% de progreso hoy no tiene ningún efecto sistémico — `Progress` se capa visualmente en 100 (`Math.min(100, ...)`), pero el Goal sigue `active` indefinidamente, sin celebración, sin archivo, sin nuevo Goal automático. Un usuario que llega al 100% simplemente ve una barra llena y nada más ocurre — puede seguir ganando Points (que ya no mueven la barra, capada) o cancelar manualmente. **No se propone cambiar esto en este bloque** — se documenta como estado real para informar la decisión de arquitectura (Sección 9/16).

---

## 8. P0-2 Partners ↔ Rewards Analysis

`rewards_catalog.partner_name` es `text` nullable, sin FK — confirmado en `20260823150000_create_rewards_catalog.sql`, cuyo propio comentario explica por qué: *"NO es FK a una tabla `partners` — esa tabla no existe todavía y está fuera de alcance del Bloque 1"*. Ese comentario es de ANTES de que `partners` existiera (`20260825120000_create_partners.sql`, dos días después) — la razón original de no tener FK ya no aplica hoy. `partners.id` es `uuid primary key`, perfectamente apto como destino de FK. `rewards_catalog.funding_type` ya distingue `'viao'` (financiado por VIAO, sin Partner real detrás) de `'partner'` (financiado por un Partner real) — esta columna ya es, de facto, la señal de "¿debería tener `partner_id`?".

**¿Es realmente P0, o era P1/P2?** Confirmado como **P0 real, no sobre-clasificado**: hoy no hay NINGUNA forma de, dado un Partner real, listar sus Rewards, ni de, dado un Reward `funding_type='partner'`, verificar que el nombre corresponde a un Partner activo — el texto libre podría decir cualquier cosa, incluso el nombre de un Partner ya `inactive` o inexistente, sin que el sistema lo detecte. Es un hallazgo de integridad de datos real, no solo estético.

---

## 9. Distinguir dos roles de Partner

**Partner de EARNING** (`partner_activities.partner_id`, ya existe, ya es una FK real desde P B2) y **Partner de REDEMPTION** (`rewards_catalog.partner_name`/futuro `partner_id`) **NO tienen por qué ser el mismo, pero PUEDEN serlo** — no hay ninguna razón de negocio para forzar que coincidan (un usuario podría ganar Points en un gimnasio y canjear una Reward en un restaurante asociado), y tampoco hay ninguna razón para prohibirlo (un mismo comercio podría, perfectamente, ser ambos — de hecho es el caso más intuitivo para el usuario: "gano y gasto en el mismo sitio"). Un Reward `funding_type='viao'` **no debe tener Partner en absoluto** (VIAO lo financia directamente, sin comercio real detrás) — `partner_id` debe ser NULL siempre en ese caso, nunca forzado. Un Partner puede financiar 0, 1 o varios Rewards (relación 1:N, `partners.id` ← `rewards_catalog.partner_id`) — no hay evidencia de que un Reward necesite más de un Partner a la vez (N:N), así que no se recomienda una tabla intermedia todavía.

---

## 10. Modelo de negocio (arquitectura evaluada, sin implementar)

```text
PARTNER
   │
   ├── Activities → Points → Goal          (ya existe, FK real: partner_activities.partner_id)
   └── Rewards → Redemption                 (NO existe hoy: partner_name es texto libre)
```

Confirmado: esto SÍ convierte a Partner en la pieza central real del modelo económico de VIAO — hoy Partner ya es el origen de todo Point ganado vía actividad real (no Missions, que son internas a VIAO), y con la FK de la Sección 8 pasaría a ser también, opcionalmente, el origen de lo que se puede canjear. No se recomienda implementar esta arquitectura completa en este bloque — solo la pieza de datos mínima (Sección 8) que la habilita para el futuro.

---

## 11. Migration / Backward Compatibility

**P0-1 (Opción B)**: **cero migraciones nuevas** — la columna y el trigger ya existen y ya se ejecutan en cada `INSERT` de `goals` desde el día en que se creó la tabla (el trigger nunca se desactivó, solo dejó de LEERSE). Cambio real: solo `lib/goals/get-goal.ts` (query adicional a `rewards_transactions`, mismo patrón que la versión histórica) — TypeScript, no SQL. **Riesgo de datos históricos**: ninguno — `points_at_goal_creation` ya se calculó correctamente para cada Goal existente en el momento de su creación (el trigger es `security definer`, corrió siempre, para cualquier Goal creado desde el origen de la tabla); no hace falta backfill.

**P0-2 (Opción C)**: **1 migración additiva**: `alter table rewards_catalog add column partner_id uuid references partners(id)` — nullable, sin backfill obligatorio (`partner_name` se conserva intacto, coexiste). Backfill OPCIONAL y de bajo riesgo: para las filas `funding_type='partner'` existentes, un `UPDATE` manual (Studio) mapeando `partner_name` al `partners.id` correcto donde el nombre coincida exactamente — sin urgencia, sin romper nada si se deja para después. **RLS afectado**: ninguno — `rewards_catalog_select_all` ya usa `using (true)`, una columna nueva no cambia esa policy; el GRANT de `service_role` para INSERT/UPDATE ya cubre columnas nuevas automáticamente.

---

## 12. Security / RLS Impact

**P0-1**: cero cambios de RLS/GRANT — la lectura adicional a `rewards_transactions` usaría el mismo cliente de SESIÓN que ya usa `getWalletBalance()`, bajo la misma policy `rewards_transactions_select_own` ya existente (SELECT propio, ya probada). El trigger `set_goal_points_at_creation()` ya tiene sus permisos revocados de `public/anon/authenticated` desde su creación — nada que tocar.

**P0-2**: cero cambios de RLS — añadir `partner_id` a una tabla cuya policy de SELECT ya es `using (true)` no requiere ninguna policy nueva. La escritura (asociar un Partner a un Reward) sigue siendo exclusiva de `service_role`, igual que hoy.

---

## 13. Testing Impact

**P0-1**: `lib/goals/get-goal.test.ts` necesitaría casos nuevos (los 5 simulados en la Sección 6) — el patrón de test ya existe en el proyecto para lógica de ledger equivalente (`redeem-reward.test.ts`, `cancel-redemption` tests referenciados en `cancel-goal.test.ts`). `app/goal-card.tsx` seguiría recibiendo un número — cambia CUÁL número (prop), no su tipo — impacto de test bajo. **Ningún test de Wallet/Rewards se ve afectado** (P0-1 no toca `rewards_wallets`/`redeem_reward`/`cancel_redemption`, solo cómo se LEE el progreso del Goal).

**P0-2**: `get-rewards-catalog.test.ts` (si existe) necesitaría un caso para `partner_id` nulo/presente. `redeem_reward()`/`cancel_redemption()` no necesitan cambios (no leen `partner_id`) — impacto de test acotado a la capa de lectura del catálogo.

---

## 14. Core Loop After Decisions

```text
Points Earned (mission/partner_activity/registration/referral)
        ↓
Goal Progress = points_at_goal_creation + SUM(earned, excluyendo redemption_refund)   [SOLO SUBE]

Points Available = SUM(todo el ledger, earned Y spent)                                 [SUBE Y BAJA]
        ↓
Wallet
        ↓
Reward Redemption (puede tener Partner asociado, opcionalmente)
```

**Sí, esta separación es la arquitectura correcta** — responde directamente a la pregunta de la Sección 15 del encargo: dos números con dos propósitos distintos (motivación/logro vs. poder adquisitivo actual), cada uno gobernado por una regla de agregación distinta sobre el MISMO ledger (`rewards_transactions`), sin tabla nueva ni duplicación de datos — solo dos formas de sumar la misma fuente de verdad.

---

## 15. Dependencies (impacto en hallazgos de P14.4)

| Hallazgo de P14.4 | Depende de P0-1 | Depende de P0-2 | Estado tras esta decisión |
|---|---|---|---|
| Contradicción Goal↔Wallet (el propio P0-1) | — | | **Resuelto** si se adopta Opción B |
| Partners↔Rewards desconectados (el propio P0-2) | | — | **Resuelto** si se adopta Opción C |
| `targetDate` nunca mostrado | No | No | Independiente — puede avanzar ya |
| Goal completado sin celebración | Parcialmente (B hace el 100% más alcanzable/estable de mostrar) | No | Puede diseñarse ya, pero conviene esperar a que B esté decidido para no animar un número que luego cambia de significado |
| Missions se agotan tras la semana 1 (Progressive Discovery) | No | No | Independiente — puede avanzar ya |
| Wallet, saldo no es la 1ª card | No | No | Independiente — puede avanzar ya |
| Ecosistema Partner (rol earning vs. redemption) | No | Sí, directamente | Bloqueado hasta decidir P0-2 |
| `reason` sin traducir en Wallet (`mission:*`) — hallazgo nuevo de este bloque | No | No | Independiente — puede avanzar ya |

---

## 16. What NOT to Build Yet

- Missions rotativas o Progressive Discovery avanzada — sin relación con P0-1/P0-2, pero sin evidencia de piloto todavía (ya establecido en P14.2/P14.4).
- Cualquier UI de "Rewards por Partner" (listado de Rewards de un Partner concreto en su perfil público) — depende de que P0-2 esté decidido e implementado primero.
- Tabla intermedia Partner↔Reward N:N — sin evidencia de que un Reward necesite más de un Partner.
- Backfill automático de `partner_name`→`partner_id` — de bajo riesgo pero no urgente, puede hacerse manualmente y después.
- QR, Experiences, Promotions, nuevos tipos de Partner — fuera de alcance, ya establecido en bloques anteriores.
- Cualquier cambio visual de Home/GoalCard/Wallet — este bloque es de datos/arquitectura, no de UI (aunque el copy sí necesitará ajustarse cuando se implemente P0-1, eso pertenece al turno de implementación, no a este).

---

## 17. Recommended Implementation Order

1. **P0-1 primero** (menor riesgo, cero migraciones, ya construido y probado antes) — reactivar la lectura de `earnedTowardGoal` en `get-goal.ts`, actualizar `goal-card.tsx`/copy relacionado para mostrar "Ganado"/"Disponible" según corresponda.
2. **P0-2 después** (1 migración additiva, sin backfill obligatorio) — añadir `partner_id` nullable a `rewards_catalog`, sin tocar UI todavía salvo lo mínimo para no romper nada.
3. **Solo entonces**, evaluar los hallazgos P1/P2 de P14.4 que dependían de estas decisiones (celebración de Goal completado, ecosistema visual Partner↔Reward).

Ningún paso de esta lista está autorizado a ejecutarse en este bloque — requiere un turno de implementación explícito posterior, con las dos decisiones ya validadas por el propietario.

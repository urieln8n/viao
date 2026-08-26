---
STATUS: LOCKED
ERA: V1 (implementado; esta consolidación es de la sesión de reorganización documental)
DOMAIN: Missions
AUTHORITY: Decision Lock formal de Missions V1 — consolida decisiones ya implementadas y probadas, verificadas mediante auditoría independiente. No crea decisiones nuevas.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO Missions V1 — Decision Lock

### Scope: exclusivamente el sistema Missions (`mission_completions`, `complete_mission()`, los 4 call-sites reales, `lib/missions/*`). Rewards y Goals se referencian solo donde la evidencia lo exige — sus propias decisiones viven en sus propios Decision Locks (`VIAO_REWARDS_V1_DECISION_LOCK.md`, `VIAO_GOALS_V1_DECISION_LOCK.md`).
### Relación con documentos anteriores: no sustituye ni reescribe ningún documento existente. No corrige la afirmación desactualizada de `docs/VIAO_MVP_MASTER.md` sobre el commit de `search_started` (detectada en la auditoría independiente previa a este documento) — queda fuera de alcance de este bloque, por instrucción explícita.
### Cualquier decisión futura distinta de las aquí formalizadas requiere un nuevo Decision Lock o una supersession formal — nunca una reinterpretación silenciosa de este documento.

---

## 1. Identidad del documento

- **Título**: VIAO Missions V1 — Decision Lock.
- **STATUS**: `LOCKED`.
- **AUTHORITY**: fuente de verdad para las decisiones de Missions V1 listadas en el Decision Register (sección 2) — no para el sistema Missions en su totalidad conceptual (eso corresponde al futuro `VIAO_MISSIONS_V1.md`, documento técnico `CURRENT`, no creado en este bloque).
- **Fecha**: 2026-08-25.
- **Scope**: `mission_completions`, `complete_mission()`, `lib/missions/rules.ts`, `lib/missions/complete-mission.ts`, `lib/missions/get-missions-status.ts`, `lib/missions/complete-mission-for-current-session.ts`.

---

## 2. Decision Register

| ID | Decisión | Estado | Evidencia técnica | Nivel | Autoridad |
|---|---|---|---|---|---|
| MI1 | Exactamente 4 Missions, sin motor configurable: `search_started` (10 pts, semanal), `hotel_viewed` (10 pts, semanal), `return_visit` (10 pts, semanal), `goal_created` (50 pts, `lifetime`) | `LOCKED` | `lib/missions/rules.ts:35-40` (array `MISSIONS`); mismos 4 valores duplicados en SQL, `complete_mission()` líneas 62-68 (`CASE p_mission_key ...`); confirmado exhaustivamente por búsqueda de todas las invocaciones reales de `completeMission(`/`completeMissionForCurrentSession(` en `app/` y `lib/` — exactamente 4 `mission_key` distintos se invocan alguna vez en producción | A+B | `complete-mission.test.ts` (los 4 casos cubiertos individualmente) |
| MI2 | `vision_used` no es ni ha sido nunca una Mission de V1 | `LOCKED` | Cero coincidencias de `vision_used`/`VISION_ENABLED` en todo `lib/missions/` (grep exhaustivo, no una sola función ni comentario) | A | No aplica un test a una ausencia — se verifica por búsqueda exhaustiva, no por prosa |
| MI3 | Pool de Missions = 3.000 Points/mes, independiente del pool de Rewards (100€/mes) | `LOCKED` | `lib/missions/rules.ts:51` (`MISSIONS_POOL_MONTHLY_LIMIT_POINTS = 3000`, documental); `complete_mission()` línea 48 (`v_monthly_pool_limit_points constant integer := 3000`, aplicación real); lock `pg_advisory_xact_lock(hashtext('viao_missions_pool'))`, distinto del lock de Rewards (`viao_reward_pool`) | A+B | `complete-mission.test.ts:329-372` (rechazo al superar el techo), `:374-403` (límite exacto, `<=` no `<`) |
| MI4 | `goal_created` usa `period_key='lifetime'` como mecanismo anti-farming | `LOCKED` | `lib/missions/complete-mission.ts:51` (`LIFETIME_PERIOD_KEY = "lifetime"`), línea 59 (asignación condicional por periodicidad); constraint `mission_completions_unique UNIQUE(user_id, mission_key, period_key)` (`20260824100000_create_mission_completions.sql:33`) | A+B | `complete-mission.test.ts:183-209` (3 disparos reales del evento → 1 sola fila, verificado empíricamente) |

---

## 3. Arquitectura formalizada

**Resolución de `period_key`**: siempre server-side, nunca del cliente. Semanal: `isoWeekKey()` (ISO 8601, `lib/missions/complete-mission.ts:34-45`), verificado con casos de frontera de año en ambos sentidos (`complete-mission.test.ts:57-66`). `lifetime`: constante fija, sin cálculo (MI4).

**Idempotencia**: constraint real `UNIQUE(user_id, mission_key, period_key)` — no lógica de aplicación. Repetir la misma Mission en el mismo periodo nunca duplica Points ni filas (`complete-mission.test.ts:151-180`). Dos periodos distintos sí acumulan correctamente (`:212-237`).

**Concurrencia**: un único advisory lock global, `pg_advisory_xact_lock(hashtext('viao_missions_pool'))` — bajo ese lock quedan serializados idempotencia, comprobación de techo mensual y el doble INSERT (`mission_completions` + `rewards_transactions`). Verificado con 10 llamadas concurrentes reales → exactamente 1 completion y 1 transacción (`:240-274`).

**Diferencia de locking respecto a Rewards — característica intencional de Missions V1, no un supuesto**: `complete_mission()` **no** ejecuta `FOR UPDATE` sobre `profiles` (`perform 1 from public.profiles where id = p_user_id;`, sin bloqueo de fila) — a diferencia de `redeem_reward()`, que sí bloquea la fila del usuario además del lock del pool. En Missions, toda la serialización económica depende exclusivamente del advisory lock global `viao_missions_pool`. Es una decisión de diseño explícita del propio código (comentario de `20260824101000_create_complete_mission_rpc.sql`: *"el volumen esperado es mucho menor... un único lock global es correcto y más simple, sin coste de rendimiento real a esta escala"*), verificada empíricamente por el test de concurrencia citado arriba. Se formaliza aquí como `LOCKED` — no debe interpretarse como un descuido ni corregirse para "igualarlo" a Rewards sin una decisión explícita nueva.

**Agotamiento del pool**: la Mission se rechaza (`missions_pool_exhausted`) **antes** de insertar nada — ni `mission_completions` ni `rewards_transactions` se tocan si el pool no tiene margen. Verificado que el saldo no cambia (`:329-372`).

**Fail-closed ante `mission_key` desconocida**: `CASE p_mission_key ... ELSE null END` → `raise exception 'mission_not_found'` — nunca se asume un valor por defecto ni "sin límite". Test-verificado: `:86-98`.

**Revocación de EXECUTE**: `revoke execute on function public.complete_mission(uuid, text, text) from public, anon, authenticated` — el RPC no es invocable directamente por ningún cliente. Test-verificado: `:307-319`.

**Protección de inserción directa**: `mission_completions` no concede INSERT a `authenticated` (única migración que la toca: `20260824100000_*.sql`, `GRANT SELECT to authenticated; GRANT SELECT, INSERT to service_role` — sin UPDATE/DELETE en ningún rol, en ninguna migración, confirmado por grep exhaustivo). Test-verificado: `:292-305`.

**RLS/ownership de lectura**: policy `mission_completions_select_own` (`user_id = auth.uid()`). Test-verificado: `:277-290`.

**Los 4 call-sites reales de producción** (confirmados por búsqueda exhaustiva, ninguno más existe):
1. `app/search/actions.ts:167` → `completeMissionForCurrentSession("search_started")`.
2. `app/properties/[id]/resolve.ts:85` → `completeMissionForCurrentSession("hotel_viewed")`.
3. `lib/analytics/record-return-visit.ts:92` → `completeMission(userId, "return_visit")`.
4. `lib/goals/create-goal.ts:109` → `completeMission(user.id, "goal_created")`.

**Patrón *best-effort* de `completeMissionForCurrentSession()`**: envoltorio usado en rutas públicas donde puede no haber sesión (`search`, `properties/[id]`) — resuelve la sesión, y si no existe, retorna sin hacer nada; cualquier error se captura y se registra (`console.error`), nunca se propaga hacia la acción real que lo dispara (buscar, ver un alojamiento). Verificado por lectura directa de `lib/missions/complete-mission-for-current-session.ts` — **sin test dedicado que lo ejercite directamente** (ver sección 4).

---

## 4. Evidencia — cobertura real, sin inflar

| Archivo | Test propio | Nivel |
|---|---|---|
| `lib/missions/rules.ts` | Sin archivo de test dedicado; sus constantes se verifican indirectamente a través de `complete-mission.test.ts` (los valores de Points/periodicidad se comprueban en cada caso de Mission) | A, parcialmente B (indirecto) |
| `lib/missions/complete-mission.ts` | `complete-mission.test.ts` | A+B, cobertura alta |
| `lib/missions/get-missions-status.ts` | **Ninguno** | **A únicamente — sin test propio, no se afirma cobertura B** |
| `lib/missions/complete-mission-for-current-session.ts` | **Ninguno** | **A únicamente — sin test propio, no se afirma cobertura B** |

`get-missions-status.ts` y `complete-mission-for-current-session.ts` **no tienen ningún archivo de test dedicado**. Esto no invalida MI1-MI4 (ninguna de las 4 decisiones depende de estos dos archivos para su evidencia), pero se registra explícitamente para no presentar una cobertura que no existe.

---

## 5. Separación económica — Missions vs. Rewards

| Pool | Techo | Unidad | Lock | Comparte con |
|---|---|---|---|---|
| Missions | 3.000 Points/mes | Points | `viao_missions_pool` | Nada — presupuesto propio |
| Rewards | 100 €/mes | EUR | `viao_reward_pool` | Nada — presupuesto propio |

Ambos pools nunca se suman ni se comparten lock — confirmado en el propio comentario de `complete_mission()`: *"DISTINTO del de Rewards... nunca compartido, presupuestos independientes"*. Este Decision Lock no introduce ninguna relación nueva entre ambos.

---

## 6. Alcance — qué queda explícitamente fuera de Missions V1

- **Motor configurable de Missions** — no existe y no se introduce. Añadir o cambiar una Mission sigue siendo un cambio de código (`rules.ts` + `complete_mission()`), nunca una fila editable.
- **`vision_used` como Mission** — MI2, permanece fuera.
- **Más de 4 Missions** — no se amplía el catálogo en este documento.
- **Mezcla del pool Missions con el pool Rewards** — explícitamente prohibida (sección 5).
- **Missions de Partner** — no se introduce ninguna (consistente con la decisión ya tomada en el dominio de Partners, `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`, fuera del scope de este documento).
- **Corrección de `VIAO_MVP_MASTER.md`** — la afirmación desactualizada sobre el commit de `search_started` detectada en la auditoría independiente queda fuera de alcance de este bloque.
- **Documento `CURRENT` de Missions** — no se crea aquí.

---

## 7. Qué NO debe cambiarse sin una nueva decisión explícita

Las 4 Missions y sus Points/periodicidad (`lib/missions/rules.ts`), el pool de 3.000 Points/mes y su advisory lock, la constraint `UNIQUE(user_id, mission_key, period_key)`, el RPC `complete_mission()` (incluida su ausencia deliberada de `FOR UPDATE` sobre `profiles`), y ninguno de los 4 call-sites de producción.

---

## 8. Dependencias

- **Código real + tests + migraciones** — autoridad técnica última en cualquier discrepancia (principio 1, `docs/00_GOVERNANCE.md`).
- **`docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md`** — Missions escribe al mismo ledger que gobierna ese documento (`rewards_transactions`, `reason='mission:'+key`), pero sus propias decisiones económicas (pool, techo) son independientes y viven aquí.
- **`docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md`** — autoridad de producto/estrategia global.
- **`docs/VIAO_MVP_MASTER.md`** — checkpoint técnico anterior; contiene una afirmación desactualizada sobre `search_started` (detectada, no corregida por este documento).

---

## 9. Regla de no implementación

Este bloque es exclusivamente documental. Ningún código, migración, test, componente ni configuración fue creado o modificado para producir este documento.

---

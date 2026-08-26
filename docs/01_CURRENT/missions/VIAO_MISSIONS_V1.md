---
STATUS: CURRENT
ERA: V1 (implementado)
DOMAIN: Missions
AUTHORITY: Current technical/product-domain document for Missions V1. El código real, las migraciones y los tests siguen siendo la autoridad técnica última; el Decision Lock (`VIAO_MISSIONS_V1_DECISION_LOCK.md`) tiene precedencia sobre este documento en cualquier decisión bloqueada. Este documento explica cómo funciona Missions V1 hoy, no crea ni reinterpreta decisiones.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO Missions V1 — Documento técnico CURRENT

### Jerarquía aplicada: código + migraciones + tests > `docs/02_DECISION_LOCKS/missions/VIAO_MISSIONS_V1_DECISION_LOCK.md` > este documento > documentos globales/históricos.
### Relación con el Decision Lock: el Decision Lock responde "qué está bloqueado" (MI1-MI4 y la arquitectura de seguridad). Este documento responde "cómo funciona Missions V1 y cuál es su estado técnico real". Ninguna decisión del Decision Lock se reinterpreta aquí.

---

## 2. Propósito

Missions es el motor de hábito genérico de VIAO: otorga Points por acciones recurrentes reales del usuario (buscar, volver, ver un alojamiento, definir un objetivo), sin depender de ninguna actividad comercial de Partner. Es paralelo e independiente del earning por reserva confirmada o por actividad de Partner — todos escriben al mismo ledger (`rewards_transactions`), pero Missions tiene su propio pool, su propio lock y su propia lógica de disparo.

---

## 3. Scope exacto

Este documento cubre: `mission_completions`, la RPC `complete_mission()`, y los 4 archivos de `lib/missions/` (`rules.ts`, `complete-mission.ts`, `get-missions-status.ts`, `complete-mission-for-current-session.ts`), más los 4 call-sites reales que las invocan. No cubre Rewards ni Goals más allá de su punto de integración (sección 13, 26).

---

## 4-5. Las 4 Missions — Points y periodicidad

| `mission_key` | Nombre mostrado | Points | Periodicidad | `period_key` |
|---|---|---|---|---|
| `search_started` | "Buscar tu próximo destino" | 10 | semanal | `isoWeekKey()` (ISO 8601) |
| `hotel_viewed` | "Ver un alojamiento" | 10 | semanal | `isoWeekKey()` |
| `return_visit` | "Volver esta semana" | 10 | semanal | `isoWeekKey()` |
| `goal_created` | "Definir tu objetivo de viaje" | 50 | `lifetime` | `'lifetime'` (fijo) |

Fuente: `lib/missions/rules.ts:35-40` (array `MISSIONS`) — duplicado como fuente de verdad económica real en SQL, `complete_mission()` líneas 62-68 (`CASE p_mission_key ... end`). Ambos deben coincidir manualmente (SQL no puede importar una constante de TypeScript); confirmado que coinciden hoy.

**Exactamente estas 4** — confirmado no solo por el array de `rules.ts`, sino por búsqueda exhaustiva de toda invocación real de `completeMission(`/`completeMissionForCurrentSession(` en `app/` y `lib/`: ningún quinto `mission_key` se invoca en ningún punto del código.

---

## 6. Resolución server-side de `period_key`

Siempre resuelto en `lib/missions/complete-mission.ts`, nunca aceptado del cliente. Semanal: `isoWeekKey(date)` (líneas 34-45), algoritmo ISO 8601 estándar, verificado contra casos de frontera de año en ambos sentidos (`complete-mission.test.ts:57-66`). `lifetime`: constante `LIFETIME_PERIOD_KEY` (línea 51), sin cálculo.

---

## 7. Arquitectura completa del flujo

```
Evento real de aplicación
        │
        ├── app/search/actions.ts:167 ─────────────────┐
        ├── app/properties/[id]/resolve.ts:85 ──────────┤
        ├── lib/analytics/record-return-visit.ts:92 ────┤
        └── lib/goals/create-goal.ts:109 ────────────────┘
                        │
                        ▼
        lib/missions/complete-mission.ts (resuelve period_key, server-side)
                        │
                        ▼
        RPC complete_mission() [SECURITY DEFINER, solo service_role]
                        │
                        ├── INSERT mission_completions (append-only)
                        └── INSERT rewards_transactions (reason='mission:'+key)
                        │
                        ▼
        lib/missions/get-missions-status.ts (lectura, cliente de sesión)
                        │
                        ▼
        app/missions-summary.tsx (Home, solo lectura, nunca dispara nada)
```

---

## 8. Los 4 call-sites reales

1. `app/search/actions.ts:167` → `completeMissionForCurrentSession("search_started")`.
2. `app/properties/[id]/resolve.ts:85` → `completeMissionForCurrentSession("hotel_viewed")`.
3. `lib/analytics/record-return-visit.ts:92` → `completeMission(userId, "return_visit")`.
4. `lib/goals/create-goal.ts:109` → `completeMission(user.id, "goal_created")`.

Ninguno de los 4 requiere ni asume UI dedicada — todos son efectos laterales de una acción de producto ya existente.

---

## 9-10. `completeMission()` y `completeMissionForCurrentSession()`

`completeMission(userId, missionKey)` (`lib/missions/complete-mission.ts:53-85`): valida que la Mission exista (`getMissionDefinition()`), resuelve `period_key`, invoca la RPC vía `service_role`, traduce el resultado (`completed`/`mission_not_found`/`pool_exhausted`/`error`). `userId` siempre viene de la sesión real resuelta por quien llama — esta función no vuelve a comprobar la sesión.

`completeMissionForCurrentSession(missionKey)` (`lib/missions/complete-mission-for-current-session.ts:12-25`): envoltorio *best-effort* para rutas públicas donde puede o no haber sesión. Resuelve la sesión con `auth.getUser()`; **si no hay usuario, retorna sin hacer nada** (`return;` explícito, línea 18-20); cualquier error se captura (`catch`) y se registra con `console.error`, nunca se propaga — la acción real que lo dispara (buscar, ver un alojamiento) nunca falla por un problema de Missions.

---

## 11. RPC `complete_mission()`

`supabase/migrations/20260824101000_create_complete_mission_rpc.sql`, `SECURITY DEFINER`, `set search_path=''`:
1. Comprueba que el usuario exista en `profiles` (sin `FOR UPDATE` — ver sección 24).
2. Resuelve Points por `mission_key` vía `CASE` (fuente de verdad económica en SQL).
3. Toma el advisory lock global `pg_advisory_xact_lock(hashtext('viao_missions_pool'))`.
4. Idempotencia: si ya existe `(user_id, mission_key, period_key)`, devuelve la fila existente sin generar Points de más.
5. Kill-switch: comprueba el techo mensual (sección 14) antes de insertar nada.
6. INSERT atómico: `mission_completions` + `rewards_transactions`.

---

## 12. `mission_completions`

`supabase/migrations/20260824100000_create_mission_completions.sql`: `id`, `user_id`, `mission_key`, `period_key`, `points_awarded` (snapshot denormalizado, `CHECK > 0`), `created_at`. Constraint `mission_completions_unique UNIQUE(user_id, mission_key, period_key)` (línea 33). RLS: policy `mission_completions_select_own`; `GRANT SELECT to authenticated`, `GRANT SELECT, INSERT to service_role` — **sin UPDATE ni DELETE en ningún rol, en ninguna migración** (confirmado por grep exhaustivo sobre todo `supabase/migrations/`, no solo por esta migración puntual).

---

## 13. Integración con `rewards_transactions`

Cada completion inserta una fila en el ledger: `reason = 'mission:' + mission_key` (p. ej. `'mission:return_visit'`), `reference_type = 'mission_completion'`, `reference_id` = id de la fila de `mission_completions`. Verificado que ambas filas existen atómicamente juntas: `complete-mission.test.ts:101-131`. Missions **no** tiene su propio ledger — reutiliza el único existente, mismo criterio ya aplicado por Rewards.

---

## 14-16. Pool de Missions y separación de Rewards

| Pool | Techo | Unidad | Lock |
|---|---|---|---|
| **Missions** | 3.000 Points/mes | Points | `pg_advisory_xact_lock(hashtext('viao_missions_pool'))` |
| **Rewards** | 100 €/mes | EUR | `pg_advisory_xact_lock(hashtext('viao_reward_pool'))` |

`MISSIONS_POOL_MONTHLY_LIMIT_POINTS = 3000` (`lib/missions/rules.ts:51`, documental); `v_monthly_pool_limit_points := 3000` (`complete_mission()` línea 48, aplicación real). **Ambos pools son presupuestos completamente separados** — unidades distintas, locks distintos, nunca se suman ni se comparten (confirmado en el propio comentario del RPC). Al superar el techo, la Mission se rechaza (`missions_pool_exhausted`) **antes** de insertar nada — ni `mission_completions` ni `rewards_transactions` se tocan (`complete-mission.test.ts:329-372`, saldo verificado sin cambios). Verificado también el límite exacto (`<=`, no `<`): `:374-403`.

---

## 17. Idempotencia y anti-farming

Idempotencia general: `UNIQUE(user_id, mission_key, period_key)` — repetir la misma Mission en el mismo periodo nunca duplica Points ni filas (`:151-180`); dos periodos distintos sí acumulan correctamente (`:212-237`). Anti-farming de `goal_created`: `period_key='lifetime'` fijo — 3 disparos reales del evento (crear, cancelar, crear Goal) → 1 sola fila para siempre (`:183-209`).

---

## 18-20. Seguridad, fail-closed, sin sesión

- **RLS/ownership**: un usuario no puede leer las completions de otro (`:277-290`).
- **GRANT/EXECUTE**: `revoke execute ... from public, anon, authenticated` — un cliente autenticado no puede invocar `complete_mission()` directamente (`:307-319`); tampoco puede insertar directamente en `mission_completions` (`:292-305`).
- **Fail-closed**: `mission_key` desconocida → `raise exception 'mission_not_found'`, nunca un valor por defecto (`:86-98`).
- **Sin sesión en el wrapper best-effort**: `completeMissionForCurrentSession()` retorna sin hacer nada ni lanzar si no hay usuario autenticado — verificado por lectura directa del código (líneas 18-20); **sin test dedicado que lo ejercite** (ver sección 22-23).

---

## 21. `vision_used` fuera de Missions V1

Confirmado por búsqueda exhaustiva: cero coincidencias de `vision_used`/`VISION_ENABLED` en todo `lib/missions/`. Nunca fue ni es una Mission de V1 — `LOCKED` como MI2 en el Decision Lock.

---

## 22-23. Cobertura de tests real

| Archivo | Test propio |
|---|---|
| `lib/missions/rules.ts` | Sin archivo dedicado; sus constantes se verifican indirectamente en `complete-mission.test.ts` |
| `lib/missions/complete-mission.ts` | `complete-mission.test.ts` — cobertura alta (idempotencia, concurrencia, kill-switch, anti-farming, RLS, GRANT) |
| `lib/missions/get-missions-status.ts` | **Ninguno — sin test propio** |
| `lib/missions/complete-mission-for-current-session.ts` | **Ninguno — sin test propio** |

Se declara explícitamente: ni `get-missions-status.ts` ni `complete-mission-for-current-session.ts` tienen cobertura de test directa. No se afirma lo contrario en ningún punto de este documento.

---

## 24. Diferencia arquitectónica respecto a Rewards

`complete_mission()` **no** ejecuta `FOR UPDATE` sobre `profiles` (`perform 1 from public.profiles where id = p_user_id;`, sin bloqueo de fila) — a diferencia de `redeem_reward()`, que sí bloquea la fila del usuario además de tomar el lock del pool. En Missions, toda la serialización depende exclusivamente del advisory lock global `viao_missions_pool`. Esto es **comportamiento actual confirmado** por lectura directa del RPC y verificado empíricamente por el test de concurrencia (10 llamadas simultáneas → exactamente 1 completion y 1 transacción, `:240-274`) — no es una decisión nueva de este documento, ya está formalizada como `LOCKED` en `VIAO_MISSIONS_V1_DECISION_LOCK.md`, sección 3.

---

## 25. Límites / Not implemented / Future

- **Motor configurable de Missions**: `NOT IMPLEMENTED` — añadir o cambiar una Mission sigue siendo un cambio de código en dos archivos (`rules.ts` + `complete_mission()`), nunca una fila editable.
- **Missions de Partner**: `NOT IMPLEMENTED` — ninguna Mission depende de actividad de Partner.
- **Más de 4 Missions**: fuera de alcance de V1.
- **`get-missions-status.ts`/`complete-mission-for-current-session.ts` con test dedicado**: no existe hoy — no es un `FUTURE` declarado en ningún documento, solo un gap de cobertura real.

---

## 26. Relación con Rewards y Goals

- **Rewards**: Missions escribe al mismo ledger (sección 13), con pool y lock completamente independientes (sección 14-16). No hay llamada cruzada entre `complete_mission()` y `redeem_reward()`.
- **Goals**: `goal_created` se dispara desde `lib/goals/create-goal.ts:109` como consecuencia de una creación exitosa de Goal — la relación es unidireccional (Goals dispara Missions, nunca al revés). El progreso del Goal (`GOAL_PROGRESS_MODEL=WALLET_BALANCE`, `VIAO_GOALS_V1_DECISION_LOCK.md`) se deriva del saldo total del Wallet, que incluye los Points de Missions sin distinción de origen.

---

## 27. Qué NO debe tocarse sin nueva decisión explícita

Las 4 Missions y sus Points/periodicidad, el pool de 3.000 Points/mes y su advisory lock, la constraint `UNIQUE(user_id, mission_key, period_key)`, el RPC `complete_mission()` (incluida su ausencia deliberada de `FOR UPDATE`), y ninguno de los 4 call-sites de producción.

---

## 28. Evidencia técnica — bibliografía

**Migraciones**: `20260824100000_create_mission_completions.sql`, `20260824101000_create_complete_mission_rpc.sql`.
**Código**: `lib/missions/rules.ts`, `lib/missions/complete-mission.ts`, `lib/missions/get-missions-status.ts`, `lib/missions/complete-mission-for-current-session.ts`.
**Call-sites**: `app/search/actions.ts:167`, `app/properties/[id]/resolve.ts:85`, `lib/analytics/record-return-visit.ts:92`, `lib/goals/create-goal.ts:109`.
**Tests**: `lib/missions/complete-mission.test.ts` (única suite de tests del dominio).

---

## Discrepancia documental conocida — fuera de alcance

`docs/VIAO_MVP_MASTER.md` afirma que el hook de `search_started` en `app/search/actions.ts` está "en working tree, no commiteado". Esto está desactualizado: `git log` confirma que ya fue commiteado en `c3bd963`. No se corrige en este documento ni en `VIAO_MVP_MASTER.md` — queda registrado como discrepancia conocida, consistente con la propia nota de `VIAO_MVP_MASTER.md` sobre su posible desactualización.

---

## Referencias

- `docs/02_DECISION_LOCKS/missions/VIAO_MISSIONS_V1_DECISION_LOCK.md` — decisiones bloqueadas (MI1-MI4), este documento no las reinterpreta.
- `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md` / `docs/01_CURRENT/rewards/VIAO_REWARDS_V1.md` — ledger compartido, pool independiente.
- `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md` — relación con `goal_created` y `WALLET_BALANCE`.
- `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` — autoridad de producto/estrategia global.
- `docs/00_VIAO_HANDOFF.md` — punto de entrada de continuidad.

---

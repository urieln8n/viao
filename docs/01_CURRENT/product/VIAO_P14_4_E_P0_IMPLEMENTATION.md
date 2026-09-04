---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem
DOMAIN: Producto + Datos (Goal, Wallet, Rewards, Partners)
AUTHORITY: Registro de implementación de un Decision Lock ya aprobado (P14.4-D). Validado con ejecución real contra Postgres local. No autoriza su propio despliegue a producción — eso requiere un turno explícito posterior.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-04 (sincronización final post-validación — P14.4-E P0 CLOSED, PASS)
---

# VIAO — P14.4-E P0 CORE MODEL IMPLEMENTATION

**Fecha**: 2026-09-04. **Estado**: **P14.4-E P0 — PASS.** Implementado en código local, validado con ejecución real (926/926 tests, 0 fail) contra Postgres local. **NO desplegado, NO commiteado** — pendiente de decisión explícita del propietario sobre el siguiente paso (release).

## Decision Lock (aprobado por el propietario, fórmula confirmada tras validación)

- **P0-1**: Opción B — Goal progress = Points acumulados ganados hacia el Goal desde su creación, monótono, nunca baja al canjear. Wallet sigue siendo Points disponibles.
- **P0-2**: Opción C — `rewards_catalog.partner_id` FK nullable hacia `partners.id`, `partner_name` se mantiene para backward compatibility, sin backfill.

**Fórmula definitiva de P0-1** (confirmada por el propietario, contradicción entre versiones anteriores del encargo ya resuelta):

```
earnedPoints =
  points_at_goal_creation
  +
  SUM(
    rewards_transactions.amount
    WHERE type = 'earned'
    AND reason <> 'redemption_refund'
    AND created_at > goal.created_at
  )
```

- **Goal Progress** = Points acumulados ganados ("earned") hacia ese Goal desde su creación — solo sube.
- **Wallet** = Points actualmente disponibles (`rewards_wallets`, SUM de todo el ledger, earned y spent) — sube y baja.
- Una `redemption` (canje) reduce **Wallet**, pero **NO** reduce Goal Progress.
- Un `redemption_refund` (tras cancelar una redención) **NO** incrementa Goal Progress — el ciclo completo canjear+refund tiene efecto neto cero sobre `earnedPoints`, evitando doble contabilidad.

## P0-1 — Implementación

### Arquitectura

```
goals.points_at_goal_creation (ya existía, trigger ya lo rellena, ahora SÍ se lee)
        +
SUM(rewards_transactions.amount WHERE type='earned' AND reason<>'redemption_refund' AND created_at > goal.created_at)
        =
earnedPoints (ActiveGoal.earnedPoints) → calculateGoalProgressPercent() → % mostrado en Home
```

`rewards_transactions` sigue siendo la única fuente de verdad — no se creó ninguna tabla nueva, no se duplica ningún Point en ningún otro sitio.

### Archivos nuevos

- **`lib/goals/get-earned-points.ts`** — `getEarnedPointsTowardGoal(sessionClient, userId, goalCreatedAt, pointsAtGoalCreation)`. Vive en su propio archivo (no dentro de `get-goal.ts`) por el mismo motivo exacto que `calculate-progress.ts` ya estaba separado: recibe el `SupabaseClient` como parámetro (mismo patrón que `resendPartnerAccess(sessionClient, ...)`) en vez de crearlo internamente vía `next/headers` — así es invocable directamente en `node:test` contra un usuario real, sin mockear nada. Relanza cualquier error de Supabase (nunca lo esconde) — es `getActiveGoal()` quien decide tratarlo como fail-closed.

### Archivos modificados

- **`lib/goals/get-goal.ts`** — `getActiveGoal()` ahora selecciona también `points_at_goal_creation`, llama a `getEarnedPointsTowardGoal()`, y devuelve `earnedPoints` como nuevo campo de `ActiveGoal`. Todo dentro del mismo `try/catch` ya existente — si la consulta adicional fallara, se trata igual que cualquier otro fallo (fail-closed, `undefined`, nunca un progreso inventado).
- **`lib/goals/calculate-progress.ts`** — renombrado el parámetro `walletBalance` → `earnedPoints` (documenta el cambio de semántica). **Cero cambio de lógica**: sigue siendo `min(100, round(a/b*100))`, mismo cap, mismo manejo de `target<=0`.
- **`app/goal-card.tsx`** — `ActiveGoalCard` usa `goal.earnedPoints` en vez de la prop `walletBalance` (retirada de `GoalCard`/`ActiveGoalCard`, ya no aportaba nada). Label cambiado de `goals.availableLabel` ("Disponible ahora") a `goals.earnedLabel` ("Ganado para tu objetivo") — **cambio de copy estrictamente necesario**, no una mejora aprovechada: mostrar "Disponible ahora" junto a un número que ya no es el saldo disponible sería directamente incorrecto. `goals.earnedLabel` ya existía en `lib/i18n/{es,en}.ts` desde el modelo histórico original, sin usar — no se creó ninguna clave nueva, no se tocó ningún archivo de i18n.
- **`app/page.tsx`** — `<GoalCard goal={activeGoal} walletBalance={balance} />` → `<GoalCard goal={activeGoal} />` (única línea). `balance` sigue existiendo y usándose sin cambios en el Hero y el teaser de Wallet.

## P0-1 — Data / Logic Changes

Ninguna migración nueva — `points_at_goal_creation` y su trigger `security definer` `set_goal_points_at_creation()` ya existían desde el origen de la tabla `goals` y nunca se desactivaron; solo dejaron de leerse. `create-goal.ts`/`cancel-goal.ts` no necesitaron ningún cambio (ya insertaban el placeholder `points_at_goal_creation: 0` que el trigger sobrescribe, exactamente como siempre).

## P0-1 — Test Results — PASS

Ejecutados con éxito contra Postgres **local real** (Docker, `supabase_db_VIAO`) — no simulado.

- `lib/goals/get-earned-points.test.ts` (nuevo) — **9/9 PASS**: earned aumenta, spent no reduce, refund no infla (caso numérico exacto: +100 earned/-100 redemption/+100 redemption_refund → 100, nunca 200), baseline se respeta y se suma (caso numérico exacto: baseline=300, +50 → 350), `mission:<key>` cuenta (patrón, no valor fijo), múltiples fuentes suman (referral+mission+partner_activity), secuencia completa nunca retrocede (Goal=500, +100/-50 canje/+30 → nunca baja), Goal alcanza 100%, Goal >100% se capa solo en el porcentaje mostrado (el valor acumulado real no se capa).
- `lib/goals/get-goal.test.ts` (reescrito) — **3/3 PASS**: los tests puramente aritméticos de `calculateGoalProgressPercent()` (capado a 100%, target inválido, casos base 0/50/100%). Se retiraron los tests D/E/F/G/J que codificaban el modelo V1/WALLET_BALANCE anterior (ahora falso).
- Verificación adicional con los casos A/B/C exactos del encargo de validación (baseline=300 literal, `+50`, canje `-100`) mediante un script temporal ejecutado contra Postgres real y eliminado tras su uso: los 3 casos confirmados exactos (300 / 350 / 350-no-250).

## P0-2 — Migración

`supabase/migrations/20260904100000_add_partner_id_to_rewards_catalog.sql`:

```sql
alter table public.rewards_catalog
  add column partner_id uuid references public.partners (id) on delete set null;

create index rewards_catalog_partner_id_idx on public.rewards_catalog (partner_id);
```

Nullable, additiva, reversible conceptualmente. `on delete set null` — defensa en profundidad (`partners` no concede DELETE a ningún rol hoy, así que esto no puede dispararse en producción actualmente, pero protege contra un futuro cambio de esa política). Sin cambios de tipo, sin eliminar `partner_name`, sin backfill.

**Aplicada y verificada contra Postgres local real** (`docker exec -i supabase_db_VIAO psql ...`). Schema confirmado directamente con `\d rewards_catalog`:

```
partner_id | uuid | | |                        -- nullable, sin default
Foreign-key constraints:
    "rewards_catalog_partner_id_fkey" FOREIGN KEY (partner_id) REFERENCES partners(id) ON DELETE SET NULL
```

`partner_name` sigue presente sin ningún cambio. RLS (`rewards_catalog_select_all`, `using (true)`) intacta, sin policies nuevas.

## P0-2 — Type / Logic Changes

**Ninguno**, deliberadamente. El proyecto no usa un archivo de tipos generado desde el schema (confirmado — no existe `database.types.ts` ni equivalente); `RewardCatalogEntry` (`lib/rewards/get-rewards-catalog.ts`) sigue sin seleccionar `partner_id` — ninguna UI lo necesita todavía. La columna existe en el schema, lista para usarse en un bloque futuro, sin que este bloque haya tenido que tocar ninguna pantalla.

## P0-2 — Test Results — PASS

Añadidos a `lib/rewards/get-rewards-catalog.test.ts` (archivo ya existente, mismo patrón que sus 2 tests originales) — **4/4 PASS** contra Postgres local real: `partner_id` nullable (Reward `funding_type='viao'` sigue con `partner_id=NULL`), un Partner válido puede asociarse, `partner_name` sigue funcionando sin cambios (coexiste), la FK rechaza un `partner_id` inexistente.

## Security Impact

**Cero cambios de RLS/GRANT en ambas decisiones**, confirmado por lectura de las migraciones reales antes de escribir el código y reverificado en el schema real tras aplicar la migración:
- P0-1: la consulta adicional a `rewards_transactions` usa el mismo cliente de sesión que ya usaba `getWalletBalance()`, bajo la misma policy `rewards_transactions_select_own` ya existente.
- P0-2: `rewards_catalog_select_all` ya usa `using (true)` — una columna nueva no necesita ninguna policy nueva; el GRANT de `service_role` para INSERT/UPDATE ya cubre columnas nuevas automáticamente.

No se tocó Auth, `owner_id`, `access_token`, ni ningún RPC/policy de Partners.

## UI Impact

Mínimo, exactamente el previsto: `ActiveGoalCard` muestra un número distinto (ahora `earnedPoints`, no `walletBalance`) bajo una etiqueta distinta (`goals.earnedLabel` en vez de `goals.availableLabel`, ambas ya existentes en el i18n). Ningún otro componente de Home, Wallet o Rewards cambió. Ningún selector/filtro/vista de Partner en Rewards — no se construyó nada de eso.

## Browser QA

**NO REALIZADA todavía.** Requeriría una sesión autenticada real con Goal/Wallet reales para observar el nuevo comportamiento en pantalla — no se creó ninguna cuenta nueva en producción para esto (sería una escritura de datos fuera del alcance de los bloques de validación ya ejecutados). Sigue siendo el paso pendiente antes de cualquier promoción a producción.

## Database Validation — PASS

Migración aplicada contra Postgres **local real** y verificada directamente en el schema (ver sección P0-2 — Migración arriba). No aplicada a producción — explícitamente fuera de alcance hasta una decisión posterior del propietario.

## Build / TypeScript / Lint — PASS

- `npx tsc --noEmit` → **PASS (EXIT 0)**
- `npm run lint` → **PASS (EXIT 0)**
- `npm run build` → **PASS (EXIT 0)** — 24 rutas compiladas

## Automated Tests — PASS

**926/926 tests PASS, 0 FAIL, 0 SKIPPED**, ejecutados contra Postgres **local real** (Docker, `supabase_db_VIAO`).

### Nota histórica — bloqueo de Docker, ya resuelto

Docker Desktop no estaba corriendo al inicio de la validación (ni el proceso ni el motor). Se resolvió arrancando Docker Desktop y esperando la recuperación automática de WAL de Postgres (el contenedor había quedado en un apagado sucio de una sesión Docker anterior — `"database system was not properly shut down; automatic recovery in progress"`, resuelto solo en unos 30 segundos). Un fallo transitorio de un test ajeno (`get-cached-destinations.test.js`, dominio Travel) apareció una única vez durante los primeros segundos tras ese arranque y **no se reprodujo** en la corrida final, ya con Postgres estable — no quedó registrado como fallo real, la ejecución final fue 926/926 PASS.

## Files Changed

```
M  app/goal-card.tsx
M  app/page.tsx
M  lib/goals/calculate-progress.ts
M  lib/goals/get-goal.ts
M  lib/goals/get-goal.test.ts
M  lib/rewards/get-rewards-catalog.test.ts
A  lib/goals/get-earned-points.ts
A  lib/goals/get-earned-points.test.ts
A  supabase/migrations/20260904100000_add_partner_id_to_rewards_catalog.sql
A  docs/01_CURRENT/product/VIAO_P14_4_E_P0_IMPLEMENTATION.md
M  docs/00_VIAO_HANDOFF.md
M  docs/01_CURRENT/product/VIAO_FUTURE_BACKLOG.md
```

## Preexisting Changes Preserved

Confirmado por `git diff --stat` idéntico, en todos los turnos de este bloque (implementación, validación, corrección de test, este cierre documental) — en los 9 archivos/directorios ajenos: `app/partners/partner-image.tsx`, `app/profile/actions.ts`, `app/profile/page.tsx`, `components/layout/app-shell.tsx`, `lib/analytics/events.ts`, `lib/i18n/en.ts`, `lib/i18n/es.ts`, `lib/partners/get-partners-for-admin.ts`, `lib/partners/get-partners-for-admin.test.ts`, más `app/u/`, `lib/profile/`, y las 2 migraciones untracked preexistentes — ninguno tocado.

## Documentation

- `docs/01_CURRENT/product/VIAO_P14_4_E_P0_IMPLEMENTATION.md` (este documento)
- `docs/00_VIAO_HANDOFF.md` (§2, §5, §21)
- `docs/01_CURRENT/product/VIAO_FUTURE_BACKLOG.md` (sección NOW)

## Risks / Open Questions

1. **🟡 `goals.availableLabel` queda sin ningún consumidor** — no se eliminó (no autorizado, "no rediseñar"), pero ya no lo usa ningún componente conocido. Documentado, no corregido.
2. **🟡 Backfill de `partner_name`→`partner_id`** — sigue pendiente, sin fecha, tal como especificó el Decision Lock.
3. **🟡 Browser QA real todavía no realizada** — pendiente antes de cualquier promoción a producción.

## Recommended Next Step

P14.4-E P0 queda **CERRADO — PASS**, en código local, sin desplegar. El siguiente paso (Browser QA real, commit/push, despliegue) requiere una decisión explícita y un turno propio del propietario — ninguno autorizado ni ejecutado en este bloque.

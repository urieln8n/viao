---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem
DOMAIN: Producto + Datos (Home, Goal, Missions, Wallet, Rewards, Partners)
AUTHORITY: Registro de cierre de P14.4-F (auditoría + F1-F4) y de su despliegue a producción. F4 (Goal Completion) está commiteado y desplegado en código pero **BLOQUEADO en producción** hasta aplicar manualmente su migración — ver "POST-DEPLOY VERIFICATION" al final.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-04 (commit c02c5e9 pusheado y desplegado; BLOCKER encontrado — migración `20260904110000` no aplicada a producción)
---

# VIAO — P14.4-F CLOSURE RECORD

**Fecha**: 2026-09-04. **Estado en código**: **P14.4-F F3 + F4 — PASS. F4 SECURITY — PASS.** Commiteado (`c02c5e9`) y pusheado/desplegado a producción. **Estado real en producción**: F1/F2/F3/P0-1/P0-2 operativos; **F4 (Goal Completion) BLOQUEADO** — ver sección final.

## Resumen de la secuencia completa de P14.4-F

1. **Core Experience Final Audit** (solo auditoría) — 10 findings clasificados por severidad, entregados como informe de chat (sin archivo de documentación propio en ese turno, por instrucción explícita de "no modificar documentación"). F1-F8 nombrados ahí.
2. **F1 + F2** (implementación) — copy de referidos corregido (`profile.referralCodeExplainer`, describía un mecanismo inerte) + bono de registro explicado (`rewards.pointsExplainer`).
3. **F3 + F4** (implementación) — feedback de Points + Goal Completion real.
4. **F4 Security Audit** (auditoría independiente) — veredicto **PASS**.
5. **Este documento** — cierre formal.

## F3 — Points Feedback — CERRADO

**Arquitectura**: `components/state/points-toast.tsx` (`PointsToastHost`, montado una vez en `app/layout.tsx`, + `announcePointsEarned()`) — evento DOM plano, sin dependencia nueva (el proyecto no tenía Toast/Sonner). Reutiliza `--animate-celebrate` (design system ya existente, reservado desde su creación para "Mission completada, Reward conseguido" pero nunca implementado hasta este bloque).

**Cobertura real**: feedback inmediato implementado únicamente para `goal_created` (Mission, 50 Points) — el único caso donde el usuario que gana los Points está, de forma síncrona, en una pantalla interactiva propia (`GoalForm`, dentro de `app/goal-card.tsx`).

**Por qué no todas las fuentes de Points tienen feedback visual — explícito, no un olvido**: auditado exhaustivamente antes de implementar. `return_visit` se dispara en la Server Action de `/login`, justo antes de un redirect (el usuario ya no está en esa pantalla). `partner_activity`/`partner_activity_registered`/`referral` se disparan desde `/partners/ops/[accessToken]`, el panel operado por el **Partner**, no por el usuario que gana los Points — no existe hoy ninguna pantalla del usuario final a la que enganchar un toast en tiempo real para estas tres fuentes. `profile_completed` vive en `app/profile/actions.ts`/`page.tsx`, archivos con cambios preexistentes sin commitear y ajenos a este bloque, protegidos durante toda la sesión. `registration` ocurre en el propio signup (trigger DB) sin ningún punto de UI síncrono limpio — F2 ya cerró el gap real ("por qué tengo Points") con copy explicativo, alternativa deliberada a un toast forzado en un punto sin superficie adecuada.

**Accesibilidad**: `role="status"`, `aria-live="polite"`, contenedor `pointer-events-none` (nunca bloquea clics), toast `pointer-events-auto`.

**ES/EN**: `goals.pointsEarnedToastLabel` ("Objetivo creado" / "Goal created").

**Reduced motion**: `motion-safe:animate-celebrate` — bajo `prefers-reduced-motion: reduce` aparece/desaparece sin transición, información nunca se pierde.

**Sin cambios en reglas económicas ni en `rewards_transactions`** — el toast solo lee/anuncia un resultado ya decidido por el RPC `complete_mission()`, existente y sin modificar.

## F4 — Goal Completion — PASS

**Comportamiento real, verificado con tests reales (no simulados)**:

- El Goal completa cuando `earnedPoints >= targetPoints`.
- `earnedPoints` se calcula con el modelo acumulativo aprobado en P14.4-E: `points_at_goal_creation + SUM(rewards_transactions.amount WHERE type='earned' AND reason<>'redemption_refund' AND created_at > goal.created_at)`.
- `reason='redemption_refund'` queda excluido — un ciclo canjear+refund nunca infla `earnedPoints`.
- **Wallet balance NUNCA participa en la condición de completion** — verificado explícitamente (Test 9 de `complete-goal-if-threshold-met.test.ts`, compara contra `getEarnedPointsTowardGoal()` con la misma fórmula).
- Una `redemption` posterior no reabre un Goal ya `completed` (Test 4). Un `redemption_refund` posterior tampoco lo altera (Test 5).
- `completed_at` se establece exactamente en la transición, nunca cambia después (Test 6).
- La transición es idempotente (Tests 6/7) y concurrency-safe: **5 llamadas concurrentes reales producen exactamente 1 `just_completed:true`**, verificado empíricamente dos veces (turno de implementación + turno de seguridad, con aislamiento limpio en ambos).

**Mecanismo real**: RPC nuevo `complete_goal_if_threshold_met(p_goal_id, p_user_id)` (`supabase/migrations/20260904110000_add_complete_goal_if_threshold_met_rpc.sql`) — `SECURITY DEFINER`, `search_path=''`, `FOR UPDATE` + `WHERE status='active'`, autorización por `service_role` únicamente.

**Trigger modificado, imprescindible para F4**: `protect_goal_immutable_fields()` bloqueaba incondicionalmente cualquier transición de `status` distinta de `active→cancelled`. Se añadió una segunda excepción, `active→completed`, condicionada a una **señal transaccional** (`current_setting`/`set_config`, `is_local=true`) que únicamente el RPC anterior establece — mismo patrón ya auditado y en producción para Partners (`protect_partners_immutable_fields()` + `set_partner_status()`).

## F4 Security Audit — PASS

Auditoría independiente ejecutada en un turno propio, con ataques **empíricos reales** contra Postgres local (usuarios reales vía `signUp()`, PostgREST real, nunca `service_role` para los intentos de ataque en sí):

| Ataque | Resultado |
|---|---|
| `active → completed` directo (UPDATE de cliente) | PASS — rechazado |
| Modificar `target_points` | PASS — rechazado |
| Modificar `points_at_goal_creation` | PASS — rechazado |
| Modificar `user_id` | PASS — rechazado |
| Manipular la señal transaccional (`rpc/set_config`) | PASS — no alcanzable vía API REST (`pg_catalog`, fuera del schema expuesto); y aunque lo fuera, `is_local` no sobrevive entre peticiones HTTP separadas — ambas propiedades confirmadas empíricamente |
| Ownership incorrecto (RPC con `p_user_id` ajeno) | PASS — `not_found`, anti-enumeración |
| Invocación directa del RPC como `authenticated` | PASS — `permission denied`, código `42501` |
| 5 llamadas concurrentes reales | PASS — exactamente 1 `just_completed:true` |
| Control: `active → cancelled` (debe seguir permitido) | PASS — sin cambios |

**Conclusión de la auditoría**: `current_setting`/`set_config` **NO** es explotable — doblemente protegido (no alcanzable vía PostgREST + alcance transaccional aunque lo fuera). Ningún finding 🔴 CRITICAL, 🟠 HIGH ni 🟡 MEDIUM.

## G1 — LOW / FUTURE / NON-BLOCKING

**Hallazgo**: `goals` concede `UPDATE` a nivel de **tabla completa** a `authenticated` desde su creación (`20260823153000_create_goals.sql`, sin cambios de F4) — a diferencia de Partners, que además restringe el `GRANT` a nivel de **columnas específicas** (doble capa: GRANT + trigger). Goals depende únicamente del trigger como capa de protección.

**Conclusión**: no es una vulnerabilidad explotable demostrada — el trigger protegió correctamente todos los campos en los 9 ataques empíricos probados. No bloquea F4. No introducido por este bloque (arquitectura preexistente). **No se corrige en este bloque.**

**Clasificación**: **FUTURE / NON-BLOCKING** — candidato de bajo esfuerzo para un bloque futuro de endurecimiento, sin fecha ni urgencia asignada.

## Tests

**940/940 PASS, 0 FAIL, 0 SKIPPED** — corrida final de cierre, contra Postgres local real (Docker), sin regresiones desde el baseline de F3+F4 (también 940/940).

Desglose de tests nuevos de este bloque (P14.4-F, acumulado F1-F4):
- `lib/goals/complete-goal-if-threshold-met.test.ts` — 11 tests (los 10 pedidos + 1 de ownership/anti-enumeración).
- `lib/missions/complete-mission-if-fresh.test.ts` — 3 tests.
- `lib/rewards/get-rewards-catalog.test.ts` — sin cambios adicionales en este bloque (ya cerrado en P14.4-E).

## Build / TypeScript / Lint

- `npx tsc --noEmit` → **PASS (EXIT 0)**
- `npm run lint` → **PASS (EXIT 0)**
- `npm run build` → **PASS (EXIT 0)**

## Files Changed (acumulado F1-F4, este bloque)

```
M  lib/i18n/es.ts, lib/i18n/en.ts               (F1 + F2 + F3 copy)
A  supabase/migrations/20260904110000_add_complete_goal_if_threshold_met_rpc.sql  (F4)
A  lib/goals/complete-goal-if-threshold-met.ts, .test.ts                          (F4)
A  lib/missions/complete-mission-if-fresh.ts, .test.ts                            (F3)
A  components/state/points-toast.tsx                                              (F3)
M  lib/goals/get-goal.ts, create-goal.ts                                          (F3 + F4)
M  app/goal-card.tsx, app/layout.tsx                                              (F3 + F4)
```

## Preexisting Changes Preserved

Confirmado por `git diff --stat` idéntico en todos los turnos de P14.4-F — los 9 archivos/directorios ajenos (`app/partners/partner-image.tsx`, `app/profile/actions.ts`, `app/profile/page.tsx`, `components/layout/app-shell.tsx`, `lib/analytics/events.ts`, `lib/partners/get-partners-for-admin.ts`/`.test.ts`, `app/u/`, `lib/profile/`, más las 2 migraciones untracked preexistentes de antes de P14.3-A) permanecen intactos, ninguno tocado en ningún turno de esta secuencia.

## Documentation

- `docs/01_CURRENT/product/VIAO_P14_4_F_IMPLEMENTATION.md` (este documento, nuevo)
- `docs/00_VIAO_HANDOFF.md` (§2, §5, §21)
- `docs/01_CURRENT/product/VIAO_FUTURE_BACKLOG.md` (sección de cierre de P14.4-F, G1 registrado como FUTURE)

## POST-DEPLOY VERIFICATION (2026-09-04, turno posterior — COMMIT → PUSH → DEPLOY → PRODUCTION VERIFY)

**Commit**: `c02c5e9` ("feat: close P14.4-F core experience (Goal completion + Points feedback)"), pusheado a `origin/main`. **Deploy**: Vercel auto-deploy on push (mecanismo ya establecido, sin cambios de configuración) — `dpl_8WHbYcMpvCaYUxbM7eUdMU7qfDGG`, ● Ready, alias `https://viao.vercel.app` confirmado apuntando a este deployment.

**Verificado en producción (solo lectura — Home/Login/Wallet-gate/Partners)**: las 4 rutas responden `200 OK` con contenido real (título `VIAO`, sin marcador de error real; el falso positivo inicial de "This page could not..." resultó ser metadata RSC normal de Next.js del boundary `not-found`, no un error real).

**🔴 BLOCKER encontrado — migración de F4 NO aplicada a producción**: verificación de solo lectura contra el schema real de producción (Supabase, vía `service_role`, sin escritura) confirma:
- `rewards_catalog.partner_id` (P0-2, migración `20260904100000`) — **presente** en producción. ✅
- `goals.points_at_goal_creation` (preexistente) — **presente**. ✅
- RPC `complete_goal_if_threshold_met` (F4, migración `20260904110000_add_complete_goal_if_threshold_met_rpc.sql`) — **AUSENTE**. PostgREST responde `Could not find the function public.complete_goal_if_threshold_met(p_goal_id, p_user_id) in the schema cache`.

**Impacto real, rastreado en el código ya desplegado** (`lib/goals/get-goal.ts`, `lib/goals/complete-goal-if-threshold-met.ts`): cuando `earnedPoints >= targetPoints`, `getActiveGoal()` llama al RPC; al fallar (función inexistente), `completeGoalIfThresholdMet()` devuelve `{goalStatus:"not_found", justCompleted:false}` (fail-closed) y `getActiveGoal()` interpreta `goalStatus !== "active"` como "ya no hay Goal que mostrar", devolviendo `undefined`. **Efecto visible para cualquier usuario real que alcance el objetivo de su Goal ahora mismo**: el Goal desaparece de Home por completo (Home vuelve a mostrar el formulario "crear objetivo") en vez de completarse — **una regresión de UX peor que el estado anterior a este release** (antes, un Goal que alcanzaba el 100% simplemente seguía mostrando la barra llena, sin desaparecer). F1/F2/F3/P0-1/P0-2 no dependen de esta migración y no están afectados.

**Por qué no se aplicó automáticamente**: instrucción explícita del propietario para este mismo turno — "No ejecutes migraciones nuevas... si encuentras que una migración necesaria para este release NO está aplicada en producción, repórtalo como BLOCKER y detente. NO LA APLIQUES AUTOMÁTICAMENTE."

**Smoke test de escritura en producción (crear/completar/limpiar un Goal real de prueba) no se ejecutó**: bloqueado por el propio sistema de permisos del entorno antes de cualquier escritura (ninguna fila se llegó a crear); dado que la verificación de solo lectura ya encontró el BLOCKER real (RPC ausente), no era necesario insistir — el resultado habría sido el mismo error.

**Acción pendiente, manual, del propietario**: aplicar `supabase/migrations/20260904110000_add_complete_goal_if_threshold_met_rpc.sql` al Postgres de producción (mismo procedimiento manual ya usado para las migraciones anteriores de P13/P0-2 — ver `docs/00_VIAO_HANDOFF.md`). Hasta entonces, F4 (Goal Completion) permanece BLOQUEADO en producción aunque el código ya está desplegado. Registrado también en `VIAO_FUTURE_BACKLOG.md` (sección NOW).

## Recommended Next Step

P14.4-F (F1-F4) queda **CERRADO — PASS** en código, **commiteado y desplegado** (`c02c5e9`). Pendiente real, no de código: aplicar la migración de F4 a producción (BLOCKER de arriba) antes de que Goal Completion funcione para usuarios reales. Ningún otro trabajo autorizado en este bloque — no F5-F8, no P14.5, no Partners.

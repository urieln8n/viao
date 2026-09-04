---
STATUS: CURRENT
ERA: Post Master Core Polish & Real-World Validation
DOMAIN: Producto (transversal)
AUTHORITY: Registro de ideas — NUNCA autoriza implementación por sí mismo. Cada línea requiere su propia auditoría/autorización explícita en su propio turno, igual que cualquier otro bloque de VIAO.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-04 (POST-DEPLOY, mismo día — P14.4-F commiteado/pusheado/desplegado (`c02c5e9`); nuevo ítem NOW: migración de F4 no aplicada a producción, BLOCKER. Sincronizaciones previas, mismo día: P14.4-F CLOSURE (sección "COMPLETADO — P14.4-F", 940/940 tests, G1 LOW/FUTURE/NON-BLOCKING), post-P14.4-E DOCUMENTATION SYNC + CLOSURE, post-implementación P14.4-E, post-P14.4-D, post-P14.4; creación original 2026-09-02 — MASTER CORE POLISH & REAL-WORLD VALIDATION)
---

# VIAO — FUTURE BACKLOG

Documento vivo, creado por instrucción explícita del bloque "MASTER CORE POLISH & REAL-WORLD VALIDATION" (§37). Separa lo que bloquea el Core hoy de lo que es mejora futura, línea de producto futura, o idea sin validar — **nada de lo listado aquí está autorizado a implementarse por estar en esta lista.**

---

## NOW — bloquea o pone en riesgo el Core hoy

- **Verificar y aplicar en producción los GRANTs de `service_role` sobre `profiles`, `goals` y `rewards_wallets`** (migración `20260902120000`, este mismo bloque). Sin acceso `service_role` (probado real, no solo en local), Share Profile no funciona en producción y cualquier futura feature que lea estas tablas por `service_role` fallará igual que falló aquí antes del fix. Mismo procedimiento manual ya usado para las migraciones anteriores de P13 — ver `docs/00_VIAO_HANDOFF.md`.
- **Aplicar también en producción la migración pendiente de P13** (`20260902100000_p13_grant_security_hardening.sql`) — sigue documentada como pendiente en `docs/00_VIAO_HANDOFF.md`, sin cambios desde entonces, no es responsabilidad de este bloque pero condiciona la seguridad real de producción.
- **🔴 BLOCKER (P14.4-F, 2026-09-04, encontrado en POST-DEPLOY VERIFY) — aplicar la migración de F4 a producción**: `supabase/migrations/20260904110000_add_complete_goal_if_threshold_met_rpc.sql` está commiteada y desplegada en CÓDIGO (`c02c5e9`) pero **NO aplicada al Postgres de producción** (confirmado por lectura directa: PostgREST no encuentra el RPC `complete_goal_if_threshold_met`). Efecto real ahora mismo: cualquier usuario cuyo `earnedPoints` alcance el `targetPoints` de su Goal activo ve su Goal **desaparecer de Home** (nunca se completa, nunca se muestra) — peor que el comportamiento anterior a este release. No aplicada automáticamente por instrucción explícita del propietario. Ver `VIAO_P14_4_F_IMPLEMENTATION.md` sección "POST-DEPLOY VERIFICATION" para el detalle completo y el procedimiento de aplicación manual.

## COMPLETADO — P14.4-E P0 Core Model Implementation (2026-09-04)

**Ya NO está pendiente.** Ambas decisiones P0 (Goal↔Wallet Opción B, Partners↔Rewards Opción C) implementadas, validadas con 926/926 tests reales contra Postgres local (0 fail) y con la migración `20260904100000_add_partner_id_to_rewards_catalog.sql` aplicada y verificada en schema real (local Y producción). tsc/lint/build en verde. **Commiteado y desplegado** (`c02c5e9`) — ver `VIAO_P14_4_E_P0_IMPLEMENTATION.md` para el registro completo.

- **Goal↔Wallet**: `lib/goals/get-earned-points.ts` (nuevo), `get-goal.ts`/`calculate-progress.ts`/`goal-card.tsx`/`page.tsx` actualizados.
- **Partners↔Rewards**: `rewards_catalog.partner_id` (nullable, FK, `ON DELETE SET NULL`), sin propagar a ninguna UI todavía (deliberado).

## COMPLETADO — P14.4-F Core Experience Final Audit + F1-F4 (2026-09-04)

**Ya NO está pendiente en código.** F1 (copy de referidos corregido), F2 (bono de registro explicado), F3 (feedback "+N Points" para `goal_created`, alcance real auditado y limitado — ver abajo), F4 (Goal Completion real: nuevo RPC `complete_goal_if_threshold_met()`, `earnedPoints`-based, nunca Wallet balance) — todos implementados y validados con 940/940 tests reales. F4 pasó además una **auditoría de seguridad independiente** (9 ataques empíricos reales, todos bloqueados) — ver `VIAO_P14_4_F_IMPLEMENTATION.md` para el registro completo. **Commiteado y desplegado** (`c02c5e9`) — **pero F4 sigue BLOQUEADO en producción real, ver el ítem NOW de arriba**.

- **G1 — LOW / FUTURE / NON-BLOCKING**: `goals` concede `UPDATE` a nivel de tabla completa a `authenticated` (a diferencia de Partners, que además restringe por columnas) — el trigger `protect_goal_immutable_fields()` es hoy la única capa de protección, y resistió los 9 ataques empíricos probados. Candidato de bajo esfuerzo para un futuro bloque de endurecimiento (GRANT de columnas explícitas para Goals), sin fecha ni urgencia. Ver `VIAO_P14_4_F_IMPLEMENTATION.md`.

## NEXT — mejoras a validar con los primeros usuarios/Partners reales

- Repetir el **REAL USER PILOT** (§34 del encargo) con 10-15 usuarios y 5 Partners reales, y usar sus respuestas a la encuesta de §35 para priorizar esta sección con evidencia real, no intuición.
- **Auditoría dedicada del mismo hallazgo de GRANTs faltantes** en las 5 tablas fuera del alcance de P13 que ESTE bloque no verificó por falta de necesidad demostrada: `destinations`, `mission_completions`, `partner_activities`, `photos`, `reward_redemptions`. Ninguna ha fallado nunca porque ningún código usa `service_role` sobre ellas todavía — pero el mismo patrón (GRANT nunca explícito, dependía del ACL permisivo pre-P13) es plausible en cualquiera. No se corrige de forma especulativa aquí.
- Extender el "Web Share API + fallback portapapeles" de Share Profile con una prueba manual en un navegador real de escritorio y uno móvil (la verificación automatizada de este bloque confirmó el código correcto, pero el fallback de portapapeles no pudo confirmarse con éxito en el entorno de QA headless — ver el informe de este bloque, sección Security/QA).
- **(P14.2, 2026-09-04) Validar con 2-3 Partners piloto reales** cuál de estas dos rutas les importa más antes de construir ninguna: (A) mejores métricas/narrativa de valor en el Dashboard (`VIAO_PARTNERS_MASTER_ROADMAP.md` P11/P12), o (B) una forma más fiable de registrar Actividad — hoy 100% autodeclarada por el propio Partner, sin QR real ni verificación externa (`VIAO_PARTNERS_MASTER_ROADMAP.md` P11.1). No decidir sin esa evidencia.

## LATER — líneas de producto futuras (ninguna implementada, todas ya auditadas en profundidad)

Todo lo siguiente ya tiene una auditoría completa propia en esta misma sesión (`V3.0 MASTER AUDIT`, `V3.0.1`/`V3.0.1.2 BRAND AUDIT`) — no se repite el análisis aquí, solo se enlaza como recordatorio de que existe y de que ninguna decisión de producto quedó tomada:

- Discovery real (buscador/filtro/geolocalización).
- Experiences como unidad de producto propia (con reserva, capacidad, horario).
- Exchange (dar/intercambiar objetos) — pendiente de Decision Lock explícito sobre Trust & Safety antes de cualquier prueba, aunque sea reducida.
- Tourism como vertical propia — pendiente de Decision Lock explícito que resuelva la tensión con el Core Reset ya ejecutado (`VIAO_MASTER_CONTEXT_V1.md`).
- Partner Monetization por niveles / SEO programático / City Quests / Daily Challenges.
- Decisión de marca (mantener VIAO vs. dominio nuevo vs. rebrand) — ver `V3.0.1`/`V3.0.1.2`, pendiente de decisión del propietario.

## PARKED — ideas concretas, sin validar, no descartadas

- **(P14.4, 2026-09-04, ACTUALIZADO por P14.4-F) Hallazgos P1/P2 del Core Experience Audit**: feedback inmediato al ganar Points y celebración al completar el Goal — **ya implementados en P14.4-F** (F3/F4), pero con alcance real limitado: el toast de Points solo cubre `goal_created` (única fuente con superficie síncrona propia del usuario; `return_visit`/`partner_activity`/`referral`/`profile_completed`/`registration` quedan sin feedback en tiempo real por motivos estructurales, ver `VIAO_P14_4_F_IMPLEMENTATION.md`). Siguen sin implementar: Missions rotativas o ampliadas (hoy solo 4 fijas, se agotan tras la primera semana), mostrar `targetDate` en `ActiveGoalCard`, reordenar `/rewards` para que el saldo sea la primera card.
- **(P14.4-D, 2026-09-04, RESUELTO por P14.4-F) `goals.status` nunca transicionaba a `'completed'`** — resuelto en P14.4-F (F4), ver `VIAO_P14_4_F_IMPLEMENTATION.md`. Sigue pendiente, sin resolver, no bloqueante: `app/rewards/page.tsx` no traduce los `reason` reales de Missions/Partner activity (`mission:<key>`, `partner_activity`) en el historial de Wallet, el usuario ve el string interno tal cual. Ver `VIAO_P14_4_D_P0_DECISIONS.md` §6.

- **Partner Portal V1** (auditoría de Bloque A iniciada y luego pausada antes de este bloque): Experience CRUD completo con media/Storage/publicación, gestionado por el propio Partner. Coincide parcialmente con "Experiences" de LATER — si se retoma, debe decidirse primero si es una extensión mínima de `partner_activities` (recomendado en `V3.0 MASTER AUDIT` §32) o el alcance completo original del encargo.
- **"Entrar como Partner" (impersonation) para Admin** — explícitamente no implementado por instrucción propia del encargo de Partner Portal V1; requiere su propio diseño de auditoría/reversibilidad si se retoma.
- **Icono de avatar por defecto más allá de un icono genérico de persona** (`PartnerImage`, este bloque) — iniciales del nombre, color determinista por usuario, etc. — mejora cosmética menor, no bloqueante, no validada con usuarios reales todavía.

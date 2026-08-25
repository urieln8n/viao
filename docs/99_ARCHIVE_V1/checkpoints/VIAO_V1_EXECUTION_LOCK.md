---
STATUS: HISTORICAL / GOVERNANCE PRECEDENT
ERA: V1 checkpoint
DOMAIN: Gobernanza/Meta
AUTHORITY: Contenido operativo NO vigente; su jerarquía de autoridad documental (código > decisiones recientes > docs V1 > docs fundacionales) SÍ es precedente vigente — incorporada en docs/00_GOVERNANCE.md
SUPERSEDES: —
SUPERSEDED BY: docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md (Goals); docs/VIAO_MVP_MASTER.md (estado operativo general, en revisión)
LAST REVIEWED: 2026-08-24 (fecha propia)
---

# VIAO V1 — Execution Lock

**Fecha:** 2026-08-24
**Branch:** `main` — **HEAD:** `76f0947` ("fix: complete goal cancellation flow")
**Autor de la decisión:** Andrés (VIAO es su proyecto exclusivo)

**Qué es este documento**: la fuente de verdad **operativa** para continuar VIAO V1 a partir de este punto — dónde estamos, qué está cerrado, qué sigue abierto, qué NO se toca, y cuál es el siguiente bloque exacto. No es un documento de implementación detallada.

**Relación con el resto de la documentación** (jerarquía de autoridad usada en este documento, tal como se pidió):
1. Código real + tests + migraciones actuales (fuente última de verdad técnica).
2. Decisiones V1 más recientes aprobadas — **este documento** y, para detalle técnico, [`VIAO_V1_PRODUCT_LOOP_CHECKPOINT.md`](./VIAO_V1_PRODUCT_LOOP_CHECKPOINT.md) (checkpoint técnico de estado, no se duplica aquí).
3. Documentos V1 — [`VIAO_V1_LOOP_DECISION.md`](./VIAO_V1_LOOP_DECISION.md), [`VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md`](./VIAO_COMPETITIVE_AUDIT_DECISION_LOCK.md).
4. Documentos fundacionales antiguos — `VIAO_MVP_v0.1.md`, `VIAO_ARCHITECTURE.md`, `VIAO_DATABASE.md`, `VIAO_ROADMAP.md` (ver sección 10, parcialmente desactualizados).

Este documento no repite el detalle técnico ya fijado en el Checkpoint (RPC, RLS, tests línea por línea) — lo referencia. Su función es ser el punto de entrada rápido: "¿dónde estamos y qué es lo siguiente?".

---

## 1. Dónde estamos

- **Commiteado** (2 commits, `main`, `ahead 2` de `origin/main`): Rewards + Goals completos (`e0c39ea`, `76f0947`).
- **En working tree, sin commit**: Missions completo (código + 14 tests, todos verdes) y el bloque de Goal-en-onboarding.
- **E2E visual de Missions**: **INCONCLUSO** por limitaciones del daemon/tooling de navegador (`browse`) — nunca se declaró PASS, y este documento reafirma que no debe declararse.
- **Hotelbeds**: 🟡 CONGELADO, caso `#60019483`, sin llamadas reales.
- **Flights**: DIFERIDO.

## 2. Qué está terminado

- Rewards (catálogo, canje, cancelación/refund, kill-switch mensual) — commiteado.
- Goals (crear, leer con progreso, cancelar, único activo forzado por constraint) — commiteado.
- Missions (4 Missions mínimas, RPC atómico, RLS, kill-switch, 14 tests) — implementado, **pendiente de commit**, no de desarrollo.
- Vision y Referidos — de bloques anteriores a este ciclo V1, funcionales.

## 3. Qué está congelado

- **Hotelbeds** — íntegramente. 0 llamadas reales, sin tocar credenciales/certificados/endpoints/Vercel/producción. El siguiente movimiento depende exclusivamente de la respuesta oficial al caso `#60019483`.
- **Goals (código)** — el modelo híbrido actual queda congelado como referencia hasta nueva decisión explícita (ver sección 6). No se toca en este turno ni en el próximo bloque.

## 4. Qué está bloqueado externamente

- Validación visual E2E de Missions — el tooling de navegador (`browse`) presenta crashes del daemon no atribuibles a código de VIAO (diagnóstico ya documentado en el Pre-flight Audit previo). Queda marcado **PENDIENTE / BLOQUEADO POR TOOLING**, nunca como PASS.
- Resolución del caso Hotelbeds `#60019483` — depende de un tercero (Hotelbeds).

## 5. Decisiones aprobadas en este Decision Lock

### 5.1 Missions V1 — no se amplía

Fijado explícitamente: **Missions V1 permanece mínima, 3-5 Missions como máximo, sin ampliarse en esta etapa.**

Explícitamente descartado ahora: árbol complejo de misiones, niveles, badges, streaks complejos, marketplace de missions, sistema dinámico, editor administrativo, generación de missions por IA, economía paralela. La economía sigue pasando íntegramente por el ledger único (`rewards_transactions`).

Estado técnico ya construido (detalle completo en el Checkpoint, sección 4 — aquí solo el resumen operativo):
- `completeMission()` + RPC `complete_mission()` (`SECURITY DEFINER`, único invocable por `service_role`).
- Idempotencia real vía `UNIQUE(user_id, mission_key, period_key)`.
- Advisory lock global de Missions (independiente del de Rewards).
- Atomicidad completion + ledger en una sola transacción.
- Kill-switch mensual (3000 Points), independiente del pool de Rewards.
- `period_key` server-side siempre (nunca del cliente); `'lifetime'` para `goal_created`, cerrando por construcción el farming por cancelar/recrear Goal.
- 14 tests, incluida concurrencia real (`Promise.all`), RLS, y bloqueo de invocación directa del RPC.

**E2E visual: PENDIENTE / BLOQUEADO POR TOOLING.** Nunca PASS.

### 5.2 Vision — permanece, sin acoplarse a Missions

**VISION PERMANECE EN EL PRODUCTO.** No se elimina, no se rompe, no se oculta activamente. Sigue siendo un activo diferenciado de VIAO (`docs/VIAO_V1_LOOP_DECISION.md` ya la calificaba como "la funcionalidad más completa del proyecto").

**VISION NO ES UNA DEPENDENCIA DEL LOOP ECONÓMICO DE MISSIONS V1.** Ninguna Mission depende de `vision_used`. No se crean Missions basadas en Vision en esta etapa.

**⚠️ Contradicción documental resuelta por este Decision Lock**: `docs/VIAO_V1_LOOP_DECISION.md` (línea 151, sección de diseño de Missions semanales) proponía originalmente reutilizar `search_started` **y `vision_used`** como eventos candidatos. La implementación real (`lib/missions/rules.ts`) usa `search_started`, `return_visit`, `hotel_viewed`, `goal_created` — **`vision_used` nunca se implementó**. Este Decision Lock fija que esa omisión es intencional y definitiva para V1, no un olvido pendiente de corregir: la propuesta original de `VIAO_V1_LOOP_DECISION.md` queda superada por el código real + esta decisión, según la jerarquía de autoridad de la sección de cabecera.

### 5.3 Goals — código congelado, discrepancias reconocidas y NO resueltas

**No se modifica el código de Goals en este turno.** El modelo actual queda congelado como referencia hasta nueva decisión explícita:
- Progreso = modelo híbrido ya implementado (`points_at_goal_creation` + earned posterior a la creación).
- El saldo del Wallet se sigue mostrando por separado.
- Canjear un Reward NO reduce el progreso histórico del Goal.
- Crear otro Goal NO cancela automáticamente el activo — debe cancelarse explícitamente primero, según las restricciones actuales (`goals_one_active_per_user_idx`).

**Importante, fijado explícitamente**: estas diferencias respecto a una posible semántica alternativa (progreso = saldo del Wallet en tiempo real) **no son bugs** — son decisiones de producto ya implementadas y documentadas en su propia migración (`20260823153000_create_goals.sql`), incluida la razón histórica del diseño actual (evitar una "señal desmotivadora" de un modelo anterior que sí usaba saldo en tiempo real).

Una auditoría de reconciliación específica (Goals Reconciliation Audit, este mismo checkpoint) ya documentó en detalle el gap, el plan mínimo de implementación y una recomendación técnica — **esa recomendación queda registrada pero explícitamente no ejecutada**: no se hace onboarding obligatorio ahora, no se crea ninguna migración nueva, no se cambia Goals en este turno. La decisión de si se reconcilia con un modelo alternativo queda **abierta** (sección 6 de este documento).

### 5.4 Rewards — no se toca

Rewards ya está construido y commiteado. No se reconstruye, no se cambia el ledger, no se crea un segundo sistema de Points. `rewards_transactions` sigue siendo la única fuente de verdad económica. Cualquier cambio futuro relacionado con Points exige auditar primero: `rewards_transactions`, `rewards_wallets`, `redeem-reward`, `cancel-redemption`, `mark-redemption-fulfilled`, reglas económicas, idempotencia, refunds, kill-switch, RLS, concurrencia. Nada de esto se implementa en este turno.

### 5.5 Partners — modelo conceptual fijado, sin implementar

Modelo conceptual del siguiente gran experimento comercial (posterior al cierre de Missions):

```
PARTNER → QR → COMPRA ATRIBUIDA → COMISIÓN → POINTS
```

- Atribución mediante QR (token rotativo, ya diseñado conceptualmente en `VIAO_V1_LOOP_DECISION.md`).
- El Partner introduce/confirma el importe de la compra atribuida.
- VIAO registra la compra atribuida y genera una comisión.
- Una parte de esa comisión alimenta Points, según las reglas V1 aprobadas.

**Dos métricas económicas distintas, que no deben confundirse entre sí**:
1. **Ratio de cofinanciación Partner/Reward** — 50% Partner / 50% VIAO en el canje de un Reward (`rewards_catalog.funding_split`, `partner_50_50`) — **[DECISIÓN APROBADA, `VIAO_V1_LOOP_DECISION.md`, no implementada en código todavía]**.
2. **% de la comisión de Partner que se convierte en Points** — `POINTS_PERCENTAGE_OF_COMMISSION = 0.25` (25%, no 50%) — **[CONFIRMADO EN CÓDIGO, `lib/rewards/rules.ts`, pero sin ningún flujo real que lo ejercite todavía — es una constante preparada, no un mecanismo activo]**.

**El mecanismo exacto de atribución (cómo se valida una "compra atribuida" real, con qué garantías antifraude en el momento del QR) no está completamente formalizado en ningún documento existente.** Se documenta aquí como **DECISIÓN V1 PENDIENTE DE FORMALIZACIÓN** — no se inventan detalles adicionales sobre cómo funcionaría técnicamente.

No se implementa Partners en este turno ni en el inmediatamente siguiente.

### 5.6 Antifraude y caducidad — fase posterior, sin definir en detalle

Después de Partners/QR: antifraude ampliado, límites, caducidad de Points, detección de abuso, reconciliación económica. Se mantiene como fase futura, sin implementar ni especificar en detalle ahora.

### 5.7 Hotelbeds — regla absoluta, sin cambios

Estado: 🟡 **CONGELADO** — caso `#60019483` (verificado contra `docs/01_CURRENT/providers/HOTELBEDS_CERTIFICATION_STATUS.md`). Cero llamadas reales, sin reservar, sin cancelar, sin cambiar credenciales/certificados/endpoints, sin tocar Vercel, sin pruebas reales. La integración continúa en entorno de evaluación (`MockHotelProvider`, `TRAVEL_PROVIDER` sin definir en local). El siguiente movimiento depende exclusivamente de la respuesta oficial de Hotelbeds a ese caso.

### 5.8 Flights — diferido

Sin cambios. No se toca.

### 5.9 UX/UI — especificación conceptual, sin implementar

Principio: **Travel premium + fintech + loyalty.** No infantil, no apariencia puramente bancaria, no parecer una simple app de hoteles. Mensaje central: *"Tu actividad cotidiana te acerca a tu próximo viaje."*

Elementos a especificar progresivamente (paleta, tipografía, espaciado, cards, botones, navegación, iconografía, estados, Points, Goal, Rewards, Partner, Home) — sin rediseño total ahora.

Ejemplo de Home ideal (conceptual, no vinculante sobre qué fórmula de progreso usar — eso sigue abierto, sección 6):

```
1.240 Points

Próximo objetivo: ROMA
62% conseguido
Te faltan 760 Points
```

No se implementa ningún cambio visual en este turno, salvo que exista una tarea posterior específica que lo autorice.

## 6. Decisiones que siguen abiertas

1. **Reconciliación del modelo de progreso de Goals**: ¿se mantiene el modelo híbrido actual (progreso monotónico, insensible al gasto) o se adopta `progress = wallet_balance / target_points` (V1 tal como se propuso en un turno anterior de esta sesión)? Existe un análisis completo (Gap Analysis, plan de implementación mínimo, matriz de tests) ya entregado — pendiente de una decisión explícita antes de tocar código.
2. **Formalización exacta del mecanismo de atribución Partner/QR** — validación antifraude en el momento de la visita, quién confirma el importe y cómo, qué pasa ante una disputa. No formalizado todavía en ningún documento.
3. **Fecha/condición exacta para retomar Hotelbeds** — depende de un tercero, sin ETA controlable por VIAO.
4. **Cuándo y cómo se ejecuta el commit de Missions** — técnicamente lista (sección 5.1), pendiente de autorización explícita de commit, no de más desarrollo.

## 7. Qué NO tocar (reglas absolutas de trabajo, vigentes desde este Decision Lock)

1. No modificar código de producto sin autorización explícita de ese turno concreto.
2. No crear migraciones sin autorización explícita.
3. No cambiar `.env`.
4. No tocar credenciales.
5. No tocar certificados.
6. No tocar Vercel.
7. No hacer llamadas reales a Hotelbeds.
8. No implementar funcionalidades nuevas por iniciativa propia.
9. No inventar decisiones económicas — toda cifra nueva se clasifica `[CONFIRMADO EN CÓDIGO]` / `[DECISIÓN APROBADA]` / `[HIPÓTESIS]` / `[BENCHMARK DE MERCADO]`.
10. No duplicar el ledger.
11. No crear un segundo sistema de Points.
12. No convertir decisiones de producto ya implementadas en "bugs".
13. No declarar PASS cuando una validación (especialmente E2E) sea inconclusa.
14. No ampliar Missions más allá de las 4 ya definidas.
15. No rediseñar toda la UI de una vez.
16. No eliminar Vision.
17. No introducir Vision como dependencia de Missions V1.
18. No cambiar Goals hasta que la decisión de la sección 6.1 se resuelva explícitamente.
19. No hacer onboarding obligatorio.
20. No hacer commit ni push sin autorización explícita de ese turno concreto.

## 8. Criterios que debe cumplir cualquier implementación futura de earning/Points

Todo mecanismo nuevo que otorgue Points debe cumplir, sin excepción (mismo estándar ya aplicado en Rewards y Missions):
- Idempotencia real a nivel de base de datos (constraint, no solo lógica de aplicación).
- Atomicidad entre el evento y su escritura en el ledger.
- RLS que impida lectura/escritura ajena.
- `period_key` (o equivalente de deduplicación temporal) resuelto siempre server-side, nunca confiado del cliente.
- Kill-switch con techo explícito, fail-closed.
- Único escritor económico real (`service_role`, vía RPC `SECURITY DEFINER` o el escritor ya existente — nunca un segundo camino de escritura).
- Tests de concurrencia con llamadas reales, no solo mockeadas.
- Prueba explícita de ausencia de duplicación bajo reintento.

## 9. Documentos fundacionales — estado

`docs/99_ARCHIVE_V1/foundational/VIAO_ARCHITECTURE.md` y `docs/99_ARCHIVE_V1/foundational/VIAO_DATABASE.md` (17 de agosto de 2026) son **anteriores** a los bloques de Rewards, Goals y Missions (23-24 de agosto de 2026) y no reflejan el schema real vigente hoy. Se marcan como:

**Históricos / parcialmente desactualizados; el schema real vigente es el de las migraciones actuales (`supabase/migrations/`).**

No se reescriben ahora — la actualización de estos dos documentos queda anotada como housekeeping posterior, sin prioridad asignada en este Decision Lock.

## 10. Estado real del roadmap

| Bloque | Estado | Evidencia | Siguiente acción |
|---|---|---|---|
| Rewards | COMPLETADO | Commit `e0c39ea`; `lib/rewards/*`, migraciones, tests verdes | Ninguna — solo auditar antes de tocarlo de nuevo (sección 5.4) |
| Goals | COMPLETADO (código) / EN CURSO (decisión de producto) | Commits `e0c39ea`, `76f0947`; `lib/goals/*`, migraciones, tests verdes | Resolver la decisión abierta de la sección 6.1 antes de cualquier cambio |
| Missions | COMPLETADO (técnico) / PENDIENTE (commit + E2E visual) | `lib/missions/*`, 2 migraciones sin commitear, 14 tests verdes | Commit cuando se autorice (sección 11) |
| Partners | PENDIENTE | Sin código; modelo conceptual fijado en sección 5.5 | Formalizar el mecanismo de atribución (decisión abierta 6.2) antes de diseñar implementación |
| QR | PENDIENTE | Sin código; diseño conceptual únicamente | Depende de Partners |
| Antifraude | PENDIENTE | `lib/rate-limit/` existe pero no aplicado a Points todavía | Definir en detalle solo después de Partners/QR |
| Caducidad | PENDIENTE | No implementado; solo `reward_redemptions.expires_at` (caducidad del código de canje, no del saldo) | Definir en detalle solo después de Partners/QR |
| Hotelbeds | CONGELADO | `docs/01_CURRENT/providers/HOTELBEDS_CERTIFICATION_STATUS.md`, caso `#60019483` | Ninguna hasta respuesta oficial de Hotelbeds |
| Flights | DIFERIDO | Sin código | Ninguna |
| Vision | COMPLETADO | `lib/vision/*`, tests verdes, funcional y visible | Ninguna — se mantiene sin acoplarse a Missions (sección 5.2) |
| Referidos | COMPLETADO | `lib/referrals/*`, tests verdes | Ninguna en este ciclo |
| Ledger | COMPLETADO | `rewards_transactions` + `rewards_wallets`, único escritor auditado | Ninguna — sigue siendo la única fuente de verdad para todo lo anterior |

## 11. Siguiente paso real

El siguiente paso **no es implementar nuevas Missions ni Partners**. Es:

1. Cerrar/documentar este Decision Lock (este documento).
2. Validar que no existan contradicciones nuevas entre código real y documentación (hecho en este turno — ver sección 5.2 para la única contradicción encontrada, ya resuelta aquí).
3. Preparar el commit de Missions (revisión final de archivos afectados, sin tocar Rewards/Goals/Hotelbeds).
4. Ejecutar la validación técnica final (tests + tsc + lint + build) inmediatamente antes de ese commit.
5. Commit de Missions.
6. Solo después, avanzar al siguiente bloque aprobado (Partners), empezando por resolver su decisión abierta (sección 6.2), no por escribir código.

No se implementa Partners todavía. No se implementa Antifraude todavía. No se toca Hotelbeds.

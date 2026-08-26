---
STATUS: CURRENT
ERA: Esta sesión (post-reorganización documental)
DOMAIN: Meta / Continuidad
AUTHORITY: Punto de entrada de continuidad — NO tiene autoridad sobre código, Decision Locks ni CURRENT. Es un mapa de navegación y estado, no una fuente de decisiones.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — HANDOFF

## 1. Purpose

Este documento es el **punto de entrada oficial de continuidad** de VIAO para cualquier chat nuevo con Claude Code. No sustituye a:

- `docs/00_GOVERNANCE.md` (reglas documentales y de autoridad)
- los documentos `CURRENT` de cada dominio
- los Decision Locks
- el código, las migraciones y los tests

Es un mapa: dice **dónde está cada cosa y qué estado tiene**, no decide nada por sí mismo. Ninguna afirmación de este documento debe tratarse como una decisión nueva — si algo aquí parece una decisión, la decisión real vive en el documento fuente citado.

---

## 2. Current project state

- **Fase/bloque actual**: cierre de la reorganización documental y formalización de Rewards V1 (CURRENT + Decision Lock, ya auditados independientemente). Este propio HANDOFF es el bloque en curso.
- **Último bloque cerrado**: Rewards V1 — `docs/01_CURRENT/rewards/VIAO_REWARDS_V1.md` + `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md`, con auditoría independiente y correcciones ya aplicadas.
- **Siguiente bloque autorizado**: **ninguno todavía** — ver sección 11. El siguiente bloque *lógico* (Missions) no está autorizado hasta que se pida explícitamente.
- **Último commit documental conocido**: `3b09d49` — "docs: reorganize VIAO documentation and establish governance". Existen cambios posteriores sin commitear (ver `git status` en cada sesión — este documento no fija ese estado porque cambia con cada bloque).
- **Estado documental**: `REVIEW REQUIRED = 0`. Quedan 2 documentos en `docs/` raíz sin archivar formalmente, ambos con nota de supersesión parcial ya aplicada, pendientes de tu confirmación explícita para moverlos: `VIAO_PARTNERS_MASTER.md` y `VIAO_V1_LOOP_DECISION.md` — ver sección 15 de `00_GOVERNANCE.md`.
- **Estado técnico**: Rewards y Missions implementados y probados en código (ver sección 6). Missions **no tiene todavía** documentación `CURRENT` ni Decision Lock propios — es un gap documental confirmado, no un gap de implementación.
- **Pendiente de auditoría**: Missions (documentación, no código — el código ya fue auditado en el bloque combinado "Rewards + Missions V1" de esta sesión). Goals tiene Decision Lock pero no documento `CURRENT` propio — mismo tipo de gap.

---

## 3. Authority hierarchy

| Orden | Nivel | Ejemplo | Prevalece sobre |
|---|---|---|---|
| 1 | Código + migraciones + tests | `lib/`, `supabase/migrations/` | Todo lo demás, siempre |
| 2 | Decision Locks | `docs/02_DECISION_LOCKS/**` | CURRENT, MASTER_PRODUCT_CONTEXT, GOVERNANCE |
| 3 | CURRENT | `docs/01_CURRENT/**` | MASTER_PRODUCT_CONTEXT (en su propio dominio técnico), HISTORICAL |
| 4 | `VIAO_MASTER_PRODUCT_CONTEXT.md` | — | Autoridad de producto/estrategia global; no manda sobre el dominio técnico de un CURRENT específico |
| 5 | `00_GOVERNANCE.md` | — | Reglas de gobernanza documental, no decisiones de producto |
| 6 | `99_ARCHIVE_V1/` / histórico | — | Ninguno — referencia, nunca autoridad vigente |

**Caso especial ya resuelto**: `docs/VIAO_MVP_MASTER.md` (checkpoint técnico/ingeniería) y `VIAO_MASTER_PRODUCT_CONTEXT.md` (producto/estrategia) son complementarios, no hay uno superior al otro — cada uno manda en su propio dominio (ver `00_GOVERNANCE.md`, sección "MVP_MASTER vs MASTER_PRODUCT_CONTEXT").

---

## 4. Documents to read first

| Prioridad | Documento | Para qué leerlo |
|---|---|---|
| 1 | `docs/00_GOVERNANCE.md` | Reglas de autoridad y estado documental global |
| 2 | Este documento (`docs/00_VIAO_HANDOFF.md`) | Estado y navegación actual |
| 3 | `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` | Propósito de producto, qué es VIAO hoy, Decision Register global |
| 4 | `docs/VIAO_MVP_MASTER.md` | Estado técnico/ingeniería granular (checkpoint) |
| 5 | `docs/01_CURRENT/rewards/VIAO_REWARDS_V1.md` | Cómo funciona Rewards hoy |
| 6 | `docs/02_DECISION_LOCKS/rewards/VIAO_REWARDS_V1_DECISION_LOCK.md` | Qué de Rewards está bloqueado |
| 7 | `docs/02_DECISION_LOCKS/goals/VIAO_GOALS_V1_DECISION_LOCK.md` | Qué de Goals está bloqueado |
| 8 | `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` + `VIAO_PARTNERS_TECHNICAL_SPEC.md` | Partners — producto y diseño técnico |
| 9 | `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` | Partners — economía bloqueada |

*(Añadir aquí `docs/01_CURRENT/missions/VIAO_MISSIONS_V1.md` y `docs/02_DECISION_LOCKS/missions/VIAO_MISSIONS_V1_DECISION_LOCK.md` en cuanto existan.)*

---

## 5. Block status

| Bloque | Estado | Autoridad | Siguiente acción |
|---|---|---|---|
| Documentación / gobernanza | Cerrado y committeado (`3b09d49`) | `00_GOVERNANCE.md` | Mantener al cerrar cada bloque futuro |
| Producto (propósito global) | `CURRENT` | `VIAO_MASTER_PRODUCT_CONTEXT.md` | Ninguna pendiente |
| Rewards | `CURRENT` + Decision Lock, auditados | `VIAO_REWARDS_V1.md` / `VIAO_REWARDS_V1_DECISION_LOCK.md` | Ninguna pendiente |
| Missions | Implementado y probado en **código**; **sin** `CURRENT` ni Decision Lock propios | Código + tests (`lib/missions/`) | Crear `CURRENT`/Decision Lock — no autorizado todavía |
| Goals | Decision Lock existe; **sin** `CURRENT` propio | `VIAO_GOALS_V1_DECISION_LOCK.md` | Crear `CURRENT` — no autorizado todavía |
| Partners | `CURRENT` (Master V2, Technical Spec, MVP Master) + Decision Lock económico | `VIAO_PARTNERS_MASTER_V2.md` / `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` | `VIAO_PARTNERS_MVP_MASTER.md` con veredicto parcialmente desactualizado (PMM3/4/6/10 ya resueltos) |
| Travel | `FROZEN` | `VIAO_MASTER_PRODUCT_CONTEXT.md` §15, `HOTELBEDS_CERTIFICATION_STATUS.md` | Ninguna — depende de respuesta externa de Hotelbeds |
| Vision | `FROZEN`/funcional, sin acoplarse a Missions | `VIAO_MASTER_PRODUCT_CONTEXT.md` §15 | Ninguna |

---

## 6. Locked decisions

| ID | Decisión | Autoridad |
|---|---|---|
| RW1 | `POINTS_PER_EURO = 100` | `VIAO_REWARDS_V1_DECISION_LOCK.md` |
| RW2 | Ledger append-only | `VIAO_REWARDS_V1_DECISION_LOCK.md` |
| RW3 | `rewards_wallets` como VIEW derivada | `VIAO_REWARDS_V1_DECISION_LOCK.md` |
| RW4 | Idempotencia del ledger | `VIAO_REWARDS_V1_DECISION_LOCK.md` |
| RW5 | `MAX_REWARD_REAL_COST_PERCENT = 30%` | `VIAO_REWARDS_V1_DECISION_LOCK.md` |
| RW6 | Pool VIAO mensual = 100€/mes | `VIAO_REWARDS_V1_DECISION_LOCK.md` |
| MI1 | 4 Missions exactas, sin motor configurable | Código (`lib/missions/rules.ts`) + `99_ARCHIVE_V1/checkpoints/VIAO_V1_EXECUTION_LOCK.md` §5.1 — **sin Decision Lock propio todavía** |
| MI2 | `vision_used` fuera de Missions V1 | Código (ausencia confirmada) + `VIAO_V1_EXECUTION_LOCK.md` §5.2 — **sin Decision Lock propio todavía** |
| MI3 | Pool Missions = 3.000 Points/mes, independiente de Rewards | Código (`complete_mission()` RPC) — **sin Decision Lock propio todavía** |
| MI4 | `goal_created` con `period_key='lifetime'` (anti-farming) | Código + tests — **sin Decision Lock propio todavía** |
| GOALS-V1 | `GOAL_PROGRESS_MODEL = WALLET_BALANCE` | `VIAO_GOALS_V1_DECISION_LOCK.md`, `APPROVED/IMPLEMENTED` |
| L1-L19 | Partners Beta (3-5 piloto, categorías, onboarding manual, QR+Reserva, gratis, ledger reutilizado, etc.) | `VIAO_PARTNERS_MASTER_V2.md` §21 |
| P1-P8 | Economía de Partner Activity (tasa por €, límites diario/mensual, semántica de agotamiento) | `VIAO_PARTNERS_TECHNICAL_SPEC.md` §25 |
| PMM3/PMM4/PMM6/PMM10 | Atribución, economía, dashboard mínimo, refunds de Partners | `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` |

**Nota**: MI1-MI4 son decisiones reales, verificadas directamente en código y tests, pero **no tienen todavía un Decision Lock formal propio** — su autoridad hoy es el código mismo más el precedente histórico ya archivado. Esto es exactamente el gap que motiva el siguiente bloque lógico (sección 11).

---

## 7. Future

- `POINTS_PERCENTAGE_OF_COMMISSION = 25%` (`lib/rewards/rules.ts`) — dormant, cero flujo que lo consuma. Autoridad: `VIAO_REWARDS_V1_DECISION_LOCK.md` (RW7), `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`. No es un roadmap obligatorio — solo queda centralizado para cuando exista, si se decide activarlo.
- Pool de Partners (P4, 3.000 Points/mes) — `LOCKED` a nivel de documento, **sin implementación en código todavía**.
- OCR, POS/API de Partners, CRM avanzado de Partners — `FUTURE`, explícitamente fuera de Beta (`VIAO_PARTNERS_MASTER_V2.md` §20).

---

## 8. Deprecated / superseded

- **Cofinanciación 50/50 Partner/VIAO** — origen `docs/VIAO_V1_LOOP_DECISION.md`; nunca implementada en schema real; formalmente retirada por `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` (también referenciada como RW8 en `VIAO_REWARDS_V1_DECISION_LOCK.md`).
- **QR/token rotativo diario escaneado por el usuario** — origen `VIAO_V1_LOOP_DECISION.md`; sustituido por código fijo + confirmación del Partner (`PMM3 LOCKED`, `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`).
- **"Sin dashboard de Partner en V1"** — origen `VIAO_V1_LOOP_DECISION.md`; sustituido por dashboard mínimo de solo lectura (`PMM6 LOCKED`, mismo documento).

---

## 9. Frozen

- **Travel/HotelProvider en su totalidad**: `Trips`, `TravelProvider`/`HotelProvider`, `HotelbedsProvider`, `MockHotelProvider`, `Search`, `Bookings`/`Booking Intents` — `FROZEN`, código intacto, sin trabajo activo (`VIAO_MASTER_PRODUCT_CONTEXT.md` §15).
- **Hotelbeds**: 🟡 congelado, caso `#60019483`, cero llamadas reales hasta respuesta oficial externa (`docs/01_CURRENT/providers/HOTELBEDS_CERTIFICATION_STATUS.md`).
- **Travelgate / RateHawk**: investigación `FROZEN` (Travelgate VERDICT GREEN solo sandbox; RateHawk VERDICT YELLOW, credenciales privadas no obtenidas) — `docs/03_RESEARCH_VALIDATION/providers/`.
- **Vision**: funcional, `FROZEN` en el sentido de que no se diseña alrededor de él ni se acopla a Missions.

---

## 10. Do not touch

Sin nueva decisión explícita del propietario:

- `rewards_transactions`, `rewards_wallets`, `rewards_catalog`, `reward_redemptions` (schema, RLS, GRANTs).
- `redeem_reward()`, `cancel_redemption()`.
- `complete_mission()`, las 4 Missions de `lib/missions/rules.ts` (Points/periodicidad).
- Pools económicos: `100€/mes` (Rewards), `3.000 Points/mes` (Missions) — ni sus valores ni sus advisory locks.
- `POINTS_PERCENTAGE_OF_COMMISSION` — no activar.
- Cualquier migración existente en `supabase/migrations/`.
- Cualquier test existente en `lib/`.
- Hotelbeds — no reactivar, no tocar credenciales/endpoints/producción.

---

## 11. Current work

**Rewards V1 (CURRENT + Decision Lock) está cerrado y auditado.** No requiere más trabajo salvo que surja una contradicción real.

**Siguiente bloque *lógico* según esta auditoría**: formalizar Missions — Decision Lock (MI1-MI4) y documento `CURRENT` — siguiendo exactamente el mismo patrón ya validado con Rewards (auditoría de código → Decision Lock → CURRENT → auditoría independiente → correcciones). Después, el mismo patrón aplicaría a Goals (tiene Decision Lock, falta `CURRENT`).

**Esto es una observación, no una autorización.** Ningún bloque de implementación o documentación se ejecuta por el simple hecho de estar identificado aquí como "siguiente lógico" — requiere una instrucción explícita en su propio turno, exactamente como se exigió para cada bloque anterior de esta sesión.

---

## 12. Standard block protocol

```
BOOTSTRAP
  → AUDIT (leer fuentes reales, nunca asumir)
  → PLAN (proponer, no ejecutar)
  → EXPLICIT AUTHORIZATION (del propietario, en su propio turno)
  → IMPLEMENTATION / DOCUMENTATION
  → VALIDATION (el propio autor verifica su trabajo)
  → INDEPENDENT AUDIT (auditoría separada, escéptica, no confía en el autor)
  → CORRECTIONS (solo lo que la auditoría identificó)
  → FINAL VALIDATION
  → UPDATE HANDOFF (sección 16)
  → COMMIT (solo si se pide explícitamente)
  → HARD STOP
```

Nunca se salta de un chat nuevo directamente a implementación.

---

## 13. New chat bootstrap

Comando literal para iniciar cualquier chat nuevo:

```
VIAO — BOOTSTRAP / HANDOFF

Antes de hacer cualquier modificación:

1. Lee docs/00_VIAO_HANDOFF.md
2. Lee los documentos que el HANDOFF indique como obligatorios.
3. Ejecuta git status.
4. Reconstruye el estado.
5. Identifica bloque actual.
6. Identifica siguiente bloque lógico.
7. NO implementes.

Devuelve:

A. Estado actual
B. Bloque actual
C. Último bloque cerrado
D. Decisiones LOCKED
E. FUTURE
F. DEPRECATED
G. FROZEN
H. Qué NO tocar
I. Siguiente bloque
J. Documentos leídos
K. Contradicciones/anomalías

Después:

HARD STOP.
```

---

## 14. Update rule

Este HANDOFF se actualiza **al cerrar cada bloque importante** (sección 16), nunca a mitad de un bloque. Cada actualización registra: fecha, bloque, resultado, documentos creados/modificados, si hubo auditoría independiente, si hubo commit, y el siguiente bloque lógico resultante. El HANDOFF **no introduce decisiones nuevas** — si una actualización necesitara afirmar algo que no está ya en un CURRENT o Decision Lock, eso pertenece a esos documentos, no aquí.

---

## 15. Conflict rule

- **Código vs. documento**: gana el código/migraciones/tests, siempre.
- **Decision Lock vs. documento CURRENT**: se revisa la jerarquía (sección 3) y la fecha/estado de cada uno — no se asume automáticamente que el más reciente gana si ambos tienen `LOCKED` vigente en dominios distintos.
- **Dos Decision Locks en conflicto**: no se elige arbitrariamente — `HARD STOP`, se reporta el conflicto y se espera decisión del propietario.
- **Producto vs. código**: se documenta la discrepancia; si implica un cambio de código, `HARD STOP` — no se resuelve silenciosamente.

Ninguna contradicción se corrige automáticamente en ningún bloque, nunca.

---

## 16. Handoff history

| Fecha | Bloque | Resultado | Commit | Siguiente bloque |
|---|---|---|---|---|
| 2026-08-25 | Reorganización documental + gobernanza | Cerrado, auditado, committeado | `3b09d49` | Resolver REVIEW REQUIRED (MVP_MASTER vs MASTER_PRODUCT_CONTEXT) |
| 2026-08-25 | Resolución REVIEW REQUIRED + limpieza de referencias | Cerrado | Sin commitear todavía | Rewards V1 (Decision Lock + CURRENT) |
| 2026-08-25 | Rewards V1 — Decision Lock + CURRENT + auditoría independiente + correcciones | Cerrado, `PASS` tras correcciones | Sin commitear todavía | Este HANDOFF |
| 2026-08-25 | Creación de `docs/00_VIAO_HANDOFF.md` | Cerrado | Sin commitear todavía | Missions (Decision Lock + CURRENT) — no autorizado todavía |

---

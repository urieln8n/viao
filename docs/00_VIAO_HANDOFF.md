---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem (post-Core Reset, post-Release Baseline)
DOMAIN: Meta / Continuidad
AUTHORITY: Punto de entrada de continuidad — NO tiene autoridad sobre código, Decision Locks ni CURRENT. Es un mapa de navegación y estado, no una fuente de decisiones.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-04 (sincronización final post-P14.4-F CLOSURE, mismo día — §2, §5, §21 actualizados: P14.4-F (Core Experience Final Audit + F1-F4) cerrado, F3+F4 PASS, F4 SECURITY PASS, G1 registrado LOW/FUTURE/NON-BLOCKING, 940/940 tests reales contra Postgres local. Sincronizaciones previas, mismo día: post-P14.4-E DOCUMENTATION SYNC + CLOSURE, post-implementación P14.4-E, post-P14.4-D, post-P14.4, post-P14.3-A FINAL VERIFICATION, post-implementación P14.3-A. Sincronización anterior: 2026-09-02, post-RELEASE CLOSURE P10+P10.1+UX-AUTH-1+P13 — banner, §2, §5, §7, §7.1, §8, §11.4 nueva, §14, §15, §21)
---

# VIAO — HANDOFF

> ## ⚠️ RECORDATORIO PARTNERS (leer antes de cualquier bloque de Partners)
>
> **Cuando un negocio envía una solicitud para convertirse en Partner, ¿dónde llega la solicitud, quién la revisa, cómo se aprueba/rechaza y cómo se responde al negocio y se le entrega su acceso?**
>
> **Actualizado 2026-09-01 (PARTNER APPROVAL V1, ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §19 para la evidencia completa)**: la aprobación **ya NO es manual vía Supabase Studio** — ese camino está bloqueado a propósito por el trigger de protección, para cualquier rol. El mecanismo real hoy es el RPC `set_partner_status()`, commiteado, desplegado y **validado con un E2E real en producción** (transición `pending→active` disparada de verdad, Database Webhook confirmado hasta `pg_net`, `HTTP 200`). El comercio recibe comunicación automática por email en 3 momentos (solicitud recibida, aprobado, rechazado vía `pending→inactive`), y el `access_token` se entrega automáticamente en el email de aprobación — sujeto a la misma limitación ya documentada de Resend sin dominio propio verificado (ver §11.2). Andrés recibe aviso de cada solicitud nueva vía `PARTNER_NOTIFICATION_EMAIL` (Partner Application Notification V1, commiteado `14365ae`). Sin deduplicación ni estado `rejected` — decisión deliberada, no un bug.
>
> **Actualizado 2026-09-02 (RELEASE CLOSURE, ver §11.4)**: **ya existe un panel interno** — `/admin/partners` (P10 — Admin Partners V1, commiteado `e1794e6`, desplegado, guard verificado en producción). Localizar/revisar el contenido de una solicitud sigue en Supabase Studio; solo el paso de EJECUTAR la aprobación cambió de mecanismo. `contact_email` es ahora obligatorio al solicitar (P10.1). **Nota crítica no relacionada con Partners específicamente, pero que afecta a la sección de seguridad de este documento**: P13 (Security Hardening/GRANT audit) también se cerró en este release — corregido y validado en el Postgres **local**, pero su aplicación al Postgres de **producción** sigue pendiente de una acción manual del propietario (ningún mecanismo automático la aplica al hacer deploy) — ver §11.4.
>
> **Actualizado 2026-09-03/04 (P14/P14.1/P14.1.1, commiteado y desplegado `29e0632`)**: además del acceso vía `access_token` en la URL, ahora existe `/partner/login` — puerta de entrada dedicada, misma identidad Supabase Auth que `/login`, redirige a `/partners/dashboard` (Camino B, `owner_id`). Y además del email automático de aprobación (webhook), `/admin/partners` tiene ahora un botón **"Reenviar acceso"** (`resendPartnerAccessAction()`) como fallback manual — reutiliza el mismo email/plantilla, nunca expone `access_token` al cliente. **QA de producción end-to-end (P14.1.5) sigue ABIERTO**: verificado con evidencia real hasta "el email de aprobación llega y su enlace carga el Dashboard correcto" (Partner de prueba `viao-test-partner-access`, creado vía INSERT administrativo autorizado en P14.1.4) — el paso de vinculación de cuenta (`LinkAccountWidget` → `link_partner_owner()` → `/partner/login` → Dashboard ya vinculado) quedó pendiente de confirmación del propietario, sin evidencia todavía. **No declarar P14.1.5 cerrado hasta que exista esa confirmación.**
>
> **Actualizado 2026-09-04 (P14.2 — Partner Product Audit, solo auditoría, sin código)**: auditado el Partner como producto B2B, no solo como acceso. Hallazgo que corrige una premisa que circulaba en el propio encargo de ese bloque: **VIAO no tiene hoy Experiences ni Promotions como funcionalidades Partner** — ni tabla, ni CRUD, ni UI. "Experience" existe únicamente como una de las 6 categorías fijas de negocio (`restaurant/experience/barbershop/gym/shop/service`). El producto Partner real hoy es: acceso + Dashboard (Visibilidad/Clientes/Ventas/Actividad reciente) + "Mi comercio" (perfil editable) + registro de Actividad en Ops (dos flujos etiquetados "QR" y "Reserva", **ninguno de los dos verifica nada real** — es autodeclaración pura del propio Partner, con dos tasas de Points distintas). QR real, verificación externa, confirmación cruzada del usuario, series temporales de métricas y monetización: **ninguno construido, ninguno aprobado para construir todavía** — ver `VIAO_PARTNERS_MASTER_ROADMAP.md` para el detalle y la matriz de priorización.

---

## 1. Purpose

Este documento es el **punto de entrada oficial de continuidad** de VIAO para cualquier chat nuevo con Claude Code. No sustituye a:

- `docs/00_GOVERNANCE.md` (reglas documentales y de autoridad)
- los documentos `CURRENT` de cada dominio
- los Decision Locks
- el código, las migraciones y los tests
- `docs/01_CURRENT/partners/VIAO_PARTNERS_CONTINUITY_MASTER.md` (continuidad operativa específica de Partners — este HANDOFF es el mapa global, ese documento es el detalle de fase-por-fase de Partners)

Es un mapa: dice **dónde está cada cosa y qué estado tiene**, no decide nada por sí mismo. Ninguna afirmación de este documento debe tratarse como una decisión nueva — si algo aquí parece una decisión, la decisión real vive en el documento fuente citado.

---

## 2. Current project state

# CURRENT VIAO STATE

```text
CURRENT PHASE:
P14.4-F — Core Experience Final Audit + F1-F4 CLOSED, PASS. See below.

P14 / P14.1 / P14.1.1:
Partner Access + Onboarding — CODE CLOSED, DEPLOYED (29e0632)
Production E2E QA (P14.1.5): OPEN — account linking step unconfirmed

P14.2:
Partner Product Audit — AUDITED (no implementation)

P14.4:
Core Experience Audit -> P14.4-D Decision Audit -> P14.4-E P0 COMPLETE
-> P14.4-F Core Experience Final Audit (10 findings) -> F1+F2
(referral copy fixed, registration bonus explained) -> F3+F4
(Points feedback toast for goal_created; real Goal Completion via new
RPC complete_goal_if_threshold_met, earnedPoints-based, never wallet
balance) -> F4 Security Audit: PASS (9 empirical real attacks, all
blocked; current_setting/set_config confirmed unreachable via REST
and transaction-scoped even if it were) -> CLOSED.
P14.4-F F3+F4: PASS. F4 SECURITY: PASS. G1 (goals lacks Partners-style
column-level GRANT, trigger-only protection): LOW/FUTURE/NON-BLOCKING.
940/940 tests, tsc/lint/build PASS, local only, NOT committed/deployed.
See VIAO_P14_4_F_IMPLEMENTATION.md (and VIAO_P14_4_E_P0_IMPLEMENTATION.md
for the P0-1/P0-2 model it builds on)

PRODUCTION:
Partner login/access flow operational (/login, /partner/login,
/partners/dashboard, /admin/partners all verified live).

PARTNER PRODUCT (real, code-verified):
Dashboard + Profile ("Mi comercio") + Activity (self-declared,
Ops "QR"/"Reserva" flows) + Metrics (profileViews, clientesNuevos/
Recurrentes, ventasDeclaradas/Confirmadas, Actividad reciente)

EXPERIENCES:
NOT IMPLEMENTED (no table, no CRUD, no UI — "experience" is only
a fixed Partner category value, not a content entity)

PROMOTIONS:
NOT IMPLEMENTED

REAL QR:
NOT IMPLEMENTED (the "QR" button in Ops is a manual amount-entry
form, not an actual QR code/scan)

VERIFICATION:
NOT IMPLEMENTED (Activity is 100% Partner self-declared; only
volume/rate safeguards exist — daily limit, monthly pool, attempt_id
idempotency — none confirm the transaction itself happened)

CURRENT GATE:
Pilot validation with 2-3 real Partners

NEXT DECISION:
Metrics/value (Route A) vs. activity verification (Route B) —
see VIAO_PARTNERS_MASTER_ROADMAP.md, not decided yet

NEXT IMPLEMENTATION:
Owner to review P14.4-F closure; Browser QA real, then a commit/push/
deploy decision for future blocks — see below
```

- **Fase/bloque actual**: **P14.4-F — Core Experience Final Audit + F1-F4**, cerrado en código, **PASS** (F3+F4, más F4 Security Audit: PASS), commiteado y desplegado en este release. Último bloque de CÓDIGO cerrado y **desplegado**: **P14.4-F** (este release) — construye sobre P14.4-E (P0-1/P0-2), también incluido en este mismo release. Antes de esto, el último bloque de CÓDIGO desplegado era **P14 + P14.1 + P14.1.1 — Partner Login + Onboarding Audit + Access Recovery**, commit `29e0632`.
- **P14.4-F — qué cambió (código)**: F3 (`PointsToastHost`/`announcePointsEarned`, feedback real para `goal_created`) + F4 (`complete_goal_if_threshold_met()`, RPC nuevo, Goal completa cuando `earnedPoints>=targetPoints`, nunca por Wallet balance; `protect_goal_immutable_fields()` extendido con señal transaccional, mismo patrón que Partners). tsc/lint/build limpios. 940/940 tests reales contra Postgres local, incluida una auditoría de seguridad independiente (9 ataques empíricos, todos bloqueados).
- **QA de producción (P14.1.5)**: **OPEN, no PASS** — sin cambios desde la última revisión: verificado con evidencia real: Partner de prueba visible en Admin, "Reenviar acceso" funcional, email real recibido (contenido correcto), enlace del email carga el Dashboard correcto con `LinkAccountWidget` visible. **Sin confirmar todavía**: que la vinculación de cuenta complete correctamente y que `/partner/login` funcione después con la cuenta ya vinculada. No declarar este bloque cerrado hasta esa confirmación.
- **Siguiente bloque autorizado**: **ninguno todavía**. Caminos abiertos, sin decidir: (1) Browser QA real de P14.4-F antes de confiar plenamente en el nuevo modelo en producción; (2) cerrar el QA de P14.1.5 (falta solo la confirmación del paso de vinculación); (3) validación con Partners piloto reales antes de construir cualquiera de Activity Verification / QR / Metrics avanzadas / Experiences / Promotions — ver `VIAO_PARTNERS_MASTER_ROADMAP.md` para la matriz de priorización completa de P14.2.
- **Pendiente real, no de código**: la migración de P13 (GRANT hardening) sigue sin aplicarse al Postgres de producción — sin cambios desde el release anterior, acción manual pendiente del propietario.
- **Estado documental**: sincronizado en este bloque (P14.4-F, este HANDOFF + `VIAO_FUTURE_BACKLOG.md` + `VIAO_P14_4_F_IMPLEMENTATION.md`) contra código/Git/producción real.
- **Estado técnico**: Rewards V1, Goals V1 (ahora con modelo de progreso acumulativo y Goal Completion real, P14.4-E/F), Missions V1, Partners (Foundation + V2 + Commerce Identity + Partner Auth Entry + Partner Discovery CTA + Partner Approval V1 + Admin Partners V1 + Onboarding Hardening + Partner Login (P14) + Access Recovery (P14.1.1), en producción), Auth/Onboarding de Usuario (UX-AUTH-1, en producción) implementados y probados en código — ver sección 5-7.

---

## 3. Authority hierarchy

| Orden | Nivel | Ejemplo | Prevalece sobre |
|---|---|---|---|
| 1 | Código + migraciones + tests | `lib/`, `supabase/migrations/` | Todo lo demás, siempre |
| 2 | Decision Locks | `docs/02_DECISION_LOCKS/**` | CURRENT, MASTER_PRODUCT_CONTEXT, GOVERNANCE |
| 3 | CURRENT | `docs/01_CURRENT/**` | MASTER_PRODUCT_CONTEXT (en su propio dominio técnico), HISTORICAL |
| 4 | `VIAO_MASTER_PRODUCT_CONTEXT.md` / `VIAO_MASTER_CONTEXT_V1.md` | — | Autoridad de producto/estrategia global; no manda sobre el dominio técnico de un CURRENT específico. **Ver anomalía §15 — ambos reclaman este nivel sin supersesión formal declarada entre ellos.** |
| 5 | `00_GOVERNANCE.md` | — | Reglas de gobernanza documental, no decisiones de producto |
| 6 | `99_ARCHIVE_V1/` / histórico | — | Ninguno — referencia, nunca autoridad vigente |

---

## 4. Documents to read first

| Prioridad | Documento | Para qué leerlo |
|---|---|---|
| 1 | `docs/00_GOVERNANCE.md` | Reglas de autoridad y estado documental global (ver §15 de este HANDOFF: contiene una sección "Gap identificado" ya desactualizada) |
| 2 | Este documento (`docs/00_VIAO_HANDOFF.md`) | Estado y navegación actual |
| 3 | `docs/01_CURRENT/partners/VIAO_PARTNERS_CONTINUITY_MASTER.md` | Continuidad operativa de Partners fase-por-fase (UX-9→F3.5, roadmap F4-F9) — el documento más actualizado del repositorio a día de hoy |
| 4 | `docs/VIAO_MASTER_CONTEXT_V1.md` | Identidad de producto post-Core Reset — "VIAO ya no es un producto de viajes"; **de mayor autoridad práctica que `VIAO_MASTER_PRODUCT_CONTEXT.md` en todo lo referente a Travel, sin supersesión formal declarada (ver §15)** |
| 5 | `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` | Propósito de producto original — **desactualizado en su marco Travel-como-núcleo**, útil para el resto de su contenido (Decision Register, Partners) |
| 6 | `docs/01_CURRENT/rewards/VIAO_REWARDS_V1.md` + Decision Lock | Cómo funciona Rewards hoy / qué está bloqueado |
| 7 | `docs/01_CURRENT/goals/VIAO_GOALS_V1.md` + Decision Lock | Cómo funciona Goals hoy / qué está bloqueado |
| 8 | `docs/01_CURRENT/missions/VIAO_MISSIONS_V1.md` + Decision Lock | Cómo funciona Missions hoy / qué está bloqueado — **nota: el propio documento data del 2026-08-25, anterior al Core Reset que sustituyó 2 de las 4 Missions (`hotel_viewed`→`partner_activity_registered`, `search_started`→`profile_completed`); confirmar contra `lib/missions/rules.ts` antes de citarlo** |
| 9 | `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` + `VIAO_PARTNERS_TECHNICAL_SPEC.md` + `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` | Partners — producto, diseño técnico y economía bloqueada (fundación PB0-PB7; para lo posterior, usar la Continuity Master, prioridad 3) |

---

## 5. Block status

| Bloque | Estado | Autoridad | Siguiente acción |
|---|---|---|---|
| Documentación / gobernanza | Cerrado, parcialmente desactualizado (ver §15) | `00_GOVERNANCE.md` | Actualizar su sección "Gap identificado" (Rewards/Missions ya tienen CURRENT) — no autorizado en este bloque |
| Producto (propósito global) | `CURRENT`, con contradicción de identidad sin resolver formalmente (§15) | `VIAO_MASTER_PRODUCT_CONTEXT.md` / `VIAO_MASTER_CONTEXT_V1.md` | Resolver supersesión formal — no autorizado en este bloque |
| Rewards | `CURRENT` + Decision Lock, cerrados | `VIAO_REWARDS_V1.md` / Decision Lock | Ninguna pendiente |
| Goals | `CURRENT` + Decision Lock, cerrados | `VIAO_GOALS_V1.md` / Decision Lock | Ninguna pendiente |
| Missions | `CURRENT` + Decision Lock existen, pero **desactualizados frente al Core Reset** (2 de 4 Missions cambiaron de trigger) | Código (`lib/missions/rules.ts`) — máxima autoridad, prevalece sobre el documento | Actualizar `VIAO_MISSIONS_V1.md` para reflejar `partner_activity_registered`/`profile_completed` — no autorizado en este bloque |
| Partners — Foundation (PB0-PB7) | ✅ COMPLETADO | `VIAO_PARTNERS_IMPLEMENTATION_STATUS.md`, código + tests | Ninguna pendiente |
| Partners — V2 (Discovery/Registration/Self-Service/Measurement) | ✅ COMPLETADO hasta F3.5 inclusive | `VIAO_PARTNERS_CONTINUITY_MASTER.md`, código + tests | UX-13, no autorizado |
| Partners — Approval (P2) | ✅ COMPLETADO, activado y validado E2E en producción | `VIAO_PARTNERS_CONTINUITY_MASTER.md` §19, `VIAO_PARTNERS_MASTER_ROADMAP.md` | Ninguna pendiente |
| Partners — Admin (P10) | ✅ COMPLETADO, `/admin/partners` desplegado, guard verificado en producción | `VIAO_PARTNERS_CONTINUITY_MASTER.md` §20.1 | Ninguna pendiente |
| Partners — Onboarding Hardening (P10.1) | ✅ COMPLETADO, `contact_email` obligatorio verificado en producción | `VIAO_PARTNERS_CONTINUITY_MASTER.md` §20.2 | Ninguna pendiente |
| Auth/Onboarding de Usuario (UX-AUTH-1) | ✅ COMPLETADO en código/producción; circuito completo con sesión nueva NO verificado en este bloque | §11.4 | Reintentar smoke test cuando el rate-limit de Supabase Auth se libere (no urgente) |
| Security Hardening (P13) | 🟡 COMPLETADO en código/local; **PENDIENTE aplicar a Postgres de producción** | `VIAO_PARTNERS_MASTER_ROADMAP.md` (sección P13), §11.4 | Acción manual del propietario: aplicar `20260902100000_p13_grant_security_hardening.sql` a producción |
| Partners — Login + Access Recovery (P14 / P14.1 / P14.1.1) | ✅ COMPLETADO en código, commiteado y **desplegado** (`29e0632`); QA de producción **🟡 OPEN** — ver P14.1.5 abajo | `VIAO_PARTNERS_CONTINUITY_MASTER.md`, este HANDOFF §2 | Confirmar el paso de vinculación de cuenta pendiente (P14.1.5) |
| Partners — Producción E2E QA (P14.1.5) | 🟡 OPEN — email/enlace/Dashboard verificados con evidencia real; vinculación de cuenta sin confirmar | Este HANDOFF §2 | Confirmación del propietario del resultado de vincular la cuenta de prueba |
| Partners — Product Audit (P14.2) | ✅ AUDITADO (sin código) — corrige la premisa de que Experiences/Promotions ya existen (no existen) | `VIAO_PARTNERS_MASTER_ROADMAP.md` | Validación con Partners piloto reales antes de decidir próxima implementación |
| Partners — Master UI/UX Audit (P14.3) | ✅ AUDITADO (sin código) — 16 partes, informe de 12 secciones, confirma hallazgos de navegación y datos de prueba | Informe de este bloque (no archivo propio) | Implementación pendiente, no autorizada todavía |
| Core Experience Audit — Home+Goal+Missions+Wallet+Partners (P14.4) | ✅ AUDITADO (sin código) — 2 hallazgos P0: progreso de Goal = saldo de Wallet (canjear una Reward retrocede el Goal, sin aviso); Partners-Discovery y `reward.partnerName` son conceptos de datos desconectados | `VIAO_P14_4_CORE_EXPERIENCE_AUDIT.md` | Decisión del propietario sobre los 2 hallazgos P0 antes de cualquier implementación |
| P0 Decision Audit — Goal↔Wallet + Partners↔Rewards (P14.4-D) | ✅ AUDITADO (sin código) — recomienda reactivar el modelo híbrido de Goal (schema/trigger ya existen, sin migración nueva) y añadir `partner_id` nullable a `rewards_catalog` (1 migración additiva, sin backfill obligatorio) | `VIAO_P14_4_D_P0_DECISIONS.md` | **Aprobación del propietario de ambas decisiones** antes de cualquier turno de implementación |
| P0 Core Model Implementation (P14.4-E) | ✅ **COMPLETE / PASS** — implementado en código local, validado con 926/926 tests reales contra Postgres local (0 fail), tsc/lint/build PASS, migración P0-2 aplicada y verificada en schema real. **Sin commitear/desplegar** | `VIAO_P14_4_E_P0_IMPLEMENTATION.md` | Ver P14.4-F — construye directamente sobre este modelo |
| Core Experience Final Audit + F1-F4 (P14.4-F) | ✅ **CERRADO — F3+F4 PASS, F4 SECURITY PASS** — 10 findings auditados; F1 (referral copy) + F2 (registration bonus) + F3 (Points feedback toast, alcance real auditado) + F4 (Goal Completion real, RPC nuevo + trigger extendido con señal transaccional) implementados; auditoría de seguridad independiente con 9 ataques empíricos reales, todos bloqueados. G1 (LOW) registrado, no corregido, no bloqueante. 940/940 tests, tsc/lint/build PASS. **Sin commitear/desplegar** | `VIAO_P14_4_F_IMPLEMENTATION.md` | Browser QA real, decisión sobre G1, luego commit/push/deploy — ninguno autorizado |
| Travel | ❄️ FROZEN / legacy purgado de navegación y Core, código congelado en el repo | `VIAO_MASTER_CONTEXT_V1.md` §11-13, `HOTELBEDS_CERTIFICATION_STATUS.md` | Ninguna — depende de decisión estratégica explícita futura |
| Vision | ❄️ FROZEN, funcional, desacoplado de Missions (recomendado DECOUPLE, no ejecutado formalmente) | `VIAO_MASTER_CONTEXT_V1.md` §9 | Ninguna |
| Release Baseline | ✅ COMPLETADO | Ver §11 | Verificación E2E de Partners en producción — **ya no bloqueada**: P2 (Approval) tiene E2E real confirmado (ver §19 de la Continuity Master); Dashboard/Self-Service en producción con sesión real siguen sin re-verificar en este bloque, ver §8 |

---

## 6. Locked decisions

| ID | Decisión | Autoridad |
|---|---|---|
| RW1-RW8 | Economía de Rewards (`POINTS_PER_EURO=100`, ledger append-only, `rewards_wallets` VIEW, idempotencia, `MAX_REWARD_REAL_COST_PERCENT=30%`, pool 100€/mes, 50/50 `DEPRECATED`, `POINTS_PERCENTAGE_OF_COMMISSION` dormant) | `VIAO_REWARDS_V1_DECISION_LOCK.md` |
| GOALS-V1 | `GOAL_PROGRESS_MODEL = WALLET_BALANCE`, auto-cancelación, 1 Goal activo | `VIAO_GOALS_V1_DECISION_LOCK.md`, `APPROVED/IMPLEMENTED` |
| MI1-MI4 | 4 Missions exactas sin motor configurable, `vision_used` fuera, pool 3.000 Points/mes, `goal_created` con `period_key='lifetime'` | `VIAO_MISSIONS_V1_DECISION_LOCK.md` (ya formalizado — corrige el gap que el HANDOFF anterior señalaba) |
| L1-L19, P1-P8, PMM3/PMM4/PMM6/PMM10 | Partners Beta: alta manual/curada, QR+Reserva, gratis (€0), tasa por €, límites diario (2/Partner/usuario/día) y mensual (3.000 Points/mes, pool propio), dashboard mínimo solo lectura, `access_token` LOCKED como mecanismo de acceso permanente | `VIAO_PARTNERS_MASTER_V2.md` §21, `VIAO_PARTNERS_TECHNICAL_SPEC.md` §24, `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` — **nota 2026-08-31**: el inciso "(sin Supabase Auth para Partners)" queda superado parcialmente por Commerce Identity (UX-16.3, `owner_id`+`link_partner_owner()`) — `access_token` sigue LOCKED como mecanismo, pero un Usuario Auth ya puede vincularse opcionalmente a un Commerce sin rol nuevo sobre `profiles`. Ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §3/§18 |
| — | `partners.status`/`access_token`/`is_test`/`slug`/`id` nunca editables por Self-Service | Código (`lib/partners/update-partner-profile.ts`, allowlist por construcción) + tests (`update-partner-profile.test.ts`) — sin Decision Lock formal propio, misma situación que MI1-MI4 antes de formalizarse |
| — | VIAO no vuelve a Travel como núcleo salvo decisión estratégica explícita futura | `VIAO_MASTER_CONTEXT_V1.md` §1, §21 |

---

## 7. Estado real de Partners

### Implementado (verificado en código + tests, no solo en documentación)

Discovery pública (`/partners`), Partner Registration pública (`/partners/join` → `pending`), Partner Profile público (`/partners/[slug]`), Partner Dashboard de solo lectura (clientes nuevos/recurrentes, ventas declaradas/confirmadas, actividad reciente), Analytics (`partner_profile_viewed`, agregado como `profileViews` en el Dashboard), Partner Self-Service C1 (edición de nombre/categoría/descripción/teléfono/dirección/`image_url` vía `access_token`, con `status`/`access_token`/`is_test`/`slug`/`id` protegidos por allowlist verificado con tests), aislamiento `is_test` (fixtures nunca aparecen en Discovery/Profile). **Añadido 2026-08-31**: Commerce Identity (`owner_id`+`link_partner_owner()`, UX-16.3), Partner Auth Entry (`intent=partner`+`accessToken` en Login/Register redirigiendo al Dashboard en vez de `/onboarding`, UX-17.1), Partner Discovery CTA discreto en Login/Register/Profile (UX-17.2) — ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §18.

### NO implementado (confirmado, no asumido)

Self-Service C2 (subida real de imágenes/Storage, logo, galería), horario/web/redes sociales (sin columna en `partners`), oferta estructurada (la tasa €→Points sigue fija en SQL, no configurable por Partner), QR, promociones/multiplicadores, favoritos, notificaciones, geolocalización, reviews, billing/suscripciones, CRM, blockchain/token, navegación principal para Partners en Sidebar/MainNav (sigue sin ítem fijo — solo existe el CTA discreto de UX-17.2 en Login/Register/Profile, sin umbral cumplido).

**Retirado de esta lista 2026-09-02**: "panel administrativo para aprobar/rechazar solicitudes Partner" — construido como P10 — Admin Partners V1 (`/admin/partners`), ver §7.1.

**Ya no aplica** ("login separado Usuario/Partner" retirado de esta lista): Commerce Identity + UX-17.1 resuelven esto de forma distinta a "arquitectura viable, no construida" — sin pantalla nueva de elección de identidad ni Auth unificada, mediante vinculación opcional (`owner_id`) y routing (`intent=partner`). Ver §6 y `VIAO_PARTNERS_CONTINUITY_MASTER.md` §18.

### 7.1 Operational Gap — Partner Onboarding (auditado 2026-08-31, actualizado 2026-09-02)

El tramo `solicitud pending → revisión → aprobación/rechazo → comunicación → entrega de access_token` **ya no es 100% manual**: desde P10 (`/admin/partners`, commiteado `e1794e6`), el paso de EJECUTAR la aprobación/rechazo/reactivación/baja tiene una UI real, con guard `partner_admin`. **Localizar y revisar el contenido de una solicitud sigue siendo manual vía Supabase Studio** — P10 no cubrió ese paso, solo la ejecución de la transición. Sin estado `rejected` en el schema (solo `pending`/`active`/`inactive`, decisión deliberada), sin regeneración de token (deliberado). El procedimiento operativo actualizado está en `docs/01_CURRENT/partners/VIAO_PARTNERS_CONTINUITY_MASTER.md` §17 ("Partner Onboarding Beta — Runbook Operativo") y §20.1.

**Corrección (Partner Application Notification V1, §11.3)**: la frase "sin notificación automática" de la versión anterior de este párrafo ya no es exacta — Andrés SÍ recibe un email en cuanto se crea una solicitud `pending` (`PARTNER_NOTIFICATION_EMAIL`, ver §11.3). Lo que sigue sin existir es cualquier interfaz para revisar/aprobar (Supabase Studio sigue siendo el único camino) y cualquier deduplicación de solicitudes repetidas.

---

## 8. Estado de validación (local vs. producción — no confundir)

**Local (Supabase Docker + `npm test`)**: `895 tests · 891 pass · 0 fail · 4 skipped`, `tsc`/`lint`/`build` en verde — verificado en frío justo antes del commit `e1794e6` (2026-09-02). Los 25 fallos que bloques anteriores documentaban como el hallazgo de P13 están ahora en verde.

**Producción (`https://viao.vercel.app`)**:
- Deployment del commit `bde1663` (que incluye `c809584`): **Ready**, verificado en este bloque (`vercel ls`).
- Home, Goal, Missions, Wallet/Rewards, `/partners` (Discovery), `/partners/[slug]` (404 correcto): **NO VERIFICADO en este bloque concreto** (sí en el bloque RELEASE BASELINE anterior, sin errores de consola).
- Esquema de base de datos de producción: **is_test/description/category confirmados sincronizados** (prueba de caja negra vía `/partners/join`, bloque RELEASE BASELINE — una solicitud real se insertó sin error). El resto del esquema (incluida la migración de `partner_profile_viewed`) **no tiene confirmación directa**, solo inferencia razonable por aplicación secuencial de migraciones.
- Partner Dashboard, `profileViews` en producción, Self-Service C1 en producción, persistencia tras recarga, protección de campos sensibles en producción con una sesión de usuario real: **NO VERIFICADO** — no por falta de acceso (eso ya no es el bloqueo, ver §15 actualizado), sino porque nadie lo ha vuelto a ejercitar desde entonces. Sí verificado exhaustivamente en local con tests automatizados equivalentes.
- **Actualizado 2026-09-01**: `set_partner_status()` (RPC de aprobación) SÍ quedó verificado en producción con datos reales — cadena completa `pending→active`→Database Webhook→`pg_net`→endpoint, confirmada en `net._http_response`. Ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §19 para el detalle — es la primera pieza de Partners verificada en producción más allá de una inserción de caja negra.
- **Actualizado 2026-09-02 (RELEASE CLOSURE)**: `/admin/partners` (P10) verificado en producción solo en su guard (sin sesión → `/login`); login/register/recover/`/partners/join` (validación de `contact_email`)/`/partners` (catálogo) verificados. **NO verificado**: el circuito Register→Onboarding→Home con una sesión nueva, ni el canje de Rewards logueado — bloqueado por rate-limit (`429`) de Supabase Auth agotado por los propios intentos de signup del smoke test (confirma que el rate limiting de producción funciona, no un defecto). **⚠️ La migración de P13 (GRANT hardening) sigue SIN aplicarse al Postgres de producción** — verificada exhaustivamente contra el Postgres local únicamente; no existe ningún mecanismo en este proyecto que aplique migraciones de Supabase a producción al hacer deploy (sin GitHub Actions, el `build` de Vercel es solo `next build`). El GRANT permisivo que P13 corrige sigue vigente en producción hasta que el propietario aplique esa migración manualmente (mismo procedimiento ya usado para `20260901100000`).

**No se debe leer "Vercel Ready" como "producción completamente validada".** Un build de Next.js correcto no depende del estado del esquema de base de datos.

---

## 9. FUTURE

- `POINTS_PERCENTAGE_OF_COMMISSION = 25%` — dormant, sin flujo real.
- Multiplicador de Points permanente por Partner (columna simple, sin ventana de tiempo) — diseño conceptual ya evaluado (`VIAO_PARTNERS_CONTINUITY_MASTER.md`), no implementado.
- Evento `partner_viewed`/instrumentación de Discovery (distinto de `partner_profile_viewed`, que sí existe) — evaluado y descartado por ahora (sin precedente de medir impresiones de catálogo en el resto de VIAO).
- Conversión Profile→Activity mostrada en el Dashboard — dato ya calculable, no expuesto todavía.

---

## 10. DEPRECATED / superseded

- Cofinanciación 50/50 Partner/VIAO — `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`.
- QR/token rotativo diario — sustituido por `access_token` fijo + confirmación del Partner.
- "Sin dashboard de Partner en V1" — sustituido por dashboard mínimo (PMM6).
- Missions `hotel_viewed`/`search_started` — sustituidas por `partner_activity_registered`/`profile_completed` (Core Reset, Product Decision Lock 2026-08-27) — **este cambio todavía no está reflejado en `VIAO_MISSIONS_V1.md`/su Decision Lock, ver §5**.

---

## 11. Release Baseline — evidencia real

```
Commit código:        c809584 — "feat: complete travel-to-partners core reset and partners v2 ecosystem"
                       (Travel Legacy Purge + Core Reset + Premium Design System + Partners V2 + F3.5)
Commit documentación:  bde1663 — "docs: record release baseline (c809584) in Partners Continuity Master"
origin/main:           bde1663 (verificado en este bloque)
Working tree:          limpio (verificado en este bloque)
Vercel:                dpl_Gf25caNUTRw7BgxnDubMFyNvyUr9 y el deployment posterior del commit bde1663,
                       ambos ● Ready, target production, alias https://viao.vercel.app
                       (verificado en este bloque, vercel ls)
Tests/tsc/lint/build:  PASS (817/813/0/4) — verificado repetidamente, última vez en este bloque
```

---

## 11.1 V2 Release Checkpoint — evidencia real (2026-08-31)

```
Commits código+docs:   9233fd7 — "feat: implement commerce identity ownership" (UX-16.3, ya existía
                       sin pushear desde un bloque anterior de esta misma sesión)
                       17d6986 — "feat: complete partner v2 release checkpoint" (Commerce Chrome
                       UX-16.5/16.6 + Partner Auth Entry UX-17.1 + Partner Discovery CTA UX-17.2 +
                       landing UX-14 + fix de imagen de Partner + sincronización documental —
                       19 archivos, todos previamente verificados en bloques anteriores de esta
                       sesión, consolidados en un único commit, mismo patrón que c809584)
origin/main:           17d6986 (push bde1663..17d6986, verificado en este bloque)
Working tree:          limpio tras el commit (verificado en este bloque)
Vercel:                dpl_5x6z3porRuYc6fgvGpy7PebrmPB1, ● Ready, target production,
                       alias https://viao.vercel.app (deploy automático disparado por el push,
                       verificado con `vercel inspect` en este bloque)
Tests/tsc/lint/build:  PASS (835 tests / 831 pass / 0 fail / 4 skipped), tsc/lint/build limpios —
                       verificado en frío justo antes del commit, en este mismo bloque
E2E local:             Usuario (Login/Register/Goals/Missions/Rewards/Partners Discovery) 6/6 PASS;
                       Partner Auth Entry/Discovery 7/7+10/10 PASS (bloques UX-17.1/17.2, reafirmado);
                       Partner Application: envío 1/1 PASS (verificado en BD, status:pending,
                       is_test:false, fila de prueba eliminada tras verificar); revisión/aprobación/
                       rechazo vía UI de la app NO EJECUTABLE (no existe interfaz — decisión explícita,
                       ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §18.4), verificable solo vía Supabase
                       Studio (ya documentado en el Runbook, §17 de ese documento)
Smoke test producción: Home, Login, Register, Partners (0 Partners reales, esperado), Partner Join,
                       Profile (redirige a /login sin sesión, middleware correcto), Partner Dashboard
                       con token inexistente (404 correcto), Login con intent=partner (CTA oculto
                       correctamente en producción) — 8/8 rutas, 0 errores de consola en todas.
                       Ninguna prueba destructiva ni dato real creado en producción.
Observación abierta:   Home en producción, visita anónima verificada (cookies vacías, sin sesión
                       alguna), muestra la experiencia de usuario logueado (Goal en 0 Points) en vez
                       de HomeLanding (UX-14) — el condicional `balance === undefined` no parece
                       alcanzarse en ese caso. No es parte del alcance de UX-17.1/17.2/este release,
                       no se ha investigado ni corregido en este bloque — queda señalado para su
                       propia auditoría.
```

**Actualización — esta observación se investigó y se cerró en el bloque siguiente (UX-14.2, ver §11.1.1): causa confirmada (GRANT de `anon` en producción, distinto de local), corregida con un `REVOKE` ejecutado directamente por el propietario en Supabase Studio (fuera del alcance de esta sesión, sin acceso privilegiado a producción), verificado empíricamente antes/después con la `anon key` pública real extraída del bundle de producción — 14/14 tablas pasaron de `200`/0 filas a `401`/`42501` tras el `REVOKE`, y Home anónimo en producción mostró `HomeLanding` correctamente en la reverificación.**

---

## 11.2 Email V2 — evidencia real (2026-08-31)

```
Commit:                5cb965f — "feat: add VIAO-branded transactional email via Resend"
origin/main:            5cb965f (push d5139b0..5cb965f, verificado en este bloque)
Vercel:                 dpl_5FsKj7wuZ2bRLi7aCGnTsdm8PPxr, ● Ready, https://viao.vercel.app
Tests/tsc/lint/build:   PASS (860 tests / 856 pass / 0 fail / 4 skipped — 25 tests nuevos)
```

**Arquitectura**: `lib/email/` (cliente Resend perezoso, mismo patrón que `lib/openai/client.ts`; `sendEmail()` best-effort, nunca lanza — deliberadamente distinto de `getOpenAiClient()`, ver comentario en el propio archivo) + 3 plantillas Partner (solicitud recibida/aprobado/rechazado, HTML inline, identidad VIAO) + webhook (`app/api/webhooks/partner-status/route.ts`, Database Webhook de Supabase → distingue `pending→active`/`pending→inactive`/`active→inactive` vía `old_record`/`record`, sin panel admin, sin rol nuevo) + `/confirm` (mismo patrón que `recover/update/page.tsx`, preserva `intent=partner`+`accessToken`).

**Hallazgo real durante la propia verificación** (mismo patrón que UX-14.2, no asumido): `additional_redirect_urls`/`site_url` de `supabase/config.toml` no coincidían con el origen real de desarrollo (`http://localhost:3000`) — cualquier `redirectTo`/`emailRedirectTo` perdía su ruta y caía al `site_url` plano. Corregido y **verificado con un email de recuperación real** (Mailpit): antes `redirect_to=http://127.0.0.1:3000` (sin ruta), después `redirect_to=http://localhost:3000/recover/update` (correcto) — seguido hasta `/recover/update` funcionando de punta a punta.

**Sin dominio propio — limitación confirmada, no asumida**: sin dominio verificado en Resend, el remitente de prueba (`onboarding@resend.dev`) **solo entrega a la dirección con la que se creó la cuenta de Resend**, nunca a un `contact_email` real de un comercio — confirmado contra la documentación oficial de Resend. Los 3 emails de Partner y el webhook están completos y desplegados, pero no entregarán nada a comercios reales hasta que exista dominio propio. `RESEND_FROM_EMAIL` se deja deliberadamente sin configurar en Vercel para que el fallback de prueba se aplique — no se ha configurado Resend como SMTP de Auth en producción (haría que los emails de confirmación/recuperación dejaran de llegar a usuarios reales, sustituyendo un remitente que hoy sí funciona por uno que no).

**Pendiente — MANUAL ACTION REQUIRED, no ejecutable desde esta sesión (sin acceso a Supabase/Resend/Vercel Dashboard de producción)**:
1. Verificar dominio propio en Resend (DNS).
2. Tras verificarlo: configurar `RESEND_FROM_EMAIL` real en Vercel, y solo entonces evaluar activar Resend como SMTP de Auth en producción.
3. Supabase Dashboard producción → Auth → URL Configuration: Site URL `https://viao.vercel.app`, Redirect URLs con `/recover/update` y `/confirm`.
4. Supabase Dashboard producción → Auth → Email Templates: pegar `supabase/templates/{confirmation,recovery}.html`.
5. ~~Supabase Dashboard producción → Database → Webhooks: crear el webhook sobre `partners` (`UPDATE`), header `x-viao-webhook-secret`.~~ **Hecho** — ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §19.2 (checklist ✅) y §19.3 (E2E real con un segundo Partner no-test, `elkin`, `pending→active`→email de aprobación confirmado). Esta lista no se había sincronizado tras completarse — corregido en P14.1.1, sin volver a verificar el Dashboard de Supabase directamente en ese bloque (ver P14.1.1 §11, "Production Verification").
6. ~~Vercel: añadir `PARTNER_STATUS_WEBHOOK_SECRET` y `SITE_URL` (Production).~~ **Hecho**, mismo motivo que el punto 5.

**P14.1.1 (Partner Onboarding + Access Recovery)**: añadido "Reenviar acceso" en `/admin/partners` (fallback manual al webhook, mismo email/template `sendPartnerApprovedEmail()`, nunca expone `access_token`) y corregido el copy de `/partners/dashboard` (el enlace se envía al aprobarse, no al darse de alta — antes decía lo contrario). Puntos 1-4 de la lista de arriba (dominio Resend, `RESEND_FROM_EMAIL`, Auth URL Configuration, Auth Email Templates) siguen sin verificar directamente — no tocados por P14.1.1.

**Smoke test producción**: Home (anónimo, `HomeLanding` visible — ver §11.1.1), Register, Login, `/confirm` (estado "enlace inválido" correcto), `/partners`, webhook (`401` sin secreto) — 6/6, 0 errores de consola. Deliberadamente **no** se envió ninguna solicitud Partner real en producción en este bloque (evita ruido/emails de prueba reales dado que `RESEND_API_KEY` ya está configurada ahí) — cobertura completa del mismo flujo ya verificada en local con un email real.

---

## 11.3 Partner Application Notification V1 — evidencia real (2026-08-31)

```
Commit:                pendiente — cambios en working tree, no commiteados (HARD STOP explícito,
                       esperando aprobación del propietario)
Tests/tsc/lint/build:  tsc/lint/build PASS (limpios). npm test: 867 tests / 863 pass / 0 fail /
                       4 skipped (7 tests nuevos sobre el baseline de Email V2, 860/856/0/4),
                       0 regresiones — verificado en frío, entorno local completo
E2E local:             solicitud real vía /partners/join ("Café Barcelona E2E ...", navegador real,
                       0 errores de consola) -> fila creada en `partners` con status:pending,
                       is_test:false, todos los campos correctos (verificado por SELECT directo);
                       pantalla "Solicitud recibida" mostrada correctamente; ambos emails
                       (confirmación al comercio + notificación a Andrés) se dispararon inline sin
                       bloquear ni romper la respuesta (best-effort, verificado por el propio
                       resultado exitoso)
```

**Qué NO se pudo verificar de punta a punta, y por qué (no asumido)**: ni `RESEND_API_KEY` ni `PARTNER_NOTIFICATION_EMAIL` están configuradas en este entorno local (verificado sin imprimir sus valores) — sin la clave real de Resend, ningún email de Partner puede entregarse de verdad desde aquí, ni siquiera a Mailpit: Mailpit solo recibe los emails de **Supabase Auth** (confirmación/recuperación, vía el SMTP local de `supabase/config.toml`), nunca los de `lib/email/` (Resend es una API externa, no pasa por el SMTP local). La verificación real de "a quién se envía" y "qué contenido lleva" se hizo con inyección de dependencias (mismo patrón ya establecido, sin librería de mocking) en `lib/email/send-partner-emails.test.ts` y `lib/email/templates/partner-emails.test.ts` — no es una carencia de este bloque, es la misma limitación que ya afectaba a los 3 emails de Partner existentes desde Email V2.

**Contenido del email a Andrés**: nombre, categoría (valor real del CHECK, p. ej. `restaurant` — sin traducir a etiqueta, para no invertir la dependencia `lib/` → `app/partners/category-label.ts`), descripción/dirección/email/teléfono (solo si el comercio los rellenó), fecha/hora de la solicitud, e instrucción textual para revisarla en Supabase Studio. Nunca `access_token` — ni siquiera puede filtrarse por error, el tipo de parámetros de la plantilla no lo contempla.

**`request-partner-registration.test.ts`**: fixture de este bloque (`RPR Notification Resilience ...`) quedó marcada `is_test:true` correctamente (vía `createServiceRoleClient()`, no vía `supabase db query`). La fixture creada manualmente por el propio E2E de este bloque (`Café Barcelona E2E ...`) **no pudo marcarse `is_test:true`**: `supabase db query` sobre esa fila devolvió `partners_immutable_field_change` — el trigger `protect_partners_immutable_fields()` (`20260831140000_add_partners_owner_id_identity.sql`) bloquea cualquier cambio a `is_test` incondicionalmente, para cualquier conexión que no sea la propia Supabase Studio (fricción ya señalada como conocida y fuera de alcance en un bloque anterior de esta sesión). Queda como `status:pending`/`is_test:false` en local — visible en el propio flujo de revisión que este bloque documenta, sin ningún efecto en producción.

---

## 11.4 RELEASE CLOSURE — P10 + P10.1 + UX-AUTH-1 + P13 — evidencia real (2026-09-02)

```
Commit:                e1794e6 — "release: close P10, P10.1, UX-AUTH-1 and P13"
origin/main:            0e138dc..e1794e6, push sin errores
Working tree:           limpio tras el commit
Vercel:                 dpl_GqVULGsD1anZWbTEEosM6Uia9kgJ, ● Ready, target production,
                        alias https://viao.vercel.app (creado 34s después del commit,
                        deploy automático disparado por el push)
Tests/tsc/lint/build:   PASS (895 tests / 891 pass / 0 fail / 4 skipped), tsc/lint/build limpios,
                        verificado en frío justo antes del commit
```

**P10 — Admin Partners V1**: `/admin/partners` (guard `partner_admin` vía Server Component + `notFound()` para cualquier otro rol, Client Component de acciones que reutiliza `setPartnerStatusAction()`/`set_partner_status()` sin modificarlos). Verificado en producción: guard correcto (sin sesión → `/login`). Detalle completo: `VIAO_PARTNERS_CONTINUITY_MASTER.md` §20.1.

**P10.1 — Partner Onboarding Hardening**: `contact_email` obligatorio en `/partners/join` (validación cliente + servidor). Verificado en producción: campo `required`, envío bloqueado sin él antes de tocar el servidor. Detalle: `VIAO_PARTNERS_CONTINUITY_MASTER.md` §20.2.

**UX-AUTH-1 — Auth/Onboarding de Usuario**: redirect seguro tras login (`returnTo` saneado), guard de sesión en `/onboarding`, flujo Welcome→Goal nuevo, mostrar/ocultar contraseña en los 3 formularios, indicadores de campo obligatorio, foco visible en la transición de onboarding (micro-fix de accesibilidad ya incluido). Verificado en producción: `/login`/`/register`/`/recover` (formularios, validaciones, toggle de contraseña, responsive desktop 1280×800 + mobile 390×844, sin errores de consola), guard de `/recover/update` sin token. **NO verificado en producción**: el flujo Welcome→Goal→Home con una sesión recién creada — ver más abajo.

**P13 — Security Hardening (GRANT audit)**: ver `VIAO_PARTNERS_MASTER_ROADMAP.md` (sección P13) para el detalle técnico completo. **Corregido y validado exhaustivamente en el Postgres local únicamente.** Sin mecanismo automático de aplicación a producción en este proyecto (confirmado: sin `.github/workflows/`, `build` de Vercel = `next build`) — **el GRANT permisivo original sigue vigente en el Postgres de producción de VIAO hasta que el propietario aplique `20260902100000_p13_grant_security_hardening.sql` manualmente** (Supabase Studio SQL Editor o `supabase db push`), igual que con `20260901100000`. Residual 🟡 documentado (TRUNCATE/REFERENCES/TRIGGER/MAINTAIN en tablas futuras), no bloqueante, no corregido a propósito.

**Rate-limit de Supabase Auth agotado durante el smoke test**: los intentos de crear un usuario de prueba real en producción (necesario para verificar Onboarding/Rewards con sesión) dispararon un `429` de Supabase Auth tras varios intentos en pocos minutos (dos de ellos, además, con el dominio `example.com`, que Supabase Auth rechaza server-side). La app respondió correctamente (mensaje claro, sin crash) — **confirma que el rate limiting de producción funciona**, pero impidió completar el circuito Register→Welcome→Goal→Home y el canje de Rewards con una sesión real en este bloque. No es un defecto de P10/P10.1/UX-AUTH-1/P13. Queda como verificación pendiente, no urgente — puede repetirse en cualquier momento posterior sin código nuevo.

**Documentación sincronizada en este mismo bloque, antes del commit**: este documento, `VIAO_PARTNERS_CONTINUITY_MASTER.md` (§20 nueva), `VIAO_PARTNERS_MASTER_ROADMAP.md` (P10/P13/Master Checklist/Open Decisions/Known Risks/P15) — contra código/Git/producción real, sin inventar estado. No se encontró en ningún documento del repositorio contenido previo sobre una posible línea de producto futura "Partner Experience/Business Photos/Tourism Discovery" — no se ha añadido nada al respecto en este bloque para evitar inventar visión de producto no solicitada.

---

## 12. FROZEN

- Travel/HotelProvider en su totalidad (`Trips`, `TravelProvider`/`HotelProvider`, `HotelbedsProvider`, `MockHotelProvider`, `Search`, `Bookings`) — código presente, sin punto de entrada en navegación, sin trabajo activo.
- Hotelbeds — caso `#60019483`, sin respuesta oficial externa.
- Travelgate/RateHawk — investigación congelada.
- Vision — funcional, desacoplado de Missions, sin nuevo entry point.

---

## 13. NOT NOW

Favoritos, notificaciones, promociones/multiplicadores, QR, campañas, CRM, mapas/geolocalización, reviews, chat, loyalty tiers, blockchain/token, billing, panel admin de solicitudes Partner (reafirmado explícitamente en el V2 Release Checkpoint, 2026-08-31), Self-Service C2 (Storage/imágenes), oferta con Points configurables, navegación principal para Partners en Sidebar/MainNav (auditado en P14.3, implementación pendiente de release propio), roles sobre `profiles`.

**Retirado de esta lista 2026-08-31**: "login separado Usuario/Partner" — resuelto de forma distinta (vinculación opcional + routing, no una pantalla de elección de identidad) por Commerce Identity/UX-17.1. Ver §6, §7 y `VIAO_PARTNERS_CONTINUITY_MASTER.md` §18.

---

## 14. Current work / Next logical vs. Authorized

- **PENDIENTE OPERATIVO (no requiere código)**: aplicar la migración `20260902100000_p13_grant_security_hardening.sql` al Postgres de **producción** — acción manual del propietario, ver §11.4. El hallazgo de seguridad de P13 sigue vigente en producción hasta entonces.
- **PENDIENTE DE REVISIÓN**: Browser QA real de P14.4-F (sesión autenticada real con Goal/Wallet/Points reales) antes de confiar plenamente en el nuevo modelo de completion en producción.
- **NEXT LOGICAL**: decisión explícita del propietario sobre el **cierre formal de V2**, y después **P16.0 — Product + Architecture Audit**. En paralelo, sin relación de bloqueo: comprar/verificar el dominio propio de VIAO en Resend (desbloquea entrega real de emails — ver §11.2), UX-13 (Self-Service C2).
- **AUTHORIZED**: el V2 Release Checkpoint (§11.1), UX-14.2 (§11.1.1), Email V2 (§11.2), Partner Application Notification V1 (§11.3), **PARTNER APPROVAL V1** (§19 de la Continuity Master), **P10 + P10.1 + UX-AUTH-1 + P13 (código) — RELEASE CLOSURE** (§11.4) y **P14.4-F — Core Experience Final Audit + F1-F4** (este release) ya se ejecutaron y están desplegados. Nada más está autorizado a partir de aquí.
- **NOT AUTHORIZED**: UX-13, UX-18, V3 (Partner Engagement, ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §18.5), activar Resend como SMTP de Auth en producción (bloqueado hasta dominio propio, ver §11.2), cierre formal de V2, P16.0, y todo lo listado en §13.

Esto es una observación, no una autorización. Ningún bloque se ejecuta por estar identificado aquí como "siguiente lógico" — requiere instrucción explícita en su propio turno.

---

## 15. Contradicciones/anomalías detectadas en este bloque

1. **`VIAO_MASTER_PRODUCT_CONTEXT.md` vs. `VIAO_MASTER_CONTEXT_V1.md`**: ambos reclaman el nivel 4 de la jerarquía de autoridad (producto/estrategia global) y ninguno declara formalmente `SUPERSEDES`/`SUPERSEDED BY` respecto al otro en su cabecera — ambos campos están vacíos en ambos documentos. Sustancialmente están en desacuerdo: el primero (2026-08-25) sigue enmarcando Travel como parte del núcleo; el segundo (2026-08-27) declara explícitamente "VIAO YA NO ES UN PRODUCTO DE VIAJES" y documenta esta misma contradicción en su propia sección 22-24. **No se resuelve aquí** — requiere que el propietario decida si `VIAO_MASTER_CONTEXT_V1.md` sustituye formalmente al primero, o si se fusionan.
2. **`00_GOVERNANCE.md`, sección "Gap identificado"**: afirma que no existen documentos `CURRENT` para Rewards ni Missions. Es falso desde el commit `3a5b810` (2026-08-25, posterior a la redacción de esa sección) — ambos existen (`VIAO_REWARDS_V1.md`, `VIAO_MISSIONS_V1.md`) con sus Decision Locks. No se corrige `00_GOVERNANCE.md` en este bloque (fuera de alcance explícito) — se deja constancia aquí.
3. **`VIAO_MISSIONS_V1.md` vs. código real**: el documento (LAST REVIEWED 2026-08-25) describe las 4 Missions originales; el código (`lib/missions/rules.ts`) ya refleja el Core Reset del 2026-08-27, con `hotel_viewed`→`partner_activity_registered` y `search_started`→`profile_completed`. Prevalece el código (principio 1 de gobernanza) — el documento queda identificado como desactualizado, no se corrige en este bloque.
4. **Acceso a Supabase de producción**: sigue sin existir acceso privilegiado desde ninguna sesión de Claude Code (`supabase projects list` nunca lista ningún proyecto VIAO; `vercel env pull` nunca revela valores). **Actualizado 2026-09-01**: esto dejó de ser un bloqueo práctico para Partners — el propietario ejecutó personalmente la migración `20260901100000` y toda la configuración manual de producción (`partner_admin`, Database Webhook, variables de Vercel), y el mecanismo de aprobación quedó validado con un E2E real (ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §19). La limitación de acceso en sí (yo nunca tengo credenciales privilegiadas de producción) sigue siendo estructural y permanente, no algo que se "resuelva" — solo se resolvió el bloqueo operativo concreto que generaba en ese momento. El resto de la cobertura de producción de Partners que no se ha vuelto a ejercitar desde entonces (Dashboard/Self-Service C1 con una sesión real, `link_partner_owner()` con una cuenta real) permanece **NO VERIFICADO**, ver §8 y P3 en `VIAO_PARTNERS_MASTER_ROADMAP.md`. **Actualizado 2026-09-02**: la misma limitación estructural aplica ahora a P13 — la migración de GRANT hardening está commiteada y desplegada como código, pero su aplicación real al Postgres de producción requiere que el propietario la ejecute manualmente (mismo procedimiento que `20260901100000`), no ejecutada todavía. Ver §11.4.

---

## 16. Documentos leídos en esta actualización

`docs/00_GOVERNANCE.md`, `docs/00_VIAO_HANDOFF.md` (versión anterior, íntegra), `docs/01_CURRENT/product/VIAO_MASTER_PRODUCT_CONTEXT.md` (cabecera), `docs/VIAO_MVP_MASTER.md` (cabecera), `docs/01_CURRENT/missions/VIAO_MISSIONS_V1.md` (cabecera), `docs/01_CURRENT/goals/VIAO_GOALS_V1.md` (cabecera), `docs/01_CURRENT/partners/VIAO_PARTNERS_CONTINUITY_MASTER.md` (íntegro, ya en contexto de esta sesión), `docs/VIAO_MASTER_CONTEXT_V1.md` (íntegro, ya en contexto de esta sesión), más `git status`/`git log`/`git branch`/`vercel ls` ejecutados en este mismo bloque. No se leyeron en profundidad los documentos `01_CURRENT/rewards/`, `01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md`/`VIAO_PARTNERS_TECHNICAL_SPEC.md` en este bloque específico — su contenido ya estaba verificado contra el código real en bloques anteriores de esta misma sesión (UX-9→UX-12), no se ha vuelto a auditar aquí.

---

## 17. Standard block protocol

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
  → OWNER AUTHORIZATION (commit/push/deploy son decisiones propias, no automáticas)
  → COMMIT (solo si se pide explícitamente)
  → PUSH (solo si se pide explícitamente)
  → VERCEL DEPLOY (automático al hacer push a main — no requiere acción propia, pero SÍ requiere autorización para el push que lo dispara)
  → PRODUCTION VERIFICATION
  → UPDATE HANDOFF (antes del HARD STOP de cualquier bloque importante)
  → HARD STOP
```

Nunca se salta de un chat nuevo directamente a implementación. Un bloque terminado técnicamente **no** implica automáticamente commit, push ni deploy — cada uno requiere autorización explícita propia, aunque el bloque anterior ya la haya dado para su propio alcance.

---

## 18. New chat bootstrap

Comando literal para iniciar cualquier chat nuevo:

```
VIAO — BOOTSTRAP / HANDOFF

Antes de hacer cualquier modificación:

1. Lee docs/00_VIAO_HANDOFF.md
2. Lee docs/01_CURRENT/partners/VIAO_PARTNERS_CONTINUITY_MASTER.md si el bloque toca Partners.
3. Ejecuta git status / git log --oneline -10.
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
I. Siguiente bloque lógico
J. Siguiente bloque autorizado
K. Documentos leídos
L. Contradicciones/anomalías

Después:

HARD STOP.
```

---

## 19. Update rule

Este HANDOFF se actualiza **al cerrar cada bloque importante**, nunca a mitad de un bloque. Cada actualización registra: fecha, bloque, resultado, documentos creados/modificados, si hubo auditoría independiente, si hubo commit/push/deploy, y el siguiente bloque lógico resultante. El HANDOFF **no introduce decisiones nuevas**.

---

## 20. Conflict rule

- **Código vs. documento**: gana el código/migraciones/tests, siempre.
- **Decision Lock vs. documento CURRENT**: se revisa la jerarquía (§3) y la fecha/estado de cada uno.
- **Dos Decision Locks en conflicto, o dos documentos reclamando el mismo nivel de autoridad** (ver §15.1): no se elige arbitrariamente — se reporta el conflicto y se espera decisión del propietario.
- **Producto vs. código**: se documenta la discrepancia; si implica un cambio de código, se reporta — no se resuelve silenciosamente.

Ninguna contradicción se corrige automáticamente en ningún bloque, nunca.

---

## 21. Handoff history

| Fecha | Bloque | Resultado | Commit | Deploy | Siguiente bloque |
|---|---|---|---|---|---|
| 2026-08-25 | Reorganización documental + gobernanza | Cerrado, auditado, committeado | `3b09d49` | — | Resolver REVIEW REQUIRED |
| 2026-08-25 | Resolución REVIEW REQUIRED + limpieza de referencias | Cerrado | Sin commitear en su momento | — | Rewards V1 |
| 2026-08-25 | Rewards V1 — Decision Lock + CURRENT + auditoría independiente | Cerrado, `PASS` | Sin commitear en su momento | — | HANDOFF inicial |
| 2026-08-25 | Creación de `docs/00_VIAO_HANDOFF.md` (versión inicial) | Cerrado | Sin commitear en su momento | — | Missions/Goals |
| 2026-08-25 (posterior) | Missions V1 + Goals V1 — Decision Lock + CURRENT | Cerrado | `3a5b810` | — | Partners V1 (PB0-PB7) |
| ~2026-08-26 | Partners V1 Foundation (PB0-PB7) | Cerrado, 816 tests/812 pass en su momento | `517088c` | — | Auditorías UX-6→UX-9 |
| 2026-08-27→2026-08-30 | Core Reset (Travel Legacy Purge), Premium Design System, UX-6→UX-9 (Partners V2 foundation, schema) | Cerrado (auditorías + implementación por bloques, sin commit individual) | Consolidado después en `c809584` | — | UX-10 |
| 2026-08-30→2026-08-31 | UX-10 (Discovery/Registration), UX-11 (auditorías engagement/roadmap), UX-12 (Measurement + Self-Service C1), F3.5 (Analytics Stability) | Cerrado, 817/813/0/4 | Consolidado en `c809584` | — | Release Baseline |
| 2026-08-31 | RELEASE BASELINE — commit consolidado + push + Vercel + verificación parcial de producción | Cerrado, `PASS WITH CONDITIONS` (esquema de producción confirmado vía `/partners/join`; Dashboard/Self-Service en producción sin verificar) | `c809584` (código) + `bde1663` (docs) | Vercel Ready, `https://viao.vercel.app` | Production E2E Verification |
| 2026-08-31 | Production Partner E2E Verification | **BLOQUEADO** — sin acceso a Supabase de producción ni a los valores reales de los secretos de Vercel (Encrypted, no revelables vía CLI) | Ninguno (solo lectura + 1 solicitud real vía `/partners/join`, ya documentada) | — | Requiere que el propietario apruebe la solicitud de prueba y comparta su `access_token`, o confirme que la cobertura local es suficiente |
| 2026-08-31 | Actualización de HANDOFF (auditoría de continuidad post-Release Baseline) | Cerrado — auditoría, sin cambios de código | Sin commitear en su momento | — | Partner Operational Flow Audit |
| 2026-08-31 | Partner Registration → Approval → Access → Response Audit | Cerrado — confirmó que el tramo intermedio es 100% manual, sin panel, sin notificación, sin `rejected` | Sin commitear (solo lectura + greps) | — | Partner Operational Flow / Next Block Audit |
| 2026-08-31 | Partner Operational Flow / Next Block Audit (UX/producto/escalabilidad) | Cerrado — recomendó runbook manual (no código) antes que UX-13 o Partner Ops | Sin commitear (solo lectura) | — | Partner Onboarding Operational Closure |
| 2026-08-31 | Partner Onboarding Operational Closure — Runbook Operativo Beta + este HANDOFF (este bloque) | Cerrado — puramente documental. Runbook creado en `VIAO_PARTNERS_CONTINUITY_MASTER.md` §17. NO se implementó Partner Ops, UX-13, estado `rejected`, regeneración de token, ni ningún cambio de schema/Decision Locks | Sin commitear (no autorizado en este bloque) | — | Ninguno autorizado |
| 2026-08-31 | Commerce Identity (UX-16.3) — `owner_id`/`link_partner_owner()`, y Commerce Chrome (UX-16.5/16.6) — separación visual Usuario/Commerce | Cerrado, tests/build/E2E PASS en su momento | `9233fd7` (sin pushear hasta el V2 Release Checkpoint) | — | Partner Auth Entry |
| 2026-08-31 | Partner Entry & Auth (UX-17): auditoría → Partner Auth Entry (UX-17.1) → Partner Discovery CTA (UX-17.2) | Cerrado — 7/7 y 10/10 E2E PASS respectivamente, `accessToken` verificado en URL únicamente, Commerce Identity/RLS/RPC sin tocar | Sin commitear hasta el V2 Release Checkpoint | — | V2 Release Checkpoint |
| 2026-08-31 | **V2 Release Checkpoint** — auditoría de intake de solicitudes Partner (decisión explícita: sin panel admin nuevo), sincronización documental (`VIAO_PARTNERS_CONTINUITY_MASTER.md` §3/§16/§18, este HANDOFF §2/§6/§7/§11.1/§13/§14), tests/build en frío, E2E (Usuario 6/6, Partner Application 1/1 + resto no ejecutable por diseño), commit, push, deploy automático, smoke test de producción (8/8 rutas, 0 errores) | **Cerrado, PASS** — ver §11.1 para el detalle completo | `9233fd7` + `17d6986` | Vercel `dpl_5x6z3porRuYc6fgvGpy7PebrmPB1`, ● Ready, `https://viao.vercel.app` | UX-14.2 (Home anónimo en producción) |
| 2026-08-31 | **UX-14.2** — diagnóstico y corrección del desajuste `anon` local vs. producción (Caso A confirmado con la `anon key` real de producción, 14/14 tablas), `REVOKE` ejecutado por el propietario en Supabase Studio (fuera de mi acceso), reverificado 14/14 y con Home anónimo real | **Cerrado, PASS** — ver §11.1.1 | Ninguno (solo Supabase, sin cambios de repositorio) | — (mismo deploy) | Email V2 |
| 2026-08-31 | **Email V2** — Resend (`lib/email/`), 3 emails Partner + webhook de aprobación/rechazo (`app/api/webhooks/partner-status/`), plantillas Auth VIAO + corrección real de `site_url`/redirect allow-list (verificada con un email de recuperación real de punta a punta), `/confirm`. 860/856/0/4 tests, build/E2E/smoke test producción PASS. Sin dominio propio: emails de Partner no entregan a destinatarios reales todavía (limitación de Resend confirmada, no de VIAO) | **Cerrado, PASS** — ver §11.2 | `5cb965f` | Vercel `dpl_5FsKj7wuZ2bRLi7aCGnTsdm8PPxr`, ● Ready, `https://viao.vercel.app` | Dominio propio de VIAO en Resend (siguiente paso lógico, no autorizado) |
| 2026-08-31 | **Partner Application Notification V1** — `sendPartnerApplicationNotificationEmail()` (mismo patrón que los 3 emails de Partner ya existentes), único destinatario `PARTNER_NOTIFICATION_EMAIL`, cierra el gap "Andrés no se entera de una solicitud nueva" sin panel admin/roles/schema/RLS nuevos. tsc/lint/build limpios, tests nuevos PASS (ver §11.3), E2E local real (solicitud vía navegador -> fila `pending` correcta en BD) | **Cerrado, commiteado** — corrige la fila anterior de esta tabla, que quedó obsoleta (decía "NO commiteado") | `14365ae` | Vercel Ready (mismo deploy, sin cambio de env vars todavía en ese momento) | PARTNER APPROVAL V1 |
| 2026-09-01 | **PARTNER APPROVAL V1** — diseño auditado en 3 fases (traza del bloqueo real, diseño de alternativas, revisión de seguridad del trigger), RPC `set_partner_status()` (`SECURITY DEFINER`, matriz de 4 transiciones, anti-enumeración), Server Action, 17 tests. Release conjunto de 3 commits: Partner Approval (A), UX Pro Max V2/Bloque B (B), Master Roadmap P0-P15 (C) | **Cerrado, PASS** | `56a414e` (A) + `18867a2` (B) + `0e138dc` (C) | Vercel Ready, `https://viao.vercel.app` | Activación de producción (migración + configuración manual) |
| 2026-09-01 | **Activación de producción de PARTNER APPROVAL V1** — migración `20260901100000` ejecutada por el propietario en Supabase Studio (sin acceso privilegiado de mi lado en ningún momento); configuración manual de `partner_admin`, `SITE_URL`, `PARTNER_STATUS_WEBHOOK_SECRET`, Database Webhook; redeploy de Vercel para incorporar las variables nuevas | **Cerrado, PASS** — ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §19.2 | Ninguno de código (solo Supabase/Vercel, ejecutado por el propietario) | Redeploy `dpl_42eaJdiEqBV2khNEPKdoxHDhEona` | E2E real de producción |
| 2026-09-01 | **E2E real de producción (PARTNER APPROVAL V1)** — Partner de test dedicado (`is_test=true`, `contact_email=null`) llevado de `pending→active` vía `set_partner_status()`; cadena automática completa confirmada (trigger → Database Webhook → `pg_net` → `/api/webhooks/partner-status` → `HTTP 200` → `{"handled":"approved"}`), verificado independientemente en `net._http_response` de Supabase. Un segundo Partner, `elkin` (real, no test), completó el mismo `pending→active`, siendo hoy el primer Partner `active` genuino del proyecto. Sin email real enviado (`contact_email` vacío) | **Cerrado, PASS** — ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §19.3 | Ninguno (solo datos vía RPC autenticado, sin migraciones/código) | — (mismo deploy) | P10 — Admin Partners V1 (auditado, READY, no autorizado) |
| 2026-09-01 | Sincronización documental post-P2 (este bloque) — `VIAO_PARTNERS_MASTER_ROADMAP.md`, `VIAO_PARTNERS_CONTINUITY_MASTER.md` (§19 nueva), este HANDOFF actualizados contra código/Git/producción real; ninguna afirmación obsoleta de "P2/P9 sin commitear/desplegar" queda sin corregir | Cerrado — puramente documental, sin código/SQL/RPC/Supabase/Vercel modificados | Sin commitear (no autorizado en este bloque) | — | Ninguno autorizado |
| 2026-09-02 | **RELEASE CLOSURE — P10 (Admin Partners V1) + P10.1 (Partner Onboarding Hardening) + UX-AUTH-1 (Auth/Onboarding UX) + P13 (Security Hardening, código/local)** — cada bloque ya auditado/implementado en turnos anteriores de esta sesión; documentación sincronizada contra código/Git real antes del commit (este HANDOFF, Continuity Master §20, Master Roadmap); tests/tsc/lint/build en frío (895/891/0/4), commit único (separar en 4 habría exigido staging parcial de `lib/i18n/*` compartidos), push, deploy automático Vercel, smoke test de producción parcial | **Cerrado, PASS CON CONDICIONES** — código y local, PASS completo; producción, PASS parcial: guard de `/admin/partners` y validaciones de `/partners/join` confirmados, circuito Onboarding con sesión nueva NO verificado (rate-limit de Supabase Auth agotado por el propio smoke test); **la migración de P13 sigue SIN aplicarse al Postgres de producción** (acción manual pendiente del propietario) — ver §11.4 | `e1794e6` | Vercel `dpl_GqVULGsD1anZWbTEEosM6Uia9kgJ`, ● Ready, `https://viao.vercel.app` | Acción manual: aplicar la migración de P13 a producción. Decisión: cierre formal de V2 y, después, P16.0 — Product + Architecture Audit |
| 2026-09-03 | **P14 — Partner Login**: `/partner/login` nuevo (misma Supabase Auth, `LoginForm` compartido extraído de `/login`), redirige a `/partners/dashboard`. **P14.1 — Onboarding Audit**: confirmado que el email de aprobación (webhook) ya existía y funcionaba; corregido un copy impreciso en el EmptyState del Dashboard (decía que el enlace llega "al darse de alta", en realidad llega al aprobarse). **P14.1.1 — Access Recovery**: `resendPartnerAccessAction()`/"Reenviar acceso" en `/admin/partners`, fallback manual al mismo email, `access_token` nunca expuesto (resultado siempre `{outcome}`). Diff aislado a nivel de hunk de trabajo previo no relacionado (`app-shell.tsx`, `lib/i18n/*` compartidos con Share Profile) — restauración verificada por hash de blob idéntico | **Cerrado en código, PASS** — tsc/lint/build limpios, 922/918/0/4 (última corrida completa; Docker local intermitente en corridas posteriores, sin relación con el código) | `29e0632` | Vercel Ready, `https://viao.vercel.app` — `/partner/login`, `/partners/dashboard`, `/admin/partners` verificados con navegador real tras el deploy | QA de producción end-to-end (P14.1.2 → P14.1.5) |
| 2026-09-03/04 | **QA de producción (P14.1.2 → P14.1.5)** — verificación real, no simulada: Partner de prueba (`is_test=true`, `viao-test-partner-access`) creado mediante INSERT administrativo revisado y ejecutado por el propietario (P14.1.4, tras auditar que no existía mecanismo automático seguro para producción); "Reenviar acceso" pulsado una vez por el propietario; email real recibido en `fa.andres18@hotmail.com` (contenido/CTA correctos); enlace del email verificado — carga el Dashboard del Partner de prueba correcto, con `LinkAccountWidget` visible | **🟡 OPEN, no PASS** — el paso de vinculación de cuenta quedó pendiente de confirmación del propietario al iniciarse P14.2; no se ha declarado PASS sin esa evidencia | Ninguno (solo lectura/verificación; un script de diagnóstico temporal por turno, creado y eliminado cada vez, nunca comiteado) | Sin cambios de deploy | Confirmación del propietario del resultado de la vinculación, luego reanudar Fases 6-9 de P14.1.5 |
| 2026-09-04 | **P14.2 — Partner Product Audit** (solo auditoría) — corrige la premisa de que Experiences/Promotions ya existen como funcionalidad Partner (no existen: ni tabla, ni CRUD, ni UI; "experience" es solo una categoría fija). Documenta el producto Partner real (Dashboard/Perfil/Actividad/Métricas), el modelo de Actividad actual (100% autodeclarado, sin verificación externa — los flujos "QR"/"Reserva" de Ops no verifican nada real, son formularios de importe manual), matriz de priorización, y dos rutas abiertas sin decidir (valor/métricas vs. verificación de actividad) | **Cerrado, auditoría sin código** | Ninguno | Sin cambios | Validación con 2-3 Partners piloto reales antes de decidir la siguiente implementación |
| 2026-09-04 | **P14.2 — Documentation & Roadmap Sync** (este bloque) — este HANDOFF (§2 con snapshot `CURRENT VIAO STATE`, §5 con 3 filas nuevas, RECORDATORIO Partners actualizado) y `VIAO_PARTNERS_MASTER_ROADMAP.md` sincronizados contra código/Git/producción real; P14.1.5 registrado explícitamente como OPEN, no PASS, sin evidencia inventada. Revisados `VIAO_PARTNERS_CONTINUITY_MASTER.md`/`VIAO_FUTURE_BACKLOG.md` por contradicciones — ninguna encontrada (ya framed correctamente como futuro/parked) | Cerrado — puramente documental | Sin commitear (no autorizado en este bloque) | Sin cambios | Ninguno autorizado — esperar instrucciones |
| 2026-09-04 | **P14.3 — Master UI/UX + Partner Audit** (solo auditoría, sin código) — informe de 12 secciones sobre Partner Login/Dashboard/Mi negocio/Imagen/Perfil público, Sidebar+Navigation, UI/UX, Accesibilidad, Design System; evidencia de código + navegador real en producción (capturas desktop/mobile de `/partner/login`, `/partners`, `/partners/[slug]`, `/`). Confirma 2 hallazgos prioritarios: sin entrada a Partners en la navegación principal (P0/P1), datos de prueba visibles en Discovery real (P0) | Cerrado — auditoría sin código | Ninguno | Sin cambios | Implementación (Navigation/Data Hygiene), no autorizada en este release |
| 2026-09-04 | **P14.4 — Core Experience Audit** (solo auditoría, sin código) — Home/Goal/Missions/Wallet/Partners evaluados como un único sistema, contra código real completo. 2 hallazgos P0: (1) el progreso del Goal es literalmente el saldo de Wallet (`calculateGoalProgressPercent`), así que canjear una Reward reduce visiblemente el progreso del Goal sin ningún aviso al usuario; (2) Partners-Discovery (`getActivePartners()`) y `reward.partnerName` (texto libre en el catálogo de Rewards) son conceptos de datos completamente desconectados. Además: microcopy con lenguaje de viajes superviviente (`goals.createDescription`: "Elige un destino..."), `targetDate` capturado y nunca mostrado, sin estado de celebración al completar el Goal, progressive discovery sin estructura suficiente más allá de la primera semana | Cerrado — auditoría sin código | Ninguno | Sin cambios | Decisión del propietario sobre los 2 hallazgos P0 antes de cualquier implementación |
| 2026-09-04 | **P14.4-D — P0 Product + Data Decision Audit** (solo auditoría/decisión, sin código) — hallazgo central: el modelo de Goal que P0-1 pide evaluar (progreso = Points acumulados, nunca baja al canjear) **ya se construyó y se abandonó deliberadamente** — `goals.points_at_goal_creation` y su trigger `security definer` siguen en el schema, sin usarse desde que un Decision Lock previo cambió a `GOAL_PROGRESS_MODEL=WALLET_BALANCE`. Recomendación P0-1: reactivar ese modelo histórico (cero migraciones nuevas, solo cambia la query de lectura), con la regla de exclusión de `redemption_refund` ya verificada (evita doble contabilidad, simulada en 5 casos exactos). Recomendación P0-2: `rewards_catalog.partner_id uuid references partners(id)`, nullable, coexistiendo con `partner_name` (1 migración additiva, sin RLS nuevo, sin backfill obligatorio). Hallazgo adicional confirmado: `goals.status` nunca transiciona a `'completed'` en ningún flujo actual (verificado por test existente); y `app/rewards/page.tsx` no traduce los `reason` reales de Missions/Partner activity (`mission:*`, `partner_activity`) en el historial de Wallet | Cerrado — auditoría/decisión sin código | Ninguno | Sin cambios | **Aprobación del propietario de ambas decisiones** antes de cualquier turno de implementación |
| 2026-09-04 | **P14.4-E — P0 Core Model Implementation** — implementadas las 2 decisiones aprobadas. P0-1: nuevo `lib/goals/get-earned-points.ts` (testeable sin `next/headers`, mismo patrón que `resendPartnerAccess`), `get-goal.ts`/`calculate-progress.ts`/`goal-card.tsx`/`page.tsx` actualizados — Goal progress ya no depende del saldo de Wallet. P0-2: migración `20260904100000_add_partner_id_to_rewards_catalog.sql` (additiva, nullable, sin backfill, cero cambios de RLS). ⚠️ Contradicción detectada en el propio encargo (fórmula aditiva de su §4 vs. ejemplo numérico de su §7, matemáticamente incompatibles) — resuelta por mí a favor de §4 + precedente histórico, documentada explícitamente, pendiente de confirmación del propietario. tsc/lint/build PASS. 13 tests nuevos escritos (9 de `get-earned-points.test.ts` + 4 de `get-rewards-catalog.test.ts`) siguiendo el mismo patrón de integración real ya establecido — **NO ejecutados**: Docker local inalcanzable, mismo problema recurrente de esta sesión; confirmado por inspección que el 100% de los fallos es el mismo mensaje de entorno, ninguno una aserción real fallida | **Código local, PASS WITH CONDITIONS** — pendiente confirmación de la contradicción §4/§7 y ejecución real de tests antes de producción | Sin commitear (no autorizado en este bloque) | Sin desplegar | Revisión del propietario; después, ejecución real de tests con Docker disponible |
| 2026-09-04 | **P14.4-E VALIDATION** (mismo día, turno posterior) — el propietario confirmó la fórmula del baseline (aditiva, §4). Docker Desktop se arrancó (no estaba corriendo); Postgres local hizo una recuperación de WAL automática (apagado sucio de una sesión anterior) y quedó sano en ~30s. Migración P0-2 aplicada contra Postgres local real (`docker exec -i supabase_db_VIAO psql`) y verificada directamente en el schema (`partner_id` nullable, FK correcta, `ON DELETE SET NULL`, `partner_name` intacto). Suite completa ejecutada contra Postgres local real: 922 pass / 2 fail. Los 2 fallos: `Test P0-2.1` (dato irreal en mi propio test, violaba un CHECK preexistente ajeno a P0-2) y `get-cached-destinations.test.js` (transitorio, dominio Travel, ajeno) | PASS WITH CONDITIONS — 1 test propio por corregir | Sin commitear | Sin desplegar | Corregir `Test P0-2.1` y repetir la suite |
| 2026-09-04 | **P14.4-E P0-2 TEST CORRECTION + FINAL VALIDATION** (mismo día, turno posterior) — corregido `Test P0-2.1` (`points_cost: 10`→`1000`, mismo `funding_type='viao'`, misma intención del test) para respetar el CHECK `rewards_catalog_viao_real_cost_within_30_percent`, preexistente y ajeno a P0-2. Suite completa re-ejecutada: **926/926 PASS, 0 fail** — incluido `get-cached-destinations.test.js`, confirmando que su fallo anterior fue transitorio (ligado al arranque de Docker/recuperación de Postgres, no reproducido con Postgres ya estable). tsc/lint/build PASS | **Cerrado, PASS** | Sin commitear | Sin desplegar | Documentar el cierre — este mismo bloque |
| 2026-09-04 | **P14.4-E DOCUMENTATION SYNC + CLOSURE** (mismo día, turno posterior) — sincronizados `VIAO_P14_4_E_P0_IMPLEMENTATION.md` (reescrito para reflejar PASS definitivo, 926/926, migración verificada en schema real, contradicción §4/§7 ya resuelta y confirmada), este HANDOFF (§2/§5/§21) y `VIAO_FUTURE_BACKLOG.md` (P14.4-E ya no pendiente) contra el resultado real de la validación — ninguna afirmación de "no ejecutado"/"Docker inalcanzable"/"827 fail" queda sin corregir | **Cerrado — puramente documental** | Sin commitear (no autorizado en este bloque) | Sin desplegar | Ninguno autorizado — esperar instrucciones sobre Browser QA / release |
| 2026-09-04 | **P14.4-F — Core Experience Final Audit** (solo auditoría, mismo día) — Home/Goal/Points/Missions/Wallet/Partners/Rewards auditados como un único sistema post-P14.4-E. 10 findings (F1-F8 + 2 adicionales), destacando F1 (copy de referidos describe un mecanismo inerte, `booking_confirmed`, en vez del real `partner_activity_count`) y F2 (bono de registro de 100 Points nunca explicado) como P0 | Cerrado — auditoría sin código | Ninguno | Sin cambios | F1+F2 (implementación autorizada) |
| 2026-09-04 | **P14.4-F — F1 + F2** — `profile.referralCodeExplainer` corregido (describe el mecanismo real, 2 actividades de Partner, 100/50 Points) y `rewards.pointsExplainer` extendido (bono de registro explicado) — ES+EN, 4 claves i18n tocadas, cero cambios de lógica/DB. 926/926 tests, tsc/lint/build PASS | **Cerrado, PASS** | Sin commitear | Sin desplegar | F3+F4 (implementación autorizada) |
| 2026-09-04 | **P14.4-F — F3 + F4** — F3: `PointsToastHost`/`announcePointsEarned` (nuevo, sin dependencia añadida), alcance real auditado y limitado a `goal_created` (única fuente Points con superficie síncrona propia del usuario). F4: nuevo RPC `complete_goal_if_threshold_met()` + `protect_goal_immutable_fields()` extendido con señal transaccional (mismo patrón ya auditado de Partners) — Goal completa cuando `earnedPoints>=targetPoints`, nunca por Wallet balance; idempotente y concurrency-safe, verificado empíricamente (5 llamadas paralelas -> exactamente 1 `just_completed:true`). 14 tests nuevos, 940/940 PASS, tsc/lint/build PASS | **Cerrado, PASS** | Sin commitear | Sin desplegar | F4 Security Audit (autorizado) |
| 2026-09-04 | **P14.4-F — F4 Security Audit** (auditoría independiente, mismo día) — 9 ataques empíricos reales contra Postgres local (UPDATE directo de `status`/`target_points`/`points_at_goal_creation`/`user_id`, manipulación de la señal transaccional, ownership ajeno, invocación directa del RPC como `authenticated`, concurrencia) — **todos bloqueados**. Confirmado que `set_config` no es alcanzable vía PostgREST (`pg_catalog`, fuera del schema expuesto) y que, aunque lo fuera, `is_local` no sobrevive entre peticiones separadas. 1 hallazgo LOW (G1: `goals` usa GRANT de tabla completa, no columnas específicas como Partners) — no bloqueante | **F4 SECURITY: PASS** | Ninguno (solo ataques de prueba contra datos efímeros, sin residuo) | Sin cambios | Cierre documental (autorizado) |
| 2026-09-04 | **P14.4-F CLOSURE** (mismo día, turno posterior) — creado `VIAO_P14_4_F_IMPLEMENTATION.md` (registro consolidado de la secuencia completa: audit→F1+F2→F3+F4→security audit), este HANDOFF (§2/§5/§21) y `VIAO_FUTURE_BACKLOG.md` sincronizados. G1 registrado como LOW/FUTURE/NON-BLOCKING. Validación final: 940/940 tests, tsc/lint/build PASS, sin regresión | **P14.4-F F3+F4: PASS. F4 SECURITY: PASS.** | Sin commitear (no autorizado en este bloque) | Sin desplegar | Ninguno autorizado — esperar revisión del propietario |

---

**Fin del documento (revisión post-RELEASE CLOSURE, 2026-09-02). Desde la revisión anterior (PARTNER APPROVAL V1, 2026-09-01): P10 — Admin Partners V1, P10.1 — Partner Onboarding Hardening, UX-AUTH-1 — Auth/Onboarding de Usuario, y P13 — Security Hardening (código) se cerraron en un único commit de release (`e1794e6`), pusheado y desplegado en producción. Documentación (este HANDOFF, `VIAO_PARTNERS_CONTINUITY_MASTER.md` §20, `VIAO_PARTNERS_MASTER_ROADMAP.md`) sincronizada contra código/Git/producción real en el mismo bloque, antes del commit. Smoke test de producción parcial: `/admin/partners` (guard), `/login`/`/register`/`/recover`, `/partners/join` (validación) y `/partners` (catálogo) confirmados; el circuito completo de Onboarding con una sesión nueva **no se pudo verificar** por un rate-limit de Supabase Auth agotado por los propios intentos de este mismo smoke test (no un defecto de código). **Punto crítico que no debe perderse**: la migración de P13 (`20260902100000`) está commiteada, desplegada y validada exhaustivamente en el Postgres **local**, pero **NO se ha aplicado al Postgres de producción** — ningún mecanismo de este proyecto lo hace automáticamente al hacer deploy; requiere la misma acción manual del propietario que ya se usó para `20260901100000`. Hasta que eso ocurra, el hallazgo de seguridad de P13 sigue vigente en producción. Limitación de Resend sin dominio propio sigue vigente, sin cambios. No se inició UX-13, UX-18, V3, ni P16 — el cierre formal de V2 sigue siendo una decisión pendiente del propietario, no tomada en este bloque.**

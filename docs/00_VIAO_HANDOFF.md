---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem (post-Core Reset, post-Release Baseline)
DOMAIN: Meta / Continuidad
AUTHORITY: Punto de entrada de continuidad — NO tiene autoridad sobre código, Decision Locks ni CURRENT. Es un mapa de navegación y estado, no una fuente de decisiones.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-02 (sincronización documental post-RELEASE CLOSURE P10+P10.1+UX-AUTH-1+P13 — banner, §2, §5, §7, §7.1, §8, §11.4 nueva, §14, §15, §21 actualizados puntualmente; resto sin cambios salvo lo indicado)
---

# VIAO — HANDOFF

> ## ⚠️ RECORDATORIO PARTNERS (leer antes de cualquier bloque de Partners)
>
> **Cuando un negocio envía una solicitud para convertirse en Partner, ¿dónde llega la solicitud, quién la revisa, cómo se aprueba/rechaza y cómo se responde al negocio y se le entrega su acceso?**
>
> **Actualizado 2026-09-01 (PARTNER APPROVAL V1, ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §19 para la evidencia completa)**: la aprobación **ya NO es manual vía Supabase Studio** — ese camino está bloqueado a propósito por el trigger de protección, para cualquier rol. El mecanismo real hoy es el RPC `set_partner_status()`, commiteado, desplegado y **validado con un E2E real en producción** (transición `pending→active` disparada de verdad, Database Webhook confirmado hasta `pg_net`, `HTTP 200`). El comercio recibe comunicación automática por email en 3 momentos (solicitud recibida, aprobado, rechazado vía `pending→inactive`), y el `access_token` se entrega automáticamente en el email de aprobación — sujeto a la misma limitación ya documentada de Resend sin dominio propio verificado (ver §11.2). Andrés recibe aviso de cada solicitud nueva vía `PARTNER_NOTIFICATION_EMAIL` (Partner Application Notification V1, commiteado `14365ae`). Sin deduplicación ni estado `rejected` — decisión deliberada, no un bug.
>
> **Actualizado 2026-09-02 (RELEASE CLOSURE, ver §11.4)**: **ya existe un panel interno** — `/admin/partners` (P10 — Admin Partners V1, commiteado `e1794e6`, desplegado, guard verificado en producción). Localizar/revisar el contenido de una solicitud sigue en Supabase Studio; solo el paso de EJECUTAR la aprobación cambió de mecanismo. `contact_email` es ahora obligatorio al solicitar (P10.1). **Nota crítica no relacionada con Partners específicamente, pero que afecta a la sección de seguridad de este documento**: P13 (Security Hardening/GRANT audit) también se cerró en este release — corregido y validado en el Postgres **local**, pero su aplicación al Postgres de **producción** sigue pendiente de una acción manual del propietario (ningún mecanismo automático la aplica al hacer deploy) — ver §11.4.

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

- **Fase/bloque actual**: ninguna en curso. El último bloque cerrado es **RELEASE CLOSURE — P10 + P10.1 + UX-AUTH-1 + P13** (`VIAO_PARTNERS_CONTINUITY_MASTER.md` §20, `VIAO_PARTNERS_MASTER_ROADMAP.md` — este último es ahora la fuente detallada del estado P0-P15, no este HANDOFF).
- **Último bloque cerrado (código)**: commit único `e1794e6` — Admin Partners V1 (P10), Partner Onboarding Hardening (P10.1), Auth/Onboarding UX (UX-AUTH-1) y Security Hardening (P13, código) — pusheado a `origin/main` y desplegado en producción (Vercel `dpl_GqVULGsD1anZWbTEEosM6Uia9kgJ`, ● Ready).
- **Último bloque cerrado (producción)**: deploy automático del commit anterior, verificado. Smoke test parcial: login/register/recover/partners/join/`/admin/partners` (guard) confirmados en `https://viao.vercel.app`; el circuito Register→Onboarding→Home con sesión nueva **no se pudo verificar** en este bloque (rate-limit de Supabase Auth agotado por los propios intentos del smoke test — ver §11.4). **La migración de P13 (GRANT hardening) NO se ha aplicado al Postgres de producción** — sigue siendo una acción manual pendiente del propietario, exactamente como todas las migraciones anteriores de este proyecto (ningún mecanismo automatiza esto al hacer deploy).
- **Siguiente bloque autorizado**: **ninguno todavía**. P10, P10.1, UX-AUTH-1 y P13 (código) ya no son "próximo bloque" — están cerrados. Pendiente real, no de código: que el propietario aplique la migración de P13 a producción. Pendiente de decisión: cierre formal de V2, y después **P16.0 — Product + Architecture Audit**.
- **Decisión explícita de este bloque (histórica, V2 Release Checkpoint)**: se auditó si el ciclo de solicitudes Partner necesitaba un panel administrativo nuevo. Conclusión de entonces: no en ese release. Esa decisión se reabrió en la auditoría de P10 y, en este bloque, **se construyó** (`/admin/partners`) — no hay contradicción, son turnos distintos con alcance distinto.
- **Estado documental**: sincronizado en este bloque (2026-09-02) contra código/Git/producción real — ver `VIAO_PARTNERS_MASTER_ROADMAP.md` y `VIAO_PARTNERS_CONTINUITY_MASTER.md` §20 para el detalle que este HANDOFF no repite.
- **Estado técnico**: Rewards V1, Goals V1, Missions V1, Partners (Foundation + V2 + Commerce Identity + Partner Auth Entry + Partner Discovery CTA + Partner Approval V1 + **Admin Partners V1 + Onboarding Hardening, en producción**), Auth/Onboarding de Usuario (**UX-AUTH-1, en producción**) implementados y probados en código — ver sección 5-7.

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

Favoritos, notificaciones, promociones/multiplicadores, QR, campañas, CRM, mapas/geolocalización, reviews, chat, loyalty tiers, blockchain/token, billing, panel admin de solicitudes Partner (reafirmado explícitamente en el V2 Release Checkpoint, 2026-08-31), Self-Service C2 (Storage/imágenes), oferta con Points configurables, navegación principal para Partners en Sidebar/MainNav (sin umbral cumplido), roles sobre `profiles`.

**Retirado de esta lista 2026-08-31**: "login separado Usuario/Partner" — resuelto de forma distinta (vinculación opcional + routing, no una pantalla de elección de identidad) por Commerce Identity/UX-17.1. Ver §6, §7 y `VIAO_PARTNERS_CONTINUITY_MASTER.md` §18.

---

## 14. Current work / Next logical vs. Authorized

- **PENDIENTE OPERATIVO (no requiere código)**: aplicar la migración `20260902100000_p13_grant_security_hardening.sql` al Postgres de **producción** — acción manual del propietario, ver §11.4. El hallazgo de seguridad de P13 sigue vigente en producción hasta entonces.
- **NEXT LOGICAL**: decisión explícita del propietario sobre el **cierre formal de V2**, y después **P16.0 — Product + Architecture Audit**. En paralelo, sin relación de bloqueo: comprar/verificar el dominio propio de VIAO en Resend (desbloquea entrega real de emails — ver §11.2), UX-13 (Self-Service C2).
- **AUTHORIZED**: el V2 Release Checkpoint (§11.1), UX-14.2 (§11.1.1), Email V2 (§11.2), Partner Application Notification V1 (§11.3), **PARTNER APPROVAL V1** (§19 de la Continuity Master) y **P10 + P10.1 + UX-AUTH-1 + P13 (código) — RELEASE CLOSURE** (§11.4) ya se ejecutaron y cerraron, incluido su despliegue en producción. Nada más está autorizado a partir de aquí.
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

---

**Fin del documento (revisión post-RELEASE CLOSURE, 2026-09-02). Desde la revisión anterior (PARTNER APPROVAL V1, 2026-09-01): P10 — Admin Partners V1, P10.1 — Partner Onboarding Hardening, UX-AUTH-1 — Auth/Onboarding de Usuario, y P13 — Security Hardening (código) se cerraron en un único commit de release (`e1794e6`), pusheado y desplegado en producción. Documentación (este HANDOFF, `VIAO_PARTNERS_CONTINUITY_MASTER.md` §20, `VIAO_PARTNERS_MASTER_ROADMAP.md`) sincronizada contra código/Git/producción real en el mismo bloque, antes del commit. Smoke test de producción parcial: `/admin/partners` (guard), `/login`/`/register`/`/recover`, `/partners/join` (validación) y `/partners` (catálogo) confirmados; el circuito completo de Onboarding con una sesión nueva **no se pudo verificar** por un rate-limit de Supabase Auth agotado por los propios intentos de este mismo smoke test (no un defecto de código). **Punto crítico que no debe perderse**: la migración de P13 (`20260902100000`) está commiteada, desplegada y validada exhaustivamente en el Postgres **local**, pero **NO se ha aplicado al Postgres de producción** — ningún mecanismo de este proyecto lo hace automáticamente al hacer deploy; requiere la misma acción manual del propietario que ya se usó para `20260901100000`. Hasta que eso ocurra, el hallazgo de seguridad de P13 sigue vigente en producción. Limitación de Resend sin dominio propio sigue vigente, sin cambios. No se inició UX-13, UX-18, V3, ni P16 — el cierre formal de V2 sigue siendo una decisión pendiente del propietario, no tomada en este bloque.**

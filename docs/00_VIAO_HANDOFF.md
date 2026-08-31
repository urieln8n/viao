---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem (post-Core Reset, post-Release Baseline)
DOMAIN: Meta / Continuidad
AUTHORITY: Punto de entrada de continuidad — NO tiene autoridad sobre código, Decision Locks ni CURRENT. Es un mapa de navegación y estado, no una fuente de decisiones.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-31
---

# VIAO — HANDOFF

> ## ⚠️ RECORDATORIO PARTNERS (leer antes de cualquier bloque de Partners)
>
> **Cuando un negocio envía una solicitud para convertirse en Partner, ¿dónde llega la solicitud, quién la revisa, cómo se aprueba/rechaza y cómo se responde al negocio y se le entrega su acceso?**
>
> Respuesta actual (Beta, 2026-08-31, verificada contra código real — ver §7.1 y el Runbook Operativo en `VIAO_PARTNERS_CONTINUITY_MASTER.md` §17): la **revisión/aprobación en sí sigue siendo manual, 100%, vía Supabase Studio** — sin panel interno, sin estado `rejected` en el schema. **Actualizado (Email V2, §11.2)**: desde ese bloque, el comercio SÍ recibe comunicación automática por email en 3 momentos (solicitud recibida, aprobado, rechazado vía `pending→inactive`) y el `access_token` SÍ se entrega automáticamente en el email de aprobación — pero solo entra en vigor de verdad cuando VIAO tenga un dominio propio verificado en Resend (sin él, Resend solo entrega a la dirección de la propia cuenta Resend, nunca a un `contact_email` real — ver §11.2). **Actualizado (Partner Application Notification V1, §11.3, pendiente de aprobación para commit)**: el último gap operativo real — "¿cómo se entera Andrés de que existe una solicitud nueva?" — ya tiene solución: `sendPartnerApplicationNotificationEmail()` envía un email a `PARTNER_NOTIFICATION_EMAIL` (variable de entorno, nunca hardcodeada) en cuanto se crea cada solicitud `pending`, con nombre/categoría/descripción/dirección/contacto/fecha — nunca `access_token`. Sujeto a la misma limitación de Resend sin dominio: solo entrega si `PARTNER_NOTIFICATION_EMAIL` coincide con la dirección autorizada por la cuenta de Resend. Sigue sin existir panel interno, deduplicación ni estado `rejected` — decisión deliberada, no un bug.

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

- **Fase/bloque actual**: ninguna en curso. El último bloque cerrado es el **V2 Release Checkpoint** — Commerce Identity (UX-16.x) + Partner Auth Entry (UX-17.1) + Partner Discovery CTA (UX-17.2), auditado, testeado, E2E verificado, documentado, commiteado, pusheado y desplegado (ver §21 para el commit/deploy exactos).
- **Último bloque cerrado (código)**: V2 Release Checkpoint — ver §21 para el commit exacto de este bloque.
- **Último bloque cerrado (documentación)**: sincronización de `VIAO_PARTNERS_CONTINUITY_MASTER.md` (§3, §16, §18 nuevo) y este HANDOFF con el estado real de Commerce Identity/UX-17.1/UX-17.2 — corrige la afirmación previa (ya obsoleta) de que Partner era "sin `auth.users`, sin `profiles`" de forma absoluta.
- **Siguiente bloque autorizado**: **ninguno todavía**. UX-13 (Self-Service C2 + oferta textual) sigue siendo el siguiente bloque *lógico*, no autorizado.
- **Decisión explícita de este bloque**: se auditó si el ciclo de solicitudes Partner (`/partners/join` → revisión → aprobación → acceso) necesitaba un panel administrativo nuevo. Conclusión: el ciclo ya funciona completo vía Supabase Studio (decisión ya tomada, ver §7.1) — se confirmó explícitamente con el propietario **no construir panel admin en este release**, sin reabrir esa decisión.
- **Estado documental**: este HANDOFF estaba desactualizado antes de esta revisión — no mencionaba Commerce Identity, UX-16.x, UX-17.1 ni UX-17.2 en absoluto. Corregido en las secciones 6-7, 13 y 21 de este documento.
- **Estado técnico**: Rewards V1, Goals V1, Missions V1, Partners (Foundation + V2 hasta Self-Service C1 + F3.5), y ahora Commerce Identity + Partner Auth Entry + Partner Discovery CTA implementados y probados en código — ver sección 5-7.

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
| Travel | ❄️ FROZEN / legacy purgado de navegación y Core, código congelado en el repo | `VIAO_MASTER_CONTEXT_V1.md` §11-13, `HOTELBEDS_CERTIFICATION_STATUS.md` | Ninguna — depende de decisión estratégica explícita futura |
| Vision | ❄️ FROZEN, funcional, desacoplado de Missions (recomendado DECOUPLE, no ejecutado formalmente) | `VIAO_MASTER_CONTEXT_V1.md` §9 | Ninguna |
| Release Baseline | ✅ COMPLETADO | Ver §11 | Verificación E2E de Partners en producción — bloqueada, ver §15 |

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

Self-Service C2 (subida real de imágenes/Storage, logo, galería), horario/web/redes sociales (sin columna en `partners`), oferta estructurada (la tasa €→Points sigue fija en SQL, no configurable por Partner), QR, promociones/multiplicadores, favoritos, notificaciones, geolocalización, reviews, billing/suscripciones, CRM, blockchain/token, navegación principal para Partners en Sidebar/MainNav (sigue sin ítem fijo — solo existe el CTA discreto de UX-17.2 en Login/Register/Profile, sin umbral cumplido), panel administrativo para aprobar/rechazar solicitudes Partner (decisión explícita, ver §7.1 — el ciclo ya funciona vía Supabase Studio, y construirlo exigiría además un mecanismo de autenticación de administrador inexistente hoy).

**Ya no aplica** ("login separado Usuario/Partner" retirado de esta lista): Commerce Identity + UX-17.1 resuelven esto de forma distinta a "arquitectura viable, no construida" — sin pantalla nueva de elección de identidad ni Auth unificada, mediante vinculación opcional (`owner_id`) y routing (`intent=partner`). Ver §6 y `VIAO_PARTNERS_CONTINUITY_MASTER.md` §18.

### 7.1 Operational Gap — Partner Onboarding (auditado 2026-08-31)

El tramo `solicitud pending → revisión → aprobación/rechazo → comunicación → entrega de access_token` es **100% manual vía Supabase Studio** — confirmado por auditoría de código (ver recordatorio al inicio de este documento). Sin panel interno, sin estado `rejected` en el schema (solo `pending`/`active`/`inactive`), sin entrega automática de `access_token` al comercio salvo en el email de aprobación (Email V2), sin regeneración de token. **Decisión deliberada para el volumen actual (0-5 Partners), no un bug.** El procedimiento manual está ahora documentado en `docs/01_CURRENT/partners/VIAO_PARTNERS_CONTINUITY_MASTER.md` §17 ("Partner Onboarding Beta — Runbook Operativo"). Umbral identificado para cuando esto deje de ser suficiente: ~10-20 solicitudes simultáneas (ver auditoría del bloque "Partner Operational Flow / Next Block Audit").

**Corrección (Partner Application Notification V1, §11.3)**: la frase "sin notificación automática" de la versión anterior de este párrafo ya no es exacta — Andrés SÍ recibe un email en cuanto se crea una solicitud `pending` (`PARTNER_NOTIFICATION_EMAIL`, ver §11.3). Lo que sigue sin existir es cualquier interfaz para revisar/aprobar (Supabase Studio sigue siendo el único camino) y cualquier deduplicación de solicitudes repetidas.

---

## 8. Estado de validación (local vs. producción — no confundir)

**Local (Supabase Docker + `npm test`)**: `817 tests · 813 pass · 0 fail · 4 skipped`, `tsc`/`lint`/`build` en verde — verificado repetidamente, la evidencia más reciente es de este mismo bloque de auditoría de continuidad.

**Producción (`https://viao.vercel.app`)**:
- Deployment del commit `bde1663` (que incluye `c809584`): **Ready**, verificado en este bloque (`vercel ls`).
- Home, Goal, Missions, Wallet/Rewards, `/partners` (Discovery), `/partners/[slug]` (404 correcto): **NO VERIFICADO en este bloque concreto** (sí en el bloque RELEASE BASELINE anterior, sin errores de consola).
- Esquema de base de datos de producción: **is_test/description/category confirmados sincronizados** (prueba de caja negra vía `/partners/join`, bloque RELEASE BASELINE — una solicitud real se insertó sin error). El resto del esquema (incluida la migración de `partner_profile_viewed`) **no tiene confirmación directa**, solo inferencia razonable por aplicación secuencial de migraciones.
- Partner Dashboard, `profileViews` en producción, Self-Service C1 en producción, persistencia tras recarga, protección de campos sensibles en producción: **NO VERIFICADO** — bloqueado por falta de acceso a la base de datos de producción (ver §15). Sí verificado exhaustivamente en local con tests automatizados equivalentes.

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
5. Supabase Dashboard producción → Database → Webhooks: crear el webhook sobre `partners` (`UPDATE`), header `x-viao-webhook-secret`.
6. Vercel: añadir `PARTNER_STATUS_WEBHOOK_SECRET` y `SITE_URL` (Production).

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

- **NEXT LOGICAL**: comprar/verificar el dominio propio de VIAO en Resend (desbloquea que los emails de Partner y, más adelante, de Auth, entreguen a destinatarios reales — ver §11.2). Alternativa: UX-13 — Self-Service C2.
- **AUTHORIZED**: el V2 Release Checkpoint (§11.1), UX-14.2 (§11.1.1) y Email V2 (§11.2) ya se ejecutaron y cerraron. Nada más está autorizado a partir de aquí.
- **NOT AUTHORIZED**: UX-13, UX-18, V3 (Partner Engagement, ver `VIAO_PARTNERS_CONTINUITY_MASTER.md` §18.5), activar Resend como SMTP de Auth en producción (bloqueado hasta dominio propio, ver §11.2), y todo lo listado en §13.

Esto es una observación, no una autorización. Ningún bloque se ejecuta por estar identificado aquí como "siguiente lógico" — requiere instrucción explícita en su propio turno.

---

## 15. Contradicciones/anomalías detectadas en este bloque

1. **`VIAO_MASTER_PRODUCT_CONTEXT.md` vs. `VIAO_MASTER_CONTEXT_V1.md`**: ambos reclaman el nivel 4 de la jerarquía de autoridad (producto/estrategia global) y ninguno declara formalmente `SUPERSEDES`/`SUPERSEDED BY` respecto al otro en su cabecera — ambos campos están vacíos en ambos documentos. Sustancialmente están en desacuerdo: el primero (2026-08-25) sigue enmarcando Travel como parte del núcleo; el segundo (2026-08-27) declara explícitamente "VIAO YA NO ES UN PRODUCTO DE VIAJES" y documenta esta misma contradicción en su propia sección 22-24. **No se resuelve aquí** — requiere que el propietario decida si `VIAO_MASTER_CONTEXT_V1.md` sustituye formalmente al primero, o si se fusionan.
2. **`00_GOVERNANCE.md`, sección "Gap identificado"**: afirma que no existen documentos `CURRENT` para Rewards ni Missions. Es falso desde el commit `3a5b810` (2026-08-25, posterior a la redacción de esa sección) — ambos existen (`VIAO_REWARDS_V1.md`, `VIAO_MISSIONS_V1.md`) con sus Decision Locks. No se corrige `00_GOVERNANCE.md` en este bloque (fuera de alcance explícito) — se deja constancia aquí.
3. **`VIAO_MISSIONS_V1.md` vs. código real**: el documento (LAST REVIEWED 2026-08-25) describe las 4 Missions originales; el código (`lib/missions/rules.ts`) ya refleja el Core Reset del 2026-08-27, con `hotel_viewed`→`partner_activity_registered` y `search_started`→`profile_completed`. Prevalece el código (principio 1 de gobernanza) — el documento queda identificado como desactualizado, no se corrige en este bloque.
4. **Acceso a Supabase de producción**: la CLI de Supabase autenticada en esta sesión no lista ningún proyecto VIAO entre los proyectos accesibles (`supabase projects list` solo muestra `andres-web` y `barberia-saas`). La CLI de Vercel (autenticada como el propio propietario) puede *listar* los nombres de las variables de entorno de producción pero no *revelar* sus valores reales vía `vercel env pull` (las variables "Encrypted" llegan vacías). **No se puede verificar ni se ha intentado modificar el esquema de la base de datos de producción desde esta sesión.** La única evidencia positiva de sincronización de esquema es indirecta (una solicitud real vía `/partners/join` se insertó sin error, confirmando `is_test`/`description`/`category`). El resto de la cobertura de producción de Partners (Dashboard, Self-Service C1, `profileViews`, protección de campos) permanece **NO VERIFICADO**, no por fallo sino por falta de acceso — requiere que el propietario apruebe manualmente la solicitud de prueba ya creada y comparta su `access_token`, o confirme que la evidencia local ya reunida es suficiente.

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
| 2026-08-31 | **Partner Application Notification V1** — `sendPartnerApplicationNotificationEmail()` (mismo patrón que los 3 emails de Partner ya existentes), único destinatario `PARTNER_NOTIFICATION_EMAIL`, cierra el gap "Andrés no se entera de una solicitud nueva" sin panel admin/roles/schema/RLS nuevos. tsc/lint/build limpios, tests nuevos PASS (ver §11.3), E2E local real (solicitud vía navegador -> fila `pending` correcta en BD) | Implementado — **NO commiteado, esperando aprobación explícita (HARD STOP)** | Ninguno todavía | Ninguno todavía | Commit/push/deploy de este bloque (si se aprueba) |

---

**Fin del documento (revisión Email V2, 2026-08-31). Este bloque construyó el sistema de email propio de VIAO (Resend, sin dominio verificado todavía), corrigió un desajuste real de configuración de Auth encontrado durante su propia verificación, testeó, verificó E2E (incluido un email real de recuperación de punta a punta), sincronizó documentación, commiteó (`5cb965f`), pusheó y desplegó a producción (`https://viao.vercel.app`, `dpl_5FsKj7wuZ2bRLi7aCGnTsdm8PPxr`) — ver §11.2 para el detalle completo. Limitación explícita registrada: sin dominio propio verificado, los emails de Partner no llegan a destinatarios reales — código y arquitectura ya preparados, activación pendiente de esa única acción externa. No se inició UX-13, UX-18 ni V3.**

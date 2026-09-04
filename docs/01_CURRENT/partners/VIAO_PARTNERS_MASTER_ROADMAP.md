---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem
DOMAIN: Partners
AUTHORITY: Contrato operativo para ejecutar Partners fase por fase. No sustituye al código — ante cualquier contradicción futura, gana el código real (ver `docs/00_GOVERNANCE.md`). Complementa, no sustituye, a `VIAO_PARTNERS_CONTINUITY_MASTER.md` (ese documento es el diario cronológico bloque-a-bloque; este es el mapa operativo por fases, reconstruido desde cero contra el código real en esta auditoría).
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-04 (sincronización documental post-P10.2/P14.2 — nueva sección P10.2, P11/P12 corregidos, nueva sección P11.1, nota de numeración en P14 — ver notas de actualización tras la sección 0)
---

# VIAO — PARTNERS MASTER ROADMAP

Auditoría de nivel senior contra código real, migraciones reales y tests reales — nunca contra suposiciones. Cero implementación en este bloque: documento puro. Fuentes: lectura directa de todo `app/partners/`, `lib/partners/`, `app/api/webhooks/partner-status/`, `lib/email/` (parte Partner), `supabase/migrations/*partner*`, `lib/supabase/{server,middleware,service,client}.ts`, y los 147 tests reales de este dominio (conteo exacto en la sección 15).

---

## 0. Purpose

Documento operativo, no narrativo. Permite decir "Ejecuta P6" en un chat nuevo y empezar a implementar esa fase concreta sin re-auditar todo Partners. Cada fase (P0-P15) es autocontenida: objetivo, estado real, archivos, migraciones, tests, criterio de DONE, checklist.

**Nota de sincronización (2026-09-01, misma fecha, turno posterior)**: este documento se escribió con PARTNER APPROVAL V1 (P2) todavía sin commitear. Desde entonces: P2 (`56a414e`) y UX Pro Max V2/Bloque B (`18867a2`, relevante para P9) **ya están commiteados, pusheados y desplegados**, y P2 fue además activado y validado en producción con un E2E real automático (`pending→active` sobre un Partner de test, cadena completa `set_partner_status()`→trigger→Database Webhook→`pg_net`→`/api/webhooks/partner-status`→HTTP 200, confirmado independientemente en `net._http_response` de Supabase). Las secciones afectadas quedan corregidas puntualmente abajo, sin reescribir el documento — el resto de esta auditoría (P0/P1/P3-P8/P11-P15) sigue vigente sin cambios.

**Nota de sincronización (2026-09-02, RELEASE CLOSURE)**: desde la nota anterior se cerraron y desplegaron **P10 — Admin Partners V1**, **P10.1 — Partner Onboarding Hardening** (`contact_email` obligatorio en `/partners/join`) y **P13 — Security Hardening (GRANT audit)**, junto con UX-AUTH-1 (fuera del dominio Partners — login/registro/onboarding general de Usuario, documentado en `docs/00_VIAO_HANDOFF.md`, no repetido aquí). Los tres, commit único `e1794e6` ("release: close P10, P10.1, UX-AUTH-1 and P13"), pusheado a `origin/main` y desplegado en producción (`https://viao.vercel.app`). P10 deja de ser "NEXT BLOCK": existe `/admin/partners` (guard `partner_admin`, reutiliza `set_partner_status()` sin modificarlo). P13 deja de ser "no corregido": las 14 entidades de `public` afectadas por el default ACL permisivo quedaron corregidas (migración `20260902100000_p13_grant_security_hardening.sql` + `auto_expose_new_tables = false`), los 25 tests que este documento citaba como "100% el hallazgo de P13" están en verde. Queda un residual 🟡 documentado (no bloqueante) sobre privilegios TRUNCATE/REFERENCES/TRIGGER/MAINTAIN en tablas *futuras* — ver P13 más abajo. Las secciones afectadas (1, 4, 11, 14, 15, P1, P10, P13, Master Checklist, Open Decisions, Known Risks, P15) quedan corregidas puntualmente abajo; el resto de esta auditoría sigue vigente sin cambios. Verificación de producción de este release: login/register/recover/partners/join/`/admin/partners` (guard) confirmados; el circuito completo Register→Onboarding→Home con sesión nueva quedó **NO VERIFICADO** en este bloque por rate-limit de Supabase Auth (agotado por los propios intentos de smoke test, no un defecto) — ver `docs/00_VIAO_HANDOFF.md` para el detalle.

**Nota de sincronización (2026-09-03/04, P14/P14.1/P14.1.1/P14.2)**: ⚠️ **colisión de numeración, no un error de este documento** — la sesión que ejecutó estos bloques usó "P14" para referirse a **Partner Login** (`/partner/login`, nuevo, `LoginForm` compartido con `/login`), sin relación con la sección **P14 — QA / E2E** de este mismo roadmap (ver más abajo, sin cambios de numeración por no reescribir el documento entero). Para evitar confusión: "Partner Login + Access Recovery" queda documentado aquí como **P10.2** (mismo criterio de numeración hermana ya usado para P10.1), no como P14. Resumen: **P10.2 — Partner Login + Access Recovery** (nueva, ver abajo) commiteada y desplegada (`29e0632`), QA de producción parcialmente verificado — ver `docs/00_VIAO_HANDOFF.md` §2 para el detalle exacto y el estado abierto de la vinculación de cuenta. **P14.2 — Partner Product Audit** (solo auditoría, sin código propio en este roadmap) corrigió una premisa incorrecta: Experiences/Promotions **no existen** como funcionalidad Partner — ver P11/P12 corregidos abajo, y nueva sección **P11.1 — Activity Verification**.

---

## 1. Current State

**Partners funciona de punta a punta en código, commiteado y desplegado, para el recorrido completo** Registration → Approval (P2, commiteado `56a414e`, activado y validado en producción) → Commerce Identity → Access → Dashboard → Profile edit → Discovery. No hay ningún hueco funcional que impida a un comercio real completar el ciclo hoy. **(2026-09-02)** La condición pendiente que citaba esta sección — una forma de invocar `set_partner_status()` sin conocimiento técnico — quedó resuelta: **P10 — Admin Partners V1** está commiteado (`e1794e6`) y desplegado (`/admin/partners`, guard `partner_admin`, reutiliza el RPC sin modificarlo). El hallazgo de seguridad sistémico (GRANTs más amplios de lo esperado en ~14 tablas, incluida `partners`) también quedó corregido — ver **P13**, `🟢 COMPLETE`, mismo commit. Queda un residual 🟡 de bajo riesgo, no bloqueante, sobre tablas *futuras* (ver P13).

---

## 2. Target State

```text
Comercio descubre VIAO          → ✅ /partners público, sin sesión
        ↓
Solicita convertirse en Partner → ✅ /partners/join
        ↓
Solicitud queda pending         → ✅ requestPartnerRegistration()
        ↓
VIAO recibe notificación        → ✅ PARTNER_NOTIFICATION_EMAIL (Partner Application Notification V1)
        ↓
VIAO revisa solicitud           → ✅ Supabase Studio, tabla partners
        ↓
Aprobación / rechazo            → ✅ set_partner_status() en producción, validado E2E, con UI (P10, /admin/partners)
        ↓
Partner pasa a active           → ✅ (una vez aprobado)
        ↓
Partner recibe acceso           → ✅ email de aprobación con access_token (si webhook configurado en producción)
        ↓
Partner entra a su Dashboard    → ✅ /partners/dashboard/[accessToken]
        ↓
Completa / modifica su ficha    → ✅ MyBusinessForm (campos limitados, ver P6)
        ↓
Ficha aparece dentro de VIAO    → ✅ /partners, /partners/[slug]
        ↓
Usuarios descubren el Partner   → ✅ Discovery + Home (solo anónimo) + Missions CTA
        ↓
Usuario visita ficha            → ✅ /partners/[slug]
        ↓
Usuario interactúa con Partner  → ✅ /partners/ops/[accessToken] (QR/Reserva, el propio Partner lo opera)
        ↓
Partner obtiene valor           → 🟡 Dashboard con métricas reales, sin ninguna narrativa de "esto es lo que ganas"
        ↓
VIAO obtiene valor              → 🔵 sin medir (P12)
```

---

## 3. Architecture

- **Patrón B (service_role-only)** para `partners`: sin GRANT amplio, RLS solo para `owner_id = auth.uid()` (columnas explícitas, nunca `select *`). Toda escritura pública pasa por una única función server-side (`requestPartnerRegistration()`), nunca Supabase directo desde el cliente.
- **RPCs `SECURITY DEFINER`, `search_path=''`** para toda operación sensible: `link_partner_owner()`, `set_partner_status()`, `complete_partner_activity()`. Mismo patrón en los tres: resuelven `auth.uid()` internamente, nunca confían en un parámetro del llamante, respuesta uniforme anti-enumeración.
- **Server Actions finas**: nunca contienen lógica de autorización propia — solo resuelven el cliente de sesión correcto (nunca `service_role` cuando el RPC necesita `auth.uid()`) e invocan la función de dominio.
- **Sin Storage propio**: `image_url` es texto libre, sin bucket ni upload.
- **Tres mecanismos de identidad distintos y no confundibles**: `access_token` (acceso del propio Partner, sin Auth), `owner_id` (Commerce Identity, vincula un Partner a un Usuario Auth real), `raw_app_meta_data.role='partner_admin'` (autoridad de VIAO sobre `status`, nuevo en este bloque).
- **Hallazgo corregido (2026-09-02, P13)**: el GRANT de columna sobre `partners` volvió al allowlist exacto que las migraciones declaran (`access_token`/`contact_email`/`owner_id` fuera del alcance de `authenticated`) — la RLS y los triggers siguen siendo la barrera real, y ahora el GRANT también lo es, como estaba diseñado desde el principio.

---

## 4. Partner Lifecycle (auditado paso a paso)

| # | Paso | Estado | Mecanismo real |
|---|---|---|---|
| 1 | Comercio descubre VIAO | ✅ | `/partners` (sin sesión), CTA en Login/Register/Profile (UX-17.2) |
| 2 | Solicita ser Partner | ✅ | `/partners/join` → `PartnerJoinForm` → `submitPartnerRegistrationAction` |
| 3 | Solicitud queda `pending` | ✅ | `requestPartnerRegistration()`, INSERT único, `status`/`is_test` hardcodeados |
| 4 | VIAO recibe notificación | ✅ | `sendPartnerApplicationNotificationEmail()` → `PARTNER_NOTIFICATION_EMAIL` |
| 5 | VIAO revisa solicitud | ✅ | Supabase Studio, tabla `partners`, filtro manual `status='pending'` |
| 6 | Aprobación/rechazo | ✅ | `set_partner_status()` — implementado, commiteado, desplegado, validado E2E en producción; con UI (`/admin/partners`, P10, commiteado `e1794e6`) |
| 7 | Partner pasa a `active` | ✅ | Mismo RPC, transición `pending→active` |
| 8 | Partner recibe acceso | 🟢 | Email de aprobación con `access_token` — Database Webhook de producción configurado y validado E2E (`net._http_response`: `status_code=200`) |
| 9 | Partner entra al Dashboard | ✅ | `/partners/dashboard/[accessToken]`, `resolvePartnerAccess()` |
| 10 | Completa/modifica ficha | 🟡 | `MyBusinessForm` — funciona, campos limitados (ver P6) |
| 11 | Ficha aparece en VIAO | ✅ | `/partners` (Discovery), `/partners/[slug]` |
| 12 | Usuarios descubren el Partner | ✅ | Discovery, Home (solo anónimo), Missions CTA |
| 13 | Usuario visita ficha | ✅ | `/partners/[slug]`, `getPartnerBySlug()` |
| 14 | Usuario interactúa | 🟡 | Interacción real es el propio Partner registrando la Actividad (`/partners/ops/[accessToken]`) tras una visita/reserva — el Usuario no "interactúa" con la ficha más allá de leerla, no hay ninguna acción de Usuario→Partner en la ficha misma |
| 15 | Partner obtiene valor | 🟡 | Dashboard con métricas reales — sin ninguna comunicación explícita de "esto es lo que VIAO te trae" |
| 16 | VIAO obtiene valor | 🔵 | Sin medir (P12) |

---

## 5. Current Routes

| Ruta | Tipo | Protección | Archivo |
|---|---|---|---|
| `/partners` | Pública | Ninguna (Discovery) | `app/partners/page.tsx` |
| `/partners/[slug]` | Pública | Ninguna (perfil público) | `app/partners/[slug]/page.tsx` |
| `/partners/join` | Pública | Ninguna | `app/partners/join/page.tsx` |
| `/partners/dashboard` | Requiere sesión Auth (Camino B) | `createSessionClient().auth.getUser()`, redirect a `/login` si no hay sesión | `app/partners/dashboard/page.tsx` |
| `/partners/dashboard/[accessToken]` | Token opaco (Camino A) | `resolvePartnerAccess()`, `notFound()` si inválido/no `active` | `app/partners/dashboard/[accessToken]/page.tsx` |
| `/partners/ops/[accessToken]` | Token opaco | `resolvePartnerAccess()` | `app/partners/ops/[accessToken]/page.tsx` |
| `/api/webhooks/partner-status` | Secreto compartido (header) | `PARTNER_STATUS_WEBHOOK_SECRET` | `app/api/webhooks/partner-status/route.ts` |

**Middleware** (`lib/supabase/middleware.ts`): solo protege `/profile` (`PROTECTED_PATHS`). Ninguna ruta de `/partners/*` está en esa lista — su protección es 100% a nivel de página (token/RLS), no de middleware. Confirmado por lectura directa, no asumido.

---

## 6. Current Database Model

```text
auth.users
   │
   └── profiles (1:1, id = auth.users.id)
          │
          └── partners.owner_id (opcional, N:1 — un profile puede poseer varios Commerce)

partners
   ├── id uuid PK
   ├── name, slug (unique), category (CHECK: restaurant/experience/barbershop/gym/shop/service)
   ├── status (CHECK: pending/active/inactive — NO existe 'rejected')
   ├── access_token uuid (unique, default gen_random_uuid(), inmutable)
   ├── owner_id uuid → profiles(id), ON DELETE SET NULL
   ├── is_test boolean (default false, inmutable)
   ├── description, address, contact_email, contact_phone, image_url (nullable, editables por Self-Service C1)
   ├── created_at, updated_at
   └── protegidos por trigger: status*, access_token, is_test, owner_id (solo NULL→valor), slug, id
       (*status: excepción nueva, por transición válida + señal transaccional — ver P2)

partner_activities
   ├── partner_id → partners(id)
   ├── user_id → profiles(id)
   ├── attribution_mechanism (qr/reservation), amount_confidence, declared_amount_eur, points_awarded
   └── vía RPC complete_partner_activity() (PB2), nunca INSERT directo

analytics_events
   └── event_name='partner_profile_viewed', metadata->>'partnerId' — agregado como profileViews en el Dashboard

mission_completions
   └── mission_key='partner_activity_registered' — disparada desde app/partners/actions.ts tras una Actividad
```

**Sin relación con Storage** (`photos`/`vision-scans` no referencian `partners` en absoluto).

---

## 7. Current Authentication / Identity

Tres caminos de identidad, verificados por separado, nunca confundibles entre sí:

1. **`access_token` (Camino A, LOCKED)**: generado por Postgres (`gen_random_uuid()` default), nunca por la aplicación. Se genera en el INSERT de `requestPartnerRegistration()`, inerte hasta la aprobación. Se guarda en la propia fila de `partners`. Se entrega hoy por email de aprobación (si el webhook de producción está configurado) — sin eso, no hay entrega automática. Puede perderse (sin regeneración implementada, deliberado — Runbook §10). No hay login real asociado — es un secreto compartido tipo "enlace mágico permanente".
2. **`owner_id` (Camino B, Commerce Identity, UX-16.3)**: vincula un `auth.users` real a un Partner. Se establece exclusivamente vía `link_partner_owner(p_access_token)` (RPC), que exige `status='active'` + email de sesión verificado == `contact_email` del Partner. Tras vincularlo: el Usuario puede entrar a `/partners/dashboard` (sin token en la URL) y VIAO resuelve sus Partners por sesión (`resolveOwnedPartners()`). El acceso por `access_token` sigue funcionando igual, sin cambios.
3. **`raw_app_meta_data.role='partner_admin'` (Camino C, nuevo, PARTNER APPROVAL V1)**: autoridad exclusiva sobre `status`. Solo escribible por `service_role` — ningún cliente puede auto-otorgárselo. Sin tabla propia.

Un tercero no puede acceder: el token es opaco (UUID, sin patrón adivinable), y el Dashboard nunca expone `access_token` como dato legible desde el cliente (columna excluida del GRANT de SELECT).

Con `status='pending'` o `'inactive'`: `resolvePartnerAccess()` trata ambos igual que un token inexistente (`notFound()`) — nunca distingue el motivo.

---

## 8. Current Dashboard

`app/partners/dashboard/[accessToken]/page.tsx` (Server Component) → `PartnerDashboardView`. Contenido real: badge de estado, widget de vinculación (`LinkAccountWidget`, solo si `owner_id` es NULL), 6 métricas agrupadas (`profileViews`, `clientesNuevos`/`clientesRecurrentes`, `ventasDeclaradasEur`/`ventasConfirmadasReservaEur`), actividad reciente (últimas 10), formulario "Mi comercio" (`MyBusinessForm`) al final. `CommerceChrome` propio (sin Sidebar/MainNav de Usuario). Estados `loading`/`notFound` implementados. Sin rediseño necesario para que sea funcional — pulido visual ya cubierto conceptualmente en el bloque UX Pro Max V2 (Bloque B, sin commitear).

---

## 9. Current Profile

Ver tabla completa en P6. Editable hoy: `name`, `category`, `description`, `contact_phone`, `address`, `image_url` (URL de texto, sin subida real). No editable ni existente: horarios, web, redes sociales, servicios estructurados, categorías múltiples, logo/portada distintos de `image_url`, galería de fotos.

---

## 10. Current Discovery

Verificado por código, no asumido — Partners aparece exactamente en:

- `/partners` (Discovery pública, grid, `getActivePartners()`)
- `/partners/[slug]` (perfil público individual)
- **Home, solo para el usuario anónimo** (`HomeLanding`, hasta 2 Partners como evidencia) — nunca para el usuario autenticado más allá de una fila-teaser con enlace a `/partners`
- **Missions** (`missions-summary.tsx`): un enlace "Ver Partners", sin listado propio
- Login/Register/Profile: CTA discreto "¿Tienes un negocio?" (UX-17.2), es *hacia* `/partners/join`, no discovery de Partners existentes

**No aparece** en: Sidebar/MainNav (sin ítem fijo, decisión explícita reafirmada varias veces), Rewards, ni ningún componente de búsqueda/filtro dedicado (Discovery es un grid simple, sin buscador ni filtros por categoría todavía).

---

## 11. Current Admin / Approval

`set_partner_status()` (RPC) + `lib/partners/set-partner-status.ts` + `app/partners/admin-actions.ts` — completo, probado (17 tests), **commiteado (`56a414e`), desplegado y validado E2E en producción** (migración aplicada, `partner_admin` configurado, Database Webhook configurado, transición `pending→active` real confirmada de punta a punta). **UI desde 2026-09-02** (P10, commit `e1794e6`): `/admin/partners` (Server Component con guard `partner_admin` + `notFound()` para cualquier otro rol, Client Component con acciones por fila y confirmación para `active→inactive`), consume `setPartnerStatusAction()`/`set_partner_status()` sin modificarlos. El Runbook Operativo (`VIAO_PARTNERS_CONTINUITY_MASTER.md` §17) sigue vigente para LOCALIZAR/REVISAR solicitudes en Supabase Studio (Table Editor) — `/admin/partners` sustituye únicamente el paso de EJECUTAR la aprobación, no la revisión previa.

---

## 12. Current Emails

| Email | Existe | Trigger | Destinatario | Template | Test | Producción |
|---|---|---|---|---|---|---|
| Solicitud recibida | ✅ | INSERT exitoso en `requestPartnerRegistration()` | Comercio (`contact_email`, opcional) | `renderPartnerApplicationReceivedEmail` | ✅ | 🟡 sin dominio propio, no entrega a destinatarios reales |
| Notificación interna | ✅ | Mismo punto, incondicional | `PARTNER_NOTIFICATION_EMAIL` | `renderPartnerApplicationNotificationEmail` | ✅ | 🟡 depende de que la dirección coincida con la cuenta Resend autorizada |
| Aprobación | ✅ | Webhook, `pending→active` | Comercio | `renderPartnerApprovedEmail` (con enlace al Dashboard) | ✅ | 🟢 Database Webhook configurado y validado E2E en producción; entrega real a `contact_email` sigue sujeta al límite de Resend sin dominio propio |
| No aprobación | ✅ | Webhook, `pending→inactive` | Comercio | `renderPartnerRejectedEmail` | ✅ | 🟢 mismo webhook ya validado; misma limitación de Resend |
| Reactivación | 🔵 | `inactive→active` — sin rama en el webhook hoy | — | — | — | No implementado, documentado como pendiente (P2/P11) |

---

## 13. Current Storage

**Ninguno.** `partners.image_url` es una columna de texto libre — el comercio pega un enlace externo, VIAO no sube ni procesa ninguna imagen. Los 2 buckets reales del proyecto (`photos`, `vision-scans`) no tienen ninguna relación con Partners.

---

## 14. Current Security

- RLS: `partners_select_own`/`partners_update_own`, ambas `owner_id = auth.uid()`.
- GRANT de columnas explícito (declarado en migración, **corregido 2026-09-02** — ver P13).
- Trigger `protect_partners_immutable_fields()`: protege `access_token`/`is_test`/`slug`/`id` (incondicional) y `owner_id`/`status` (con excepciones talladas y verificadas con tests).
- 3 RPCs `SECURITY DEFINER` con `search_path=''`, autorización interna vía `auth.uid()`, respuesta anti-enumeración.
- Webhook: secreto compartido validado antes de tocar el body.
- **Hallazgo corregido (2026-09-02, P13, commit `e1794e6`)**: `authenticated` tenía GRANTs de columna más amplios de lo que las migraciones declaraban, sobre ~14 tablas incluida `partners` — confirmado con SQL directo, corregido con `REVOKE ALL` + reconstrucción exacta de cada GRANT declarado, y `auto_expose_new_tables = false` en `supabase/config.toml` para que no vuelva a ocurrir sobre tablas nuevas. Residual 🟡 no bloqueante documentado en P13 (privilegios administrativos TRUNCATE/REFERENCES/TRIGGER/MAINTAIN sobre tablas *futuras*, no explotable vía la arquitectura real de acceso — `anon`/`authenticated`/`service_role` solo llegan a Postgres vía PostgREST, que no expone esos verbos).

---

## 15. Current Tests

**147 tests del dominio Partners** (conteo exacto por archivo, verificado con grep, no estimado):

| Archivo | Tests | Cubre |
|---|---:|---|
| `link-partner-owner.test.ts` | 18 | Commerce Identity, RLS |
| `set-partner-status.test.ts` | 17 | Approval, autorización, máquina de estados, trigger |
| `register-partner-activity.test.ts` | 15 | Registro de Actividad (Ops) |
| `complete-partner-activity.test.ts` | 14 | RPC de Points/kill-switches |
| `get-partner-dashboard.test.ts` | 12 | Métricas del Dashboard |
| `resolve-partner-access.test.ts` | 11 | Resolución de `access_token`/`owner_id` |
| `route.test.ts` (webhook) | 11 | Payload, secreto, transiciones |
| `e2e-integration.test.ts` | 10 | Conexión real entre PB2/PB4/PB6 |
| `parse-amount-input.test.ts` | 7 | Parsing de importes (Ops) |
| `update-partner-profile.test.ts` | 7 | Self-Service C1 |
| `get-active-partners.test.ts` | 6 | Discovery |
| `get-partner-by-slug.test.ts` | 6 | Perfil público |
| `request-partner-registration.test.ts` | 6 | Registration |
| `get-partner-for-editing.test.ts` | 5 | Precarga del formulario |
| `actions.test.ts` (app/partners) | 2 | Server Actions de Ops |

Más `send-partner-emails.test.ts`/`templates/partner-emails.test.ts` (`lib/email/`, no contados aquí, cubren las 4 plantillas de Partner), más `get-partners-for-admin.test.ts` (7, nuevo con P10, no contado en la tabla de arriba). **(2026-09-02)** Los 25 fallos que esta sección citaba como "100% el hallazgo de P13" están corregidos — suite completa 895 tests / 891 pass / 0 fail / 4 skipped, incluido `link-partner-owner.test.ts:182` (antes en rojo por el mismo hallazgo).

---

# ROADMAP

## P0 — Audit & Decision Lock
**Objetivo**: cerrar el estado real (este documento).
**Estado**: ✅ Completo — este documento es el entregable.
**Checklist**: todos los puntos de la sección "Current State" arriba, marcados.

---

## P1 — Partner Registration
**Objetivo**: que un comercio pueda solicitar convertirse en Partner.
**Estado actual**: ✅ **Completo y funcionando en producción.**
**Qué existe**: `/partners/join` → `PartnerJoinForm` → `submitPartnerRegistrationAction` → `requestPartnerRegistration()`. Validación mínima (nombre no vacío, categoría dentro del CHECK real). Sin protección anti-spam/abuso (sin rate limiting, sin captcha, sin deduplicación — confirmado, no hay ningún mecanismo).
**Qué falta**: nada bloqueante. Deduplicación de solicitudes repetidas queda como mejora opcional, no bloqueante al volumen actual (ya evaluado y descartado explícitamente en un bloque anterior). **P10.1 — Partner Onboarding Hardening (2026-09-02, commit `e1794e6`)**: `contact_email` pasó a ser obligatorio (validación cliente + servidor, formato `EMAIL_FORMAT` básico), cerrando el riesgo de que una solicitud aprobada quedase sin ningún canal de entrega para el `access_token` ni clave de vinculación para Commerce Identity.
**Dependencias**: ninguna.
**Riesgos**: bajo — sin protección anti-spam, un volumen alto de solicitudes falsas sería visible manualmente en Studio, no automatizado.
**Archivos**: `app/partners/join/*`, `app/partners/join-actions.ts`, `lib/partners/request-partner-registration.ts`.
**Migraciones**: `20260825120000`, `20260830150000`, `20260830160000`.
**Tests**: `request-partner-registration.test.ts` (6) — suficiente.
**Criterio DONE**: ✅ ya cumplido.
**Checklist**: [x] Formulario, [x] Validación, [x] INSERT seguro, [x] Estados UI, [x] Emails.

### Tabla de campos recogidos

| Campo | Existe | Obligatorio | Editable (post-alta) | Uso |
|---|---|---|---|---|
| `name` | ✅ | ✅ | ✅ (Self-Service) | Nombre público |
| `category` | ✅ | ✅ | ✅ | Filtro/badge en Discovery |
| `description` | ✅ | ❌ | ✅ | Texto en Discovery/Perfil |
| `address` | ✅ | ❌ | ✅ | Texto en Perfil |
| `contact_email` | ✅ | ✅ (desde P10.1, 2026-09-02 — antes opcional) | ❌ (excluido del Self-Service, es la clave de vinculación de Commerce Identity) | Emails + `link_partner_owner()` |
| `contact_phone` | ✅ | ❌ | ✅ | Texto en Perfil |
| `image_url` | ✅ | ❌ | ✅ | Imagen en Discovery/Perfil |
| `status`/`access_token`/`is_test`/`slug`/`id` | ✅ | — | ❌ nunca | Internos |

---

## P2 — Partner Approval
**Objetivo**: que VIAO pueda aprobar/rechazar/desactivar/reactivar Partners de forma segura.
**Estado actual**: 🟢 **COMPLETE / PASS.** Commiteado, desplegado y validado end-to-end en producción con datos reales.
**Qué existe**: `set_partner_status(p_partner_id, p_new_status)` (RPC), `lib/partners/set-partner-status.ts`, `app/partners/admin-actions.ts`, trigger actualizado con carve-out por señal transaccional + matriz de transiciones, `raw_app_meta_data.role='partner_admin'`.
**Transiciones auditadas**:
- Permitidas: `pending→active`, `pending→inactive`, `active→inactive`, `inactive→active`.
- Rechazadas explícitamente: `pending→pending`, `active→active`, `inactive→inactive` (no-ops), `active→pending`, `inactive→pending` (ninguna vuelta a `pending`), cualquier valor fuera de `active`/`inactive` (incluido `'approved'`, `'rejected'` — probado literalmente).
**Evidencia de producción (2026-09-01)**: migración `20260901100000` aplicada; `partner_admin` configurado en `raw_app_meta_data.role` del usuario administrador real; Database Webhook (`public.partners`, `UPDATE`, `x-viao-webhook-secret` sincronizado entre Supabase y Vercel) configurado; endpoint `/api/webhooks/partner-status` verificado (`401` sin secreto/con secreto incorrecto, `200` con secreto correcto); **E2E automático real ejecutado** sobre un Partner de test dedicado (`is_test=true`, `contact_email=null`, sin tocar ningún Partner de negocio real): `pending→active` vía `set_partner_status()` → trigger → Database Webhook → `pg_net` → `/api/webhooks/partner-status` → `HTTP 200` → `{"handled":"approved"}`, confirmado independientemente en `net._http_response` de Supabase (`status_code=200, timed_out=false, error_msg=null`) — descartando que el `Status: 0` visto inicialmente en la vista en vivo de Vercel Logs fuera un fallo real (artefacto de esa vista, no del endpoint). Una primera configuración del secreto del webhook devolvió `401` antes de corregirse; quedó resuelta antes del E2E final. Un segundo Partner real (`elkin`) también completó `pending→active` por el mismo mecanismo. Ningún email real se envió en ninguna de estas pruebas (`contact_email` vacío en el Partner de test).
**Qué falta**: (1) alguna superficie de invocación sin conocimiento técnico — ver P10, es el único pendiente real; (2) email de reactivación (`inactive→active`) — documentado como pendiente, no implementado a propósito.
**Dependencias**: P0 (auditoría ya hecha). Ya no bloquea P4/P5 en producción real — el propio `elkin` es un Partner `active` real hoy.
**Riesgos**: sin superficie de invocación (P10), el mecanismo sigue exigiendo una llamada REST manual autenticada con el JWT de sesión del `partner_admin` — funcional, pero no operable por alguien sin conocimiento técnico.
**Archivos**: `supabase/migrations/20260901100000_add_partner_status_approval.sql`, `lib/partners/set-partner-status.ts`, `app/partners/admin-actions.ts`.
**Tests**: `set-partner-status.test.ts` (17) — completo.
**Criterio DONE**: ✅ cumplido — commiteado + desplegado + `partner_admin` configurado + al menos una aprobación real ejecutada en producción (dos, de hecho: Partner de test y `elkin`).
**Checklist**: [x] RPC, [x] Trigger seguro (auditado dos veces), [x] Server Action, [x] Tests, [x] Commit/push/deploy, [x] `partner_admin` real configurado, [x] Webhook configurado y validado E2E, [ ] Superficie de invocación sin fricción técnica (P10).

---

## P3 — Commerce Identity
**Objetivo**: conectar Partner ↔ cuenta Auth de forma segura.
**Estado actual**: ✅ **Cerrado.** `owner_id`, `link_partner_owner()` (RPC, anti-enumeración, atómico, idempotente), RLS `partners_select_own`/`partners_update_own`, trigger con excepción tallada solo para `NULL→valor`.
**Qué falta**: nada bloqueante. Un Usuario puede poseer varios Commerce (sin `UNIQUE`, decisión explícita).
**Dependencias**: requiere `status='active'` (P2) para poder vincularse — **ya cumplido** (P2 cerrado, `elkin` es un Partner `active` real hoy), pero `link_partner_owner()` en sí **todavía no se ha ejecutado ni una vez con una cuenta real en producción** — sigue siendo la única verificación pendiente de esta fase, sin relación ya con la disponibilidad de un Partner `active` (eso dejó de ser el bloqueo).
**Riesgos**: ninguno nuevo identificado.
**Archivos**: `lib/partners/link-partner-owner.ts`, `app/partners/dashboard/[accessToken]/link-account-widget.tsx`.
**Migraciones**: `20260831140000`.
**Tests**: `link-partner-owner.test.ts` (18) — exhaustivo. **Nota (P13)**: uno de estos 18 tests (`RLS: access_token/contact_email/owner_id nunca son seleccionables...`) está actualmente en rojo en la suite local — causa raíz es el hallazgo sistémico de GRANT de P13, no código de Commerce Identity, ver P13.
**Criterio DONE**: ✅ ya cumplido en código; 🟡 verificación real en producción pendiente — requiere ejecutar `link_partner_owner()` con una cuenta real, no autorizado todavía en ningún bloque.
**Checklist**: [x] `owner_id`, [x] RPC, [x] RLS, [x] Trigger, [ ] Verificado con un Partner real en producción (P2 ya no es el bloqueo).

---

## P4 — Partner Access
**Objetivo**: que el Partner acceda de forma fiable a su Dashboard.
**Estado actual**: ✅ **Completo.** Dos caminos (token directo, sesión vinculada), ambos auditados.
**Qué falta**: regeneración de `access_token` comprometido (deliberadamente no implementado, Runbook §10) — queda como FUTURE, no bloqueante.
**Dependencias**: P2 (sin aprobación, no hay ningún Partner `active` al que acceder).
**Archivos**: `lib/partners/resolve-partner-access.ts`, `app/partners/dashboard/[accessToken]/*`.
**Tests**: `resolve-partner-access.test.ts` (11).
**Criterio DONE**: ✅ ya cumplido.
**Checklist**: [x] Token, [x] Sesión, [x] Estados `pending`/`inactive` tratados igual que inexistente, [ ] Regeneración de token (FUTURE, no bloqueante).

---

## P5 — Partner Dashboard
**Objetivo**: Dashboard funcional.
**Estado actual**: ✅ **Funcional.** 6 métricas reales, actividad reciente, chrome propio, estados loading/notFound.
**Qué falta**: pulido visual (ya identificado conceptualmente en UX Pro Max V2, Bloque B — no bloqueante para "funcional"), ninguna narrativa de valor ("esto es lo que VIAO te trae") — ver P11.
**Dependencias**: P2/P4.
**Archivos**: `lib/partners/get-partner-dashboard.ts`, `app/partners/dashboard/[accessToken]/partner-dashboard-view.tsx`.
**Tests**: `get-partner-dashboard.test.ts` (12).
**Criterio DONE**: ✅ ya cumplido para "funcional"; pulido visual es P9/Bloque B, no P5.
**Checklist**: [x] Métricas, [x] Actividad reciente, [x] Estados, [ ] Narrativa de valor (P11).

---

## P6 — Partner Profile
**Objetivo**: que el Partner pueda crear/completar/modificar su ficha.
**Estado actual**: 🟡 **Funcional con alcance deliberadamente reducido (Self-Service C1).**

| Información | Existe DB | Existe backend | Existe UI | Editable por Partner | Falta |
|---|---:|---:|---:|---:|---|
| Nombre | ✅ | ✅ | ✅ | ✅ | — |
| Categoría | ✅ | ✅ | ✅ | ✅ | — |
| Descripción | ✅ | ✅ | ✅ | ✅ | — |
| Dirección | ✅ | ✅ | ✅ | ✅ | — |
| Teléfono | ✅ | ✅ | ✅ | ✅ | — |
| Imagen (URL) | ✅ | ✅ | ✅ | ✅ | Sin subida real, solo enlace externo |
| Email de contacto | ✅ | ✅ | ❌ (no editable, es la clave de Commerce Identity) | ❌ | Decisión deliberada, no un olvido |
| Horarios | ❌ | ❌ | ❌ | — | Self-Service C2 (FUTURE) |
| Web | ❌ | ❌ | ❌ | — | Self-Service C2 (FUTURE) |
| Redes sociales | ❌ | ❌ | ❌ | — | Self-Service C2 (FUTURE) |
| Servicios estructurados | ❌ | ❌ | ❌ | — | Self-Service C2 (FUTURE) |
| Logo/portada (distinto de `image_url`) | ❌ | ❌ | ❌ | — | Requiere Storage (P7) |
| Galería de fotos | ❌ | ❌ | ❌ | — | Requiere Storage (P7) |

**Dependencias**: ninguna para lo ya existente. Logo/portada/galería dependen de P7.
**Archivos**: `lib/partners/update-partner-profile.ts`, `app/partners/dashboard/[accessToken]/my-business-form.tsx`.
**Tests**: `update-partner-profile.test.ts` (7).
**Criterio DONE (V1)**: ✅ ya cumplido para el alcance C1. C2 es una decisión de producto separada, no bloqueante.
**Checklist**: [x] Campos C1, [ ] Decisión explícita sobre C2 (OPEN DECISION).

---

## P7 — Partner Media
**Objetivo**: logo, portada y fotografías reales.
**Estado actual**: 🔴 **No existe.** Cero bucket, cero política, cero UI.
**Qué falta**: todo — decisión de producto primero (¿lo necesita el volumen actual de Partners?), luego bucket + RLS + upload + UI.
**Dependencias**: P6 (decisión de ampliar el modelo).
**Riesgos**: sobre-ingeniería si se construye antes de tener Partners reales que lo demanden — mismo criterio ya aplicado a Self-Service C2 en bloques anteriores.
**Archivos implicados (futuro)**: nuevo bucket Storage, nuevas políticas, nuevo componente de upload.
**Migraciones implicadas (futuro)**: nueva migración de bucket + políticas.
**Tests necesarios (futuro)**: ownership (un Partner solo modifica sus propias imágenes), tamaños, formatos.
**Criterio DONE**: no aplica todavía — depende de decisión de producto.
**Checklist**: [ ] Decisión de producto, [ ] Bucket, [ ] RLS, [ ] Upload, [ ] UI, [ ] Tests.

---

## P8 — Partner Discovery
**Objetivo**: que los Partners activos aparezcan realmente dentro de VIAO.
**Estado actual**: ✅ **Completo para el volumen actual.** Ver sección 10 arriba para el mapa exacto.
**Qué falta**: buscador/filtros por categoría (sin evidencia de necesidad al volumen actual — 0-10 Partners no lo justifica), SEO (sin auditar, fuera de alcance de este documento).
**Dependencias**: P2 (sin Partners `active` reales, Discovery está vacío en producción hoy).
**Archivos**: `lib/partners/get-active-partners.ts`, `lib/partners/get-partner-by-slug.ts`, `app/partners/page.tsx`, `app/partners/[slug]/page.tsx`, `app/partners/partner-card.tsx`.
**Tests**: `get-active-partners.test.ts` (6), `get-partner-by-slug.test.ts` (6).
**Criterio DONE**: ✅ ya cumplido para V1.
**Checklist**: [x] Grid, [x] Perfil público, [x] Aislamiento `is_test`, [ ] Buscador/filtros (FUTURE, no bloqueante).

---

## P9 — User → Partner Experience
**Objetivo**: experiencia completa del usuario (Discover → View → Understand → Interact).
**Estado actual**: 🟡 **Bloque B (UX Pro Max V2) commiteado y desplegado (`18867a2`)** — ya no está pendiente de implementación. Lo único que falta es una validación visual real en navegador tras el deploy (no ejecutada todavía en ninguna sesión confirmada). P1/P2 de esa auditoría (chrome de Auth, safe-area) no son específicos de Partners; el resto de hallazgos de UX de Partners de ese bloque siguen aplicando aquí sin repetirlos.
**Qué falta**: Browser QA / validación visual post-deploy — confirmar en un navegador real que el chrome de Auth, el safe-area, los estados localizados y el catálogo de Rewards responsive se ven correctamente en producción. No ejecutada en este bloque de sincronización documental (fuera de su alcance).
**Dependencias**: ninguna nueva.
**Criterio DONE**: 🟡 código cumplido; validación visual pendiente.
**Checklist**: [x] Commit/push/deploy, [ ] Validación visual real en producción — ver el informe de UX Pro Max V2 ya entregado para el detalle de los hallazgos, no se repite aquí.

---

## P10 — Admin Panel
**Objetivo**: decidir si y cuándo construir una superficie de administración.
**Estado actual**: 🟢 **COMPLETE.** Implementado como **Admin Partners V1 (Opción B)**, la opción recomendada por este mismo documento. Commiteado y desplegado en producción, `e1794e6`, 2026-09-02.
**Qué existe**: `/admin/partners` — `app/admin/partners/page.tsx` (Server Component: `createSessionClient().auth.getUser()` → `redirect("/login")` sin sesión → `isPartnerAdmin(user)` → `notFound()` para cualquier otro rol) + `app/admin/partners/admin-partners-view.tsx` (Client Component: tabla con las acciones válidas por fila según la misma matriz de transiciones del RPC, mostrada solo a título informativo — nunca la reimplementa; `Dialog` de confirmación solo para `active→inactive`; llama a `setPartnerStatusAction()` sin modificarlo; `router.refresh()` tras cada acción, sin estado optimista) + `lib/partners/get-partners-for-admin.ts` (lectura vía `service_role`, allowlist de columnas, sin filtro de `status`, orden por `created_at desc`).
**Seguridad**: la autorización real sigue siendo el propio RPC (`auth.uid()` + `raw_app_meta_data.role='partner_admin'`, sin cambios) — el guard de la página es una segunda capa de UX, nunca la barrera, exactamente como preveía la recomendación original de este documento.
**Qué falta**: nada bloqueante. Localizar/revisar el contenido de una solicitud (nombre, categoría, descripción, etc. más allá del estado) sigue dependiendo de Supabase Studio — `/admin/partners` solo sustituye el paso de EJECUTAR la transición, no toda la revisión.
**Dependencias**: P2 (✅ ya cerrado).
**Archivos**: `app/admin/partners/page.tsx`, `app/admin/partners/admin-partners-view.tsx`, `lib/partners/get-partners-for-admin.ts`.
**Tests**: `get-partners-for-admin.test.ts` (7).
**Criterio DONE**: ✅ cumplido — commiteado, desplegado, guard verificado en producción (visitante sin sesión → `/login`).
**Checklist**: [x] Decisión explícita del propietario, [x] Diseño de `/admin/partners` mínimo, [x] Autenticación/autorización (reutiliza `partner_admin`, guard de página nunca la única barrera), [x] Implementación, [x] Tests.

---

## P10.2 — Partner Login + Access Recovery
**Objetivo**: puerta de entrada propia del Partner Portal, y un fallback manual al email de aprobación automático.
**Estado actual**: 🟢 **COMPLETE en código, desplegado.** Commit `29e0632` ("feat: complete partner access and onboarding"), pusheado a `origin/main`, Vercel Ready.
**Qué existe**: `/partner/login` (`app/partner/login/page.tsx`, `CommerceChrome` + `LoginForm` compartido con `/login`, extraído a `components/auth/login-form.tsx` — misma sesión Supabase Auth, sin sistema de auth separado, redirige a `/partners/dashboard` por defecto en vez de `/`) + `resendPartnerAccessAction()`/"Reenviar acceso" en `/admin/partners` (fallback manual al mismo email/plantilla de aprobación ya usado por el webhook — `access_token` nunca sale de `resendPartnerAccess()`, resultado siempre `{outcome:"sent"|"not_sent"}`) + corrección del copy impreciso del EmptyState de `/partners/dashboard` (decía que el enlace llega "al darse de alta"; llega al aprobarse).
**Seguridad**: sin cambios de arquitectura — mismo `owner_id`/RLS/RPCs de siempre (`resolvePartnerAccess`, `link_partner_owner`, `set_partner_status` sin tocar).
**QA de producción**: 🟡 **parcial, no PASS completo** — verificado con evidencia real: Partner de prueba visible en Admin, email real recibido, enlace carga el Dashboard correcto con `LinkAccountWidget`. **Sin confirmar**: el paso de vinculación de cuenta y `/partner/login` con la cuenta ya vinculada — ver `docs/00_VIAO_HANDOFF.md` §2 para el detalle exacto, no repetido aquí.
**Archivos**: `app/partner/login/page.tsx`, `components/auth/login-form.tsx`, `lib/auth/resolve-login-redirect.ts`, `lib/partners/resend-partner-access.ts`, `app/partners/admin-actions.ts`, `app/partners/dashboard/page.tsx`, `components/layout/app-shell.tsx`.
**Tests**: 21 nuevos (`resolve-login-redirect.test.ts` 11, `resend-partner-access.test.ts` 10), 0 regresiones sobre la suite existente (922/918/0/4 en la última corrida completa).
**Checklist**: [x] Auditoría previa (arquitectura de auth, sin proponer un sistema nuevo), [x] Implementación, [x] Tests, [x] Commit/push/deploy, [ ] QA de producción completo (vinculación de cuenta sin confirmar).

---

## P11 — Partner Value Loop
**Objetivo**: que el Partner entienda y reciba valor real de VIAO.
**Estado actual**: 🔵 Datos existen (Dashboard), narrativa no. **Confirmado en P14.2 (auditoría de producto, 2026-09-04)**: el Dashboard real hoy es exactamente Visibilidad (`profileViews`) → Clientes (nuevos/recurrentes) → Ventas (declaradas/confirmadas) → Actividad reciente — ninguna cifra tiene contexto ("¿esto es bueno?") ni serie temporal (solo acumulado histórico total, nunca por periodo).
```text
Partner → Visibilidad (Discovery) → Clientes (Actividad registrada) → [Rewards es del Usuario, no del Partner directamente] → Repetición (clientesRecurrentes, ya calculado) → Valor del Partner
```
**Qué falta**: ninguna funcionalidad nueva necesariamente — principalmente comunicación/copy en el Dashboard ya existente, más una serie temporal simple sobre datos que ya existen. Separar: **existente** (todas las métricas), **MVP necesario** (una frase de contexto por métrica + tendencia simple), **futuro** (informes/comparativas).
**⚠️ No confundir con Experiences/Promotions**: P14.2 confirmó que ninguna de las dos existe como funcionalidad Partner (ni tabla, ni CRUD, ni UI) — "experience" es solo una de las 6 categorías fijas de negocio. Cualquier documento o bloque que las dé por existentes está equivocado; corregir contra este mismo párrafo.
**Checklist**: [ ] Decisión de qué narrativa/tendencia añadir — **depende de validación con Partners piloto reales (P14.2, Route A)**, [ ] Implementación (no antes de esa validación).

---

## P11.1 — Activity Verification (needs pilot evidence)
**Objetivo**: que una Actividad registrada en Ops refleje algo que realmente ocurrió, no solo lo que el propio Partner escribió.
**Estado actual**: 🔴 **No existe.** Confirmado en código (P14.2, 2026-09-04): `/partners/ops/[accessToken]` tiene dos botones, "QR" y "Reserva" — **ninguno de los dos hace nada distinto de un formulario de importe manual**. "QR" no genera ni escanea ningún QR. "Reserva" acepta una `reservationReference` de **texto libre, sin FK, puramente informativo** (ya documentado así en el propio código, `register-partner-activity.ts`). La única diferencia real entre ambos flujos es la tasa de Points (`declared` 1pt/€ vía QR, `confirmed_by_reservation` 2pt/€ vía Reserva) — un nombre que sugiere una confianza que el sistema no respalda.
**Salvaguardas que SÍ existen** (a nivel de volumen, no de veracidad): límite diario de Actividades, pool mensual de 3.000 Points, `attempt_id` único (idempotencia), `access_token` como única vía de autorización (un Partner no puede registrar Actividad para otro).
**Qué falta si se decide construir**: algún mecanismo que involucre al usuario, no solo al Partner — QR real (estático o dinámico), código corto introducido por el usuario, o confirmación cruzada. Ver comparativa de opciones en el informe de P14.2 (no repetida aquí).
**Dependencias**: **validación con 2-3 Partners piloto reales** sobre si este es realmente el problema que más les importa (frente a P11, métricas/narrativa) — sin esa evidencia, no se elige mecanismo.
**Checklist**: [ ] Validación de necesidad real con Partners piloto, [ ] Elección de mecanismo (solo tras validación), [ ] Diseño de seguridad del mecanismo elegido, [ ] Implementación — **ninguno de estos pasos autorizado todavía**.

---

## P12 — Analytics
**Objetivo**: medir el funnel completo de Partners.
**Estado actual**: 🟡 Parcial — `partner_profile_viewed` ya existe y se agrega en el Dashboard (`profileViews`). Nada más se mide: solicitudes, aprobaciones, Partners activos en el tiempo, % de perfil completado, clics, conversión. **P14.2 confirma que no hay ninguna serie temporal** — todas las métricas del Dashboard son acumulado histórico total, nunca por periodo/mes.
**Dependencias**: ninguna técnica — es agregación sobre datos que ya existen (`partners.status`, `partners.created_at`, `partner_activities`).
**Checklist**: [ ] Decisión de qué métricas priorizar — **depende de la misma validación de Partners piloto que P11/P11.1**, [ ] Implementación (probablemente consultas nuevas, sin tabla nueva).

---

## P13 — Security Hardening (SYSTEMIC GRANT AUDIT)
**Objetivo**: corregir el hallazgo de GRANTs amplios — **deliberadamente separado de Partner Approval y de P10, nunca mezclado.**
**Estado actual**: 🟢 **COMPLETE.** Commiteado y desplegado, `e1794e6`, 2026-09-02.
**Causa raíz confirmada** (no solo el síntoma): `pg_default_acl` del schema `public` (grantor `postgres`), comportamiento legacy de la CLI de Supabase asociado a `auto_expose_new_tables` — concedía el set completo de privilegios de tabla a `anon`/`authenticated`/`service_role` en el momento de `CREATE TABLE`, antes de que el GRANT explícito de cada migración se ejecutara. Como los privilegios de Postgres son aditivos, ningún GRANT restrictivo posterior podía "restar" lo ya concedido.
**Corrección**: migración `supabase/migrations/20260902100000_p13_grant_security_hardening.sql` — `REVOKE ALL` + reconstrucción exacta (leída de cada migración de origen, no inventada) del GRANT declarado, sobre las 14 tablas afectadas: `bookings`, `booking_intents`, `analytics_events`, `ai_rate_limit_events`, `referrals`, `rewards_transactions`, `rewards_catalog`, `rewards_wallets` (vista), `searches`, `trips`, `vision_consents`, `vision_scans`, `properties`, `partners`. Más `auto_expose_new_tables = false` explícito (no dejado comentado/ausente) en `supabase/config.toml`, para que el mecanismo no vuelva a exponer tablas *futuras*. Cero cambios de RLS, RPC o `SECURITY DEFINER`.
**Resultado verificado** (verbo por verbo, incluidos TRUNCATE/REFERENCES/TRIGGER/MAINTAIN vía `pg_class.relacl` crudo, no solo los 4 privilegios de datos): `anon` → 0 privilegios en las 14 tablas; `authenticated`/`service_role` → exactamente lo que cada migración de origen declaraba, ni más ni menos; `partners.access_token`/`contact_email`/`owner_id` → fuera del allowlist de columnas de `authenticated`, confirmado. RLS y los 5 RPCs `SECURITY DEFINER` (incluidos `link_partner_owner`/`set_partner_status`) sin cambios. Los 25 tests que este documento citaba como "100% el hallazgo de P13" están en verde: suite completa 895 tests / 891 pass / 0 fail / 4 skipped.
**Residual documentado, no corregido a propósito**: `auto_expose_new_tables = false` bloquea SELECT/INSERT/UPDATE/DELETE en tablas nuevas, pero no TRUNCATE/REFERENCES/TRIGGER/MAINTAIN (confirmado con una tabla de prueba creada y eliminada en el propio bloque de implementación). Clasificado 🟡 deuda técnica de bajo riesgo, no bloqueante: `anon`/`authenticated`/`service_role` en VIAO solo llegan a Postgres vía PostgREST (Data API), que no expone ningún verbo REST para TRUNCATE/añadir una FK/crear un TRIGGER — son operaciones DDL inalcanzables desde la superficie real de la aplicación. **No se ha intentado corregir este residual** — fuera de alcance deliberado de este bloque.
**Dependencias**: ninguna de Partners específicamente — bloque independiente, no depende de P10 ni P10 depende de él.
**Archivos/migraciones**: `supabase/migrations/20260902100000_p13_grant_security_hardening.sql`, `supabase/config.toml`.
**Tests**: los 25 antes afectados, todos en verde (contra el Postgres **local**, tras `supabase db reset`); 0 regresiones sobre el resto de la suite.
**⚠️ PENDIENTE REAL, no confundir con "cerrado"**: esta corrección está verificada exhaustivamente contra el Postgres **local** de Docker. Igual que toda migración anterior de este proyecto (`20260901100000` incluida), **no existe ningún mecanismo automático que aplique migraciones de Supabase a producción al hacer `git push`/deploy de Vercel** — no hay GitHub Action ni build step que ejecute `supabase db push` (confirmado: no existe `.github/workflows/`, `package.json`'s `build` es solo `next build`). Yo nunca he tenido credenciales privilegiadas de producción en ningún bloque de esta sesión. Por tanto: **el estado real de los GRANTs en el Postgres de producción de VIAO sigue siendo el permisivo (pre-P13) hasta que el propietario aplique esta migración manualmente** (Supabase Studio SQL Editor o `supabase db push` contra el proyecto vinculado), del mismo modo que hizo con `20260901100000`. El commit/push/deploy de este bloque publica el *código* (migración + config), no ejecuta la migración en producción.
**Criterio DONE**: ✅ cumplido para las 14 entidades existentes **en local**. El residual sobre tablas futuras queda fuera de este criterio por diseño (documentado, no bloqueante). La aplicación a producción sigue pendiente — ver arriba.
**Checklist**: [x] Auditoría de causa raíz, [x] Migración de corrección (código), [x] Revalidación completa de tests (local), [ ] **Migración aplicada a Supabase de producción (acción manual del propietario, no ejecutada en este bloque)**, [ ] Residual TRUNCATE/REFERENCES/TRIGGER/MAINTAIN en tablas futuras (🟡 deuda técnica, no bloqueante, sin fecha).

---

## P14 — QA / E2E
**⚠️ Nota de numeración (2026-09-04)**: sin relación con "P14/P14.1/P14.1.1" tal como se nombraron en la sesión que ejecutó Partner Login — ver P10.2 arriba y `docs/00_VIAO_HANDOFF.md` §2. Esta sección conserva su numeración original de este roadmap, sin cambios.
**Objetivo**: validar el recorrido completo real.
**Estado actual**: 🟡 Cada tramo probado por separado (147 tests) + `e2e-integration.test.ts` conecta PB2/PB4/PB6. **P2 ya tiene su propio E2E real confirmado en producción** (ver evidencia en la sección P2 de este documento) — pero **ningún test conecta Registration→Approval→Identity→Dashboard como un único flujo real de principio a fin**, y P9 (Bloque B) tampoco tiene su validación visual E2E confirmada todavía (ver P9).
**Qué falta**: un test/checklist E2E manual (navegador real) que recorra los 15 pasos completos del ciclo de vida (sección 4 de este documento) como un único recorrido, y la validación visual pendiente de P9.
**Dependencias**: P2 desplegado — ✅ cumplido.
**Checklist**: [x] E2E real de P2 (Approval) confirmado en producción, [ ] E2E manual del ciclo completo Registration→Approval→Identity→Dashboard, [ ] Validación visual de P9, [ ] Documentar evidencia (como ya se ha hecho en bloques anteriores).

---

## P15 — Production Readiness
**Objetivo**: checklist final antes de considerar Partners "en producción real" con Partners activos de verdad.
**Estado actual**: 🟡 Mayoría ✅, con condicionantes claros.

- [🟡] DB migrations — todas aplicadas y probadas en local; en producción, todas confirmadas **excepto `20260902100000` (P13), pendiente de aplicación manual** — ver P13
- [x] RLS — funcional, sin cambios por P13, verificado sin regresiones
- [🟡] Grants — corregidos en código/local (P13, `e1794e6`); **pendiente de aplicar a producción** (acción manual del propietario); residual 🟡 documentado no bloqueante sobre tablas futuras
- [x] Auth — Commerce Identity + `partner_admin` **configurado en el usuario real de producción**
- [🟡] Emails — funcionan, webhook validado E2E en producción; entrega real sigue sin dominio propio verificado en Resend (limitación externa, no de código)
- [x] Storage — no aplica (P7 no implementado, decisión, no bug)
- [x] Errors/Loading — estados cubiertos en todas las pantallas auditadas
- [🟡] Mobile/Desktop — Bloque B (P9) commiteado y desplegado, validación visual real pendiente; smoke test de este release (2026-09-02) confirmó `/login`/`/partners` responsive en producción, no el recorrido P9 completo
- [ ] Accessibility — no auditado específicamente en este documento
- [x] i18n — claves ES/EN paritarias (TypeScript lo garantiza; re-verificado 2026-09-01 sin discrepancias en claves de Partners)
- [ ] SEO — no auditado
- [🔴] Analytics — parcial (P12)
- [🟡] Security — corregido en código/local (P13); **pendiente de aplicar a producción**, ver arriba
- [x] Tests — 147+ propios (incluye `get-partners-for-admin.test.ts`, nuevo con P10), 0 rotos; suite completa 895/891/0/4, los 25 fallos de P13 ya en verde
- [x] Build — limpio, verificado repetidamente, última vez en este release (2026-09-02)
- [x] Deploy — P2, Bloque B (P9), P10, P10.1, UX-AUTH-1 y P13 (código) desplegados en producción
- [🟡] Production smoke test — P2 validado con E2E real automático; release 2026-09-02 (P10/P10.1/UX-AUTH-1/P13) verificado parcialmente — login/register/recover/partners/join/`/admin/partners` (guard) PASS, circuito Onboarding con sesión nueva NO VERIFICADO (rate-limit de Supabase Auth, ver Known Risks #5)

---

## Definition of Done — PARTNERS V1

Verificado contra código real, no la lista original del prompt sin revisar — **confirmada válida, sin cambios**, con una precisión añadida:

1. Un comercio puede solicitar ser Partner. ✅
2. Recibe confirmación. ✅
3. VIAO recibe la solicitud (notificación). ✅
4. VIAO puede aprobarlo. ✅ (desplegado, validado E2E en producción)
5. El Partner recibe acceso. ✅ (webhook de producción configurado y validado E2E; entrega real de email sigue sujeta al límite de Resend sin dominio propio, no bloqueante para el mecanismo en sí)
6. Puede autenticarse (vincular su cuenta). ✅
7. Puede entrar a su Dashboard. ✅
8. Puede completar su ficha. ✅ (alcance C1)
9. Puede editarla. ✅
10. Puede gestionar sus imágenes. ❌ — **no cumplido, y no debería serlo para V1**: es Self-Service C2/P7, deliberadamente fuera de alcance de V1 por decisión ya tomada repetidamente. Se retira de la Definition of Done de V1, se mueve a P7/FUTURE.
11. La ficha aparece en VIAO. ✅
12. Los usuarios pueden descubrirla. ✅
13. Los usuarios pueden abrirla. ✅
14. Las operaciones están protegidas. ✅ (auditado dos veces explícitamente)
15. Los tests críticos pasan. ✅ (147/147 propios de Partners; suite completa 855/884, los 25 fallos son 100% P13, ajeno a Partners)
16. Producción funciona end-to-end. ✅ — los 3 pendientes que fijaba esta línea (desplegar P2, configurar `partner_admin` real, confirmar el webhook de producción) están resueltos y validados con un E2E real (2026-09-01).

**PARTNERS V1 = DONE en su definición original.** El único punto de esta lista sin cumplir es el #10 (gestión de imágenes), ya retirado explícitamente del alcance de V1 en la propia línea 10. **(2026-09-02)** P10 (Admin) y P13 (Security, en código/local) ya no están abiertos — quedan como bloques posteriores a V1 sin cerrar del todo: validación visual de P9, verificación real de P3, y la aplicación manual de la migración de P13 a producción.

---

## Master Checklist

```text
PARTNERS V1

[x] P0  Audit                    — este documento
[x] P1  Registration             — completo
[x] P2  Approval                 — commiteado, desplegado, validado E2E en producción
[x] P3  Commerce Identity        — completo en código, sin verificar con Partner real en producción (P2 ya no es el bloqueo)
[x] P4  Access                   — completo
[x] P5  Dashboard                — funcional
[x] P6  Profile (C1)             — completo para el alcance V1
[ ] P7  Media                    — FUERA de alcance V1, no bloqueante
[x] P8  Discovery                — completo
[ ] P9  User Experience          — commiteado y desplegado, validación visual real pendiente
[x] P10 Admin                    — COMPLETE, commiteado y desplegado (`e1794e6`, 2026-09-02), guard verificado en producción
[ ] P11 Partner Value            — FUERA de alcance V1
[ ] P12 Analytics                — FUERA de alcance V1
[x] P13 Security (GRANT audit)   — COMPLETE en código y en local (`e1794e6`, 2026-09-02); ⚠️ aplicación a Supabase de PRODUCCIÓN sigue pendiente (acción manual del propietario, no ejecutada); residual 🟡 no bloqueante sobre tablas futuras
[ ] P14 QA E2E completo          — P2 ya tiene E2E propio; falta el recorrido completo Registration→Approval→Identity→Dashboard y la validación visual de P9
[ ] P15 Production Readiness     — pendiente de aplicar P13 a producción y de P9; los pendientes de P2 ya están resueltos
```

---

## Open Decisions

| # | Decisión | Opciones | Mi recomendación |
|---|---|---|---|
| 1 | Commitear/desplegar PARTNER APPROVAL V1 | Sí ahora / esperar | ✅ **Resuelta** (2026-09-01) — commiteado (`56a414e`), desplegado y validado E2E en producción |
| 2 | Superficie de invocación de `set_partner_status()` | Script puntual / Admin Partners V1 | ✅ **Resuelta** (2026-09-02) — Admin Partners V1 implementado y desplegado (`/admin/partners`, ver P10) |
| 3 | Self-Service C2 (horarios/web/redes/servicios) | Ahora / futuro | Futuro — sin evidencia de necesidad al volumen actual |
| 4 | Partner Media (P7) | Ahora / futuro | Futuro — depende de que C2 se decida primero |
| 5 | Email de reactivación | Implementar / dejar sin email | Baja prioridad, implementación trivial cuando se decida |
| 6 | Causa raíz del hallazgo de GRANTs (P13) | Investigar ahora / después | ✅ **Resuelta** (2026-09-02) — causa raíz confirmada (`pg_default_acl`/`auto_expose_new_tables`), migración de corrección commiteada y validada en local; ⚠️ aplicación a producción sigue pendiente, ver P13 |

## LOCKED (no reabrir sin decisión explícita)

- Sin panel administrativo completo, en ningún caso (reafirmado múltiples veces).
- Sin estado `rejected` — `inactive` es la convención para "no aprobado".
- `access_token` como mecanismo de acceso permanente del Partner (P7 histórico, LOCKED).
- Autoridad de aprobación vía `raw_app_meta_data.role`, nunca tabla `partner_admins` en esta fase.

---

## Known Risks

1. **P13 corregido en código/local, PENDIENTE de aplicar a producción** (actualizado 2026-09-02) — la migración `20260902100000` está commiteada y desplegada como código, pero ninguna migración de este proyecto se aplica automáticamente a la base de datos de producción al hacer push/deploy (confirmado: sin GitHub Actions, `build` de Vercel es solo `next build`). **El Postgres de producción de VIAO sigue con el GRANT permisivo hasta que el propietario ejecute esta migración manualmente** (mismo procedimiento ya usado para `20260901100000`). Mientras tanto, el riesgo real que este hallazgo describía en producción sigue exactamente igual que antes de este bloque.
2. ~~`set_partner_status()` sin superficie de invocación sin fricción técnica~~ — **Resuelto (2026-09-02)**: `/admin/partners` (P10) implementado y desplegado.
3. ~~Webhook de aprobación en producción sin confirmar configurado~~ — **Resuelto (2026-09-01)**: configurado y validado con un E2E automático real (`net._http_response: status_code=200`).
4. **Commerce Identity (P3) sigue sin ejercitarse con datos reales** — `link_partner_owner()` nunca se ha ejecutado con una cuenta real en producción, aunque ya existe al menos un Partner `active` real (`elkin`) sobre el que podría probarse. Todo lo demás auditado como "✅ completo" en Dashboard/Discovery tampoco se ha ejercitado más allá de ese único Partner de prueba y `elkin`.
5. **(Nuevo, 2026-09-02) Onboarding de Usuario (UX-AUTH-1) sin verificación end-to-end en producción con sesión nueva** — bloqueado por rate-limit de Supabase Auth agotado por los propios intentos de smoke test de este release; no es específico de Partners, ver `docs/00_VIAO_HANDOFF.md` para el detalle. Las piezas verificables por separado (formularios, validaciones, guards) sí pasaron en producción.

---

## Future

Self-Service C2, Partner Media (P7), buscador/filtros de Discovery, Partner Value Loop narrativo (P11), Analytics completo (P12), regeneración de `access_token`, estado `rejected` formal (si algún día se justifica), multiplicador de Points por Partner (ya evaluado conceptualmente en `VIAO_PARTNERS_CONTINUITY_MASTER.md`, no implementado).

---

## Recomendación — Admin Panel (sección 22 del encargo)

**✅ Implementado (2026-09-02, `e1794e6`) — se mantiene la rationale original como registro histórico de la decisión, ver P10 arriba para el estado real.**

**¿Debe VIAO tener Admin Panel? Respuesta concreta: DESPUÉS, no AHORA, no NUNCA — específicamente, "Admin Partners V1" (Opción B) en cuanto P2 esté desplegado.**

Análisis:
- **Esfuerzo**: bajo para Opción B (una tabla con 3 filtros + 4 botones, reutilizando el RPC ya construido y probado) — no es "construir desde cero", es construir la ÚNICA pieza que falta sobre un backend ya terminado.
- **Seguridad**: ya resuelta — el RPC `set_partner_status()` es la autoridad real (`auth.uid()` + `raw_app_meta_data`), cualquier UI sería solo un cliente más, nunca la barrera de seguridad (regla ya seguida en todo este dominio).
- **Escalabilidad**: Opción B es exactamente lo que el volumen actual (0-10 Partners) necesita — Opción C (panel completo con Users/Rewards/Missions/Analytics/Moderation/Settings) sería sobre-ingeniería sin ninguna evidencia de necesidad, contradice el criterio ya aplicado consistentemente en todo el proyecto.
- **UX**: hoy, sin ninguna superficie, Andrés no tiene forma práctica de aprobar un Partner salvo un script manual — eso SÍ es una fricción operativa real, no hipotética.
- **Mantenimiento**: Opción B es pequeña, autocontenida, no introduce ningún concepto nuevo (reutiliza `partner_admin` ya construido).
- **Dependencia de Supabase Studio**: sigue siendo necesaria para LOCALIZAR/REVISAR solicitudes (Studio Table Editor) — Opción B solo sustituye el paso de EJECUTAR la aprobación, no todo el flujo.
- **Riesgo operativo**: sin ninguna superficie, el mecanismo de aprobación construido en este bloque queda sin usar en la práctica — ese es el riesgo real que motiva recomendar Opción B pronto, no un capricho de alcance.

**Dónde colocarlo en el roadmap**: P10, inmediatamente después de que P2 esté commiteado/desplegado — no antes (no tiene sentido construir la UI de un RPC que todavía no está en producción), no mucho después (el RPC quedaría sin consumidor real indefinidamente).

---

**Fin del documento. Auditoría de nivel senior contra código/migraciones/tests reales, 0 funcionalidades inventadas, 0 implementación realizada.**

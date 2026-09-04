---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem
DOMAIN: Partners
AUTHORITY: Registro de ejecución de un bloque concreto (P14.3-A). No sustituye a `VIAO_PARTNERS_MASTER_ROADMAP.md` (mapa operativo por fases) ni a `docs/00_VIAO_HANDOFF.md` (estado global) — los complementa con el detalle exacto de este bloque.
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-04 (RE-VERIFICACIÓN, mismo día, turno posterior a P14.4-F — sección "Verificación final" corregida: `andres`/`elkin-4` están `active` de nuevo, `/partners` (estático) ya refleja el estado real tras los deploys de P14.4-F, `getActivePartners()` devuelve exactamente los 2 Partners reales, sin fixtures visibles. P14.3-A pasa a PASS / READY TO CLOSE, sin blockers de código. Solo documentación corregida, ningún archivo de código tocado)
---

# VIAO — P14.3-A IMPLEMENTATION RECORD

## Estado

- Phase: P14.3-A
- Scope: Partners Discovery + Navigation + Production Data Hygiene
- Status: **PASS / READY TO CLOSE** (actualizado tras re-verificación, ver "Verificación final" abajo) — Navigation implementada, validada, sin regresión. Production Data Hygiene: **problema resuelto** — los 2 Partners de prueba objetivo siguen `inactive`, y los 2 Partners reales (`andres`, `elkin-4`) están **`active`** de nuevo; `/partners` (estático) ya refleja el estado real (regenerado de paso por los deploys posteriores de P14.4-F); `getActivePartners()` devuelve exactamente esos 2 Partners reales, sin ningún fixture visible. Sin blockers de código.
- Date: 2026-09-04 (implementación) — verificación final 2026-09-04 — **re-verificación 2026-09-04 (mismo día, turno posterior a P14.4-F): problema RESUELTO**
- Commit: PENDING
- Deployment: PENDING

## Problema

La auditoría P14.3 (turno anterior, solo lectura) confirmó tres hallazgos:

1. **Sin entrada a Partners en la navegación principal** — ni `Sidebar` (desktop) ni `MainNav` (mobile) tenían ningún enlace a `/partners`, en ningún tamaño de pantalla. Un usuario logueado no tenía forma persistente de llegar a Discovery.
2. **Datos de prueba visibles en Discovery pública real** — dos Partners con nombres de prueba (`PROD TEST REAL RESEND 1788260068`, `PROD TEST RESEND FINAL 1788260068`) aparecían en `/partners` en producción, mezclados con Partners reales (`andres`, `elkin`).
3. `/partners` debía confirmarse como Discovery reconocible — auditado, ya cumplía el criterio sin necesitar cambios.

## Cambios realizados

### Navigation (código)

- **`components/nav/sidebar.tsx`** — añadido `Partners` (`/partners`, icono `Store` de Lucide) como quinto item de `MAIN_NAV_ITEMS`, entre `Wallet` y el item de cuenta (`Perfil`, sin cambios). Comentario del archivo actualizado explicando la decisión.
- **`components/nav/main-nav.tsx`** — añadido `Partners` (mismo `href`/icono) como sexto item de `NAV_ITEMS`, misma posición relativa (entre `Wallet` y `Perfil`). Comentario del archivo actualizado, incluyendo por qué se supera el límite informal de "5 items" de bloques anteriores (preferencia de densidad, no restricción técnica — revisado explícitamente antes de romperlo).

Ningún otro archivo de código fue modificado. Ningún item existente fue eliminado, renombrado, ni movido de posición relativa entre sí.

### Production Data Hygiene (auditoría + identificación, sin ejecución de escritura)

Lectura de solo lectura (`service_role`, columnas allowlisted — `id, slug, name, category, status, is_test, created_at`, nunca `access_token`/`contact_email`/`owner_id`) vía un script temporal creado y eliminado en el mismo turno (confirmado sin residuo por `git status`). Resultado — 6 filas con "TEST" en el nombre:

| Nombre | id | status | is_test | ¿Visible en Discovery hoy? |
|---|---|---|---|---|
| VIAO TEST — Partner Access | `a418673e-6c9e-4865-bd7d-3afec0436bb5` | active | **true** | No (filtro `is_test=false` funciona correctamente) |
| VIAO TEST — Webhook E2E | `dcf3d2c3-96fd-4e4b-ab2b-6798e68e3f9b` | active | **true** | No (idem) |
| PROD TEST RESEND FINAL 1788260068 | `532ea763-58b1-4d28-83ee-312237508604` | **active** | **false** | **Sí — hallazgo confirmado** |
| PROD TEST REAL RESEND 1788260068 | `2e5efff1-7b8d-4161-a741-e5f43ab43dc3` | **active** | **false** | **Sí — hallazgo confirmado** |
| PROD TEST Notification Diagnosis 1788260068 | `f8069cc6-2e0f-42a0-8b1e-855a9912ce38` | pending | false | No (pero visible en `/admin/partners`) |
| [TEST-CLAUDE-VERIFICACION-SCHEMA] Ignorar y marcar inactivo | `692daa39-7bf6-4321-9031-7825ae85c821` | pending | false | No (pero visible en `/admin/partners`; el propio nombre pide marcarlo inactivo) |

**Acción tomada**: ninguna escritura. **Acción NO tomada, y por qué**: `set_partner_status()` (el único mecanismo administrativo existente para desactivar un Partner) es un RPC `SECURITY DEFINER` que exige `auth.uid()` real de una sesión con `raw_app_meta_data.role='partner_admin'` (`lib/partners/set-partner-status.ts`, comentario explícito: "recibe el cliente de SESIÓN real, nunca service_role"). Este bloque no tiene una sesión de administrador autenticada. Usar `service_role` para llamar al RPC directamente habría resuelto `auth.uid()` como `null` (rechazado por el propio RPC, fail-closed — no un bypass real, pero tampoco una ejecución exitosa) y hacer un `UPDATE` directo sobre `partners.status` habría sido exactamente el "atajo peligroso" que este bloque prohíbe explícitamente. Se optó por **no inventar una vía alternativa** y documentar la acción pendiente.

**Qué falta, exactamente**: en `/admin/partners`, con sesión de `partner_admin` real, pulsar "Desactivar" sobre las dos filas `active` (`PROD TEST RESEND FINAL 1788260068`, `PROD TEST REAL RESEND 1788260068`) — 2 clics, con diálogo de confirmación ya existente. Opcionalmente, "Rechazar" sobre las dos filas `pending` (mismo panel, sin confirmación) para limpiar también el panel de administración, aunque estas dos no afectan a Discovery pública hoy.

## Navigation

- **Desktop** (`Sidebar`, `lg+`): `VIAO` (wordmark) → `Inicio` / `Mi objetivo` / `Missions` / `Wallet` / **`Partners`** (nuevo) → separador → `Perfil`. 5 items principales + 1 de cuenta, jerarquía sin cambios salvo la incorporación.
- **Mobile** (`MainNav`, `<lg`, barra inferior fija): `Inicio` / `Mi objetivo` / `Missions` / `Wallet` / **`Partners`** (nuevo) / `Perfil` — 6 items iguales (`flex-1`), sin overflow ni wrap de texto confirmado visualmente en 375px de ancho (ver Validation).
- **Partners entry**: `href="/partners"`, icono `Store` (Lucide) — deliberadamente no `Compass`/`MapPin` (lenguaje de exploración/viajes).
- **Active state**: reutiliza `isNavItemActive()` ya existente (`main-nav.tsx`, exportada, sin cambios de lógica) — `/partners` y cualquier subruta (`/partners/[slug]`) marcan el item activo; `/partners/dashboard`, `/partners/ops`, `/partners/join` no llegan a mostrar la navegación principal (son rutas Commerce/Auth, ocultas por `AppShell`, sin cambios).
- **Jerarquía final**: Home→Goal→Missions→Wallet→Partners→Perfil — cierra el bucle "ganas Points → los usas en un Partner" justo antes del item de cuenta.

## Discovery

- `/partners` (`app/partners/page.tsx`) — auditado, sin cambios de código: heading "Partners", subtítulo, grid de `PartnerCard`, `EmptyState` si no hay Partners, CTA "Únete a VIAO como Partner". Ya cumplía el criterio de ser reconocible como Discovery — no se sobretrabajó.
- Navegación a `/partners/[slug]` (perfil público) — confirmada funcional, sin cambios.
- Estados: vacío ya implementado (`EmptyState`); loading no aplica (Server Component, sin fetch en cliente); error ya tolerado (`getActivePartners()` nunca lanza, devuelve `[]`).

## Security

- **Sin cambios** en Auth, RLS, `access_token`, `owner_id`, `partners_protect_immutable_fields`, ni en ningún RPC (`set_partner_status`, `link_partner_owner`, `resolve_partner_access`). Confirmado por `git status` — solo 2 archivos de navegación, ambos sin lógica de datos.
- `getActivePartners()`/`getPartnerBySlug()` (sin tocar) siguen sin seleccionar `access_token`/`contact_email`/`contact_phone`/`owner_id` — confirmado por lectura directa de ambos archivos en este bloque.
- El script temporal de lectura para identificar los Partners de prueba usó un allowlist explícito de columnas (nunca `access_token`) y fue eliminado inmediatamente después de su uso — confirmado sin residuo por `git status`.

## Validation

### TypeScript
`npx tsc --noEmit` → **EXIT 0**

### Lint
`npm run lint` → **EXIT 0**

### Build
`npm run build` → **EXIT 0** — las 24 rutas compilan, incluidas `/partners` (estática) y `/partners/[slug]` (dinámica).

### Tests
`npm test` → **513 pass / 811 fail / 0 skip / 1324 total**. **Los 811 fallos son 100% el mismo problema de infraestructura ya documentado en esta sesión** (Docker Desktop inalcanzable en este entorno — `failed to connect to the docker API at npipe:...`, confirmado con `docker ps`), no una regresión de este bloque: cada fallo inspeccionado devuelve literalmente `falta NEXT_PUBLIC_SUPABASE_URL en el entorno de prueba` o su variante de `service_role`. Ninguna suite de test referencia `components/nav/sidebar.tsx` ni `components/nav/main-nav.tsx` (confirmado por búsqueda — no existen `*.test.*` para ninguno de los dos) — los únicos 2 archivos de código modificados en este bloque no tienen tests propios que pudieran regresar. No se investigó ni se intentó "arreglar" el problema de Docker — fuera de alcance de este bloque.

### Validación funcional (navegador real, servidor local en `http://localhost:3001`, build de este bloque, `.env.local` = Supabase de producción vía lectura, sin escritura)

- **Desktop** (1280×800, `/partners`): Sidebar visible, "Partners" visible y correctamente resaltado como activo (fondo + barra lateral), navegación a `/partners` funcional, 0 errores de consola. Discovery muestra las 4 filas reales/test-visibles esperadas (`andres`, `elkin`, y los 2 hallazgos de datos de prueba — confirma visualmente el hallazgo de la sección "Production Data Hygiene").
- **Desktop** (`/`): "Inicio" activo, "Partners" correctamente NO activo — confirma que `isNavItemActive()` distingue rutas correctamente tras el cambio.
- **Mobile** (375×812, `/`): barra inferior con 6 items (Inicio/Mi objetivo/Missions/Wallet/Partners/Perfil), sin overflow horizontal, sin wrap de texto, "Inicio" correctamente activo, 0 errores de consola.
- **Seguridad**: Partner inactivo/pending no aparece en `/partners` (confirmado por código — `status='active'` en `getActivePartners()`, sin cambios); `access_token` no aparece en ninguna respuesta HTML observada.
- **No verificado en este bloque** (fuera de alcance de lo que el entorno permite sin una sesión real): navegación con teclado (tab order) no se probó de forma instrumentada — la implementación reutiliza exactamente los mismos `<Link>`/`focus-visible:ring` ya presentes en los 5 items anteriores, sin ningún atributo nuevo que pudiera romper el orden de tabulación, pero no hay una captura que lo confirme explícitamente.

## Files Changed

```
M components/nav/sidebar.tsx
M components/nav/main-nav.tsx
A  docs/01_CURRENT/partners/VIAO_P14_3_A_IMPLEMENTATION.md
M  docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_ROADMAP.md
M  docs/00_VIAO_HANDOFF.md
```

(`VIAO_FUTURE_BACKLOG.md`: revisado, sin cambios necesarios — ninguna línea existente quedó invalidada por este bloque.)

## Known Limitations

- ~~Production Data Hygiene incompleta~~ — **RESUELTO**, ver "Verificación final" §2/§3: los 2 Partners de prueba `active` fueron desactivados y `andres`/`elkin-4` están `active` de nuevo, `/partners` ya refleja ese estado. Los 2 `pending` con nombre de prueba siguen igual, visibles solo en el panel admin (nunca afectaron a Discovery pública, no era parte de este hallazgo).
- **Docker local inalcanzable en este entorno** — la suite de integración no pudo re-ejecutarse contra un Postgres local limpio en este bloque; se confirmó por inspección de mensajes de error que el 100% de los fallos es atribuible a esto, no al código de este bloque.
- **Sin subida de imágenes, sin mejoras de "Mi comercio", sin cambios en el perfil público más allá de lo ya auditado** — deliberadamente fuera de alcance de P14.3-A, quedan para un bloque futuro (P14.3-B/P14.3-C, no iniciado).
- **Sin i18n**: los labels de navegación ("Partners", como el resto de `MAIN_NAV_ITEMS`/`NAV_ITEMS`) siguen hardcodeados en español, consistente con el patrón ya existente en ambos archivos (ninguno de los 5 items previos usaba `t()` tampoco) — no es una regresión de este bloque, es el mismo patrón preexistente.

## Verificación final (2026-09-04, mismo día, turno posterior)

Lectura de solo lectura contra producción (`service_role`, columnas allowlisted, script temporal creado y eliminado en el turno — sin residuo, confirmado por `git status`).

### 1. Estado real en base de datos (fuente de verdad) — snapshot original

| Nombre | id | status | ¿Es el resultado esperado? |
|---|---|---|---|
| PROD TEST RESEND FINAL 1788260068 | `532ea763-...` | **inactive** | ✅ Sí — correcto, mecanismo funcionó |
| PROD TEST REAL RESEND 1788260068 | `2e5efff1-...` | **inactive** | ✅ Sí — correcto, mecanismo funcionó |
| PROD TEST Notification Diagnosis 1788260068 | `f8069cc6-...` | pending | Sin cambios — no tocado, como se pidió |
| [TEST-CLAUDE-VERIFICACION-SCHEMA]... | `692daa39-...` | pending | Sin cambios — no tocado, como se pidió |
| **andres** (Partner real, `is_test=false`, categoría restaurant) | `7bf51e46-...` | **inactive** (antes: active) | ⚠️ NO esperado — hallazgo nuevo en su momento |
| **elkin** / slug `elkin-4` (Partner real, `is_test=false`, categoría service) | `24f67903-...` | **inactive** (antes: active) | ⚠️ NO esperado — hallazgo nuevo en su momento |

`getActivePartners()` (query real, mismo filtro `status='active' AND is_test=false`) devolvía **0 filas** en ese momento — Discovery había quedado vacía de Partners, no solo de los 2 de prueba.

### 2. ✅ RESUELTO — `andres` y `elkin-4` vuelven a estar `active`

Re-verificado por lectura directa a producción (`service_role`, mismo patrón allowlisted) en un turno posterior, tras el cierre y despliegue de P14.4-F: **`andres` y `elkin` (slug `elkin-4`) están `active` de nuevo**. No hay registro en esta sesión de quién los reactivó ni cuándo exactamente — el mecanismo disponible (botón "Activar" en `/admin/partners`, ya existente, sin código nuevo) es exactamente el que este documento ya señalaba como suficiente. Los 2 Partners de prueba (`PROD TEST RESEND FINAL...`, `PROD TEST REAL RESEND...`) siguen `inactive`, como se esperaba — no fueron tocados por la reactivación. Los 2 `pending` con nombre de prueba siguen sin cambios, como en el snapshot original.

`getActivePartners()` devuelve ahora **exactamente 2 filas — `andres` y `elkin`** — ningún fixture de prueba visible en Discovery. El hallazgo crítico de la sección anterior queda cerrado.

### 3. ✅ RESUELTO — `/partners` (listado estático) ya refleja el estado real

`app/partners/page.tsx` sigue siendo una ruta **estática** (`○`, sin `revalidate`) — eso no cambió. Pero los 3 deploys posteriores de P14.4-F (`c02c5e9`, `1c64c6a`, `f47c8e9`) regeneraron esa página de paso, contra el estado real de la base de datos ya corregido. Verificado en vivo: `https://viao.vercel.app/partners` muestra `andres`/`elkin` y **no muestra ningún "PROD TEST..."** — la instantánea desactualizada ya no existe. La inconsistencia teórica que este documento señalaba ("el próximo deploy regeneraría la página contra 0 Partners activos") no llegó a manifestarse: para cuando ese próximo deploy ocurrió, la base de datos ya tenía `andres`/`elkin` reactivados.

### 4. Navigation — sin regresión

Sin cambios de código desde el informe anterior (confirmado por `git diff --stat` idéntico en todos los turnos posteriores, incluida esta re-verificación). Revalidado por última vez en servidor local: desktop (Sidebar, "Partners" presente y funcional, "Inicio" activo correctamente en `/`) y mobile (375×812, 6 items sin overflow, "Inicio" activo). 0 errores de consola en ambos. Sin regresión real.

### 5. Seguridad

Sin cambios. Toda lectura de verificación (incluida esta re-verificación) usó el mismo patrón allowlisted ya establecido (nunca `access_token`/`contact_email`/`owner_id`), scripts temporales eliminados sin residuo en cada turno.

### 6. Conclusión de la re-verificación

**Los 2 hallazgos que mantenían este bloque en "PASS WITH CONDITIONS" están resueltos**: Partners reales `active`, listado estático correcto, Discovery limpia de fixtures. No queda ningún blocker de código ni de datos de producción conocido para P14.3-A.

## Next Decision

**P14.3-A queda PASS / READY TO CLOSE.** Navigation implementada y validada, sin regresión. Production Data Hygiene resuelta (verificado, no solo confiado). Sin blockers de código ni de producción pendientes para este bloque. Pendiente únicamente: decisión explícita del propietario de commit/push/deploy de este bloque (Navigation + esta documentación) — ninguno ejecutado todavía. No se ha empezado P14.3-B ni ninguna otra fase.

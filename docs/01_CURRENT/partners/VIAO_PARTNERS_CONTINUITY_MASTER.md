---
STATUS: CURRENT
ERA: Partners Two-Sided Ecosystem (post-PB7, bloques UX-9 → UX-12 + F3.5 completada)
DOMAIN: Partners
AUTHORITY: Documento de continuidad operativa entre sesiones para el desarrollo de Partners como ecosistema de dos lados (Usuario + Comercio). NO es un Decision Lock — donde repite una decisión LOCKED, la fuente original (`docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`) sigue siendo la autoridad. NO tiene precedencia sobre código+migraciones+tests (`docs/00_GOVERNANCE.md`, principio 1).
SUPERSEDES: — (no deroga formalmente ningún documento)
SUPERSEDED BY: —
LAST REVIEWED: 2026-09-01 (§19 nueva — PARTNER APPROVAL V1, producción; §2/§14/§15/§17/cierre actualizados puntualmente, resto sin cambios)
---

# VIAO — MASTER CONTEXT & PARTNERS ROADMAP

## 0. Cómo usar este documento

Abre este documento al empezar cualquier chat nuevo sobre Partners, antes de auditar o implementar nada. Te dice exactamente en qué fase está el proyecto, qué ya existe (con evidencia, no supuestos), qué es lo siguiente, y qué reglas de disciplina no se pueden saltar.

**Relación con otros documentos**: `docs/01_CURRENT/partners/VIAO_PARTNERS_IMPLEMENTATION_STATUS.md` cubre con precisión PB0→PB7 (fundación técnica) pero no lo construido después (UX-9 en adelante). `docs/VIAO_MASTER_CONTEXT_V1.md` cubre la continuidad de todo VIAO (Travel decommission, Core Loop general). `docs/VIAO_PARTNERS_MASTER.md` y `VIAO_PARTNERS_MASTER_V2.md` son hipótesis de producto pre-implementación, útiles para fases futuras (F4-F9) pero superadas donde el código real decidió distinto. **Jerarquía: código+migraciones+tests > Decision Locks > este documento > resto de docs de Partners.**

---

## 1. Visión

> VIAO no es simplemente una app donde los usuarios acumulan Points.
> VIAO es una red donde los usuarios descubren comercios, reciben incentivos por interactuar con ellos, y los comercios pueden medir el valor que VIAO les genera.

Ecosistema de **dos lados**: Usuario (descubre → interactúa → gana Points → progresa → obtiene Rewards → vuelve) y Partner/Comercio (se registra → completa su perfil → aparece en VIAO → recibe usuarios → genera actividad → mide resultados → obtiene valor → permanece en VIAO).

---

## 2. Estado actual

**VIAO V1/Beta.** Core (Auth, Home, Goals, Missions, Wallet, Rewards, Profile) implementado y estable. Partners evolucionó de infraestructura invisible (pre-UX-9) a ecosistema de dos lados con Discovery, Profile público, Registration, Dashboard, y Self-Service — **completado hasta F3 inclusive** (ver §13). **Actualizado 2026-09-01 (ver §19)**: PARTNER APPROVAL V1 (P2 del `VIAO_PARTNERS_MASTER_ROADMAP.md`) y el bloque UX Pro Max V2 ya están commiteados, pusheados y desplegados; P2 está además activado y validado E2E en producción. Con esto, **1 Partner real ya está `active`** (`elkin`) — deja de ser exacto decir "0 Partners reales" sin matiz, aunque sigue sin haber comercios reales curados más allá de ese caso y el Partner de test dedicado al E2E. La fuente de verdad detallada fase-por-fase (P0-P15) es ahora `VIAO_PARTNERS_MASTER_ROADMAP.md`, no este párrafo.

---

## 3. Arquitectura

**Actualizado 2026-08-31 (Commerce Identity, UX-16.3) — supersesión parcial, ver nota al final de esta sección.** Dos mecanismos de identidad **siguen paralelos y separados**, pero ya no son mutuamente excluyentes:

- **Usuario**: Supabase Auth + `profiles` (`auth.getUser()`, sesión de cookies).
- **Partner**: `access_token` opaco (UUID) — sigue siendo el mecanismo de acceso permanente al Dashboard/Ops (P7, sin cambios). Adicionalmente, desde UX-16.3, `partners.owner_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL` permite vincular, de forma opcional y explícita (`link_partner_owner()` RPC, `SECURITY DEFINER`), una sesión real de Usuario al Commerce — sin crear un rol nuevo sobre `profiles`, sin unificar Auth, sin contraseña propia de Partner. Un Partner sin vincular sigue funcionando exactamente igual que antes (por `access_token` solo).

Esto permite ambas experiencias en el mismo ecosistema **sin roles unificados** — una misma cuenta Auth puede tener 0, 1 o varios Commerce vinculados (`owner_id` sin `UNIQUE`), pero `profiles` no gana ninguna columna de "rol Partner". Escritura de `partners` sigue Patrón B puro: RLS activa, cero policies de cliente para columnas sensibles, todo pasa por `service_role` (Server Actions/funciones dedicadas) salvo `owner_id`/nombre-categoría-etc. ya cubiertos por policies explícitas de `authenticated` con exclusión de columnas — verificado con tests que intentan *smuggling* de campos sensibles (ver §13, F3, y los 18 tests de `link-partner-owner.test.ts`).

**Nota de gobernanza** (`docs/00_GOVERNANCE.md` principio 9): la frase original de esta sección ("sin `auth.users`, sin `profiles`") describía correctamente el estado hasta UX-16.3 y queda aquí superada solo en ese punto concreto — el resto de la arquitectura (Discovery, Self-Service, RPC económico, kill-switches) no cambia. Ver §18 para el detalle completo de Commerce Identity y los bloques UX-17.1/UX-17.2 que se apoyan en ella.

Economía: `complete_partner_activity()` (RPC, `SECURITY DEFINER`, `service_role`-only) calcula Points = `importe_declarado × tasa` (1 Point/€ vía QR, 2 Points/€ vía Reserva), con kill-switch diario (P3, máx. 2 Actividades/usuario/Partner/día) y kill-switch mensual (P4, pool 3.000 Points/mes, independiente de Missions/Rewards) — ambos probados bajo **concurrencia real** (Promise.all, no mockeada).

---

## 4. Usuario

```
Descubre Partner
   ↓
Ve Profile
   ↓
Interactúa
   ↓
Gana Points
   ↓
Progresa
   ↓
Obtiene Reward
   ↓
Vuelve
```

Entradas reales a Discovery: teaser en Home (siempre visible, con o sin sesión), CTA "Ver Partners" en Missions, `partnerName` visible en Rewards. Sin pestaña fija de navegación (ver §12 del roadmap anterior / Decision Lock §11).

---

## 5. Partner

```
Se registra
   ↓
Completa perfil
   ↓
Aparece en VIAO
   ↓
Usuarios lo descubren
   ↓
Genera actividad
   ↓
Consigue clientes
   ↓
Clientes vuelven
   ↓
Mide valor
   ↓
Permanece en VIAO
```

| Pieza | Estado | Evidencia |
|---|---|---|
| Registro (solicitud pública) | ✅ Existe | `/partners/join`, `lib/partners/request-partner-registration.ts` — crea `status:'pending'` |
| Aprobación | 🟡 Existe, 100% manual | Supabase Studio, sin UI de revisión (deliberado) |
| Discovery pública | ✅ Existe | `/partners`, solo `active`+`is_test=false` |
| Profile público | ✅ Existe | `/partners/[slug]` |
| Activity (QR/Reserva) | ✅ Existe | `/partners/ops/[accessToken]`, RPC probado bajo concurrencia |
| Dashboard (lectura) | ✅ Existe | `/partners/dashboard/[accessToken]` |
| Self-Service (edición) | ✅ **Existe (UX-12)** | "Mi comercio" en el Dashboard — nombre/categoría/descripción/teléfono/dirección/imagen(URL) |
| Imágenes reales (Storage) | ❌ No existe | `image_url` sigue siendo texto libre |
| Horario / web / redes | ❌ No existe | Ninguna columna |
| Oferta estructurada | ❌ No existe | Tasa €→Points sigue fija en SQL, no configurable |
| QR | ❌ No existe | — |

---

## 6. Dashboard

Métricas ya disponibles para el Partner: clientes nuevos, clientes recurrentes, ventas declaradas, ventas confirmadas, actividad reciente, **y ahora vistas de perfil (`profileViews`, UX-12)**. Agrupado en 3 bloques visuales: Visibilidad → Clientes → Ventas (orden de embudo, deliberado).

**No confundir**: *Profile View* (alguien abrió `/partners/[slug]`) ≠ *visita física al comercio* (requiere atribución física, Fase 6/QR, todavía no existe).

---

## 7. Métricas

| Métrica | Estado |
|---|---|
| Partner aparece en Discovery | ✅ EXISTE |
| Profile View | ✅ EXISTE |
| Activity | ✅ EXISTE |
| Points generados | ✅ EXISTE |
| Clientes nuevos | ✅ EXISTE |
| Clientes recurrentes | ✅ EXISTE |
| Ventas declaradas | ✅ EXISTE |
| Ventas confirmadas | ✅ EXISTE |
| Visita física atribuida | 🔒 FUTURO |
| Visita mediante QR | 🔒 FUTURO |
| Repetición atribuida | 🔒 FUTURO |
| Conversión completa (Profile→Activity mostrada) | 🟡 Calculable, no mostrada todavía |
| ROI Partner | 🔒 FUTURO |

**Profile View ≠ visita física** — es la distinción más importante de este documento: VIAO puede demostrar hoy que alguien vio el comercio, no todavía que llegó a él.

---

## 8. Funnel

```
IMPRESIÓN/DESCUBRIMIENTO → PROFILE VIEW → ACTIVITY → POINTS → VISITA ATRIBUIDA → REPETICIÓN
        ✅                      ✅            ✅         ✅          🔒               🟡
```

Discovery y Profile: existen visualmente. Profile View analytics: existe (UX-12). Activity y Points: existen, probados. QR attribution: no existe. Recurrencia: parcialmente medible (`clientesRecurrentes` cuenta ≥2 Activities; no resaltada por Partner concreto todavía).

---

## 9. Flywheel

```
PARTNERS → VISIBILIDAD → DESCUBRIMIENTO → PERFIL → ACTIVIDAD → POINTS
   → REWARDS → RECURRENCIA → MÁS VALOR PARA EL PARTNER → MÁS PARTNERS
   → MÁS OFERTA PARA LOS USUARIOS → MÁS USUARIOS ↺
```

```
Más Partners → Más oferta → Más utilidad para usuarios → Más usuarios
   → Más actividad → Más valor para Partners → Más Partners ↺
```

**Escalera de valor comercial para el Partner** (dónde está VIAO hoy en cada nivel):

| Nivel | Mensaje | Estado |
|---|---|---|
| 1 | "Tu comercio aparece en VIAO." | ✅ |
| 2 | "Los usuarios ven tu perfil." | ✅ |
| 3 | "Usuarios interactúan contigo." | ✅ |
| 4 | "Puedes ver clientes nuevos y recurrentes." | ✅ |
| 5 | "Puedes ver cuántas personas descubren tu comercio." | ✅ (UX-12) |
| 6 | "Puedes saber cuántas visitas llegaron mediante VIAO." | 🔒 FUTURO (F6/QR) |
| 7 | "Puedes saber cuántos usuarios vuelven." | 🟡 Parcial (F7-F8) |
| 8 | "Puedes medir el valor/ROI generado por VIAO." | 🔒 FUTURO (F9) |

VIAO está hoy consolidado en el nivel 5, con base real para venderlo — la propuesta comercial ya puede decir "puedes ver cuántos usuarios descubren tu negocio, interactúan contigo, y qué actividad generas", no solo "te ponemos en una app".

---

## 10. Roadmap

```
F0 — CORE VIAO                          ✅ COMPLETADO
F1 — PARTNER FOUNDATION                 ✅ COMPLETADO / OPERATIVO
F2 — PARTNER MEASUREMENT                ✅ COMPLETADO
F3 — PARTNER SELF-SERVICE C1            ✅ COMPLETADO
F3.5 — ANALYTICS STABILITY              ✅ COMPLETADO
F4 — PARTNER SELF-SERVICE C2            🔒 FUTURO (siguiente candidata, NO autorizada)
F5 — PARTNER OFFER                      🔒 FUTURO
F6 — QR + ATRIBUCIÓN FÍSICA             🔒 FUTURO
F7 — PARTNER DISCOVERY SCALE            🔒 FUTURO
F8 — RETENTION                          🔒 FUTURO
F9 — MONETIZATION                       🔒 FUTURO
```

### F4 — Partner Self-Service C2 (futuro)
Subida real de imágenes, Storage, logo, galería futura, horario, web, redes sociales. Storage ya existe en VIAO (`20260817160000_create_storage_buckets.sql` y siguientes) pero con credencial `auth.uid()` — **requiere auditoría de seguridad propia** antes de codificar nada: el Partner usa `access_token`, no `auth.uid()`, así que las políticas de Storage actuales **no se pueden asumir reutilizables directamente**.

### F5 — Partner Offer (futuro)
Que el Partner explique "qué puede hacer el usuario aquí y qué beneficio obtiene" — **sin** permitir todavía que el Partner defina libremente "50 Points por comprar X" (cambiaría el modelo económico actual, LOCKED: Points = importe × tasa). Requiere una nueva auditoría económica antes de cualquier oferta configurable.

### F6 — QR + Atribución física (futuro)
```
Usuario → llega al comercio → escanea QR VIAO → identifica Partner
   → actividad atribuida → Points → métrica Partner
```
Métricas futuras: usuarios que llegan por QR, primera visita, visitas recurrentes, actividades, Points generados, conversión, recurrencia. Arquitectónicamente soportable sin reescritura (`slug`+`access_token` ya son identificadores independientes), pero no implementado.

### F7 — Discovery Scale (futuro)
~10 Partners: estado actual sin cambios. ~50: categorías/búsqueda/destacados, revisar navegación. ~500: paginación obligatoria (`getActivePartners()` hoy trae todo sin límite — cuello de botella real a esa escala), geolocalización, favoritos.

### F8 — Retention (futuro)
Favoritos, promociones, multiplicadores, notificaciones, campañas — cero código, cero justificación de negocio todavía. Solo con evidencia real de uso.

### F9 — Monetization (futuro)
`VIAO genera usuarios → usuarios generan actividad → Partner ve resultados → Partner percibe ROI → Partner paga`. Nada en el schema bloquea esto. Sin billing todavía.

---

## 10.1 F3.5 — ANALYTICS STABILITY — ✅ COMPLETADO

**Problema encontrado** (durante la verificación de UX-12, no relacionado con Partners en sí): `calculateConversionMetrics()` y el resto de funciones de `lib/analytics/metrics.ts` paginaban `analytics_events` vía `.range(from, to)` **sin ningún `.order()`** precedente.

**Causa**: PostgreSQL/PostgREST no garantiza un orden estable entre llamadas `SELECT` sucesivas sobre una tabla sin una cláusula `ORDER BY` determinista — a medida que la tabla crece, el plan de ejecución puede variar entre páginas, produciendo filas perdidas o duplicadas al paginar por rango. Con `analytics_events` en 233.198+ filas reales (acumuladas durante esta sesión), el bug pasó de latente a reproducible: 2 tests fallaban de forma consistente.

**Solución aplicada**: se añadió `.order("id", { ascending: true })` justo antes de cada `.range(from, to)`, en los 4 puntos donde `fetchAllRows()` se invoca: `countRegisteredUsers()`, `calculateActivationMetrics()`, `calculateConversionMetrics()`, `calculateRetentionMetrics()`. `id` es la PK (`uuid`, ya indexada por defecto), única y estable por fila — a diferencia de `created_at`, que puede repetirse entre filas del mismo `INSERT` masivo (como el propio test de paginación, que inserta en lotes de 500). Ningún índice nuevo fue necesario (la PK ya cubre el `ORDER BY`). Cambio acotado a `lib/analytics/metrics.ts` — sin migración, sin tocar `analytics_events`, sin cambiar contratos públicos ni la lógica de cálculo.

**Archivos modificados**: únicamente `lib/analytics/metrics.ts` (4 ediciones + 1 comentario explicativo). Confirmado por diff audit — ningún otro archivo tocado.

**Verificación de determinismo**: `lib/analytics/metrics.test.ts` ejecutado de forma aislada 3 veces consecutivas — **7/7 tests pass en las 3 ejecuciones**, incluidos los 2 que fallaban antes del fix (`"Paginación real..."`, `"Caso H..."`). Sin flakiness.

**Suite completa**: `817 tests · 813 pass · 0 fail · 4 skipped` (antes: 811 pass, 2 fail — ambos ahora corregidos, +2 exactos, sin ningún fallo nuevo). `tsc`/`lint`/`build` en verde.

**Observación residual, no accionada** (fuera de alcance de F3.5, documentada para un futuro bloque si se considera necesario): con el `ORDER BY id` añadido, "Paginación real" y "Caso H" pasaron de ~12s/~10s a 45-60s cada uno — `calculateConversionMetrics()` sigue leyendo la tabla **completa** sin filtrar por `event_name` antes de paginar, y a 233K+ filas eso ya es una cantidad de trabajo notable incluso con índice. No se ha optimizado (explícitamente fuera del alcance autorizado de F3.5 — "no sobreoptimices"). Candidata razonable para revisar si esta función se vuelve un cuello de botella real en el futuro.

---

## 11. Decision Locks

- VIAO no vuelve a Travel como core.
- Partners es parte central del producto (Core Loop, no directorio aislado).
- Points no son dinero.
- No crear token/blockchain ahora.
- No crear roles Partner sobre `profiles` — mantener Usuario(Auth)/Partner(`access_token`) separados.
- Mantener `access_token` como mecanismo único de acceso Partner (P7).
- No romper el RPC económico (`complete_partner_activity()`) ni sus kill-switches (P1-P6).
- No crear Points fijos por oferta sin nueva auditoría económica explícita.
- No construir QR todavía.
- No construir favoritos todavía.
- No construir notificaciones todavía.
- No construir promociones/multiplicadores todavía.
- No construir CRM todavía.
- No construir billing todavía.
- No asumir que las políticas de Storage existentes son reutilizables para Partners sin auditoría (F4).

---

## 12. Checklist

### Antes de empezar una fase
- [ ] Leer este Master Context.
- [ ] Leer el último audit/informe de la fase anterior.
- [ ] Confirmar fase actual (§14).
- [ ] Confirmar alcance permitido y fuera de alcance.
- [ ] Confirmar estado Git (`git status --short`).

### Durante
- [ ] No tocar funcionalidades fuera de alcance.
- [ ] No implementar fases futuras.
- [ ] Mantener los Decision Locks (§11).

### Al terminar
- [ ] Tests.
- [ ] Typecheck.
- [ ] Lint.
- [ ] Build.
- [ ] Verificación real (navegador, cuando aplique).
- [ ] Diff audit (nada fuera de alcance).
- [ ] Documentar cambios y problemas encontrados.
- [ ] Actualizar este Master Roadmap.
- [ ] Cerrar fase.
- [ ] Definir siguiente fase — sin autorizarla automáticamente.

---

## 13. Fases completadas

### F0 — Core VIAO — ✅ COMPLETADO
Auth, Home, Goals, Missions, Wallet, Rewards, Profile, ledger de Points, RLS, tests. Ver `docs/VIAO_MASTER_CONTEXT_V1.md`.

### F1 — Partner Foundation — ✅ COMPLETADO / OPERATIVO
Tabla `partners` (con `category`/`status`/`image_url`/`description`/`is_test`), registro público (`pending`), aprobación manual, `access_token`, Discovery, Profile, Activity (`partner_activities`+RPC, kill-switches probados bajo concurrencia real), Dashboard con clientes/ventas/actividad.

### F2 — Partner Measurement — ✅ COMPLETADO (UX-12)
`partner_profile_viewed`: nueva entrada en la taxonomía cerrada de `analytics_events` (migración aditiva `20260831090000_*.sql`), tipo TypeScript en `lib/analytics/events.ts`, emisión real desde `/partners/[slug]` (solo para Partner resuelto, nunca en 404), metadata `{ partnerId, slug }`, funciona con usuarios autenticados y visitantes anónimos (mismo mecanismo ya existente de `logAnalyticsEvent`), aparece en Dashboard como `profileViews`.

### F3 — Partner Self-Service C1 — ✅ COMPLETADO (UX-12)
El Partner edita **nombre, categoría, descripción, teléfono, dirección, imagen (URL)** vía su `access_token`, desde "Mi comercio" en el Dashboard (`lib/partners/get-partner-for-editing.ts` + `update-partner-profile.ts`). **No puede modificar**: `status`, `access_token`, `is_test`, `slug`, `id` — allowlist verificado con tests que intentan *smuggling* explícito de esos campos. Sin roles nuevos, sin Supabase Auth para Partners, sin tocar el RPC económico.

### Resultado de UX-12 (registro exacto)
```
TypeScript:              PASS (0 errores)
Lint:                    PASS (0 errores/warnings)
Build:                   PASS (mismas 17 rutas, sin rutas nuevas)
Verificación end-to-end: PASS (navegador real, base local: vista → contador →
                          edición → guardado → persistencia → aislamiento)
Tests propios de UX-12:  PASS (15/15 — 5 get-partner-for-editing,
                          7 update-partner-profile, 2 get-partner-dashboard
                          nuevos, 1 taxonomía)
Suite completa:          817 tests / 811 pass / 2 fail / 4 skipped
```
**Los 2 fallos eran preexistentes, en `lib/analytics/metrics.test.ts`** (archivo no tocado en UX-12). Causa: `calculateConversionMetrics()` usaba `.range()` sobre `analytics_events` sin `.order()` — no determinista a la escala actual (233.198 filas). **No atribuibles a UX-12** — confirmado por aritmética: de los 802 tests previos a UX-12, 798 pasaban; 796 de esos mismos 802 seguían pasando (2 nuevos fallos, ninguno en código de Partners), y los 15 tests nuevos de UX-12 pasaban el 100%. Este hallazgo se convirtió en **F3.5** (§10.1) — **completada en el bloque siguiente, ver §10.1**.

### F3.5 — Analytics Stability — ✅ COMPLETADO
Ver §10.1 para el detalle completo (problema, causa, solución, archivos, verificación). Resultado final: `817 tests · 813 pass · 0 fail · 4 skipped`, determinismo confirmado con 3 ejecuciones aisladas consecutivas del archivo afectado.

---

## 14. Fase actual

```
CURRENT PHASE:
Ninguna en curso — PARTNER APPROVAL V1 (P2) cerrado y activado en producción (§19). Esperando
autorización explícita para P10 — Admin Partners V1 (ya auditado, READY, ver el informe de esa
auditoría técnica+UX dedicada).

LAST COMPLETED:
PARTNER APPROVAL V1 (P2) — commiteado (`56a414e`), desplegado, y activado/validado E2E en
producción (§19). También commiteado y desplegado desde el mismo punto de partida: UX Pro Max V2
/ Bloque B (`18867a2`, relevante para P9 — validación visual todavía pendiente).
```

---

## 15. Próxima fase

```
NEXT AUTHORIZED WORK:
NINGUNO TODAVÍA

NEXT RECOMMENDED (auditoría de continuidad post-P2, 2026-09-01 — ver VIAO_PARTNERS_MASTER_ROADMAP.md):
P10 — Admin Partners V1: única fricción operativa real hoy (set_partner_status() solo invocable
vía llamada REST manual autenticada, sin UI). Auditoría técnica + UX dedicada ya entregada
(veredicto: READY), sin autorizar implementación todavía.

Detrás, sin orden de prioridad implícito y sin relación de bloqueo con P10:
UX-13 — Self-Service C2 (imágenes/Storage) + campo "oferta" (texto libre)
P13 — Security Hardening (GRANT audit), bloque independiente, ver §19.3
V3 — Partner Engagement (tráfico → interacción → recurrencia → valor comercial), roadmap futuro, NO implementado (ver §18.4)
```

**NO implementado.** Requiere autorización explícita en su propio turno, igual que cualquier otra fase — y, dado el Decision Lock §11, requiere auditar primero si las políticas de Storage existentes (pensadas para `auth.uid()`) son reutilizables para `access_token` antes de escribir ningún código.

---

## 16. Features NOT NOW

**Actualizado 2026-08-31**: "Partner Auth unificada / pantalla '¿Cómo quieres entrar?'" queda retirada de esta lista — Commerce Identity (UX-16.3) y el routing `intent=partner`+`accessToken` (UX-17.1) ya resuelven esto, pero **sin** unificar Auth ni crear esa pantalla explícita: es vinculación opcional vía `owner_id`, no una pantalla nueva de elección de identidad. Ver §18.

```
DO NOT BUILD:
F4+ (Self-Service C2 / Storage)
QR
Favorites
Notifications
Promotions
Billing
Blockchain / Token
CRM
Roles sobre profiles
Navegación principal para Partners (Sidebar/MainNav siguen sin ítem Partner — solo existe un CTA discreto en Login/Register/Profile, UX-17.2, sin nuevo umbral cumplido)
Geolocalización
Reviews
Panel administrativo para revisar/aprobar/rechazar solicitudes Partner (decisión reafirmada explícitamente en el V2 Release Checkpoint, 2026-08-31 — ver §18: el ciclo completo ya funciona vía Supabase Studio, construir un panel exigiría además inventar un mecanismo de autenticación de administrador inexistente hoy)
```

---

## 17. Reglas de trabajo entre chats

- Cada conversación nueva debe empezar leyendo este documento y el último informe de la fase anterior.
- **ROADMAP ≠ AUTORIZACIÓN DE IMPLEMENTACIÓN.** Que una funcionalidad aparezca en el roadmap (§10) no significa que esté autorizada — cada fase necesita autorización explícita, en su propio turno.
- **UNA FASE = UN OBJETIVO PRINCIPAL.** No mezclar en una misma implementación: QR + Favorites + Notifications + Promotions + Billing + CRM + Blockchain + navegación + nuevas economías de Points.
- Una fase no se cierra hasta tener implementación, tests, build y verificación (cuando el tipo de bloque lo requiera — un bloque de auditoría/documentación no necesita las 4).
- Si un bloque nuevo asume un estado que el código real contradice, corregirlo explícitamente antes de continuar — nunca ejecutar sobre una premisa obsoleta (ver la corrección de F2/F3 hecha en la revisión anterior de este mismo documento).
- Ante cualquier diferencia entre este documento y el código real, **el código real gana** — y la diferencia se documenta, nunca se oculta.

---

## 16.1 RELEASE BASELINE — 2026-08-31

UX-12 y F3.5 quedaron consolidadas en un único commit de checkpoint (incluía además, del mismo working tree acumulado, el Travel Legacy Purge, el Core Reset y el Premium Design System — todo trabajo real y ya reportado en bloques anteriores de esta sesión, nunca commiteado hasta este punto):

```
Commit:  c809584 — "feat: complete travel-to-partners core reset and partners v2 ecosystem"
Push:    origin/main (517088c..c809584), working tree clean
Vercel:  dpl_Gf25caNUTRw7BgxnDubMFyNvyUr9, target production, Ready (~35-39s build)
         Alias: https://viao.vercel.app
Tests:   817 · 813 pass · 0 fail · 4 skipped (re-confirmado en frío, 2 ejecuciones separadas)
tsc/lint/build: PASS
```

**Verificación de esquema de producción — RESUELTA.** En un primer intento de smoke test, `/partners` y `/partners/[slug]` en producción mostraban estados vacíos indistinguibles entre "sin Partners reales" y "columna inexistente" (`getActivePartners()`/`getPartnerBySlug()` capturan cualquier error de Supabase y devuelven `[]`/`undefined` — diseño deliberado, pero ambiguo para un smoke test). Se resolvió con una prueba de caja negra sin credenciales: se envió una solicitud real a través de `/partners/join` en `https://viao.vercel.app` (nombre `"[TEST-CLAUDE-VERIFICACION-SCHEMA] Ignorar y marcar inactivo"`, categoría `restaurant`, con descripción) — `requestPartnerRegistration()` inserta siempre `is_test: false` y la `description` proporcionada de forma hardcodeada, así que un fallo de columna faltante habría producido un error visible, no un falso positivo. **La solicitud se completó con éxito** ("Solicitud recibida") — confirma que `partners.is_test`, `partners.description` y el CHECK de `category` ya están sincronizados en producción.

**Pendiente de verificación real en producción** (no bloqueante para este baseline, pero sin cobertura todavía): Partner Dashboard, `profileViews`, la sección "Mi comercio" (Self-Service C1: editar nombre/categoría/descripción/teléfono/dirección/imagen y persistencia tras recargar), y la emisión de `partner_profile_viewed` — todos requieren un Partner `active` real en producción con su `access_token`, y quien esto escribe no tiene (ni debe fabricar) credenciales `service_role` de producción. Existe ahora mismo una fila real y segura para ese propósito: la solicitud `pending` creada arriba — aprobarla a `active` (Supabase Studio) y compartir su `access_token` permitiría cerrar esta cobertura sin crear una fila nueva. Alternativa: dar por válida la verificación exhaustiva ya hecha contra Supabase local (misma base de código, mismo esquema) como suficiente evidencia funcional, dejando la confirmación en producción para cuando exista el primer Partner real aprobado.

---

## 17. Partner Onboarding Beta — Runbook Operativo

Estado: proceso mayoritariamente manual, deliberado para el volumen actual (L3, "Onboarding manual/curado", `VIAO_PARTNERS_MASTER_V2.md` §21) — no un sustituto de un futuro Partner Ops con código, solo el procedimiento real hoy. Confirmado contra código real (`request-partner-registration.ts`, `resolve-partner-access.ts`, schema de `partners`) en la auditoría UX-12/F3.5/Partner Operational Flow (2026-08-31).

**Actualizado (PARTNER APPROVAL V1)**: el paso 4 de este Runbook ("editar `status` directamente en Supabase Studio") **dejó de funcionar** en cuanto `protect_partners_immutable_fields()` empezó a proteger también `owner_id`/`access_token`/`is_test` (UX-16.3, 2026-08-31) — el trigger bloqueaba cualquier `UPDATE` de `status`, sin ninguna excepción, para cualquier rol, incluida la propia conexión de Studio. Confirmado empíricamente (no solo por lectura de código): un intento real de cambiar `status` desde Studio devolvió `ERROR: P0001: partners_immutable_field_change`. Corregido en este bloque con un RPC dedicado (`set_partner_status()`) — ver el paso 4 actualizado. **Localizar y revisar una solicitud (pasos 1-3) sigue haciéndose en Supabase Studio sin cambios** — solo el paso de aprobación en sí cambia de mecanismo.

### 1. Nueva solicitud

Un comercio completa `/partners/join` → `PartnerJoinForm` → `submitPartnerRegistrationAction` → `requestPartnerRegistration()` → INSERT en `partners` con `status: "pending"`, `is_test: false` (ambos hardcodeados, no manipulables desde el formulario), `access_token` autogenerado (`gen_random_uuid()`, ya presente desde este momento aunque todavía inerte), `slug` derivado del nombre con resolución automática de colisiones, y los campos que el comercio rellenó (`name`, `category`, `description`, `address`, `contact_email`, `contact_phone`, `image_url` — todos opcionales salvo nombre y categoría).

**Actualizado (Partner Application Notification V1)**: en cuanto el INSERT se confirma, `requestPartnerRegistration()` envía dos emails best-effort (nunca bloquean ni invalidan la solicitud ya creada): la confirmación al comercio de siempre (Email V2, si dejó `contact_email`), y **un aviso a `PARTNER_NOTIFICATION_EMAIL`** con nombre/categoría/descripción/dirección/contacto/fecha de la solicitud (nunca `access_token`) — así que sí se recibe una notificación de esto, aunque solo llegue de verdad mientras `PARTNER_NOTIFICATION_EMAIL` coincida con la dirección que Resend permite entregar sin dominio propio (misma limitación ya documentada en §11.2 de `docs/00_VIAO_HANDOFF.md`).

### 2. Localizar `pending`

Abrir Supabase Studio del proyecto de producción de VIAO → tabla `partners` → filtrar `status = 'pending'`. No existe ningún filtro por defecto, ni orden por fecha preconfigurado — ordenar manualmente por `created_at` si hay varias.

### 3. Revisar el negocio

Checklist mínimo, basado únicamente en criterios ya existentes en la documentación de Partners (L3, categorías del CHECK real) — **no se inventa ningún criterio de calidad nuevo**:

- `name`: no vacío, reconocible como un negocio real (no genérico/spam).
- `category`: una de las 6 ya soportadas (`restaurant`, `experience`, `barbershop`, `gym`, `shop`, `service`).
- `description`/`address`: presentes y coherentes con un negocio real, si se rellenaron (son opcionales).
- `contact_email`/`contact_phone`: al menos uno presente para poder responder — si ambos están vacíos, no hay forma de contactar al solicitante; tratar como incidencia, no rechazar automáticamente.
- Coherencia general: ¿el conjunto de campos describe un negocio real y localizable? (mismo criterio ya usado, sin panel, para los primeros Partners piloto).

### 4. Aprobar/rechazar/reactivar/desactivar (`set_partner_status()`)

**Ya NO se edita `status` directamente en Studio — ese camino está bloqueado a propósito por el trigger, para cualquier rol, y así debe seguir.** El único mecanismo real (PARTNER APPROVAL V1, `20260901100000_add_partner_status_approval.sql`) es el RPC `public.set_partner_status(p_partner_id uuid, p_new_status text)`, invocado con una sesión real de VIAO cuyo usuario tenga `auth.users.raw_app_meta_data->>'role' = 'partner_admin'`.

Transiciones que acepta: `pending→active` (aprobación), `pending→inactive` (no aprobación — sigue sin existir el estado `rejected`, ver paso 9), `active→inactive` (baja), `inactive→active` (reactivación). Cualquier otra combinación, incluida cualquier vuelta a `pending`, es rechazada por el propio RPC.

**Cómo invocarlo hoy**: no existe ningún panel ni botón en la aplicación (decisión explícita de este bloque — ver el informe de PARTNER APPROVAL V1 para el razonamiento). El backend (RPC + `lib/partners/set-partner-status.ts` + la Server Action `setPartnerStatusAction()` en `app/partners/admin-actions.ts`) está completo, probado, **desplegado y validado E2E en producción (§19)** — funciona de verdad, no solo en teoría. Lo único que falta es una superficie de invocación sin fricción técnica: hoy el único procedimiento real es una llamada REST manual autenticada con el JWT de la sesión del `partner_admin` (ver §19.1 para el mecanismo exacto usado en la validación). Esa superficie es exactamente el alcance de **P10 — Admin Partners V1** (ver `VIAO_PARTNERS_MASTER_ROADMAP.md`), ya auditado (READY) y pendiente de autorización de implementación.

**Por qué no vale usar el SQL Editor de Supabase Studio como atajo**: el RPC resuelve `auth.uid()` internamente como única fuente de autorización — el SQL Editor de Studio se conecta directamente a Postgres, sin pasar por una sesión de Supabase Auth con JWT, así que `auth.uid()` siempre es `NULL` ahí y el RPC rechaza la llamada. No es un fallo — es la misma garantía de seguridad que impide que cualquier acceso directo a la base de datos se salte la comprobación de `partner_admin`.

### 5. Obtener acceso

En la misma fila, copiar el valor de `access_token`. **Verificar dos veces que el token pertenece exactamente al Partner que se está aprobando** (comparar `id`/`name`/`slug` de la fila con el token copiado) antes de comunicarlo — no hay ningún mecanismo de aplicación que lo confirme por ti.

### 6. Comunicar al Partner

**Actualizado (Email V2 + Partner Application Notification V1 + PARTNER APPROVAL V1, §19)** — el Database Webhook de producción (`app/api/webhooks/partner-status/route.ts`) **ya está configurado y validado con un E2E real** (§19.1): el paso 4 (cambiar `status` a `active`) dispara automáticamente un email de aprobación al comercio con su `access_token`/enlace al Dashboard. La plantilla manual de abajo pasa a ser el **plan de respaldo** (solo si el email de aprobación no llega, por la limitación de Resend sin dominio propio — ver §11.2 de `docs/00_VIAO_HANDOFF.md`), no el único camino:

> Hola [nombre del negocio],
>
> Tu solicitud para ser Partner de VIAO ha sido aceptada.
>
> Ya puedes gestionar tu comercio en VIAO desde tu panel:
> https://viao.vercel.app/partners/dashboard/[access_token]
>
> Desde ahí puedes ver tu actividad y editar la información de tu negocio (nombre, categoría, descripción, teléfono, dirección e imagen).
>
> Para registrar una visita o venta de un cliente, usa este otro enlace en tu comercio:
> https://viao.vercel.app/partners/ops/[access_token]
>
> Si tienes cualquier problema para acceder, respóndenos a este mismo correo.

No se inventa ningún email corporativo ni sistema de soporte — se envía desde el canal personal/de contacto que ya se esté usando hoy para gestionar Partners.

### 7. Verificación

Tras enviar el mensaje: abrir tú mismo `https://viao.vercel.app/partners/dashboard/[access_token]` con el token exacto copiado, confirmar que carga el Dashboard del Partner correcto (nombre visible coincide), y que "Mi comercio" muestra los datos ya enviados en la solicitud. Esto confirma que el enlace que se comunicó es válido antes de darlo por cerrado.

### 8. Registro operativo (sin schema nuevo)

Solución manual apropiada para Beta, sin columnas nuevas ni base de datos adicional: una hoja de cálculo simple (o cualquier medio ya en uso por VIAO) con columnas — `nombre del negocio`, `fecha de solicitud`, `estado` (recibida / aprobada / comunicada / incidencia), `fecha de comunicación`, `notas`. Es responsabilidad operativa, no una fuente de verdad técnica — `partners.status` en Supabase sigue siendo la autoridad real sobre si un Partner está activo.

### 9. Solicitudes no aprobadas

El schema real de `partners` **no tiene** un estado `rejected` — el CHECK solo admite `pending`/`active`/`inactive`. **No se crea ese estado en este bloque (PARTNER APPROVAL V1 lo reafirma explícitamente).** Convención operativa: usar `set_partner_status(partnerId, 'inactive')` desde `pending` (transición permitida por el RPC) y anotarlo en el registro operativo del paso 8 como "solicitud no aprobada" (para distinguirla, solo en el registro externo, de un futuro caso real de "Partner activo dado de baja", que llega a `inactive` por el mismo camino técnico pero parte de `active`). Dejar la fila en `pending` sin tocar sigue siendo válido si se prefiere no dejar rastro de la decisión todavía. Esta convención se abandona en cuanto exista una decisión de producto formal sobre rechazo.

### 10. Token perdido o comprometido

No existe ningún mecanismo de regeneración en la aplicación (**no implementado en este bloque, a propósito**). Si un Partner pierde su enlace o hay sospecha de que se filtró: localizar su fila en `partners` por `name`/`slug`, copiar de nuevo el `access_token` real (sigue siendo el mismo, no cambia solo) y reenviarlo. Si se sospecha compromiso real, no hay forma de invalidarlo sin editar manualmente el valor de la columna en Studio (fuera del alcance de este runbook — implicaría escribir un UUID nuevo a mano, algo que este documento no recomienda hacer sin una razón clara, dado que no hay ninguna función de aplicación que lo acompañe ni lo valide).

---

## 18. Commerce Identity & Partner Auth Entry — UX-16.x / UX-17.1 / UX-17.2 (2026-08-31)

Bloque construido y verificado en la misma sesión que el RELEASE BASELINE (§16.1), documentado aquí junto con el V2 Release Checkpoint que lo consolida y despliega.

### 18.1 Commerce Identity (UX-16.x)

`partners.owner_id uuid NULL REFERENCES profiles(id) ON DELETE SET NULL` (sin `UNIQUE` — un Usuario puede poseer varios Commerce), RLS con GRANT explícito de columnas para `authenticated` (excluye `access_token`/`contact_email`/`owner_id` de lectura directa vía `SELECT *`), trigger `protect_partners_immutable_fields()`, RPC `link_partner_owner(p_access_token uuid)` (`SECURITY DEFINER`, `UPDATE` atómico condicionado a `owner_id IS NULL`, idempotente, respuestas uniformes anti-enumeración, `search_path=''`). Chrome visual separado (`CommerceChrome`, `AppShell` sin Sidebar/MainNav en rutas `/partners/dashboard`/`/partners/ops`). Ver §3 para el detalle de arquitectura y la nota de supersesión parcial.

### 18.2 UX-17.1 — Partner Auth Entry

Resuelve que un Partner con `access_token` sin vincular pueda crear/usar su cuenta VIAO sin caer en `/onboarding`: `app/(auth)/login/page.tsx` y `app/(auth)/register/page.tsx` leen `intent=partner`+`accessToken` de la URL (`useSearchParams()` + límite `Suspense` mínimo, confirmado necesario contra la documentación real de Next.js 16.3.1) y redirigen a `/partners/dashboard/<token>` en vez de `/onboarding`/pantalla estática. El `access_token` viaja únicamente en la URL — nunca en localStorage/cookies/estado/DB nueva. 7/7 casos E2E PASS, incluida verificación en BD de la vinculación real.

### 18.3 UX-17.2 — Partner Discovery CTA

CTA discreto "¿Tienes un negocio? Únete a VIAO como Partner" (claves i18n `partners.joinTeaser`/`partners.joinTeaserCta`, ya existentes, reutilizadas sin crear ninguna nueva) en Login, Register (oculto cuando `intent=partner` ya está presente) y Profile (solo cuando `hasOwnedCommerce === false`). Home, Sidebar y MainNav sin cambios — deliberado, no un olvido (ver §16). 10/10 casos E2E PASS.

### 18.4 V2 Release Checkpoint — decisión sobre panel administrativo

Auditado explícitamente si el ciclo `solicitud → recepción → revisión → aprobación → activación → Dashboard` estaba completo. Conclusión: **sí, funciona de punta a punta hoy**, vía Supabase Studio + el Runbook Operativo (§17) — igual que documentaba ya `request-partner-registration.ts` ("deliberadamente, sin panel admin nuevo"). Construir un panel en este bloque habría exigido además inventar un mecanismo de autenticación de administrador inexistente en el proyecto (RLS de `partners` confirmado: solo `owner_id = auth.uid()`, sin ningún concepto de rol admin) — se planteó explícitamente al propietario y **se decidió no construirlo en este release**, manteniendo la decisión original. Ver también §16.

### 18.5 V2 — mapa de loops (referencia)

```
Usuario:  Goals → Points → Missions → Rewards → Partners
Partner:  Discovery → Application → Approval (manual, Supabase Studio) → Dashboard → Commerce Identity
```

**V3 — FUTURO, NO IMPLEMENTADO, solo roadmap**: `Partner → tráfico → interacción → Missions → Rewards → visitas → recurrencia → engagement → métricas → valor comercial`. Coincide conceptualmente con F6-F9 (§10) — no se abre ningún trabajo nuevo aquí, es la misma futura línea ya documentada, sin renombrar Decision Locks existentes.

---

**Fin del documento (hasta §18). Esta revisión registró el RELEASE BASELINE (commit `c809584`, push, deployment Vercel, esquema de producción verificado), la implementación real de F3.5, el Runbook Operativo de Partner Onboarding Beta (§17), Commerce Identity + UX-17.1 + UX-17.2 + el V2 Release Checkpoint (§18), incluida la decisión explícita de no construir panel administrativo en ese release — y **Partner Application Notification V1** (§17.1/§17.6: Andrés recibe aviso de cada solicitud nueva vía `PARTNER_NOTIFICATION_EMAIL`; el webhook de aprobación de Email V2 notifica al comercio automáticamente cuando está configurado en producción) — ver `docs/00_VIAO_HANDOFF.md` §11.3 para la evidencia completa. **Actualizado 2026-09-01**: Partner Application Notification V1 ya está commiteado (`14365ae`) — la frase "todavía sin commitear" de esta línea quedó obsoleta y se corrige aquí; ver §19 para el bloque cerrado inmediatamente después (PARTNER APPROVAL V1).**

**HARD STOP — V2 RELEASE CHECKPOINT — VER `docs/00_VIAO_HANDOFF.md` §21 PARA EL COMMIT/PUSH/DEPLOY EXACTOS DE ESTE BLOQUE.**

---

## 19. PARTNER APPROVAL V1 — Producción Activada (2026-09-01)

Cierra el gap que §17 paso 4 documentaba como bloqueado (`protect_partners_immutable_fields()` rechazaba cualquier `UPDATE` de `status`, para cualquier rol, incluida Supabase Studio). Auditado en diseño, implementado, testeado (17 tests, `set-partner-status.test.ts`), commiteado (`56a414e`), y en esta actualización: **activado y validado con datos reales en producción**, no solo en código.

### 19.1 Mecanismo (sin cambios respecto al diseño original)

RPC `public.set_partner_status(p_partner_id uuid, p_new_status text)` — `SECURITY DEFINER`, `search_path=''`, resuelve `auth.uid()` internamente, exige `auth.users.raw_app_meta_data->>'role' = 'partner_admin'`, valida la matriz de 4 transiciones (`pending→active`, `pending→inactive`, `active→inactive`, `inactive→active`), respuesta anti-enumeración uniforme `{"updated": boolean}`. Trigger con carve-out de doble factor (señal transaccional `set_config` + transición válida). **Sin ninguna UI que lo invoque** — el único procedimiento real hoy es una llamada REST directa y autenticada (`POST .../rest/v1/rpc/set_partner_status` con el `access_token` de sesión del `partner_admin` como `Authorization: Bearer`), documentada como el estado actual, no como receta a repetir sin criterio — ver P10.

### 19.2 Configuración de producción (verificada, no solo declarada)

| Ítem | Estado |
|---|---|
| Migración `20260901100000_add_partner_status_approval.sql` | ✅ Aplicada en producción |
| `partner_admin` (`raw_app_meta_data.role`) | ✅ Configurado en el usuario administrador real |
| `SITE_URL` (Vercel, Production) | ✅ Configurado (`https://viao.vercel.app`) |
| `PARTNER_STATUS_WEBHOOK_SECRET` (Vercel, Production) | ✅ Configurado, sincronizado con el header del Database Webhook |
| Database Webhook (`public.partners`, `UPDATE`, header `x-viao-webhook-secret`) | ✅ Configurado en Supabase |
| Endpoint `/api/webhooks/partner-status` | ✅ Verificado: `401` sin secreto, `401` con secreto incorrecto, `200` con secreto correcto |

### 19.3 Evidencia E2E real (no solo pruebas manuales del endpoint)

Sobre un Partner de test dedicado (`VIAO TEST — Webhook E2E`, `is_test=true`, `contact_email=null` — nunca sobre un Partner de negocio real): `set_partner_status(id, 'active')` desde `pending` → trigger autorizado por la señal transaccional → `UPDATE` real en `public.partners` → Database Webhook de Supabase disparado automáticamente → `pg_net` → `POST /api/webhooks/partner-status` → `HTTP 200` → `{"handled":"approved"}`. Confirmado de forma independiente en `net._http_response` de Supabase: `status_code=200, timed_out=false, error_msg=null`. Como `contact_email` era `null`, no se envió ningún email real — confirma también que esa rama condicional del webhook se comporta como el código indica.

Una primera configuración del secreto del webhook devolvió `401` (`{"error":"unauthorized"}`) antes de corregirse — quedó resuelta y re-verificada antes del E2E anterior; no se documenta el valor del secreto en ningún sitio.

Adicionalmente, un segundo Partner — `elkin`, real (no `is_test`) — completó `pending→active` por el mismo mecanismo, siendo hoy el primer Partner `active` genuino del proyecto.

**Nota diagnóstica, no un fallo**: la vista en vivo de Vercel Logs mostró inicialmente `Status: 0` para la petición automática del webhook, junto con `External APIs: Loading...` y `Response finished` en la misma entrada — investigado y descartado como fallo real: es un artefacto de esa vista (telemetría todavía poblándose), no del endpoint ni de `pg_net`. La fuente de verdad (`net._http_response`) confirmó `200` de forma independiente.

### 19.4 Qué sigue abierto (no corregido ni ampliado en este bloque)

- **P10 — Admin Partners V1**: única fricción operativa real — sin UI, la aprobación exige una llamada REST manual. Auditoría técnica+UX dedicada ya entregada (READY), sin autorizar implementación.
- **P3 — Commerce Identity**: `link_partner_owner()` sigue sin ejecutarse con una cuenta real en producción, aunque ya existe un Partner `active` real (`elkin`) sobre el que podría probarse.
- **P9 — UX Pro Max V2 / Bloque B**: commiteado y desplegado (`18867a2`), sin validación visual real confirmada en navegador tras el deploy.
- **Email de reactivación** (`inactive→active`): sin rama en el webhook, documentado como pendiente desde el diseño original, no implementado a propósito.
- **P13 — Security Hardening (GRANT audit)**: bloque completamente independiente, deliberadamente no tocado aquí ni en P2. Reconfirmado 2026-09-01 con la suite completa: 884 tests, 855 pass, 25 fail (mismo patrón exacto ya documentado), 4 skipped.

**Fin de §19. Ver `VIAO_PARTNERS_MASTER_ROADMAP.md` para el estado P0-P15 completo y la recomendación de siguiente bloque (P10).**

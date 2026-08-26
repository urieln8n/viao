---
STATUS: CURRENT
ERA: Partners/V2 (implementación, bloques PB0→PB7)
DOMAIN: Partners
AUTHORITY: Roadmap operativo de la implementación de Partners V1. NO es un Decision Lock — no fija ni reinterpreta ninguna decisión de producto o economía. Su única función es organizar la secuencia de ejecución (PB0-PB7), a partir de las decisiones ya `LOCKED` en `VIAO_PARTNERS_TECHNICAL_SPEC.md` y `VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`. Ante cualquier discrepancia entre este documento y un Decision Lock, el Decision Lock gana (principio 1, `docs/00_GOVERNANCE.md`).
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-26
---

# VIAO PARTNERS — IMPLEMENTATION STATUS

> **REGLA CRÍTICA**: este documento es el roadmap operativo de Partners V1, **no una autorización automática para implementar**. Cada bloque (PB1-PB7) requiere autorización explícita del propietario antes de modificar cualquier archivo de código, migración o test. Definir un bloque aquí no equivale a iniciarlo.

---

## 0. Tabla maestra de estado

| Bloque | Nombre | Estado | Dependencia | Siguiente acción |
|---|---|---|---|---|
| PB0 | Pre-flight | ✅ DONE | — | — |
| PB1 | Schema + RLS | ✅ DONE | PB0 | — |
| PB2 | RPC + Tests | ✅ DONE | PB1 | — |
| PB3 | Partner Access | ✅ DONE | PB2 | — |
| PB4 | Actividad QR + Reserva | ✅ DONE | PB3 | — |
| PB5 | UI Partner | ✅ DONE | PB4 | — |
| PB6 | Dashboard | ✅ DONE | PB5 | — |
| PB7 | E2E / integración completa | ✅ DONE | PB6 | — |

## PARTNERS V1 — COMPLETADO (2026-08-26)

Los 8 bloques (PB0-PB7) están implementados y validados con evidencia real. PB7 demostró mediante 10 tests de integración reales (`lib/partners/e2e-integration.test.ts`) y validación en navegador que el sistema completo funciona de extremo a extremo: `QR/Reserva → partner_activities → rewards_transactions → rewards_wallets → Goal`, con idempotencia, kill-switch P3, pool P4/P5, concurrencia, independencia de Missions y aislamiento entre Partners, todo verificado usando la capa de aplicación real (nunca el RPC como atajo). Suite completa: 816 tests, 812 pass, 0 fail, 4 skipped (+10 respecto a PB6, sin regresión) — incluyendo cero regresiones en Rewards, Missions, Goals, Vision, Trips y Booking.

> Definir un bloque en este documento no significa que ese bloque esté implementado ni constituye autorización automática para implementarlo. Cada bloque requiere autorización explícita antes de modificar código, migraciones o tests.

Progresión completa esperada:

```
PB0 ✅ DONE → PB1 ✅ DONE → PB2 ✅ DONE → PB3 ✅ DONE → PB4 ✅ DONE → PB5 ✅ DONE → PB6 ✅ DONE → PB7 ✅ DONE
```

---

## 1. Regla de progresión

**Partners V1 se implementa secuencialmente PB1 → PB2 → PB3 → PB4 → PB5 → PB6 → PB7. No se saltan bloques.**

Un bloque solo pasa a `✅ DONE` cuando cumple **todos** sus criterios de aceptación (sección 4, por bloque).

Después de cerrar un bloque:
1. Verificar Git (`git status`, `git diff --stat`, `git diff --check`).
2. Ejecutar las validaciones/tests correspondientes a ese bloque.
3. Documentar el resultado.
4. Actualizar este archivo (tabla maestra de la sección 0 + el estado del bloque en la sección 4).
5. Indicar explícitamente cuál es el siguiente bloque.

**El siguiente bloque nunca se considera iniciado automáticamente** — requiere su propia autorización explícita, igual que PB1 la requiere ahora.

---

## 2. Estados permitidos

Usar únicamente estos cuatro, sin inventar variantes:

- `⬜ TODO`
- `🟡 IN PROGRESS`
- `✅ DONE`
- `🔴 BLOCKED`

---

## 3. Decisiones LOCKED que gobiernan la implementación

Este documento **no sustituye** ningún Decision Lock — los Decision Locks siguen siendo la autoridad. Este documento solo organiza la ejecución sobre decisiones ya cerradas:

- **L1, L2, L3, L6, L7, L8, L9, L13, L19** — `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` §21.
- **P1, P2, P3, P4, P5, P6, P7, P8** — `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md` §24 y `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`.
- **PMM3, PMM4, PMM6, PMM10** — `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md` §10.

Ningún bloque de este roadmap puede reinterpretar, renumerar o modificar el valor de ninguna de estas decisiones. Si la implementación real encuentra una contradicción genuina con alguna de ellas, el bloque correspondiente se marca `🔴 BLOCKED` y se detiene hasta que el propietario la resuelva explícitamente — no se decide en código ni en este documento.

---

## 4. Definición de bloques

### PB0 — Pre-flight — ✅ DONE

Auditoría técnica independiente completa: confirmación de 0% código Partners existente, tabla de decisiones LOCKED/OPEN/DEPRECATED, auditoría de código reutilizable (`rewards_transactions`, `complete_mission()`, `redeem_reward()`, `booking_intents`, `destinations`, `rewards_wallets`), arquitectura propuesta, schema propuesto, diseño de seguridad, verificación económica, orden de implementación, riesgos, lista de "no implementar todavía", veredicto final.

Sin código, sin migraciones. Documentado en la conversación de pre-flight de esta sesión; este archivo es su continuación operativa.

---

### PB1 — Schema + RLS — ✅ DONE (2026-08-26)

**Resultado real**: `supabase/migrations/20260825120000_create_partners.sql`, `supabase/migrations/20260825121000_create_partner_activities.sql`. Aplicadas contra Supabase local (`supabase_db_VIAO`) y verificadas directamente en Postgres — no asumidas desde el SQL: `\d+ public.partners`/`\d+ public.partner_activities` confirmaron columnas, tipos, defaults, PK, FK, `CHECK` e índices exactamente como se diseñó; `\dp` confirmó `service_role=arwDxtm` en `partners` (SELECT+INSERT+UPDATE, sin DELETE) y `service_role=arDxtm` en `partner_activities` (SELECT+INSERT únicamente, sin UPDATE/DELETE); `anon`/`authenticated` quedaron en el baseline `Dxtm` (cero SELECT/INSERT/UPDATE/DELETE) en ambas tablas — ningún GRANT de cliente; `pg_policies` devolvió 0 filas para ambas tablas (sin policies de cliente, decisión de la sección de diseño más abajo); `pg_class.relrowsecurity=t` en ambas. Suite completa del proyecto ejecutada tras aplicar las migraciones: 747 tests, 743 pass, 0 fail, 4 skipped — sin regresión.

**Objetivo** (como se planteó antes de ejecutar): crear las dos tablas base, con RLS/GRANT/constraints/índices en las mismas migraciones (convención real del repositorio: `mission_completions`, `booking_intents` y `destinations` incluyen RLS+GRANT+policy en el mismo archivo que el `CREATE TABLE`, nunca en migraciones separadas).

**Tablas**:
- `partners` — identidad mínima del Partner (`id`, `name`, `slug UNIQUE`, `category CHECK IN ('restaurant','experience')` [L2], `status CHECK IN ('active','inactive')`, `access_token uuid UNIQUE DEFAULT gen_random_uuid()` [P7], `contact_email`, `contact_phone`, `address`, `created_at`/`updated_at`).
- `partner_activities` — registro append-only (`id`, `partner_id FK→partners`, `user_id FK→profiles`, `attribution_mechanism CHECK IN ('qr','reservation')`, `declared_amount_eur numeric(10,2) NOT NULL`, `amount_confidence CHECK IN ('declared','confirmed_by_reservation')`, `points_awarded integer NOT NULL DEFAULT 0` [P6], `reservation_reference text`, `attempt_id uuid UNIQUE NOT NULL`, `created_at`).

**Archivos previstos**: una migración para `partners`, una migración para `partner_activities`. Ninguna otra.

**No incluye en este bloque**: el RPC `complete_partner_activity()` (eso es PB2). No toca ninguna migración existente. No modifica Rewards/Missions/Goals.

**Decisión de diseño pendiente de resolver dentro de este bloque, no antes**: si la lectura pública de `partners` (mini-web sin sesión de VIAO) necesita algo más que una policy `to authenticated` — la migración de `destinations` (`20260823140000_*.sql`) tiene una policy de cliente real (`to authenticated using (true)`), no "sin policies de cliente" como asume el Technical Spec §11.1; la lectura verdaderamente anónima pasa por `service_role` server-side. PB1 debe decidir explícitamente el diseño RLS de `partners` con este matiz en cuenta.

#### Acceptance criteria
- Migraciones aplicadas correctamente en local (Supabase Docker).
- RLS activa en ambas tablas.
- `service_role` con exactamente los permisos previstos (verificado, ej. vía `\dp`).
- Ningún rol de cliente (`anon`/`authenticated`) con permiso de escritura en `partner_activities`.
- Constraints correctos (los `CHECK` de enum, `UNIQUE(attempt_id)`, `UNIQUE(slug)`, `UNIQUE(access_token)`).
- Índices correctos (`partner_id`, `user_id`, `created_at` en `partner_activities`).
- FK correctas (`partner_id→partners`, `user_id→profiles`).
- Estructura consistente con P1-P8 y PMM3/PMM6/PMM10 — sin columna `status` en `partner_activities` (PMM10), sin `tier_id`/`premium_multiplier` (P8).

---

### PB2 — RPC económico + tests — ✅ DONE (2026-08-26)

**Resultado real**: `supabase/migrations/20260825130000_create_complete_partner_activity_rpc.sql` + `lib/partners/complete-partner-activity.test.ts` (14 tests). Verificado directamente en Postgres — no asumido del SQL: `\df+`/`pg_proc.prosecdef=t`/`proconfig={"search_path=\"\""}` confirman `SECURITY DEFINER` y `search_path=''`; `has_function_privilege` confirma `anon=false`, `authenticated=false`, `service_role=true` para EXECUTE. `attribution_mechanism` no es un parámetro de la función — se deriva de `amount_confidence` dentro del RPC (`confirmed_by_reservation`→`reservation`, `declared`→`qr`), exactamente como fija la firma ya `LOCKED` de `VIAO_PARTNERS_TECHNICAL_SPEC.md` §10 (que tampoco lo incluye como parámetro). Los 14 tests cubren: idempotencia (mismo `attempt_id` no duplica), P1 (2 Points/€), P2 (1 Point/€), ledger (`reason`/`reference_type`/`reference_id` correctos), P3 individual y bajo concurrencia real (`Promise.all`, nunca más de 2 Actividades), P4/P5 con margen/agotado/bajo concurrencia real (la Actividad siempre se registra, el pool nunca se supera), validaciones fail-closed (importe inválido, Partner inexistente, usuario inexistente), y seguridad (RPC no invocable por un cliente `authenticated`). Suite completa del proyecto tras aplicar: 761 tests, 757 pass, 0 fail, 4 skipped (+14 respecto a PB1, sin regresión).

**Objetivo** (como se planteó antes de ejecutar): implementar `complete_partner_activity()`.

Debe respetar, sin excepción:
- `SECURITY DEFINER`, `set search_path=''`.
- Idempotencia real vía `attempt_id` (`UNIQUE`, verificado bajo lock antes de cualquier INSERT).
- Lock propio: `pg_advisory_xact_lock(hashtext('viao_partners_pool'))` — nunca compartido con `viao_missions_pool` ni `viao_reward_pool`.
- P3 — kill-switch diario: máx. 2 Actividades/`(user_id, partner_id)`/día, medido en Actividades. Al superarse, `raise exception` **antes** de insertar nada — bloqueo completo, sin filas parciales.
- P4 — pool mensual: 3.000 Points/mes, propio e independiente.
- P5 — al agotarse P4: `partner_activities` se inserta **siempre**; `rewards_transactions` se inserta **solo si hay margen**; sin backfill ni emisión retroactiva.
- P6 — `points_awarded`: decidido una única vez en el INSERT, nunca actualizado después.
- P1 = 2 Points/€ cuando `amount_confidence='confirmed_by_reservation'`.
- P2 = 1 Point/€ cuando `amount_confidence='declared'`.
- INSERT en `rewards_transactions` con `reason='partner_activity'` — mismo ledger único de Rewards, ningún ledger paralelo (L7).

Los tests deben acompañar al RPC en este mismo bloque — no se difieren a PB7 (convención real del repositorio: `redeem-reward.test.ts`, `cancel-redemption.test.ts` y el `complete-mission.test.ts` citado en `VIAO_MISSIONS_V1.md` viven junto a su RPC, no en un bloque de tests final).

#### Acceptance criteria mínimos
- Mismo `attempt_id` nunca duplica una Actividad.
- Tercera Actividad diaria del mismo `(user_id, partner_id)` queda bloqueada.
- El bloqueo del kill-switch diario no deja filas parciales.
- Pool mensual agotado registra la Actividad con `points_awarded=0`.
- Pool mensual agotado **no** crea fila en `rewards_transactions`.
- Concurrencia real (peticiones simultáneas) no permite saltarse P3 ni P4.
- Los pools de Partners/Missions/Rewards permanecen verificablemente independientes (ningún test cruza sus contadores).

---

### PB3 — Partner Access — ✅ DONE (2026-08-26)

**Resultado real**: `lib/partners/resolve-partner-access.ts` (`resolvePartnerAccess(accessToken)`, reutilizable — nunca un wrapper por-ruta) + `lib/partners/resolve-partner-access.test.ts` (11 tests). Sigue el patrón ya establecido en el repositorio para resolver un identificador externo no confiable server-side (`app/properties/[id]/resolve.ts`): función pura, testable sin contexto de Next.js. Un Partner `inactive` se trata igual que un token inexistente (`denied`, sin distinguir el motivo al llamante) — decisión de implementación tomada dentro del margen que PB3 podía resolver, sin reinterpretar P7. El resultado (`PartnerAccessResult`) nunca incluye `access_token`; verificado con `Object.keys()` exacto (`id`/`name`/`category` únicamente). Aislamiento verificado con 2 Partners reales simultáneos: el token de A nunca resuelve el id de B. Confirmado además, con un cliente real usando la clave `anon` (sin `service_role`), que ninguna fila de `partners` es legible directamente — mismo diseño RLS ya validado en PB1, reconfirmado en el contexto específico de PB3. **Deliberadamente no se creó ninguna ruta ni página** (`app/partners/` no existe) — la ruta ilustrativa del Technical Spec no se materializó para no convertirla en una decisión de producto; PB4 conectará esta función a los flujos reales, PB5 construirá la UI. Suite completa del proyecto: 772 tests, 768 pass, 0 fail, 4 skipped (+11 respecto a PB2, sin regresión).

**Objetivo** (como se planteó antes de ejecutar): resolver el acceso del Partner vía `access_token`.

Mecanismo ya `LOCKED` (P7), no se reabre aquí:
- Token opaco `uuid`, generado por VIAO en el alta manual.
- Sin Supabase Auth, sin contraseña, sin tabla de usuarios de Partner.
- Acceso limitado exclusivamente al `partner_id` correspondiente a ese token.
- Validación server-side — `service_role` nunca se expone al cliente.

**La ruta/implementación exacta se resuelve dentro de este bloque** (no es una decisión de producto pendiente, es un detalle de implementación — el Technical Spec §11.4 ya marca la ruta `/partners/ops/<access_token>` como "ilustrativa").

No inventar aquí una arquitectura de autenticación definitiva para V1+ (permanece `OPEN`, fuera de alcance de Beta). No añadir login tradicional. No añadir rotación/expiración del token salvo nueva decisión explícita del propietario.

#### Acceptance criteria
- Token válido resuelve exactamente un Partner.
- Token inválido/inexistente rechaza el acceso.
- No filtra información de otros Partners.
- `service_role` nunca llega al cliente.

---

### PB4 — Actividad QR + Reserva — ✅ DONE (2026-08-26)

**Resultado real**: `lib/partners/register-partner-activity.ts` (`registerQrActivity()`/`registerReservationActivity()`, comparten un helper interno no exportado que llama al RPC — ninguna de las dos funciones expone `amountConfidence` como parámetro, así que es estructuralmente imposible que un llamante mezcle las tasas) + `app/partners/actions.ts` (Server Actions, mismo patrón de dos capas que `lib/rewards/redeem-reward.ts`/`app/rewards/actions.ts`: `userId` siempre resuelto vía `auth.getUser()` en la Server Action, nunca en la capa `lib/`). Fail-closed idéntico a `app/trips/actions.ts`: `cookies()` fuera de una petición real de Next.js lanza (comportamiento de esta versión de Next.js, distinto de lo asumido inicialmente) y se captura, devolviendo `unauthenticated` en vez de propagar la excepción. 15 tests en `lib/partners/register-partner-activity.test.ts` (QR, Reserva, separación verificada con importes que harían evidente una tasa cruzada, usuario, Partner, aislamiento, idempotencia, kill-switch P3, pool P5 agotado) + 2 en `app/partners/actions.test.ts` (`unauthenticated` sin sesión real). `next build` ejecutado y limpio — sin errores de frontera cliente/servidor (PB4 no crea ninguna página; sin superficie cliente que inspeccionar todavía). Suite completa: 789 tests, 785 pass, 0 fail, 4 skipped (+17 respecto a PB3, sin regresión). **Limitación reconocida explícitamente**: la resolución real de `auth.getUser()` contra una cookie de navegador real no se verificó con un flujo de navegador de extremo a extremo en este bloque — no existe ninguna UI todavía (PB5) desde la que iniciar esa petición; el mecanismo en sí es el mismo ya usado, sin cambios, por `redeemRewardAction`/`createTripAction`.

**Objetivo** (como se planteó antes de ejecutar): implementar los dos flujos reales que invocan el RPC de PB2.

- **QR**: `attribution_mechanism='qr'`, `amount_confidence='declared'`.
- **Reserva**: `attribution_mechanism='reservation'`, `amount_confidence='confirmed_by_reservation'`.

La Server Action correspondiente debe, en este orden:
1. Resolver el usuario mediante `auth.getUser()` — nunca confiar en un `user_id` enviado por el cliente.
2. Resolver el Partner (vía el contexto de acceso ya validado en PB3).
3. Validar el contexto de la petición.
4. Construir los parámetros de la llamada.
5. Llamar al RPC `complete_partner_activity()`.
6. Dejar que el RPC haga toda la operación económica — la Server Action no calcula Points ni verifica pools por su cuenta.

#### Acceptance criteria
- Ambos flujos generan una fila de `partner_activities` con `attribution_mechanism`/`amount_confidence`/`declared_amount_eur`/`points_awarded` correctos.
- QR y Reserva no se cruzan (ninguna combinación mixta, ej. `qr`+`confirmed_by_reservation`).

---

### PB5 — UI Partner — ✅ DONE (2026-08-26)

**Resultado real**: `app/partners/ops/[accessToken]/page.tsx` (Server Component, mismo patrón que `app/properties/[id]/page.tsx`: resuelve el token vía `resolvePartnerAccess()`, `notFound()` si se deniega — un token de un Partner `inactive` recibe el mismo 404 genérico, sin distinguir el motivo) + `partner-ops-view.tsx` (Client Component, máquina de estados `select→form→result/error`, mismo patrón que `app/rewards/reward-catalog.tsx`) + `lib/partners/parse-amount-input.ts` (validación pura del importe, acepta coma decimal, con 7 tests). `attribution_mechanism`/`amount_confidence` nunca son elegibles desde la UI — cada botón invoca una función distinta de PB4 que ya los fija internamente.

**Verificación visual real en navegador** (Chromium vía skill de automatización, servidor de desarrollo local + Supabase local, Partner y usuario reales creados para la prueba): render correcto con el nombre/categoría reales del Partner; flujo QR completo con un usuario autenticado real registrado vía `/register` — 8€ declarados → "Points otorgados: 8 Points" (P2, 1 Point/€, verificado exacto); formulario de Reserva con ambos campos (importe + referencia opcional); validación de importe inválido (`0`) rechazada client-side sin llamar al servidor; envío sin sesión de VIAO → mensaje "Es necesario iniciar sesión en VIAO para continuar" en ambos flujos (confirmado además en los logs del servidor, que sí registran la invocación de la Server Action); token inexistente → 404 genérico del proyecto; responsive correcto en mobile (375px)/tablet (768px)/desktop; cero errores de consola y cero errores de hidratación en todas las pantallas.

**Limitación reconocida explícitamente**: el kill-switch P3 (3ª actividad) y el pool P5 agotado (`0 Points`, tratado como éxito) no se reprodujeron en vivo en el navegador — el daemon de automatización perdió la cookie de sesión entre llamadas durante la prueba (confirmado como un problema del propio daemon, no de la aplicación: los logs del servidor de desarrollo muestran que la Server Action se invocó y devolvió `unauthenticated` correctamente porque, en ese momento, la sesión real ya no existía). Ambos casos quedan cubiertos con evidencia real contra Supabase por los 15 tests de `lib/partners/register-partner-activity.test.ts` (PB4) — el mecanismo de traducción outcome→mensaje que la UI usa para mostrarlos (`ERROR_MESSAGE_KEY`, y la rama de éxito para `pointsAwarded=0`) es el mismo, ya verificado en vivo, código exacto usado para `invalid_amount`/`unauthenticated`.

**Objetivo** (como se planteó antes de ejecutar): UI mínima para que el Partner pueda, sin Supabase Auth:
- Acceder mediante su token.
- Ver el contexto de su propio Partner.
- Registrar/confirmar una Actividad.
- Recibir confirmación del resultado (Actividad creada, Points otorgados o `0` si el pool está agotado — nunca un error cuando P5 aplica).

No convertir esto en un CRM. No añadir funcionalidades comerciales no decididas (campañas, segmentación — son V1/V1.1, ver `docs/01_CURRENT/partners/VIAO_PARTNERS_MASTER_V2.md` §6).

#### Acceptance criteria
Prueba visual real en navegador (no solo tests automatizados). Sin errores de consola, sin errores de hidratación, sin exposición de secrets, sin acceso cruzado entre Partners.

---

### PB6 — Dashboard — ✅ DONE (2026-08-26)

**Resultado real**: `lib/partners/get-partner-dashboard.ts` (`getPartnerDashboard(partnerId)` — una única consulta indexada por `partner_id` sobre `partner_activities`, agregación en memoria server-side, sin RPC nuevo, sin tabla `partner_metrics`) + `app/partners/dashboard/[accessToken]/page.tsx` + `partner-dashboard-view.tsx` (ambos Server Components — el Dashboard no necesita ningún estado de navegador, coherente con "preferir lectura server-side"). Ruta separada de `/partners/ops/[accessToken]` (P7 describe explícitamente las dos capacidades — confirmar Actividades y consultar el panel — como distintas).

**Interpretación explícita de "período consultado"** (documentada en el propio archivo, no una decisión nueva): ningún documento LOCKED fija un período concreto para `clientes_nuevos`/`clientes_recurrentes`, y esta autorización prohíbe introducir un selector de fechas. Se resuelve como el histórico completo del Partner — coherente con un Beta de 6-8 semanas (L4), que funciona como un único período. `clientes_nuevos` = usuarios distintos con ≥1 Actividad histórica; `clientes_recurrentes` = el subconjunto con ≥2 — misma definición canónica de Master V2 §7, sin acotar por fecha.

`actividad_reciente` no muestra `user_id` ni ningún identificador de usuario — ningún documento LOCKED autoriza exponer al Partner la identidad de un usuario de VIAO; solo fecha, mecanismo (QR/Reserva), importe y Points otorgados. Límite de 10 filas (detalle de implementación, no una cifra LOCKED).

**Verificación visual real en navegador** (Chromium, servidor de desarrollo + Supabase local, datos reales: 1 Partner con 3 usuarios reales — uno recurrente con 2 Actividades QR+Reserva mezcladas, uno con una Actividad de `points_awarded=0` — y un segundo Partner vacío): las 4 cifras numéricas y las 4 filas de actividad reciente coinciden exactamente con los datos insertados (clientes_nuevos=3, clientes_recurrentes=1, ventas_declaradas=17,00€, ventas_confirmadas=48,00€); el caso `0 Points` se muestra como "Sin Points este mes" en la misma tarjeta de éxito, nunca como error; el Partner sin actividad muestra el estado vacío correcto (`EmptyState`, las 4 cifras en 0) sin romper la UI; aislamiento confirmado — el Partner vacío no mostró ningún dato del otro; 404 para token inexistente; responsive correcto en mobile/tablet/desktop; cero errores de consola/hidratación; inspección del HTML confirma que `access_token` solo aparece como el parámetro de la URL ya conocido por el visitante (el propio enlace "Registrar actividad" y la carga de RSC de Next.js), nunca como un campo de datos adicional.

**Este bloque es importante**: el Dashboard Partner **sí forma parte del producto Beta** (PMM6, `LOCKED` — no es un "nice to have" pospuesto).

Exactamente estas **6 métricas**, ninguna más, sin nueva decisión explícita del propietario:
1. `clientes_nuevos`
2. `clientes_recurrentes`
3. `ventas_declaradas_eur`
4. `ventas_confirmadas_reserva_eur`
5. `actividad_reciente`
6. `partner_activo`

El dashboard debe ser: solo lectura, server-side, agregaciones directas sobre `partner_activities` (`SUM`/`COUNT`), **sin** tabla `partner_metrics`, **sin** ledger paralelo, **sin** modificar Rewards.

#### Acceptance criteria
- El Partner accede a su propio dashboard (vía el token de PB3).
- Solo ve sus propios datos.
- Las 6 métricas coinciden exactamente con lo calculable sobre `partner_activities` (ver `VIAO_PARTNERS_TECHNICAL_SPEC.md` §14-15).
- No existe ninguna tabla `partner_metrics`.
- No hay ninguna escritura posible desde el dashboard.
- Sin fugas de datos entre Partners.

---

### PB7 — E2E / integración completa — ✅ DONE (2026-08-26) — PARTNERS V1 COMPLETADO

**Resultado real**: `lib/partners/e2e-integration.test.ts` (10 tests) — deliberadamente no repite lo que PB2/PB4/PB6 ya prueban aislado; prueba que las piezas se conectan, siempre a través de la capa de aplicación real (`registerQrActivity`/`registerReservationActivity`/`getPartnerDashboard`), nunca el RPC como atajo. Cobertura: loop QR completo (`partner_activities`→`rewards_transactions`→`rewards_wallets`→Goal, vía `calculateGoalProgressPercent()` real), loop Reserva completo, QR/Reserva no cruzados (mismo importe, tasas distintas verificadas en el mismo test), idempotencia vía capa de aplicación, P3 E2E (sin fila parcial, wallet sin cambios), P4/P5 E2E (puente PB4→PB6: la Actividad con 0 Points aparece en `getPartnerDashboard()`), concurrencia real (P3 y mismo `attemptId`, vía `Promise.all` sobre `registerQrActivity()`), independencia Partners/Missions (pools cruzados verificados, ledger compartido con `reason` distinto), aislamiento A/B (Dashboards separados, Wallet del usuario sí suma ambos).

**Hallazgo corregido durante la implementación** (Categoría A — error de prueba, no de Partners): mis primeros helpers de test leían `goals` y `rewards_wallets` vía `service_role`. Verificado contra Postgres real (`\dp goals`, `\dp rewards_wallets`) que `service_role` no tiene ningún GRANT sobre ninguna de las dos tablas — ambas son Patrón A (RLS de `authenticated`), por diseño, sin cambios. Corregido usando el cliente de sesión del propio usuario de prueba, igual que `create-goal.ts`/`get-wallet-balance.ts` en producción. Este hallazgo es, en sí mismo, evidencia positiva: confirma que Partners (que usa `service_role` extensivamente) no tiene ningún acceso accidental a las tablas Patrón A de otros dominios.

**Validación en navegador real**: usuario real registrado, flujo QR completo (15€ → 15 Points) confirmado end-to-end incluyendo el Dashboard del mismo Partner reflejándolo correctamente en la misma sesión. El flujo de Reserva se preparó igual pero el daemon de automatización perdió la cookie de sesión a mitad de la prueba (mismo problema ya documentado en PB5, confirmado de nuevo por los logs del servidor: la Server Action se invocó con los parámetros correctos) — cubierto en su totalidad por el test "E2E Reserva" automatizado, que sí se ejecutó con éxito contra Supabase real.

**Auditoría final**: Rewards/Missions/Goals sin ninguna modificación; Decision Locks intactos; PB1-PB6 intactos (solo se añadieron archivos nuevos de PB7); cero migraciones nuevas (PB7 es solo tests); cero referencias a Hotelbeds/MockHotelProvider/bookings/booking_intents en el código de Partners (la única coincidencia de grep es un comentario que afirma explícitamente su ausencia). `.gitignore` volvió a modificarse automáticamente al invocar el skill de navegación — revertido de nuevo, mismo patrón ya visto en PB5/PB6. `next build` limpio. Suite completa: 816 tests, 812 pass, 0 fail, 4 skipped (+10 respecto a PB6, sin regresión en ningún dominio).

**Objetivo** (como se planteó antes de ejecutar): validar el loop completo de extremo a extremo.

```
QR → partner_activities → Points → rewards_transactions → rewards_wallets → Goal
```

Y también el flujo de Reserva equivalente.

Debe comprobarse explícitamente que Partners **no rompe** Rewards, Missions ni Goals.

Debe existir validación de integración suficiente para demostrar:
1. Se registra la Actividad correctamente.
2. Los Points se calculan correctamente (P1/P2).
3. Los Points llegan al ledger único (`rewards_transactions`).
4. `rewards_wallets` refleja el saldo actualizado.
5. Un Goal activo usa ese balance correctamente (`WALLET_BALANCE`, sin lógica paralela).
6. No se modificó la lógica existente de Rewards/Missions/Goals.
7. Concurrencia/idempotencia/kill-switch (P3/P4) siguen funcionando bajo integración real, no solo en aislamiento.

La referencia actual es aproximadamente 726 tests (estado conocido al momento de este documento) — **no asumir ese número como final**: el número real de tests debe verificarse en el momento de ejecutar PB7, después de que PB1-PB6 hayan añadido los suyos.

---

## 5. DEPRECATED — no reintroducir bajo ningún bloque

- Modelo de cofinanciación 50/50 Partner/VIAO.
- Token rotativo diario, escaneado por el usuario.
- El usuario confirmando su propia Actividad (la confirmación es siempre del Partner, PMM3).
- Un segundo ledger de cualquier tipo.
- Descuento monetario directo (Points ≠ dinero, L13).
- Partner Missions.
- Integración POS/API (antes de V2, L9).
- OCR en Beta (L8).
- Pricing Premium/Pro (permanece `OPEN`, O4 — no se decide en ningún bloque de este roadmap).
- CRM avanzado/enterprise.
- Columna `status` en `partner_activities` (PMM10).
- Disputas/cancelación self-service.
- Multi-ubicación.
- Cualquier integración o acoplamiento con Hotelbeds/`MockHotelProvider`/`bookings`/`booking_intents`.
- Cualquier arquitectura de acceso Partner distinta del token opaco de Beta (P7) sin nueva decisión explícita.

---

## 6. Continuación en otro chat

Para continuar Partners V1 en otra sesión (otro chat de Claude Code, u otra herramienta), leer en este orden:

1. `docs/01_CURRENT/partners/VIAO_PARTNERS_IMPLEMENTATION_STATUS.md` (este documento) — determina cuál es el siguiente bloque.
2. `docs/01_CURRENT/partners/VIAO_PARTNERS_MVP_MASTER.md`
3. `docs/01_CURRENT/partners/VIAO_PARTNERS_TECHNICAL_SPEC.md`
4. `docs/02_DECISION_LOCKS/partners/VIAO_PARTNERS_ECONOMIC_DECISION_LOCK.md`

**El estado de la tabla maestra (sección 0) de este documento determina cuál es el siguiente bloque — no lo determina la sección 4 por sí sola.**

**No asumir que un bloque está implementado solo porque esté definido aquí.** Definir un bloque en este documento no significa que exista código para él.

**Confirmar siempre el estado real del repositorio** (`git status`, `git log`, grep directo sobre `supabase/migrations/`) antes de asumir que cualquier bloque, incluido PB0, sigue reflejando el estado actual — este documento puede quedar desactualizado si el código avanza sin que alguien actualice esta tabla.

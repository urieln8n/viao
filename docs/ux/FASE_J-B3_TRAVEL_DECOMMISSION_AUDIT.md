---
STATUS: CURRENT
ERA: V1
DOMAIN: Producto / UX / Arquitectura / Legacy
AUTHORITY: FASE J-B3 — VIAO CORE RESET / TRAVEL DECOMMISSION AUDIT
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-27
---

# FASE J-B3 — Travel Decommission Audit

Documento de auditoría + plan de migración. **No implementa nada.** No se ha borrado código, no se ha creado ninguna migración SQL, no se ha tocado Rewards/Goals/Missions/Partners/Supabase/Vercel en esta fase. Continúa directamente sobre la evidencia recopilada en FASE J-B1/J-B2.5 (nav/Home/copy) y la amplía con un mapa de dependencias completo, clasificación A/B/C/D y una propuesta de migración.

---

## 1. Executive Summary

VIAO tiene dos productos superpuestos en el mismo repositorio: el Core nuevo (Goals → Points → Missions → Rewards → Partners), ya funcional y con navegación propia, y un subsistema Travel completo (Search/Properties/Booking/Hotelbeds/Trips/Vision) que ya no tiene ningún punto de entrada visible pero **sigue vivo, compila, y en tres puntos concretos sigue alimentando al Core**:

1. **Missions** (`lib/missions/rules.ts`): 2 de 4 Missions activas (`hotel_viewed`, `search_started`) solo se pueden completar visitando una página de Travel. Sus nombres están además duplicados en una función SQL (`complete_mission()`).
2. **Rewards — Booking** (`lib/rewards/rules.ts`): `calculateHotelBookingRewardPoints()` es un mecanismo de generación de Points ligado 1:1 a `app/booking/actions.ts`. Ya es inalcanzable desde la UI (sin entrada de navegación), pero el código y la fórmula económica siguen ahí.
3. **Referrals** (`lib/referrals/rules.ts`): el ÚNICO evento que dispara una recompensa de referido es `booking_confirmed`. Esto significa que **el programa de referidos está silenciosamente roto en producción ahora mismo** — el código de referidos, la UI de Perfil y el copy siguen activos, pero nadie puede completar la acción que paga la recompensa, porque esa acción es reservar un hotel y no hay forma de llegar a `/booking` desde la app.

Además, el copy visible tiene dos hallazgos de máxima severidad no corregidos: el **H1 de Home** (`home.greetingTitle`, se muestra siempre desde que se retiró TripHero) dice literalmente *"Tu actividad cotidiana te acerca a tu próximo viaje"*, y el texto explicativo de `/rewards` (`rewards.pointsExplainer`) dice *"Ganas Points reservando..."* sin mencionar Partners en absoluto.

**Respuesta al criterio de éxito de esta fase:**

> *"¿Qué impide actualmente que eliminemos Travel de VIAO?"*
> Tres cosas, todas con solución conocida y de bajo-medio esfuerzo técnico, ninguna requiere tocar Rewards/Goals/Partners: (1) 2 Missions necesitan un trigger nuevo, (2) Referrals necesita un nuevo `VALID_REFERRAL_ACTION_TRIGGER` (una constante TypeScript, no una migración), (3) el copy de Home/Rewards necesita reescribirse. Nada de esto requiere conservar ni una sola línea de código de Hotelbeds/Booking/Search/Properties.

> *"¿Cuál es el camino técnico más seguro?"*
> Congelar el código Travel donde está (ya es inalcanzable, no genera riesgo por sí solo), resolver primero las 3 dependencias reales (Missions, Referrals, copy) con cambios pequeños y aislados, y solo después borrar físicamente rutas/librerías — nunca al revés.

---

## 2. Product identity

**Loop actual, verificado en código** (no en documentación aspiracional):

```
USER → login/registro (reason='registration')
     → crea GOAL (título libre + Points objetivo + fecha opcional)
     → gana POINTS vía:
         - Partner activity (complete_partner_activity RPC) ← mecanismo principal real
         - Missions (complete_mission RPC) ← 2/4 rotas (dependen de Travel)
         - Referral (createRewardTransaction) ← rota (trigger = booking_confirmed)
         - Booking (createRewardTransaction) ← inalcanzable (sin nav)
     → ve progreso del Goal (WALLET_BALANCE model)
     → canjea REWARDS (redeemReward, catálogo funding_type='viao'|'partner')
     → vuelve (return_visit mission, login-triggered)
```

De los 5 mecanismos de generar Points que existen HOY en el código, **solo 2 son 100% independientes de Travel y están completamente operativos**: Registro y Partner activity. Missions está a medias (2/4 rotas por Travel). Referral está roto. Booking es inalcanzable. Esto es la evidencia central de por qué "quitar Travel" no es solo borrar carpetas: hay que primero blindar/reemplazar 3 puntos de enganche reales.

---

## 3. Travel leakage audit

Búsqueda exhaustiva de las 20+ palabras clave especificadas, ejecutada en dos pasadas independientes (manual + agente de exploración) sobre todo el repositorio (excluyendo `node_modules`, `dist`, `.next`, `.git`). Clasificación por tipo, no solo por coincidencia de palabra:

| Tipo | Volumen | Ejemplos | Acción |
|---|---|---|---|
| **1. Dependencia real de código** | Alto | `lib/hotelbeds/*` (42 archivos), `lib/travel-provider/*`, `types/travel.ts` (36 importadores) | Ver §8-9, Clase A/C/D |
| **2. Copy visible** | Medio | `home.greetingTitle`, `rewards.pointsExplainer`, `goals.*` (ya corregido en J-B2.5), Missions `name` | Ver §11 |
| **3. Nombre técnico legacy** | Bajo | `lib/travel-provider/` como nombre de carpeta de abstracción de proveedor (podría llamarse `booking-provider` sin cambiar función) | No urgente, cosmético |
| **4. Documentación histórica** | Muy alto | 40 de 43 archivos en `docs/` | **No tocado, por instrucción explícita** |
| **5. Funcionalidad visible** | Cero (tras J-B1/J-B2.5) | — | Ya resuelto en fases anteriores |
| **6. Funcionalidad económica** | Alto (crítico) | `calculateHotelBookingRewardPoints`, `HOTEL_BOOKING_REWARD_RATE`, `VALID_REFERRAL_ACTION_TRIGGER='booking_confirmed'` | Ver §6, §13 |
| **7. Código muerto (cero consumidores)** | Bajo | `app/home-search-form.tsx` (ya eliminado en J-B2.5) | Resuelto |
| **8. Código todavía necesario** | Alto | Todo lo que exporta `lib/hotelbeds`, `lib/travel-provider`, `lib/bookings`, `types/travel.ts` — consumido internamente por el propio clúster Travel | Clase D hasta resolver §6 |

No se ha encontrado ningún falso positivo mayor, salvo los ya descartados en J-B2.5 (`vision` como subcadena de `provisional`, `property` en el sentido de CSS custom property).

---

## 4. Dependency graph

Verificado mediante imports reales, no asumido.

```
types/travel.ts (36 importadores)
  ├─→ lib/hotelbeds/* (booking.ts, cancellation.ts, mappers.ts, sync-content.ts, ...)
  ├─→ lib/travel-provider/* (hotelbeds-provider.ts, mock-provider.ts, index.ts)
  ├─→ lib/properties/* (get-cached-properties.ts, upsert-property-cache.ts)
  ├─→ lib/searches/* (create-search-record.ts, get-search-by-id.ts)
  ├─→ lib/bookings/* (todas las funciones de estado de reserva)
  ├─→ lib/integration/test-helpers.ts (fixtures de test de flujo completo)
  └─→ lib/openai/build-prompt.ts, index.ts (recomendación IA de propiedades)

app/search/* ──imports──→ lib/travel-provider, lib/destinations, lib/searches
   └─escribe→ searches (tabla)
   └─dispara→ completeMissionForCurrentSession("search_started")  ← MISSIONS

app/properties/[id]/* ──imports──→ lib/travel-provider, lib/properties
   └─dispara→ logAnalyticsEvent("hotel_viewed")                    ← ANALYTICS
   └─dispara→ completeMissionForCurrentSession("hotel_viewed")     ← MISSIONS

app/booking/* ──imports──→ lib/travel-provider, lib/bookings, lib/trips (findOrCreateTripForBooking)
   └─escribe→ bookings (tabla)
   └─dispara→ createRewardTransaction(reason:"booking")            ← REWARDS
   └─dispara→ calculateHotelBookingRewardPoints()                  ← REWARDS (fórmula)
   └─dispara→ completeReferralActionIfPending()                    ← REFERRALS
   └─dispara→ logAnalyticsEvent("booking_clicked"/"booking_completed") ← ANALYTICS

app/trips/* ──imports──→ lib/trips (getUserTrips, getTripDetail)
   └─LEE (read-only)→ rewards_transactions WHERE reference_type='booking'  ← REWARDS (solo lectura)
   └─LEE→ bookings, photos, vision_scans (por trip_id)

app/vision/* ──imports──→ lib/vision, lib/openai/vision
   └─opcionalmente asocia→ trip_id (vía tripId en scanVisionAction)
   └─NO depende de lib/trips para funcionar (solo para la asociación opcional)

lib/referrals/rules.ts
   └─VALID_REFERRAL_ACTION_TRIGGER = "booking_confirmed"  ← única condición de pago, ROTA
```

**Preguntas del PASO 3, respondidas:**

- **¿Quién importa a quién?** Travel → Core es minoritario y concreto (3 puntos: Missions, Rewards-booking, Referrals). Core → Travel es **cero** (Rewards/Goals/Partners no importan nada de Travel).
- **¿Quién escribe datos?** Travel escribe en `bookings`, `searches`, `properties`, `vision_scans`, `photos`. Solo `createRewardTransaction`/RPCs escriben en `rewards_transactions` — y Booking es uno de varios llamadores, no dueño de la tabla.
- **¿Quién lee datos?** Trips lee Rewards (read-only, vía `reference_type='booking'`). Nada del Core lee tablas de Travel.
- **¿Dependencia económica?** Sí: Booking origina Points reales (fórmula en `lib/rewards/rules.ts`); Referral solo paga si hay un booking confirmado.
- **¿Dependencia SQL?** Sí: `complete_mission()` RPC tiene los 4 mission keys (incl. `hotel_viewed`/`search_started`) hardcodeados en SQL.
- **¿Dependencia de Rewards?** Sí (ver §6).
- **¿Dependencia de Missions?** Sí (ver §5).
- **¿Dependencia de Goals?** Ninguna funcional — solo copy, ya corregido en J-B2.5.
- **¿Puede eliminarse sin romper el Core?** Hoy, **no** sin antes resolver Missions y Referrals. El Core seguiría "funcionando" (no habría excepciones/crashes) pero perdería 2 Missions y el programa de referidos completo.

---

## 5. Missions dependency audit — PRIORIDAD MÁXIMA

**A. Dónde se definen:** `lib/missions/rules.ts:35-40`, array `MISSIONS`, 4 entradas.

**B. Dónde se completan:**
| Mission key | Trigger real (archivo:línea) | Independiente de Travel |
|---|---|---|
| `search_started` | `app/search/actions.ts:167` `completeMissionForCurrentSession("search_started")` | ❌ No |
| `return_visit` | `lib/analytics/record-return-visit.ts` (login) | ✅ Sí |
| `hotel_viewed` | `app/properties/[id]/resolve.ts:85` `completeMissionForCurrentSession("hotel_viewed")` | ❌ No |
| `goal_created` | `lib/goals/create-goal.ts` → `completeMission()` | ✅ Sí (función), ❌ copy dice "viaje" (ya corregido en J-B2.5) |

**C. SQL/RPC:** `supabase/migrations/20260824101000_create_complete_mission_rpc.sql`, función `complete_mission()`, líneas 63-66: los 4 `mission_key` (`search_started`, `return_visit`, `hotel_viewed`, `goal_created`) y sus puntos están hardcodeados en un `CASE WHEN` SQL — duplicado manual de `lib/missions/rules.ts`, documentado como intencional en el propio archivo (SQL no puede importar constantes TS).

**D. Tablas:** `mission_completions` (constraint `UNIQUE(user_id, mission_key, period_key)` — anti-farming), `rewards_transactions` (INSERT con `reason='mission:<key>'`).

**E. Componentes que las muestran:** `app/missions-summary.tsx:47`, `{mission.name}` renderizado tal cual — es el único punto de renderizado, ya confirmado en J-B2.5.

**F. Qué más depende de ellas:** `MISSIONS_POOL_MONTHLY_LIMIT_POINTS = 3000` (techo mensual, compartido conceptualmente con el pool de Partners pero presupuestos separados — sin relación de código, solo coincidencia numérica ya documentada en fases anteriores).

### Propuesta de migración conceptual (NO implementar)

5 Missions candidatas, diseñadas para no requerir infraestructura nueva salvo donde se indica explícitamente:

| # | Mission (copy provisional) | Trigger real | Evento | Dónde ocurre | Points | Periodicidad | Dependencias | Complejidad | Riesgo |
|---|---|---|---|---|---|---|---|---|---|
| 1 | "Registra tu primera actividad con un Partner" | `complete_partner_activity()` RPC ya existente se ejecuta con éxito | Ya emitido (RPC) | `/partners/ops/[accessToken]` | 10 | weekly | Ninguna nueva — reemplaza `hotel_viewed` 1:1 en función | **Baja** — solo añadir la llamada mission-side | **Bajo** |
| 2 | "Visita un Partner nuevo esta semana" | `complete_partner_activity()` con `partner_id` distinto a actividades previas de la semana | Requiere una comprobación de "partner distinto" | `/partners/ops/[accessToken]` | 10 | weekly | Necesita una consulta extra (o un flag devuelto por la RPC) — **toca la RPC de Partners** | **Media** | **Medio** — requiere tocar `complete_partner_activity()`, protegido; NO hacer sin autorización de Partners |
| 3 | "Canjea tu primer Reward" | `redeemReward()` con éxito | Ya emitido | `/rewards` | 50 | lifetime (mismo patrón anti-farming que `goal_created`) | Ninguna nueva | **Baja** | **Bajo** |
| 4 | "Comparte tu código de referido" | Nuevo evento cliente (copiar/compartir código) | **Nuevo**, no existe hoy | `/profile` | 10 | weekly o lifetime | Requiere un nuevo tracking event (no toca Rewards/RPC, solo Missions) | **Media** | **Bajo** |
| 5 | "Completa tu perfil" | Guardar `name` + `avatar_url` no vacíos | `app/profile/page.tsx` `handleSubmit` ya existente | `/profile` | 10 | lifetime | Ninguna nueva | **Baja** | **Bajo** |

Recomendación de secuencia (no decisión, solo orden sugerido si se aprueban): **1 y 3 primero** (cero fricción técnica, sustituyen exactamente los 2 slots rotos), **5 después** (cuando se quiera una tercera opción de baja complejidad), **2 y 4 solo si se decide invertir en la lógica adicional que requieren**.

---

## 6. Rewards dependency audit

**Dónde se usa `calculateHotelBookingRewardPoints()`:** exclusivamente `app/booking/actions.ts` (único invocador, confirmado por búsqueda global). Fórmula: `Math.floor(bookingValueEur * HOTEL_BOOKING_REWARD_RATE * POINTS_PER_EURO)`, con `HOTEL_BOOKING_REWARD_RATE = 0.02` (`lib/rewards/rules.ts:26-27`).

**Qué transacciones genera:** filas en `rewards_transactions` con `reason='booking'`, `reference_type='booking'`, `reference_id=<bookings.id>` — otorgadas SOLO cuando `bookingResult.status === 'confirmed'` (nunca en `pending`/`rejected`).

**¿Existe otro mecanismo para ganar Points?** Sí, 4 más, verificados por código:
1. `reason='registration'` — trigger SQL `handle_new_user()`, independiente.
2. `reason='referral'` — `completeReferralActionIfPending()`, pero su trigger (`booking_confirmed`) también depende de Travel (ver más abajo).
3. `reason='mission:<key>'` — `complete_mission()` RPC, 2/4 dependen de Travel (ver §5).
4. Partner activity — `complete_partner_activity()` RPC, **100% independiente de Travel**, y es el mecanismo que el Decision Lock económico marca como principal (Partner-funded).

**¿Eliminar Travel dejaría un agujero económico?** No en la práctica: `calculateHotelBookingRewardPoints` ya es **inalcanzable** desde que se retiró toda entrada de navegación a `/search`→`/properties`→`/booking` (J-B1/J-B2.5, verificado: cero `href` hacia esas rutas fuera del propio clúster Travel). Ningún usuario real puede generar hoy una transacción `reason='booking'` sin teclear manualmente una URL completa y pasar por un flujo de varios pasos. El "agujero" ya existe de facto — la pregunta no es si desaparece, sino si el código que lo implementa se retira.

**¿Qué reemplazo conceptual sería necesario?** Ninguno urgente — Partner activity ya cubre el rol de "mecanismo principal de generación de Points" según el propio Decision Lock económico (`DECISION_LOCK_ECONOMIC_MODEL_V1.md`: Partner-funded=principal). Booking nunca fue ni es el mecanismo principal.

### Recomendación

> **CONGELAR TEMPORALMENTE.**

No "retirar ahora" (requeriría tocar `lib/rewards/rules.ts`, explícitamente protegido en esta fase, y no hay urgencia porque ya es inalcanzable). No "reemplazar antes de retirar" (no hace falta reemplazar algo que ya no se puede disparar). Evidencia: cero entrada de navegación, cero riesgo de nuevas transacciones `reason='booking'` mientras siga congelado, cero prisa técnica. Cuando se decida borrar físicamente `app/booking/*`, ese único borrado ya resuelve el "agujero" sin tocar `lib/rewards/rules.ts` en absoluto (la función quedaría huérfana, no rota — un candidato limpio para Clase A en una fase posterior).

**Hallazgo adicional no solicitado explícitamente pero crítico — Referrals:**

`VALID_REFERRAL_ACTION_TRIGGER = "booking_confirmed"` (`lib/referrals/rules.ts:26,32`) es la ÚNICA condición que dispara el pago de una recompensa de referido. Es una constante TypeScript pura (el propio archivo documenta: *"no hay ningún trigger SQL que dependa de estos valores"*) — cambiarla no requiere migración. Pero mientras no se cambie, **el programa de referidos está roto en producción**: la UI de Perfil sigue mostrando el código de referido y su copy explicativo como si funcionara, pero nadie puede completar la única acción que paga. Recomendación: **REEMPLAZAR ANTES DE RETIRAR BOOKING** — es una decisión de producto de bajo coste técnico (una constante) pero requiere que el negocio defina cuál es la "acción válida" equivalente en el nuevo Core (candidato obvio: una Partner activity confirmada, o N activities).

---

## 7. Vision audit

**A. ¿Tiene valor independiente del Travel?** Sí. La capacidad real de Vision (`lib/openai/vision.ts` + `lib/vision/*`) es: subir una imagen → OCR + traducción vía OpenAI. No hay ninguna lógica de negocio travel-específica en la generación del resultado — traduce cualquier imagen con texto (menú, cartel, documento, señal).

**B. ¿Puede convertirse en utilidad genérica para VIAO?** Técnicamente sí, con cambios mínimos: el único campo travel-específico es `tripId` (opcional) en `scanVisionAction` y la tabla `vision_scans.trip_id`. Quitar la asociación a Trips no rompe la función principal (escanear y traducir).

**C. ¿Depende estructuralmente de Trips?** Solo para: (1) su único punto de entrada visible actual (`app/trips/[id]/page.tsx:409`, enlace "Abrir Vision"), y (2) la opción "Guardar en Mi viaje" tras un escaneo. Sin Trips, Vision seguiría funcionando técnicamente pero **no tendría ninguna forma de que un usuario llegue a `/vision`** — necesitaría un nuevo punto de entrada si se conserva.

**D. ¿Puede desacoplarse?** Sí — desacoplar el campo `tripId` (hacerlo verdaderamente opcional/quitar la UI de asociación) es un cambio pequeño y aislado a `app/vision/*` + una columna ya nullable en `vision_scans`.

**E. ¿Debe congelarse?** Si no hay decisión de producto todavía, sí — es la opción segura mientras se decide.

**F. ¿Debe eliminarse?** No hay evidencia de que deba eliminarse — tiene coste de mantenimiento bajo (usa OpenAI, no Hotelbeds) y una capacidad genuinamente reutilizable.

**Ejemplo conceptual (NO es una decisión, solo ilustra que existe un camino):** Vision podría reencajar como *"traduce el menú o cartel de un Partner que estás visitando"* — reutilizando exactamente el mismo código de escaneo/traducción, sustituyendo la asociación a `trip_id` por una asociación opcional a `partner_id`, y ofreciéndose como acceso contextual desde la página de un Partner en vez de desde Trips. Esto es una idea, no una propuesta a implementar.

**Clasificación: Clase C (desacoplarse)** — conservar temporalmente, quitar su dependencia de Trips cuando se decida su futuro.

---

## 8. Routes audit

| Ruta | Clase | Dependencias | Riesgo de eliminar hoy | Acción recomendada |
|---|---|---|---|---|
| `/search` | D | Dispara Mission `search_started`; alimenta `/search/results`, `/booking` | Rompe 1 Mission | Congelar hasta resolver Mission #1 (§5) |
| `/search/results` | D | Depende de `/search`; usa `components/property/property-image.tsx` | Bajo (sigue a `/search`) | Congelar junto a `/search` |
| `/search/ai-recommendation` | C | Usa `lib/openai/build-prompt.ts` (SearchParams) — capacidad de recomendación IA es genérica, el prompt es travel-específico | Bajo | Desacoplar si se quiere conservar recomendación IA para otro dominio; si no, Clase A |
| `/properties/[id]` | D | Dispara Mission `hotel_viewed` + analytics `hotel_viewed`; escribe `properties` cache | Rompe 1 Mission | Congelar hasta resolver Mission #1 (§5) |
| `/booking/[propertyId]` | D | Único invocador de `calculateHotelBookingRewardPoints`, `completeReferralActionIfPending`, `findOrCreateTripForBooking` | Rompe Rewards-booking (ya inerte) y Referrals (ya roto) | Congelar — ver §6 |
| `/booking/[propertyId]/status` | D | Depende de `/booking` | Bajo | Congelar junto a `/booking` |
| `/trips` | C | Lee Rewards (read-only), asocia Bookings/Vision | Ninguno funcional (solo pierde la vista) | Desacoplar de Booking cuando se decida su futuro |
| `/trips/[id]` | C | Igual que `/trips`; único punto de entrada actual a `/vision` | Rompe el único acceso a Vision | Resolver junto con la decisión de Vision (§7) |
| `/vision` | C | Ver §7 | Ninguno funcional si se conserva un nuevo entry point | Desacoplar de `tripId`, decidir su futuro |

Ninguna ruta tiene entrada visible en nav/Home/Perfil (confirmado en J-B2.5). Ninguna puede eliminarse hoy sin antes ejecutar §5/§6/§7.

---

## 9. Libraries audit

| Módulo | Clasificación | Imports/Exports relevantes | Consumers fuera de sí mismo | Dead code | Notas |
|---|---|---|---|---|---|
| `lib/hotelbeds/*` (42 archivos) | **D** | Exporta funciones de API Hotelbeds (availability, booking, cancel, content, destinations) | Solo `lib/travel-provider/hotelbeds-provider.ts` | No | Aislado, sin fugas al Core |
| `lib/travel-provider/*` | **D** | `getTravelProvider()`, tipos de proveedor | `app/search`, `app/properties`, `app/booking`, `app/trips/[id]` (nearby-hubs) | No | Capa de abstracción, único punto que conecta con Hotelbeds |
| `lib/properties/*` | **D** | Cache de propiedades | `app/booking/actions.ts`, `app/properties/[id]/resolve.ts` | No | — |
| `lib/searches/*` | **D** | Registro de búsquedas | `app/search/actions.ts` | No | — |
| `lib/bookings/*` | **D** | CRUD de reservas | `app/booking/*`, `app/trips/[id]/actions.ts` | No | — |
| `lib/destinations/*` | **D** | Cache de destinos | `app/search/page.tsx`, `lib/travel-provider/hotelbeds-destination-resolver.ts` | No | — |
| `lib/trips/*` | **C** | `getUserTrips`, `getTripDetail`, `findOrCreateTripForBooking` | `app/trips/*`, `app/vision/page.tsx` (lista de viajes), `app/booking/actions.ts` | No | Vision depende de esto solo para la asociación opcional |
| `lib/vision/*` | **C** | Validación de imagen, consentimiento, registro de escaneo | `app/vision/*` exclusivamente | No | Ver §7 |
| `lib/integration/*` | **D** | Test helpers de flujo completo de reserva | Solo tests | No | Tests, no producción |
| `types/travel.ts` | **D** | `SearchParams`, `Property`, `BookingRequest/Result/Status` | 36 archivos (ver §4) | No | El tipo más ampliamente importado del clúster — cualquier borrado empieza por aquí AL FINAL, nunca al principio |

**Ningún módulo tiene código muerto interno** — todo lo que exportan tiene al menos un consumidor real dentro del propio clúster Travel.

---

## 10. Analytics/referrals audit

| Evento/constante | Archivo | Clasificación | Determinación |
|---|---|---|---|
| `"hotel_viewed"` (analytics event) | `lib/analytics/events.ts:16`, `metrics.ts` (contador `hotelsViewed`) | **B** | Sustituir por un evento equivalente de Partner activity si se conserva la métrica |
| `"booking_clicked"` / `"booking_completed"` | `lib/analytics/events.ts:17-18` | **D** (histórico) hasta que se retire Booking | Conservar mientras Booking exista, retirar junto con él |
| `"search_started"` (analytics, distinto del mission key) | `lib/analytics/events.ts` | **D** | Igual que arriba |
| `"vision_used"` | `lib/analytics/events.ts:19` | **C** | Independiente del resto — sigue el destino de Vision (§7) |
| `VALID_REFERRAL_ACTION_TRIGGER = "booking_confirmed"` | `lib/referrals/rules.ts:26,32` | **B — crítico** | Ver §6. Es una constante TS, sin dependencia SQL — el cambio de menor fricción técnica de toda esta auditoría, pero requiere decisión de producto |

Ninguno de estos eventos es "histórico sin consumidor" — todos siguen escribiéndose activamente mientras el código que los dispara exista.

---

## 11. Copy audit

Auditoría de TODAS las superficies activas solicitadas. Clasificación: **VISIBLE** (corregir), **LEGACY** (eliminar posteriormente, sin consumidor), **HISTÓRICO** (conservar, documentación).

| Superficie | Hallazgo | Clave i18n | Clasificación |
|---|---|---|---|
| **Home** | H1 siempre visible: *"Tu actividad cotidiana te acerca a tu próximo viaje."* | `home.greetingTitle` | **VISIBLE — máxima prioridad, no corregido todavía** |
| **Rewards (`/rewards`)** | *"Ganas Points reservando, completando Missions o invitando..."* — no menciona Partners | `rewards.pointsExplainer` | **VISIBLE** |
| **Rewards (`/rewards`)** | *"...o completes una reserva"* | `rewards.emptyMessage` | **VISIBLE** |
| **Rewards (`/rewards`)** | *"Reserva confirmada"* como etiqueta de motivo histórico | `rewards.reasonBooking` | **HISTÓRICO** — necesario mientras existan filas reales `reason='booking'` en el ledger append-only; no tocar |
| **Missions (Home)** | Nombres de 2 de 4 Missions | `lib/missions/rules.ts` (no i18n, hardcoded) | **VISIBLE — bloqueado por §5, requiere decisión de Missions** |
| **Goals** | Ya corregido en J-B2.5 (`goals.createCta`, `titlePlaceholder`, `validationError`, `progressMotivation`) | — | Resuelto |
| **Onboarding** | Ya corregido en J-B2.5 (`onboarding.concept`, `dateOptional`) | — | Resuelto |
| **Sidebar / Mobile nav** | Limpio desde J-B1/corrección estratégica | — | Resuelto |
| **Profile** | Limpio desde J-B2.5 (bloque "Mis viajes" eliminado) | — | Resuelto |
| **Metadata (`app/layout.tsx`)** | Ya corregido en J-B2.5 | — | Resuelto |
| **Errores / loading / empty states** | `components/state/*` son genéricos, sin copy propio — el copy travel-específico vive en los `title`/`message` que cada página de Travel les pasa (dentro del propio clúster, esperado) | — | Sin hallazgos fuera de Travel |
| **Trips / Search / Properties / Booking / Vision (todo su copy interno)** | Es todo el clúster Travel (`trips.*`, `search.*`, `results.*`, `propertyDetail.*`, `booking.*`, `bookingStatus.*`, `vision.trip*`) | ~100 claves | **LEGACY** — corregirlo no tiene sentido mientras el clúster siga existiendo; se resuelve borrando el clúster entero, no clave por clave |
| `nav.search`, `nav.rewards`, `nav.profile` | Huérfanas pero no-Travel (halladas en J-B2.5) | — | Fuera de alcance de esta auditoría |
| `docs/` (40/43 archivos) | Historial de decisiones, research, roadmap | — | **HISTÓRICO — no tocar, por instrucción explícita** |

---

## 12. Classification A/B/C/D — resumen consolidado

**Clase A (eliminarse — cuando se autorice el borrado físico):**
- `app/home-search-form.tsx` — ya eliminado en J-B2.5.
- Eventualmente (tras resolver §5/§6/§7): `app/search/*`, `app/properties/*`, `app/booking/*`, `lib/hotelbeds/*`, `lib/travel-provider/*`, `lib/properties/*`, `lib/searches/*`, `lib/bookings/*`, `lib/destinations/*`, `lib/integration/*`, `types/travel.ts`, `components/property/*`, `components/search/destination-input.tsx`, y las ~100 claves i18n de `trips.*/search.*/results.*/propertyDetail.*/booking.*/bookingStatus.*`.

**Clase B (reemplazarse):**
- `hotel_viewed`, `search_started` (Missions) — ver §5 propuesta.
- `goal_created` copy — ya resuelto en J-B2.5.
- `VALID_REFERRAL_ACTION_TRIGGER` — ver §6.
- `home.greetingTitle`, `rewards.pointsExplainer`, `rewards.emptyMessage` — copy, ver §11.
- Analytics `hotel_viewed`/`booking_clicked`/`booking_completed`/`search_started` — si se conservan como métricas, sustituir por equivalentes de Partner activity.

**Clase C (desacoplarse, conservar temporalmente):**
- `lib/vision/*`, `app/vision/*` — desacoplar de `tripId`/Trips.
- `lib/trips/*`, `app/trips/*` — hoy sostienen a Vision y leen Rewards; desacoplar cuando se decida el futuro de Vision.
- `app/search/ai-recommendation` / `lib/openai/build-prompt.ts` — capacidad de recomendación IA genérica atrapada en un prompt travel-específico.

**Clase D (congelarse, no tocar todavía):**
- `lib/hotelbeds/*`, `lib/travel-provider/*`, `lib/properties/*`, `lib/searches/*`, `lib/bookings/*`, `lib/destinations/*`, `types/travel.ts`, `app/search/*`, `app/properties/*`, `app/booking/*` — mientras no se resuelvan §5 (Missions) y §6 (Rewards/Referrals).
- `rewards.reasonBooking` (i18n) — mientras exista historial real en el ledger.

---

## 13. Required product decisions

1. **¿Con qué se sustituyen `hotel_viewed` y `search_started`?** Propuesta en §5 (5 candidatas), pendiente de elegir.
2. **¿Cuál es la nueva "acción válida" de Referrals?** (reemplazo de `booking_confirmed`). Candidato obvio: N Partner activities confirmadas.
3. **¿Vision se conserva como utilidad genérica, se acopla a Partners, o se retira?** (§7).
4. **¿Se retira `calculateHotelBookingRewardPoints` cuando se borre Booking, o se congela indefinidamente como código muerto documentado?** (§6 — recomendación: se vuelve huérfano de forma natural al borrar Booking, sin tocar `lib/rewards/rules.ts`).
5. **¿Se conserva la recomendación IA (`/search/ai-recommendation`) para otro dominio (p. ej. recomendar Partners), o se retira junto con Search?**

---

## 14. Proposed migration sequence

Orden verificado contra la evidencia de dependencias (§4); no requirió reordenarse respecto al propuesto, salvo aclarar que STEP 3-4 dependen de decisiones de producto (§13) antes de poder ejecutarse:

1. **STEP 1 — Core protection**: ya vigente (Rewards/Goals/Missions/Partners core sin dependencia de Travel, verificado en J-B2.5 y esta fase).
2. **STEP 2 — Missions redesign**: decidir cuáles de las 5 candidatas (§5) se implementan — requiere autorización de producto + una fase de implementación que sí tocaría `lib/missions/rules.ts` y la migración SQL.
3. **STEP 3 — Reemplazo de triggers Travel**: implementar los triggers elegidos en STEP 2 desde sus nuevas fuentes (Partner activity, redeem, perfil).
4. **STEP 4 — Resolver dependencia Rewards/Booking**: decidir el destino de `calculateHotelBookingRewardPoints` (§13.4) y **redefinir `VALID_REFERRAL_ACTION_TRIGGER`** (§6, §13.2) — esto último es la pieza más urgente porque Referrals ya está roto hoy.
5. **STEP 5 — Resolver Vision**: decisión de producto (§13.3) + si se conserva, desacoplar de `tripId`/Trips y darle un nuevo punto de entrada.
6. **STEP 6 — Retirar rutas Travel**: `/search*`, `/properties/[id]`, `/booking/*`, y `/trips*` si Vision ya no depende de ellas.
7. **STEP 7 — Retirar librerías Travel**: `lib/hotelbeds`, `lib/travel-provider`, `lib/properties`, `lib/searches`, `lib/bookings`, `lib/destinations`, `lib/trips` (si procede), `lib/integration`.
8. **STEP 8 — Limpiar tipos/imports**: `types/travel.ts` al final, cuando ya no tenga los 36 importadores actuales.
9. **STEP 9 — Limpiar analytics/referrals**: retirar eventos `hotel_viewed`/`booking_*`/`search_started` de la taxonomía si no se sustituyeron por equivalentes.
10. **STEP 10 — Limpiar i18n**: las ~100 claves `trips.*/search.*/booking.*` de una vez, tras borrar el código que las usa (no antes, evita romper build).
11. **STEP 11 — Eliminar dependencias npm innecesarias**: auditado en esta fase — **no se ha encontrado ninguna dependencia npm exclusiva de Travel** (Hotelbeds se integra vía `fetch` nativo, sin SDK/paquete dedicado). Este paso probablemente no requiera ninguna acción.
12. **STEP 12-13 — Tests / Build**: tras cada STEP, no solo al final — cada retirada de ruta/librería debe validarse de forma incremental, no en un único borrado masivo (regla de seguridad §14 del prompt: no borrar carpetas masivamente).
13. **STEP 14 — Auditoría final de "Travel leakage"**: repetir esta misma búsqueda de §3 y confirmar cero resultados fuera de `docs/` (histórico).

---

## 15. Risks

- **Referrals ya está roto en producción** (§6) — riesgo de percepción de producto, no técnico: cualquier usuario que use su código de referido hoy no puede completar la recompensa. Es el hallazgo de mayor urgencia de negocio de todo este documento, aunque su solución técnica sea trivial.
- **`home.greetingTitle`** sigue siendo el primer texto que ve cualquier usuario — mientras no se corrija, todo el trabajo de nav/Home/Perfil queda parcialmente neutralizado por el propio titular de Home.
- Si se implementan las Missions candidatas #2 o #4 (§5) sin evaluar bien su complejidad, se corre el riesgo de tocar la RPC de Partners o crear infraestructura de tracking nueva sin necesidad — #1, #3 y #5 son las de menor riesgo real.
- Borrar `types/travel.ts` antes de tiempo (fuera del orden de §14) rompería la compilación de 36 archivos simultáneamente — debe ser literalmente el último archivo en tocarse.

---

## 16. Recommended next phase

Dado que Referrals está roto en producción y `home.greetingTitle`/`rewards.pointsExplainer` son los dos hallazgos de copy más visibles y aún no corregidos, la fase recomendada a continuación (sujeta a tu autorización explícita, no implementada aquí) sería una **fase de copy fix acotada** (igual naturaleza que las ya aprobadas en J-B2.5: sin tocar cálculos, solo valores i18n) para `home.greetingTitle`, `rewards.pointsExplainer` y `rewards.emptyMessage` — es el fix de menor riesgo y mayor impacto visible pendiente. La decisión sobre Missions/Referrals/Vision (§13) es una fase separada, de producto, no de limpieza.

---

## 17. Exact files that can safely be deleted later (Clase A, una vez resueltas §5/§6/§7)

`app/search/page.tsx`, `app/search/search-form.tsx`, `app/search/actions.ts`, `app/search/results/*`, `app/search/ai-recommendation/*` (salvo que se conserve para otro dominio, §13.5), `app/properties/[id]/*`, `app/booking/*`, `lib/hotelbeds/*` (42 archivos), `lib/travel-provider/*`, `lib/properties/*`, `lib/searches/*`, `lib/bookings/*`, `lib/destinations/*`, `lib/integration/*`, `components/property/property-image.tsx`, `components/search/destination-input.tsx`, `types/travel.ts` (al final).

## 18. Exact files that must NOT be deleted yet

`lib/missions/rules.ts` y la migración `complete_mission()` (mientras no exista un reemplazo aprobado para `hotel_viewed`/`search_started`), `lib/rewards/rules.ts` (contiene `calculateHotelBookingRewardPoints`, protegido en todo momento salvo decisión explícita futura), `lib/referrals/rules.ts` (mientras no se redefina `VALID_REFERRAL_ACTION_TRIGGER`), `lib/trips/*` y `app/trips/*` (sostienen el único punto de entrada actual a Vision), `lib/vision/*` y `app/vision/*` (pendiente de decisión de producto).

## 19. SQL/migration implications

- **Ninguna migración necesaria para Referrals** (`VALID_REFERRAL_ACTION_TRIGGER` es TypeScript puro).
- **Una nueva migración SÍ sería necesaria** para actualizar `complete_mission()` si se reemplazan `hotel_viewed`/`search_started` por nuevos mission keys — el RPC actual tiene los 4 keys hardcodeados en SQL (§5.C).
- **Ninguna migración necesaria** para retirar `calculateHotelBookingRewardPoints` (queda huérfana, no rota, al borrar `app/booking/actions.ts` — no toca schema ni RPC).
- **Ninguna migración necesaria** para desacoplar Vision de `trip_id` (la columna ya es nullable; dejar de escribirla es un cambio de aplicación, no de schema) — a confirmar si se decide esa dirección.

## 20. Final acceptance criteria

Esta fase se considera completa porque:
- Se ha respondido con evidencia concreta (archivo + símbolo + línea) a "¿qué impide eliminar Travel?": exactamente 3 puntos de enganche real (Missions ×2, Rewards/Booking, Referrals), ninguno más.
- Se ha demostrado que el Core (Rewards/Goals/Partners) tiene dependencia CERO de Travel.
- Se ha entregado una propuesta de Missions de reemplazo, una recomendación explícita para Rewards/Booking ("congelar"), y una clasificación A/B/C/D completa de rutas y librerías.
- No se ha borrado ni modificado ningún archivo de código, migración, Rewards, Goals, Missions o Partners en esta fase.

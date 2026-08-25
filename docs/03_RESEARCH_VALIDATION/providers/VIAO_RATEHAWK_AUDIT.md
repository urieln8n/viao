---
STATUS: VALIDATION
ERA: Esta sesión
DOMAIN: Travel/Providers
AUTHORITY: Auditoría documental — VERDICT YELLOW (sandbox requiere credenciales privadas)
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — Auditoría técnica profunda de RateHawk / Emerging Travel Group (ETG)

### Fecha de auditoría: 2026-08-25
### Estado: AUDITORÍA DOCUMENTAL PROFUNDA — SIN VALIDACIÓN EN VIVO (ver Fase 3). No es una integración, no es una decisión de proveedor. No se ha modificado código, tipos, `HotelProvider`, `errors.ts`, `booking_intents`, `bookings`, Supabase, migraciones, RLS, UI, rutas, dependencias, `.env` ni configuración.
### Contexto: continúa `docs/03_RESEARCH_VALIDATION/providers/VIAO_HOTEL_PROVIDERS_SCREENING.md`, que marcó RateHawk/ETG como `PRIORITARIO`. Hotelbeds sigue **PENDIENTE DE RESPUESTA**, sin cambios. Travelgate sigue **GREEN**, con sandbox validado en vivo (`docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_AUDIT.md`, `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_SANDBOX_VALIDATION.md`), sin re-auditar aquí.
### Fuentes principales: documentación oficial en `docs.emergingtravel.com` (dominio oficial de la API — "pAPI Docs"/"ETG API V3"), `blog.ratehawk.com` (oficial). Todas las páginas citadas fueron accedidas mediante WebSearch (extracción de contenido indexado) tras que el acceso directo por WebFetch devolviera `403 Forbidden` de forma consistente en varias rutas de `docs.emergingtravel.com` (protección anti-bot del propio sitio, no un fallo de la investigación) — se marca explícitamente dónde el contenido proviene de un snippet de búsqueda en vez de una lectura directa de la página completa.

**Taxonomía de evidencia** (misma que en el screening previo): `CONFIRMADO` (fuente oficial o prueba directa) · `DOCUMENTADO` (fuente técnica fiable, no oficial, o snippet de la fuente oficial sin lectura completa de la página) · `INFERIDO` (deducción razonable, no verificada) · `NO VERIFICADO` (sin evidencia suficiente).

---

## FASE 1 — Auditoría documental: acceso y credenciales

1. **Endpoint sandbox**: `CONFIRMADO` — `https://api-sandbox.worldota.net`. Endpoint de producción: `https://api.worldota.net`. (Nota de nomenclatura: "worldota.net" es el dominio técnico real de la API — distinto de la marca comercial "RateHawk" y de la razón social "Emerging Travel Group"/ETG. Un tercer nombre técnico más, como ya se señaló en el screening previo.)
2. **Método de autenticación**: `CONFIRMADO` — HTTP Basic Authentication con un par `<KEY_ID>:<API_KEY>`. El `KEY_ID` actúa como usuario, el `API_KEY` como contraseña del esquema Basic.
3. **Cómo obtener credenciales**: `CONFIRMADO` — las API keys se generan "en la sección API de la configuración de contrato, disponible solo para la cuenta Master" — es decir, **requiere tener ya una cuenta con un contrato activo**, no un simple registro de desarrollador. No existe un formulario de "crear API key de prueba" público equivalente al de Hotelbeds o Travelgate.
4. **¿Existe sandbox real?**: `CONFIRMADO` — sí, con host propio (`api-sandbox.worldota.net`), credenciales de sandbox propias y distintas de producción, y "mock properties" diseñadas para simular escenarios reales (cambios de precio, impuestos, tipos de régimen).
5. **¿Es accesible para VIAO actualmente?**: `CONFIRMADO` **que NO, de forma inmediata**. El propio blog oficial de RateHawk indica textualmente: "Access to the Sandbox is available exclusively to new partners starting integration... Production credentials cannot be used in the Sandbox" — y las credenciales de sandbox se solicitan a un manager asignado, no se generan de forma autoservicio. **No existe ninguna API key de prueba pública** (a diferencia de la `test0000-...` de Travelgate).
6. **Pasos exactos desde solicitud hasta acceso**, según el propio blog oficial: (1) un manager dedicado envía un cuestionario breve para alinear requisitos técnicos y expectativas; (2) desarrollo independiente en el Sandbox, con documentación y soporte propios; (3) revisión y certificación por el equipo de "API Launch". `CONFIRMADO`.
7. **¿Existe certificación?**: `CONFIRMADO` — sí, paso 3 del proceso anterior.
8. **Tiempo estimado/documentado de certificación**: `CONFIRMADO` — "typically completed within 14–30 days" (tras completar el desarrollo en sandbox). No hay plazo documentado para la etapa previa (cuestionario→credenciales de sandbox) — `NO VERIFICADO`.
9. **¿Existe producción separada?**: `CONFIRMADO` — host distinto (`api.worldota.net`), credenciales distintas, con la advertencia explícita de no mezclar datos/IDs entre entornos.
10. **Condiciones comerciales necesarias**: `CONFIRMADO` que existe un "contrato" previo a la generación de cualquier API key (paso 3 de este listado), pero el contenido/condiciones exactas de ese contrato: `NO VERIFICADO` — no público.

---

## FASE 2 — Flujo de la API hotelera

Flujo real confirmado documentalmente (`Search → Prebook → Create booking → Check booking (poll) → Cancel`), con nombres de método/campo reales:

- **Search**: dos rutas documentadas — "Search by hotel IDs" y "Search by region" (existe también, según fuentes previas de FPR-01, un tercer patrón "hotelpage"). Devuelve tarifas con un `search_hash` propio.
- **Retrieve hotelpage**: devuelve un `book_hash` que empieza por `"h-…"`.
- **Prebook** (dos variantes documentadas: "Prebook rate from hotelpage step" y "Prebook rate from search step"): toma el `book_hash`/`search_hash` de la etapa anterior y devuelve un **nuevo** `book_hash` que empieza por `"p-…"` — este es el que hay que usar para reservar. **Confirmado, tal como pedía la tarea, que Prebook NO es simplemente un alias de Quote de VIAO**: es un paso con su propia identidad de hash, distinta de la del Search, con su propia vida útil.
  - Vida útil del `book_hash` de hotelpage: **6 horas** tras obtener la tarifa.
  - Vida útil del hash basado en búsqueda (search_hash): **38 minutos**.
  - Un hash caducado o inválido produce un error explícito (no un fallo silencioso).
- **Create booking process**: inicia la reserva de forma **asíncrona** — requiere un `partner_order_id` (generado por VIAO, equivalente conceptual a `booking_intents.client_reference`).
- **Check booking process**: consulta obligatoria del estado — valores documentados `ok` / `processing` / `error`. La documentación es explícita: **"un pedido solo puede considerarse confirmado tras recibir status `ok` de Check booking process (o confirmación por webhook) — nunca de la respuesta inicial de Create."** Esto es una diferencia estructural real frente a Travelgate/Hotelbeds, donde `book()` devuelve un resultado ya interpretable en la misma llamada.
- **Cancel**: endpoint propio, documentado con guía oficial de reintento simple (ver Fase 4).
- **Retrieve bookings** ("Get Booking"): endpoint de consulta/listado de reservas — existe, `CONFIRMADO`.
- **Webhooks**: existe un webhook de "booking changes"/"booking status" — `DOCUMENTADO` su existencia (título de página encontrado), contenido exacto no verificado en profundidad en esta pasada.

**IDs y referencias confirmados**: `search_hash`, `book_hash` (dos variantes, "h-" y "p-", con vidas útiles distintas), `partner_order_id` (generado por el partner/VIAO), `order status` (`ok`/`processing`/`error`), commission/net/gross price (campos confirmados en la respuesta de tarifa — ver Fase 7).

---

## FASE 3 — Sandbox real: DETENIDA, credenciales privadas requeridas

Siguiendo la regla explícita de esta tarea ("Si el sandbox requiere credenciales privadas: DETENER la parte experimental"):

**No se ha ejecutado ninguna llamada real contra `api-sandbox.worldota.net`.** A diferencia de Travelgate (API key de test pública, literalmente impresa en la documentación, usable sin ningún registro previo), RateHawk/ETG exige:

1. Tener una cuenta con contrato activo (Fase 1, punto 3).
2. Contacto previo con un manager asignado y cumplimentar un cuestionario técnico (Fase 1, punto 6).
3. Recibir credenciales de sandbox específicas — nunca una key genérica compartida.

VIAO no dispone hoy de ninguno de los tres. **No se ha intentado sortear la autenticación ni usar credenciales no autorizadas**, tal como exige la regla absoluta de esta tarea. Toda la Fase 2 (flujo) y las Fases 4-9 (idempotencia, compatibilidad, cobertura, modelo económico, timeouts, seguridad) de este documento se basan **exclusivamente en documentación**, nunca en resultados simulados o inventados.

**Qué falta exactamente para poder repetir con RateHawk el mismo ejercicio de validación en vivo que se hizo con Travelgate**: iniciar contacto comercial/técnico con RateHawk (vía su web o el proceso de partnership referenciado en su documentación), completar el cuestionario del manager, y esperar a recibir credenciales de sandbox — sin plazo público confirmado para esta primera etapa (Fase 1, punto 8).

---

## FASE 4 — Idempotencia y errores (CRÍTICA)

Este es el hallazgo más importante de esta auditoría, y **diverge de forma real y significativa** del comportamiento ya confirmado de Travelgate.

**Comportamiento documentado oficialmente ante errores de `Create booking process`** (`CONFIRMADO`, guía oficial explícita): si se recibe `duplicate_reservation`, `double_booking_form`, `unknown`, `timeout`, o un código HTTP 5xx, la instrucción oficial es: **reintentar con un `partner_order_id` NUEVO** (nunca reutilizar el mismo), hasta un máximo de 10 intentos, hasta obtener `status: "ok"` u otro error no reintentable. Si se supera ese límite, la recomendación es contactar al account manager (posible problema de configuración del contrato).

`duplicate_reservation`/`double_booking_form` ocurren específicamente cuando se reutiliza un `partner_order_id` que ya está asociado a un intento (exitoso o fallido) previo bajo el mismo contrato.

**Comportamiento documentado de `Check booking process`** (`CONFIRMADO`): mientras el status sea `processing`, o ante `timeout`/`unknown`/5xx, la guía oficial es **esperar y seguir consultando** (recomendación explícita: cada 5 segundos) — estos NO se consideran fallos. Solo un conjunto cerrado de errores finales (`3ds`, `block`, `book_limit`, `booking_finish_did_not_succeed`, `provider`, `soldout`) se consideran fallo definitivo.

### Comparación explícita con el hallazgo de Travelgate

| | Travelgate (validado en vivo) | RateHawk (documentado, no validado en vivo) |
|---|---|---|
| Reutilizar el mismo identificador de reintento | Produce error explícito (`BadRequest`) + `status: UNKNOWN` | No es la vía recomendada — la propia documentación anticipa este caso (`duplicate_reservation`) y pide **cambiar** de identificador |
| Qué hacer ante timeout/error ambiguo | Reconciliar primero (consultar `hotelX.booking()`), nunca reintentar a ciegas | Reintentar `Create` con un `partner_order_id` **nuevo**, hasta 10 veces — la propia documentación no exige reconciliar antes |
| Mecanismo de reconciliación disponible | Sí, confirmado y probado en vivo en esta sesión (`hotelX.booking(bookingID:...)`) | Existe (`Retrieve bookings`, webhooks), pero el flujo oficial documentado **no lo exige explícitamente antes de reintentar** |

**Pregunta abierta real, no resuelta por la documentación pública consultada** (`NO VERIFICADO`, marcada explícitamente como tal en vez de asumida en cualquier dirección): si el `Create` original **sí llegó a crear una reserva real** en el backend de RateHawk pero la respuesta se perdió (timeout de red), y VIAO sigue la guía oficial de reintentar con un `partner_order_id` NUEVO, **¿existe garantía documentada de que esto no genere una segunda reserva real duplicada?** La documentación no lo afirma ni lo niega explícitamente en las páginas consultadas en esta auditoría. Es razonable especular (`INFERIDO`, no confirmado) que el propio `book_hash` de un solo uso podría actuar como mecanismo de deduplicación interno (una tarifa ya reservada no podría reservarse dos veces con el mismo hash) — pero esto **no está confirmado por ninguna fuente**, y se marca explícitamente como pregunta para RateHawk (Fase 10).

**Cancel**: guía oficial simple y distinta — "si se recibe timeout al cancelar, llamar a Cancel booking una vez más" — sin instrucción de cambiar de identificador, sugiriendo que Cancel sí se considera seguro de reintentar directamente (`DOCUMENTADO`, no verificado en vivo).

---

## FASE 5 — Compatibilidad con VIAO (`HotelProvider`)

Contrastado contra `lib/travel-provider/types.ts`, `types/travel.ts`, `lib/travel-provider/errors.ts` (contrato real de VIAO, ya leído en profundidad en turnos anteriores de esta sesión):

| Tipo/método de VIAO | Encaje con RateHawk | Notas |
|---|---|---|
| `SearchParams` → `search()` | Encaja directamente | "Search by hotel IDs"/"Search by region" — mismo patrón conceptual que Hotelbeds/Travelgate |
| `PriceQuote`/`Conditions` → `getPrice()`/`getConditions()` | Requiere transformación, no encaje 1:1 | El "precio" y las "condiciones" de RateHawk viven en el resultado de **Prebook**, no en un endpoint separado — mismo patrón ya resuelto en `HotelbedsProvider` (una sola llamada, resultado troceado en varios tipos de VIAO) |
| `BookingRequest`/`book()` → `Create booking process` | **Requiere orquestación adicional, no solo transformación de datos** | `book()` en VIAO devuelve un `BookingResult` ya interpretable en una sola llamada; RateHawk exige `Create` + polling de `Check booking process` hasta `ok`/error final. Esto **no rompe el contrato** (`book()` puede internamente hacer varias llamadas HTTP, igual que ya orquesta Hotelbeds con `resolveBookableRate`), pero es una pieza de lógica nueva que ni Hotelbeds ni Travelgate necesitaron |
| `CancellationRequest`/`cancelBooking()` | Encaja directamente | Cancel + reintento simple documentado |
| `TravelProviderError` (4 clases) | Encaja con matices | `processing`/`timeout`/`unknown`/5xx de Check booking → **no son `ProviderError` definitivo**, deben tratarse como un estado "en curso" (similar en espíritu a `ProviderAmbiguousError`, pero con una semántica de *"sigue consultando"* explícita que Travelgate no tenía tan formalizada); los 6 errores finales (`3ds`, `block`, `book_limit`, etc.) → `ProviderUnavailableError`/`ProviderError` según el caso |
| `clientReference` (`booking_intents.client_reference`) | Mapea a `partner_order_id` | **Semántica de reintento distinta a Hotelbeds (que sí es idempotente por diseño de VIAO) y distinta a Travelgate (error explícito en reintento)** — aquí la recomendación oficial es generar uno nuevo por intento, lo que exige repensar cómo `booking_intents` (hoy diseñada para un `client_reference` estable y único por intento) representaría una secuencia de hasta 10 `partner_order_id` distintos para un mismo intento lógico de reserva |
| `getCommission()` | Más prometedor que en Travelgate | Los campos de precio de RateHawk incluyen explícitamente commission/net/gross (`DOCUMENTADO`) — no verificado en vivo, pero la propia estructura de datos ya distingue estos conceptos, algo que no se pudo confirmar empíricamente con Travelgate |

**Qué información se pierde**: nada estructuralmente — el modelo de datos de VIAO sigue siendo suficiente.
**Qué información sobra**: el par de hashes (`search_hash`/`book_hash` con dos vidas útiles distintas) no tiene un lugar natural en los tipos actuales de VIAO (`types/travel.ts` no modela un "hash de reserva con caducidad") — sería responsabilidad interna de un futuro `RateHawkProvider`, no del contrato compartido.
**¿Sigue siendo suficiente el contrato actual?**: sí, en el nivel de tipos — el ajuste real necesario es de **orquestación** (polling tras `book()`), no de contrato.

---

## FASE 6 — Cobertura y calidad de inventario

- **España**: `DOCUMENTADO` (no una cifra de inventario, una señal de mercado) — fuentes de prensa del sector citan a España entre los 5 países más reservados en las plataformas de ETG en 2025 (junto a Italia, EEUU, Alemania, Turquía), y como uno de los destinos de salida más populares reservados por agencias del Reino Unido vía RateHawk en 2024. Es una señal más fuerte que la disponible para Travelgate (que solo tiene una cifra global de "1.000+ suppliers"), pero **no es una cifra de inventario ni de número de hoteles**.
- **Barcelona específicamente**: `NO VERIFICADO` — ninguna fuente consultada da una cifra o confirmación específica de Barcelona. No se infiere de la cifra global ni de la señal de "España top-5".
- **Cifra global de inventario**: cifras divergentes entre fuentes — "2,9M+" (FPR-01, fuente propia de RateHawk) vs "3,2M" (fuente de prensa reciente) vs "250.000 propiedades con contrato directo" (otra fuente de prensa, doblado interanual) — `DOCUMENTADO`, sin una única cifra oficial reconciliada en esta pasada.
- **Hoteles independientes vs cadenas, profundidad real**: `NO VERIFICADO`.

---

## FASE 7 — Modelo económico

- **Modelos comerciales**: `CONFIRMADO` (FPR-01) — tres opciones a elegir: precio neto, comisión, o afiliado.
- **Exposición de commission/net/gross en la API**: `DOCUMENTADO` — la respuesta de "Retrieve rate info" incluye explícitamente campos de comisión y precio neto/bruto — mejor evidenciado que en Travelgate (donde `getCommission()` no se pudo verificar empíricamente por falta de condiciones comerciales reales en el access de test).
- **Coste de integración, depósitos, liquidación, moneda**: `NO VERIFICADO` en esta pasada — no se ha encontrado documentación pública específica sobre estos puntos.
- **Porcentajes exactos de comisión/markup**: no se inventa ninguno — `NO VERIFICADO`, depende del contrato negociado.

---

## FASE 8 — Timeouts, rate limits y operación

- **Timeout de Search**: `CONFIRMADO` (documentación oficial) — recomendado 60 segundos, mínimo 30 segundos (un mínimo menor puede reducir la disponibilidad de resultados devueltos).
- **Timeout de Prebook**: `CONFIRMADO` — Prebook **no admite** un timeout de entrada configurable por el cliente; el timeout lo controla ETG internamente.
- **Polling de Check booking process**: `CONFIRMADO` — cadencia recomendada de 5 segundos hasta obtener un estado final.
- **Rate limits**: `DOCUMENTADO` — existe un formato de cabecera de respuesta que informa límite/restantes/ventana de tiempo (ejemplo documentado: 1.000 peticiones/60 segundos) — no confirmado si esa cifra concreta es un límite universal fijo o solo un ejemplo ilustrativo; la documentación indica explícitamente que **los límites aumentan tras completar la certificación** — cifra exacta pre-certificación: `NO VERIFICADO`.
- **Códigos HTTP/propios**: catálogo de estados de negocio (`ok`/`processing`/`error` + 6 errores finales) `CONFIRMADO`; catálogo completo de códigos HTTP estándar no auditado en profundidad en esta pasada.
- **SLA/mantenimiento del sandbox**: `NO VERIFICADO`.

---

## FASE 9 — Seguridad y datos

- **Autenticación**: `CONFIRMADO` — HTTP Basic con `KEY_ID:API_KEY`.
- **Expiración de credenciales**: `NO VERIFICADO`.
- **IP allowlist**: `NO VERIFICADO` — no mencionado en la documentación consultada.
- **Separación sandbox/producción**: `CONFIRMADO` — hosts y credenciales distintos, con advertencia explícita de no mezclar datos entre entornos.
- **Datos de tarjeta/PCI**: `NO VERIFICADO` en esta pasada — no se ha auditado el flujo de pago con el mismo detalle que se hizo con Travelgate (bloqueado por la falta de credenciales de sandbox, Fase 3).
- **GDPR/almacenamiento/logs**: `NO VERIFICADO`.

---

## FASE 10 — Comparación final: Hotelbeds vs Travelgate vs RateHawk

🟢 Favorable · 🟡 Condicionado · 🔴 Desfavorable · ⚪ No verificado en esta auditoría

| Criterio | Hotelbeds | Travelgate | RateHawk |
|---|---|---|---|
| Acceso | 🟢 self-service, ya implementado en VIAO | 🟢 self-service total, sin registro | 🟡 requiere manager + cuestionario, no autoservicio |
| Sandbox | 🟢 abierto, 50 req/día (FPR-01) | 🟢 validado en vivo esta sesión | 🟡 existe y bien documentado, credenciales privadas, no probado |
| Search | 🟢 implementado en producción | 🟢 validado en vivo | 🟢 bien documentado, no probado en vivo |
| Quote/Prebook | 🟢 implementado (CheckRate) | 🟢 validado en vivo | 🟢 bien documentado (dos variantes de hash), no probado |
| Book | 🟢 implementado | 🟢 validado en vivo | 🟡 documentado, pero asíncrono (Create+poll) — orquestación nueva necesaria |
| Cancel | 🟢 implementado | 🟢 validado en vivo | 🟢 documentado, guía de reintento simple |
| Get Booking / consulta | ⚪ no verificado en esta auditoría | 🟢 validado en vivo (reconciliación funcionó) | 🟢 documentado ("Retrieve bookings"), no probado |
| Idempotencia | 🟡 diseño defensivo ya construido en VIAO, comportamiento exacto del proveedor no probado en vivo en esta sesión | 🔴 confirmado desfavorable — error explícito en reintento | 🟡 enfoque distinto (nuevo ID por intento) — riesgo de duplicado no descartado ni confirmado |
| Reconciliación | 🟡 prevista en el diseño (`booking_intents`), mecanismo del proveedor no verificado aquí | 🟢 confirmada y probada en vivo | 🟡 existe, pero no exigida explícitamente por el flujo oficial documentado |
| Errores | 🟢 modelo ya mapeado en código real | 🟢 catálogo real observado en vivo | 🟢 catálogo de estados bien documentado |
| Timeouts | ⚪ no revisado en esta auditoría | 🟢 confirmado con cifras reales | 🟢 bien documentado (60s/30s Search, poll 5s) |
| Rate limits | 🟡 50 req/día en sandbox (FPR-01) | ⚪ sin cifra pública | 🟡 formato documentado, cifra exacta depende de certificación |
| Cobertura España | 🟢 origen histórico confirmado | ⚪ sin cifra concreta | 🟡 señal de mercado real (top-5), sin cifra de inventario |
| Cobertura Barcelona | ⚪ no verificado con cifra concreta | ⚪ no verificado | ⚪ no verificado |
| Modelo económico | 🟢 confirmado (neto+markup) | ⚪ no público a nivel de plataforma | 🟢 3 modelos confirmados + campos de comisión expuestos en la API |
| Complejidad integración | 🟢 ya resuelta (única con código real funcionando) | 🟢 confirmada baja, sin cambios de contrato | 🟡 algo mayor — patrón async + dos hashes con vidas útiles distintas |
| Compatibilidad `HotelProvider` | 🟢 es el patrón de referencia | 🟢 confirmada sin cambios de tipos | 🟢 compatible conceptualmente, con matiz de orquestación async |
| Riesgo operativo | 🟡 bloqueado por respuesta comercial pendiente, no técnico | 🟡 acceso real descentralizado por supplier | 🟡 riesgo de duplicado no resuelto + acceso no autoservicio |
| Velocidad para VIAO | 🟡 inmediata técnicamente, bloqueada comercialmente | 🟢 la más rápida para empezar a probar (ya validado) | 🟡 requiere contacto previo, luego 14-30 días documentados de certificación |

---

## VEREDICTO FINAL

# YELLOW — sandbox parcialmente validado, requiere resolver bloqueadores de acceso y una pregunta de diseño abierta

RateHawk/ETG muestra la **documentación más precisa y detallada de los candidatos "nuevos" evaluados hasta ahora** (nombres de método reales, ciclo de vida exacto de hashes, catálogo de estados de reserva, guía oficial de reintento) — comparable en calidad a la de Travelgate. Pero, a diferencia de Travelgate, **esta auditoría no ha podido validar nada en vivo**: el sandbox existe y está bien documentado, pero requiere credenciales privadas que VIAO no tiene hoy, y obtenerlas exige un contacto comercial previo sin plazo público confirmado para esa primera etapa.

### Respuestas directas a las 7 preguntas del encargo

1. **¿RateHawk merece una integración futura?** Sí, condicionalmente — merece iniciar el contacto para obtener credenciales de sandbox y repetir entonces el mismo ejercicio de validación en vivo que se hizo con Travelgate. No merece saltar directamente a integración sin esa validación.
2. **¿Es mejor candidato que Travelgate técnicamente?** No se puede afirmar todavía — Travelgate fue validado en vivo (100% de las operaciones probadas con éxito) y RateHawk no (0%, por falta de credenciales). Documentalmente ambos están al mismo nivel de calidad y precisión.
3. **¿Tiene alguna ventaja sobre Travelgate?** Sí, reales: exposición explícita de commission/net/gross en la respuesta de tarifa (mejor para `getCommission()`); guía oficial más explícita sobre qué NO tratar como fallo (`processing`/`timeout`/`unknown` durante el polling); señal de mercado en España más fuerte que la de Travelgate.
4. **¿Qué falta para probarlo realmente?** Credenciales de sandbox privadas — contacto comercial/técnico con RateHawk, cuestionario del manager, sin plazo público confirmado para esa primera etapa (después, 14-30 días de certificación si el desarrollo avanza).
5. **¿Qué riesgos nuevos aparecen?** El riesgo de reserva duplicada al reintentar `Create` con un `partner_order_id` nuevo tras un timeout ambiguo — no confirmado ni descartado por la documentación pública consultada (Fase 4). Es un riesgo genuinamente distinto al de Travelgate, no necesariamente peor ni mejor.
6. **¿Qué preguntas debemos enviar a RateHawk?** (a) ¿Existe garantía real de deduplicación cuando se reintenta `Create` con un `partner_order_id` nuevo tras un timeout — puede producirse una reserva duplicada real? (b) ¿Cuál es el rate limit real antes de completar la certificación? (c) ¿Qué cobertura real existe en Barcelona específicamente, no solo "España" a nivel de mercado? (d) ¿Cuánto tiempo toma típicamente, en la práctica, desde el cuestionario inicial hasta recibir credenciales de sandbox? (e) ¿Cuáles son las condiciones exactas de cada uno de los 3 modelos comerciales (neto/comisión/afiliado) para una empresa en la fase actual de VIAO?
7. **¿Qué proveedor debería recibir el siguiente esfuerzo?** No es una elección excluyente — Travelgate ya tiene su sandbox validado y no necesita más esfuerzo inmediato; Hotelbeds sigue esperando respuesta, sin que este documento cambie eso; el siguiente esfuerzo productivo y no conflictivo es **iniciar el contacto comercial con RateHawk** para desbloquear su propia Fase 3, en paralelo, sin competir con la espera de Hotelbeds.

---

## Bloqueadores

- Credenciales de sandbox privadas (Fase 3) — requiere contacto comercial/técnico previo, sin plazo público confirmado para esa primera etapa.
- Condiciones comerciales exactas de los 3 modelos — no públicas.

## Riesgos

- Riesgo de reserva duplicada bajo el patrón de reintento documentado (Fase 4) — no resuelto.
- Complejidad de orquestación adicional (polling asíncrono) no presente en Hotelbeds/Travelgate.
- Cobertura de Barcelona/España no verificable más allá de una señal de mercado general.

## Preguntas abiertas para RateHawk

Ver punto 6 del veredicto, arriba.

---

## Fuentes consultadas

- [Introducing the RateHawk API Sandbox — blog.ratehawk.com (oficial)](https://blog.ratehawk.com/introducing-the-ratehawk-api-sandbox/)
- [Emerging Travel Group API — docs.emergingtravel.com (oficial, portal raíz)](https://docs.emergingtravel.com/)
- Páginas oficiales referenciadas vía snippet de búsqueda (acceso directo bloqueado por protección anti-bot, `403 Forbidden` en WebFetch): `docs/integration-guide/`, `docs/fundamentals/authorization/`, `docs/fundamentals/requests/`, `docs/fundamentals/responses/`, `docs/best-practices-for-apiv3/`, `docs/api-usage-advices/`, `docs/affiliate-api/hotel-search/retrieve-hotelpage/`, `docs/affiliate-api/hotel-search/retrieve-rate-info/`, `docs/affiliate-api/hotel-search/prebook-rate-from-hotelpage-step/`, `docs/affiliate-api/hotel-search/search-by-region/`, `docs/b2b-api/hotel-search/search-by-hotel-ids/`, `docs/b2b-api/hotel-search/prebook-rate-from-hotelpage-step/`, `docs/affiliate-api/booking/create-booking-process/`, `docs/affiliate-api/booking/start-booking-process/`, `docs/affiliate-api/booking/check-booking-process/`, `docs/b2b-api/booking/check-booking-process/`, `docs/affiliate-api/post-booking/`, `docs/affiliate-api/post-booking/retrieve-bookings/`, `docs/b2b-api/post-booking/retrieve-bookings/`, `docs/midoffice-api/webhooks/receive-booking-changes-webhook/`.
- [Emerging Travel Group Reports Record Revenue — Hospitality Net](https://www.hospitalitynet.org/news/4131152/emerging-travel-group-reports-record-revenue-with-ratehawks-expansion-and-agentic-ai-integration)
- [Meliá's Bold Expansion in Spain... Emerging Travel Group — Travel And Tour World](https://www.travelandtourworld.com/news/article/melias-bold-expansion-in-spain-shakes-the-tourism-world-how-emerging-travel-group-supercharges-global-travel-access/)
- `docs/03_RESEARCH_VALIDATION/providers/VIAO_HOTEL_PROVIDERS_SCREENING.md`, `docs/99_ARCHIVE_V1/providers/FPR-01_evaluacion_proveedores.md`, `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_AUDIT.md`, `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_SANDBOX_VALIDATION.md` — contexto y comparación, no re-auditados.
- `lib/travel-provider/types.ts`, `lib/travel-provider/errors.ts`, `types/travel.ts` — contrato real de VIAO, contrastado en Fase 5.

---

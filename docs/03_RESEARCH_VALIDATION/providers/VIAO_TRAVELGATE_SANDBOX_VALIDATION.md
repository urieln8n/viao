---
STATUS: VALIDATION
ERA: Esta sesión
DOMAIN: Travel/Providers
AUTHORITY: Validación en vivo contra el sandbox real (GraphQL/curl)
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — Validación técnica del sandbox público de Travelgate Hotel-X

### Estado: VALIDACIÓN TÉCNICA — NO ES UNA INTEGRACIÓN. No se ha modificado ningún archivo de código, tipo, contrato ni Supabase.
### Continúa de: `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_AUDIT.md` (VERDICT: GREEN para prueba inmediata en sandbox, NO para producción). Hotelbeds sigue pendiente de respuesta — este documento NO sustituye esa decisión.
### Método: llamadas HTTP/GraphQL reales, ejecutadas en esta sesión, contra `https://api.travelgate.com` (el endpoint real de Travelgate, único tanto para test como para producción), usando exclusivamente la API key de test pública ya publicada en la documentación oficial de Travelgate. Ningún resultado de este documento está inventado — cada bloque de datos citado es la respuesta real y textual del sandbox.

---

## 1. Estado de la prueba

**Validación completada con éxito de punta a punta**: Search → Quote → Book → Cancel, más una consulta de reconciliación post-cancelación y una prueba deliberada de reintento duplicado. Todas las llamadas se ejecutaron contra el sandbox real, no simulado.

Adicionalmente, dado que la documentación pública (auditada en `VIAO_TRAVELGATE_AUDIT.md`) no detallaba la sintaxis exacta de las queries GraphQL (la documentación es una SPA renderizada en cliente, no accesible por scraping directo), esta sesión usó **introspección GraphQL real** (`__type`, `__schema`) contra el propio endpoint para descubrir el schema exacto — método más fiable que la documentación prosa para esta validación técnica.

---

## 2. Entorno utilizado

- Endpoint: `https://api.travelgate.com` (POST, `Content-Type: application/json`) — el mismo para test y producción, tal como documentaba la auditoría previa.
- Protocolo: GraphQL, confirmado por introspección real (`Query`/`Mutation` con namespace `hotelX`).
- Cliente: `client_demo` (el cliente de test documentado).
- Modo: `settings.testMode: true` — **hallazgo nuevo, no evidente en la documentación auditada previamente**: este flag es el que activa el enrutado automático a los accesses de prueba (`2`=HOTELTEST, `5647`=LOGITEST) sin necesidad de configurarlos manualmente.
- Access/contexto usado para las pruebas completas: `2` (supplier de test "HOTELTEST").

---

## 3. Credenciales utilizadas

**API key de test pública**: `test0000-0000-0000-0000-000000000000` — esta clave está publicada literalmente en la documentación oficial de Travelgate (ver `VIAO_TRAVELGATE_AUDIT.md`, sección 4); no es un secreto de VIAO ni de ninguna cuenta propia. No se ha creado, solicitado ni usado ninguna cuenta, API key propia, ni credencial real de VIAO en esta sesión. No se ha revelado ningún secreto que no estuviera ya público en la documentación del propio proveedor.

---

## 4. Search

Query real ejecutada (`hotelX.search`), con `criteria: {checkIn, checkOut, hotels: ["1"], occupancies}` y `settings: {client: "client_demo", testMode: true, context: "HOTELTEST", timeout: 25000}`.

**Hallazgo de proceso, no documentado explícitamente en la auditoría previa**: el código de hotel de ejemplo citado por la documentación (vía WebFetch en la auditoría previa, `ES284122`/`BR1518`) **no resultó válido** al probarlo. Se obtuvo el código real y verificado (`"1"`, entre 18 hoteles disponibles en el access de test) mediante la query de contenido `hotelX.hotels(criteria: {access: "2"})` — esto confirma que la documentación prosa, procesada por una herramienta de resumen automático en el turno anterior, no es una fuente 100% fiable para códigos de ejemplo exactos; **la introspección/llamada real al API sí lo es**, y así se ha procedido aquí.

**Resultado real**: 33 opciones devueltas para el hotel `"1"` ("Hotel Test PUSH"), combinando distintos `boardCode` (14, 1, 19), `paymentType` (MERCHANT, DIRECT, CARD_BOOKING, CARD_CHECK_IN) y tarifas (BAR, BARRF, BAR_USD, SUMMER_RATE), en EUR y USD, con `cancelPolicy.refundable` variando entre `true`/`false` según la tarifa. Ejemplo real de una opción:

```json
{"hotelCode":"1","hotelName":"Hotel Test PUSH","boardCode":"14","paymentType":"MERCHANT","status":"OK",
 "price":{"currency":"EUR","net":96.04,"gross":98,"binding":false},
 "cancelPolicy":{"refundable":false,"description":""}}
```

Advertencia no bloqueante recibida en la misma respuesta: `MAPPING_NOT_FOUND` para el access `5647` (LOGITEST) — ese access no reconoce el código `"1"` (pertenece al contexto HOTELTEST, no al suyo). No impidió obtener resultados del access `2` — comportamiento parcial correcto, no un fallo total.

---

## 5. Quote

Ejecutado con éxito sobre el `id` de la primera opción de Search.

**Hallazgo confirmado empíricamente** (coincide con lo ya documentado en la auditoría previa): el `optionRefId` que devuelve Quote es **distinto** del `id` recibido en Search — hay que usar siempre el de Quote para el siguiente paso (Book), nunca reutilizar el de Search.

Resultado real:
```json
{"hotelCode":"1","boardCode":"14","paymentType":"MERCHANT","status":"OK",
 "price":{"currency":"EUR","net":96.04,"gross":98,"binding":false},
 "cancelPolicy":{"refundable":false,"description":""},
 "errors":null,"warnings":null}
```
Precio idéntico al de Search (98 EUR gross) — sin cambios de tarifa entre ambos pasos en este caso concreto.

---

## 6. Book

Ejecutado con éxito usando el `optionRefId` de Quote, `clientReference: "VIAO-SANDBOX-TEST-0001"` (generado por esta sesión, mismo patrón que `booking_intents.client_reference`), `holder`/`paxes` con datos ficticios (permitido explícitamente por la documentación oficial).

**Hallazgo de proceso**: `rooms[].occupancyRefId` es **1-based**, no 0-based — no documentado explícitamente en `VIAO_TRAVELGATE_AUDIT.md`; descubierto mediante el propio error de validación del API (`"Rooms occupancyRefId should go from 1 to 1"`), que es preciso y accionable.

**Resultado real, reserva de prueba confirmada**:
```json
{"status":"OK",
 "reference":{"client":"VIAO-SANDBOX-TEST-0001","supplier":"5964378","bookingID":"n1@1[260915[...]"},
 "price":{"currency":"EUR","net":96.04,"gross":98},
 "cancelPolicy":{"refundable":false,"description":""}}
```
No se requirió tarjeta (la opción usada tenía `paymentType: MERCHANT`, no `DIRECT`/`CARD_BOOKING`/`CARD_CHECK_IN` — comportamiento exactamente como documentaba la auditoría previa). El `clientReference` propio de VIAO fue devuelto por eco exacto en `reference.client`.

---

## 7. Cancel

Ejecutado con éxito usando el `bookingID` real devuelto por Book.

**Resultado real**:
```json
{"status":"CANCELLED","cancelReference":"",
 "reference":{"client":"VIAO-SANDBOX-TEST-0001","supplier":"5964378","bookingID":""},
 "price":{"currency":"EUR","gross":96.04}}
```

**Verificación adicional** (no pedida explícitamente por el flujo mínimo, añadida por rigor): se volvió a consultar la reserva vía `hotelX.booking(bookingID:...)` después de cancelar — el estado se mantuvo consistente: `"status":"CANCELLED"`. El ciclo completo queda cerrado y verificado, no solo ejecutado.

---

## 8. Errores

Catálogo real de errores/avisos observados en esta sesión (todos reproducidos con llamadas reales, ninguno copiado de documentación sin verificar):

| Código | Tipo | Cuándo apareció | Naturaleza |
|---|---|---|---|
| `ACCESS_ERROR` | `VALIDATION_ERROR` | Al omitir `testMode`/`context` sin configurar accesses manualmente | Error de configuración de la petición — recuperable ajustando la petición |
| `207` (`12207`) | error de proceso | Código de hotel no reconocido por un access concreto | Respuesta válida "no disponible", no un fallo técnico |
| `MAPPING_NOT_FOUND` | `MAPPING_ERROR` | Código de hotel de un contexto pedido contra un access de otro contexto | Parcial/no bloqueante — otros accesses de la misma petición sí respondieron |
| `WRONG_FIELD` | `VALIDATION_ERROR` | `occupancyRefId` fuera de rango | Error de validación de la petición, mensaje preciso y accionable |
| `BadRequest` (`102`) | proveedor | Reintento de Book con el mismo `clientReference` ya usado | **Ver sección 10 — el hallazgo más importante de esta validación** |

Ningún error observado fue ambiguo en su origen (todos identifican con precisión qué falló); la única ambigüedad real detectada es la de la sección 10, y es una ambigüedad de **estado tras el intento**, no de causa del error.

---

## 9. Timeouts

- Techos ya documentados en la auditoría previa (Search 25.000 ms, Quote/Book 180.000 ms) — no se volvieron a poner a prueba en el techo exacto en esta sesión (no aporta información nueva, ya confirmados en la documentación oficial).
- **Hallazgo nuevo**: existe también un **suelo mínimo real** — al enviar `timeout: 1` (ms) en Search, el API lo rechazó con un error de validación explícito: `"Field timeout is null or lower than 00:00:00.0200000"` (es decir, un mínimo de ~20 ms). No documentado explícitamente en `VIAO_TRAVELGATE_AUDIT.md`.
- **No se ha forzado un timeout de red real** (p. ej., cortando la conexión a mitad de un Book) — no es reproducible de forma fiable ni segura desde este entorno de validación, y hacerlo de forma artificial sobre una reserva real de sandbox no aporta una señal fiable. Se marca explícitamente como **no probado**, no como simulado ni inventado.

---

## 10. Idempotencia

**Este es el hallazgo más importante de toda la validación.**

Se repitió, de forma deliberada, la llamada a Book **exactamente igual** (mismo `optionRefId`, mismo `clientReference: "VIAO-SANDBOX-TEST-0001"`, ya usado en la reserva exitosa de la sección 6):

```json
{"status":"UNKNOWN",
 "reference":{"client":null,"supplier":null,"bookingID":""},
 "price":null,"cancelPolicy":null}
```
```json
"errors":[{"code":"BadRequest","type":"102",
  "description":"Supplier error External: (BadRequest) Client reference VIAO-SANDBOX-TEST-0001 already exists. Please, choose another locator."}]
```

**Travelgate NO ofrece idempotencia automática al reenviar el mismo `clientReference`** — a diferencia del patrón que VIAO ya construyó para Hotelbeds (`redeem_reward()`/`complete_mission()`/`booking_intents`: reintentar con el mismo `attempt_id`/`client_reference` siempre devuelve la fila/resultado YA existente, nunca un error). Aquí, en cambio, el reintento devuelve un **error explícito** y un `status: "UNKNOWN"` — el mismo valor que, según la propia documentación oficial de Travelgate (auditada en el documento anterior), normalmente significa *"el sistema canceló automáticamente la reserva para evitar problemas"*.

**Verificación crítica realizada**: tras este reintento fallido, se consultó la reserva ORIGINAL vía `hotelX.booking(bookingID: ...)` — **seguía intacta y con `status: "OK"`**. El reintento duplicado no dañó ni canceló la reserva original; simplemente falló por su cuenta, de forma aislada.

**Consecuencia de diseño para una futura integración real** (no se implementa aquí, se deja documentado): un futuro `TravelGateProvider.book()` **no puede asumir** que reenviar el mismo `clientReference` tras un timeout/error es seguro y devolverá el resultado original, como sí puede asumirse hoy con `HotelbedsProvider`. La disciplina correcta sería: ante cualquier `ProviderAmbiguousError` (timeout, respuesta no interpretable), **antes de decidir nada**, consultar `hotelX.booking()` (por `bookingID` si se conoce, o por `accessCode + hotelCode + currency + references[]` si no, según `HotelCriteriaBookingInput`/`CriteriaBookingReferencesInput`, verificado por introspección) para conocer el estado real, y solo generar un `clientReference` nuevo si se confirma que la reserva original nunca se creó. Esto es coherente con el principio que `ProviderAmbiguousError` ya exige ("nunca reintentar automáticamente"), pero añade un matiz operativo nuevo y específico de Travelgate: reintentar con el MISMO `clientReference` sin reconciliar antes producirá un error visible, no un no-op seguro.

---

## 11. Mapping Travelgate → VIAO

| Concepto de VIAO | Concepto de Travelgate (verificado por introspección real) |
|---|---|
| `SearchParams` | `HotelCriteriaSearchInput` (`checkIn`, `checkOut`, `hotels[]`, `occupancies[]`) + `HotelSettingsInput` (`client`, `context`, `timeout`, `testMode`) |
| `SearchResults`/`Property[]` | `HotelSearch.options[]` (`HotelOptionSearch`) — un `Property` de VIAO agregaría varias `options` del mismo `hotelCode` (una por tarifa/board/paymentType), igual que Hotelbeds agrega tarifas por hotel |
| "Room"/"Rate" | Campos dentro de cada `HotelOptionSearch`: `boardCode`, `price`, `paymentType`, `rooms[]` |
| `PriceQuote` | `Price` (`currency`, `net`, `gross`, `binding`) |
| `Conditions.cancellationPolicy` | `CancelPolicy` (`refundable`, `description`, `cancelPenalties[]`) |
| Quote (paso intermedio, VIAO no lo modela como tipo propio hoy) | `HotelQuote.optionQuote` (`HotelOptionQuote`) — el `optionRefId` de aquí es el que debe viajar a Book, nunca el de Search |
| `BookingRequest`/`book()` | `HotelBookInput` (`optionRefId`, `clientReference`, `holder`, `rooms[{occupancyRefId, paxes[]}]`) |
| `BookingResult` | `HotelBookingDetail` (`status`, `reference.client/.supplier/.bookingID`, `price`, `cancelPolicy`) |
| `CancellationRequest`/`cancelBooking()` | `HotelCancelInput` (`bookingID` o `accessCode+hotelCode+reference`) |
| `CancellationResult` | `HotelCancelDetail` (`status`, `cancelReference`, `reference`, `price`) |
| `TravelProviderError` (4 clases) | `Error{code, type, description}` de Travelgate — mapeo por tipo: `VALIDATION_ERROR`/207/`MAPPING_ERROR` → `ProviderUnavailableError` o `ProviderError` según el caso; timeout de red real tras enviar Book/Cancel → `ProviderAmbiguousError` (no observado directamente en esta sesión, pero la sección 10 confirma que la ambigüedad post-intento es real y debe tratarse igual) |
| `clientReference` (`booking_intents.client_reference`) | `HotelBookInput.clientReference` — mismo campo conceptual, **semántica de fallo distinta** (sección 10) |

---

## 12. Compatibilidad con HotelProvider

**Confirmado, sin necesidad de ningún cambio de tipo/interfaz**: todo lo validado en esta sesión encaja dentro de los tipos ya existentes de `types/travel.ts` (`SearchParams`, `Property`, `PriceQuote`, `Conditions`, `BookingRequest`, `BookingResult`, `CancellationRequest`, `CancellationResult`) y del contrato `HotelProvider` (`lib/travel-provider/types.ts`) — un futuro `TravelGateProvider` sería una implementación hermana de `HotelbedsProvider`, mismo patrón, sin tocar el contrato.

**El único ajuste que un futuro `TravelGateProvider` necesitaría, que `HotelbedsProvider` no necesita en la misma medida**: la orquestación de `book()` (hoy en `app/booking/actions.ts` para Hotelbeds) tendría que incorporar el paso de reconciliación de la sección 10 como parte de su propia lógica — esto vive en la capa de orquestación, no exige ningún cambio en `HotelProvider`/`errors.ts`/`booking_intents` en sí.

---

## 13. Diferencias encontradas

1. `rooms[].occupancyRefId` es 1-based (no documentado explícitamente en la auditoría previa).
2. Reintentar Book con el mismo `clientReference` **no es un no-op seguro** — produce un error visible y `status: UNKNOWN` (sección 10), a diferencia del patrón de idempotencia ya construido para Hotelbeds.
3. `optionRefId` cambia entre Search y Quote — confirmado empíricamente (ya se sospechaba por documentación, ahora verificado).
4. `hotels[]` en Search debe coincidir con el `context` configurado o pasar por mapping FastX, que puede fallar de forma parcial en suppliers pequeños (observado con LOGITEST).
5. Existe un suelo mínimo real de `timeout` (~20 ms), no solo el techo ya documentado.
6. Los códigos de hotel de ejemplo citados por la documentación prosa (`ES284122`/`BR1518`) no resultaron válidos al probarlos — los códigos reales solo se obtuvieron mediante una llamada real (`hotelX.hotels()`).

---

## 14. Riesgos

- **El riesgo de idempotencia (sección 10) es el hallazgo con más impacto de diseño** de toda esta validación — debe incorporarse desde el primer diseño de un futuro `TravelGateProvider.book()`, no descubrirse en producción.
- Riesgo de mapping FastX incompleto entre distintos suppliers reales (visto en miniatura entre HOTELTEST/LOGITEST) — a mayor escala real (1.000+ suppliers), la superficie de fallos de mapping podría ser mayor.
- La documentación prosa de Travelgate no siempre coincide con el comportamiento real del API (hallazgo 6 de la sección 13) — para cualquier implementación futura, **validar contra el API real/introspección, no solo contra la documentación**, tal como se ha hecho en esta sesión.

---

## 15. Bloqueadores

- **Ninguno** para seguir validando/iterando en sandbox — sigue completamente abierto y operativo.
- Para producción: los mismos ya identificados en `VIAO_TRAVELGATE_AUDIT.md` (acceso comercial por supplier, sin cambios en esta sesión).

---

## 16. Qué funciona

Search, Quote, Book, Cancel, y consulta de estado de una reserva (`hotelX.booking()`) — los cinco, verificados con llamadas reales y resultados reales contra datos de prueba (`Hotel Test PUSH`, access `2`/HOTELTEST). El flujo completo Search→Quote→Book→Cancel se cerró sin ningún error no explicado.

---

## 17. Qué no funciona

- El reintento idempotente "ingenuo" (mismo `clientReference`) — falla con error, no devuelve la reserva original (sección 10).
- El access de test LOGITEST (`5647`) no pudo usarse en esta sesión para un flujo completo — solo se validó con HOTELTEST (`2`); el intento con LOGITEST solo produjo `MAPPING_NOT_FOUND`, atribuible a una limitación de los propios datos de test, no verificable si sería igual en un access real de producción.
- `getCommission()` no se ha podido verificar empíricamente — el access de test HOTELTEST no expuso ningún dato de "markup"/comisión distinguible en las respuestas de Book/Quote de esta sesión (podría deberse a que es un access de test sin condiciones comerciales reales, no necesariamente a una ausencia general de la funcionalidad).

---

## 18. Qué falta para producción

- Accesos comerciales reales (bloqueador ya documentado en la auditoría previa, sección 12/17/22).
- Diseñar explícitamente, en el futuro `complete_...` / orquestador de Travelgate, el paso de reconciliación por `bookingID`/`references` descrito en la sección 10 — no existe hoy en ningún código de VIAO porque nunca fue necesario con el patrón de Hotelbeds.
- Verificar la longitud máxima real permitida para `clientReference` con un access real (no se topó ningún límite en esta sesión con un string corto de 23 caracteres, pero no se ha probado el límite).
- Verificar `getCommission()` contra un access con condiciones comerciales reales (no posible en el sandbox de test).
- Confirmar si el comportamiento de idempotencia (sección 10) es igual en todos los suppliers reales o varía por supplier (el error `BadRequest 102` se describe como "Supplier error External" — podría depender del supplier concreto, no ser un comportamiento uniforme de Travelgate).

---

## 19. Recomendación

# GREEN — sandbox validado y contrato compatible

El sandbox de Travelgate Hotel-X queda **validado técnicamente de punta a punta** (Search/Quote/Book/Cancel, con datos reales, sin inventar ningún resultado) y **compatible con el contrato `HotelProvider` de VIAO sin necesidad de cambiarlo**. Esto confirma, con evidencia empírica y no solo documental, el VERDICT GREEN de `VIAO_TRAVELGATE_AUDIT.md` para el propósito específico de "prueba/validación inmediata del flujo."

**Con una condición explícita de diseño, no un bloqueador**: cualquier implementación futura de `TravelGateProvider.book()`/`cancelBooking()` debe incorporar desde el inicio el paso de reconciliación descrito en la sección 10 — el patrón de idempotencia "reintentar es siempre seguro" que VIAO ya construyó para Hotelbeds **no se cumple igual aquí**, y asumir que sí lo haría sería el error más costoso de trasladar a producción sin haberlo detectado antes. Esta condición no cambia el GREEN — lo hace un GREEN informado, no un GREEN ingenuo.

Esta validación **no decide el proveedor final de VIAO** ni sustituye la espera de Hotelbeds — es una prueba técnica más, cuyo resultado alimenta la futura matriz comparativa de 10 proveedores ya anunciada.

---

## Fuentes / evidencia

Todo el contenido de este documento proviene de llamadas HTTP/GraphQL reales ejecutadas en esta sesión contra `https://api.travelgate.com`, usando la API key de test pública documentada por Travelgate (sección 3), más introspección GraphQL del propio schema (`__type`/`__schema`) para determinar la sintaxis exacta cuando la documentación prosa (SPA renderizada en cliente, no accesible por scraping directo) no bastaba. Ningún dato de este documento ha sido copiado sin verificar ni inventado — cada bloque JSON citado es una respuesta real y textual del sandbox, tal como se recibió.

`docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_AUDIT.md` — auditoría documental previa, punto de partida de esta validación.
`lib/travel-provider/types.ts`, `lib/travel-provider/errors.ts`, `lib/travel-provider/hotelbeds-provider.ts`, `types/travel.ts` — contrato real de VIAO, contrastado en las secciones 11-12.

---

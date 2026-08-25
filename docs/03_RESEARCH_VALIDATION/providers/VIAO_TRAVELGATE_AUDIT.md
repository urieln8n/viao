---
STATUS: VALIDATION
ERA: Esta sesión
DOMAIN: Travel/Providers
AUTHORITY: Auditoría documental — VERDICT GREEN (alcance sandbox únicamente)
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — Auditoría Travelgate (Hotel-X) como proveedor alternativo

### Estado: AUDITORÍA — NO ES UNA DECISIÓN. No se ha implementado nada, no se ha conectado nada.
### Contexto: VIAO en Beta/MVP. Hotelbeds NO está activo — caso comercial/técnico pendiente de respuesta. Este documento NO asume que Hotelbeds vaya a estar disponible ni sustituye esa decisión.
### Continúa de: `docs/99_ARCHIVE_V1/providers/FPR-01_evaluacion_proveedores.md` (2026-08-19), que identificó "TravelgateX" como candidato adicional no investigado en profundidad ("agregador B2B con API única sobre 600+ proveedores... no se ha profundizado al mismo nivel en esta pasada").
### Método: lectura directa de la documentación oficial en `docs.travelgate.com` (dominio oficial actual — el histórico `docs.travelgatex.com`/"TravelgateX" es la misma compañía, nombre previo de marca) y del código real de `lib/travel-provider/`, `types/travel.ts`, `supabase/migrations/*booking_intents*`. Cada hallazgo se etiqueta según su fuente:

- **[CONFIRMADO]** — verificado leyendo directamente la documentación oficial de Travelgate en esta auditoría.
- **[SANDBOX]** — confirmado como disponible en el entorno de test/sandbox.
- **[REQUIERE CUENTA]** — requiere crear una cuenta/API key propia, sin necesitar aprobación comercial.
- **[REQUIERE COMERCIAL]** — requiere un acuerdo comercial/aprobación previa.
- **[DESCONOCIDO]** — no encontrado en la documentación pública consultada en esta auditoría; requiere preguntar directamente a Travelgate.

No se ha inventado ningún acceso, credencial, supplier, precio, disponibilidad ni condición comercial. Donde la documentación no lo dice, se marca `[DESCONOCIDO]` explícitamente.

---

## 1. Executive Summary

Travelgate (marca actual del proyecto conocido anteriormente como "TravelgateX") es un **marketplace/agregador B2B de conectividad hotelera**, no un proveedor de inventario propio. Su producto relevante para VIAO es **Hotel-X Pull Buyers API** (GraphQL), que da acceso a un flujo Search → Quote → Book → Cancel contra un marketplace que reclama más de 1.000 suppliers conectados.

**Hallazgo central de esta auditoría**: el **sandbox de Hotel-X es excepcionalmente abierto** — más incluso que el de Hotelbeds (FPR-01) — con una API key de test **pública, hardcodeada en la documentación** (`test0000-0000-0000-0000-000000000000`), sin necesidad de registrarse, con datos de prueba reales precargados. Esto permite validar HOY MISMO, sin ninguna aprobación, el flujo técnico completo (Search/Quote/Book/Cancel) contra la arquitectura `TravelProvider` ya existente de VIAO.

**Pero** el acceso a inventario **real** (producción) sigue un modelo **descentralizado**: Travelgate no es un único punto de contacto comercial — cada supplier detrás del marketplace requiere su **propio acuerdo comercial individual**, solicitado vía un "Auto-Activations Form". Esto es estructuralmente distinto del modelo de Hotelbeds (un único wholesaler, una única certificación).

**Conclusión de esta auditoría (no decisión de proveedor)**: Travelgate es un candidato fuerte para **validar el flujo técnico de VIAO en sandbox, de inmediato**, mientras se espera respuesta de Hotelbeds — no para sustituir a Hotelbeds como fuente de inventario real de Barcelona/España sin antes resolver varios bloqueadores comerciales y técnicos todavía desconocidos.

---

## 2. Estado actual de Travelgate

- Nombre de marca actual: **Travelgate** (`travelgate.com`, `docs.travelgate.com`, `api.travelgate.com`). `TravelgateX`/`docs.travelgatex.com` es el nombre/dominio previo de la misma compañía — ambos aparecen en fuentes recientes; se trata como la misma entidad. **[CONFIRMADO]**
- Producto relevante para VIAO: **Hotel-X Pull Buyers API** — API de "demanda" (Buyer) para tirar (`pull`) disponibilidad/precio/contenido en tiempo real desde múltiples suppliers. **[CONFIRMADO]**
- Existen otros productos no relevantes para VIAO en este momento: ChannelX Push Buyers API (el supplier empuja datos, no VIAO), Hotel Sellers Pull/Push API (para quien vende inventario A Travelgate, no para quien compra), Inventory Set Up APIs. **[CONFIRMADO]**
- Cifras de red que Travelgate declara sobre sí misma (marketing propio, **no auditadas de forma independiente en esta investigación**): "1.000+ suppliers", "1.000+ buyers", "9.000 millones de búsquedas/día", "65.000+ reservas/día", "99,99% uptime". **[CONFIRMADO como declaración oficial de Travelgate — no verificado de forma independiente]**

---

## 3. Hotel-X

- Protocolo: **GraphQL** (no REST, no SOAP) — con GraphQL Playground y "API Explorer" como herramientas de desarrollo. **[CONFIRMADO]**
- Endpoint único: `https://api.travelgate.com` — el mismo endpoint sirve tanto para test como para producción; lo que cambia es la API key usada, no la URL. **[CONFIRMADO]**
- Flujo obligatorio para confirmar una reserva: **Search → Quote → Book** (los tres pasos son necesarios; Quote revalida precio/condiciones porque pueden haber cambiado desde Search — "la información de Quote siempre tiene precedencia sobre la de Search"). Cancel es una operación aparte, post-booking. **[CONFIRMADO]**
- Existe una API "Legacy" (Hotel Buyers Legacy API) marcada como **deprecada** en la propia documentación — esta auditoría se centra exclusivamente en la API GraphQL vigente (Hotel-X Pull Buyers API), no en la legacy. **[CONFIRMADO]**

---

## 4. Sandbox/Test

- **Disponible de inmediato, sin registro previo confirmado en la documentación de este flujo concreto**: la propia guía de inicio rápido indica que se puede "probar los ejemplos de query/mutation usando una API key de test y datos de prueba precargados directamente en el playground". **[SANDBOX] [CONFIRMADO]**
- API key de test **pública y documentada literalmente**: `test0000-0000-0000-0000-000000000000`. **[SANDBOX] [CONFIRMADO]**
- Client de test: `client_demo`. **[SANDBOX] [CONFIRMADO]**
- Mismo endpoint que producción (`https://api.travelgate.com`) — no hay un dominio de sandbox separado como `api.test.hotelbeds.com`. **[CONFIRMADO]**
- Advertencia explícita de la documentación: estas credenciales/códigos de hotel son "únicamente para desarrollo y pruebas — no usar en producción". **[CONFIRMADO]**
- Comparado con Hotelbeds (FPR-01: sandbox abierto pero con registro developer previo, límite de 50 req/día): el sandbox de Travelgate, tal como está documentado, es **aún más ligero de arrancar** — no exige ni siquiera crear una cuenta para empezar a probar con la API key pública. No se ha encontrado en esta auditoría ningún límite de peticiones/día publicado para el sandbox — **[DESCONOCIDO]**, preguntar directamente.

---

## 5. Credenciales y acceso

- Autenticación real (no-test): header `Authorization: Apikey xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`. **[CONFIRMADO]**
- Las API keys propias se gestionan en `app.travelgate.com/settings/apikeys` (login en la app de Travelgate) — **[REQUIERE CUENTA]** para generar una key propia, aunque la key de test pública no la necesita.
- La documentación advierte que la key generada solo se muestra completa una vez, en el momento de crearla — no se puede recuperar después. **[CONFIRMADO]**
- Existen dos protocolos de autenticación mencionados: **API Key** e **Identity** (este último con SSO/social login y un "OAuth playground") — el detalle exacto de cuándo se usa cada uno **[DESCONOCIDO]**, no profundizado en esta pasada.
- **Distinción crítica**: tener una API key (propia o de test) da acceso técnico al API — **no** da acceso a inventario real de ningún supplier concreto. Ver sección 12.

---

## 6. Search

- Parámetros obligatorios: `checkIn`/`checkOut` (YYYY-MM-DD), `hotels[]` (lista de códigos de hotel — máximo recomendado **200 códigos por petición**), `occupancies[]` (pax por habitación). `destinations[]` solo disponible con el "Search by Destination plugin" activado en el contexto del Supplier. **[CONFIRMADO]**
- Parámetros opcionales: `language`, `currency`, `nationality`, `markets` — con valores por defecto si se omiten (el valor exacto por defecto **[DESCONOCIDO]**, no publicado en la página consultada). **[CONFIRMADO que existen; DESCONOCIDO el default exacto]**
- Respuesta incluye: código de hotel (en contexto FastX y en contexto del supplier original — ambos a la vez), nombre, board, habitaciones con precio, reembolsabilidad, penalizaciones de cancelación, reglas de tarifa, amenities. **[CONFIRMADO]**
- Multi-supplier: la documentación **recomienda explícitamente** usar un "aggregation plugin" (p. ej. "Cheapest Price") cuando se consulta más de un supplier/access a la vez, porque la respuesta puede volverse muy grande. **[CONFIRMADO]**
- Timeout máximo de Search: **25.000 ms**. **[CONFIRMADO]**

---

## 7. Quote

- Propósito: revalida el precio/condiciones de una opción concreta ya seleccionada en Search, justo antes de reservar — "siempre la fuente de verdad más actualizada, tiene precedencia sobre Search". **[CONFIRMADO]**
- Devuelve: tarifa actualizada, desglose de precio, políticas de cancelación (si el supplier las expone). **[CONFIRMADO]**
- Timeout máximo: **180.000 ms**. **[CONFIRMADO]**
- Query específica documentada: `Hotel-X Development - Quote Query`. **[CONFIRMADO, existencia — contenido detallado no profundizado en esta pasada]**

---

## 8. Book

- Requiere: `optionRefId` (de Quote), `clientReference` ("Booking ID en el sistema del cliente" — **equivalente directo y confirmado al concepto de idempotencia que VIAO ya usa**, ver sección 19), `holder` (nombre/apellido), `rooms[]` con pax por habitación. **[CONFIRMADO]**
- Ajustes obligatorios: `client` (identificador de cliente/tráfico) y `timeout` (máximo **180.000 ms**). **[CONFIRMADO]**
- Pago: tarjeta obligatoria solo si el `paymentType` de la opción es `DIRECT`, `CARD_BOOKING` o `CARD_CHECK_IN` — con campos de tarjeta completos (tipo, titular, número, CVC, caducidad) y soporte opcional de 3D Secure. Existen por tanto tarifas que NO exigen tarjeta en el momento de reservar (modelo de pago diferido/"pay at property", pendiente de confirmar caso por caso). **[CONFIRMADO]**
- Pasajeros: "no es obligatorio dar nombres/edades reales para todos los pasajeros" — dato relevante para pruebas en sandbox. **[CONFIRMADO]**
- Estados de respuesta: `OK` (reserva confirmada sin problemas), `ON_REQUEST` (pendiente, puede cambiar de estado después), `UNKNOWN` (**"el sistema canceló automáticamente la reserva para evitar problemas"**), `CANCELLED`. **[CONFIRMADO]**
- Advertencia explícita y crítica de la propia documentación: **"si recibes un error y un status de reserva OK en la respuesta de Book, el error prevalece sobre el estado de la reserva"** — hay que verificar con el seller ante cualquier discrepancia. **[CONFIRMADO]**
- Existe validación de "delta price" configurable (tolerancia de diferencia de precio entre Quote y Book, en importe o porcentaje). **[CONFIRMADO]**
- `bookingID` (identificador interno de Travelgate) + `reference.client` (localizador de VIAO) + `reference.supplier` (localizador del proveedor real, opcional, hay que pedirlo explícitamente). **[CONFIRMADO]**

---

## 9. Cancel

- Dos formas de identificar la reserva a cancelar: por `bookingID`, o por `(accessCode, hotelCode, reference)`. **[CONFIRMADO]**
- Ajustes obligatorios: `client` y `timeout`. **[CONFIRMADO]**
- Estados de respuesta: `CANCELLED`, `OK` (la reserva sigue activa, no se canceló), `ON_REQUEST`, `UNKNOWN`. **[CONFIRMADO]**
- Cálculo de la política de cancelación: siempre respecto a la fecha/hora **local del destino**, usando UTC como referencia interna. **[CONFIRMADO]**
- Advertencia explícita: ante un status distinto de `CANCELLED` o un error común, **"es responsabilidad del Buyer comprobar el estado final de la cancelación en el sistema del Seller"** — Travelgate no garantiza resolver la ambigüedad por sí sola. **[CONFIRMADO]**

---

## 10. Content / hoteles

- `HotelData` (contenido estático, separado de disponibilidad/precio en vivo): nombre, descripciones (filtrables por tipo/idioma), categoría/estrellas, imágenes, amenities (`amenities`/`allAmenities`, con mapeo), ubicación/geolocalización, contacto, tipo de propiedad, `chainCode`, `rank`, tipos de tarjeta aceptados, información de check-in/check-out, tasas obligatorias. **[CONFIRMADO]**
- Arquitectura confirmada: contenido estático (estructura/descripción del hotel) y disponibilidad/precio en vivo (Search/Quote/Book) son conceptos separados en el schema — **[DESCONOCIDO]** si esto implica una llamada aparte (como el Content API separado de Hotelbeds, que exige sincronización previa) o si el contenido llega ya incluido dentro de la respuesta de Search en la práctica — no verificado empíricamente en esta auditoría (requeriría una llamada real de sandbox, fuera de alcance de "no implementar" de este turno).

---

## 11. FastX

- Es una **capa de estandarización** sobre Hotel-X, no un producto/API aparte con su propio flujo de reserva. **[CONFIRMADO]**
- Propósito: dar códigos únicos ("FastX codes") para hoteles, tipos de habitación y planes de comida, **compartidos entre todos los suppliers del marketplace**, devueltos JUNTO a los códigos nativos de cada supplier en la misma respuesta ("dual-code") — mapea y estandariza automáticamente descripciones de habitación heterogéneas entre suppliers. **[CONFIRMADO]**
- Objetivo declarado: eliminar la necesidad de que el Buyer mantenga su propio mapeo manual hotel-por-hotel entre distintos suppliers ("Zero Mapping Chaos"). **[CONFIRMADO]**
- Hay un supplier de test específico para FastX en el sandbox: "FastX test supplier (static master data)", access code `34538`. **[SANDBOX] [CONFIRMADO]**

---

## 12. Suppliers / Access

- **Modelo confirmado, el hallazgo más importante de esta auditoría para la parte comercial**: para obtener un `access code` real de un Seller, **"hay que establecer un acuerdo comercial con el Partner deseado y solicitar la activación vía el Auto-Activations Form"**. **[REQUIERE COMERCIAL] [CONFIRMADO]**
- **Cada supplier tiene su propio proceso de aprobación, independiente de los demás** — "algunos pueden requerir solo campos básicos, otros datos adicionales o endpoints específicos". **[CONFIRMADO]**
- **Travelgate NO es un único punto de contacto comercial para inventario real** — a diferencia de Hotelbeds (FPR-01: una sola certificación, un solo interlocutor `apitude@hotelbeds.com`), aquí VIAO tendría que negociar, en principio, con **cada** supplier concreto cuyo inventario quiera usar. **[CONFIRMADO, y es una diferencia estructural relevante frente a Hotelbeds]**
- Una vez aprobado, las credenciales del supplier se almacenan de forma segura dentro de la configuración de "access" en Travelgate — VIAO no las gestiona ni las reenvía en cada petición (a diferencia de sistemas legacy). **[CONFIRMADO]**
- Terminología: **"access"** = conjunto de credenciales que conecta a un Buyer con un Seller concreto; **"client"** = etiqueta que VIAO usaría para categorizar su propio tráfico (p. ej. separar B2B/B2C, si aplicara); **"supplier"** = la integración concreta que expone un Seller (un mismo Seller puede tener varios supplier codes, p. ej. uno PULL y otro PUSH). **[CONFIRMADO]**
- Qué suppliers concretos cubren Barcelona/España, con qué calidad de inventario — **[DESCONOCIDO]**, no publicado de forma pública/general; solo se conoce tras negociar accesos concretos.

---

## 13. Multi-supplier

- Confirmado como el núcleo del modelo de negocio de Travelgate: una única integración técnica (Hotel-X) puede consultar múltiples suppliers en una sola Search. **[CONFIRMADO]**
- La documentación recomienda activamente usar un "aggregation plugin" (p. ej. Cheapest Price, que agrupa resultados por clave configurable y selecciona la opción más barata por grupo) cuando se consultan varios suppliers/accesses a la vez, para evitar respuestas excesivamente grandes. **[CONFIRMADO]**
- FastX (sección 11) es el mecanismo que hace que esa agregación multi-supplier sea manejable sin mapeo manual. **[CONFIRMADO]**
- Importante para VIAO: esta multiplicidad ocurre **dentro** de Travelgate — VIAO seguiría viendo una única respuesta unificada por Search, sin necesidad de gestionar varios "providers" en su propio código (ver sección 20).

---

## 14. Errores y timeouts

- Catálogo de errores documentado (Hotel-X Buyers): **[CONFIRMADO]**

| Código | Significado |
|---|---|
| 101 | Error interno |
| 102 | Error del supplier |
| 103 | Demasiadas peticiones al supplier |
| 104 | Timeout de conexión con el supplier |
| 105 | Error de comunicación |
| 106 | Petición abortada por el cliente |
| 201 | Error recuperando datos |
| 204 | Sin resultados |
| 205 | Candidato de habitación no soportado |
| 206 | Fechas no soportadas |
| 207 | Petición no aceptada por el supplier |
| 301 | Opción no encontrada en Quote |
| 302 | Hotel no encontrado |
| 303 | Reserva no confirmada |

Además existen categorías más generales: `HubStatus` codes, códigos HTTP estándar, `VALIDATION_ERROR`, `PLUGIN_ERROR`, `MAPPING_ERROR`, `TRAFFIC_OPTIMIZATION_ERROR`, "Connector errors". **[CONFIRMADO su existencia; catálogo completo no volcado en esta pasada]**

- Timeouts máximos confirmados: **Search 25.000 ms, Quote 180.000 ms, Book 180.000 ms**, Cancel exige también un `timeout` obligatorio (valor máximo exacto para Cancel **[DESCONOCIDO]**, no encontrado en la página de timeouts consultada). **[CONFIRMADO para Search/Quote/Book]**
- El timeout se aplica de forma **uniforme a todos los suppliers de una misma petición** — no se puede fijar un timeout distinto por supplier dentro de la misma llamada. **[CONFIRMADO]**
- Si se supera el máximo permitido, el sistema lo recorta automáticamente al límite — lo cual puede provocar errores `HANDLER_TIMEOUT` si el timeout real configurado en VIAO es más corto que ese límite recortado. **[CONFIRMADO]**
- Guía oficial de reintento: "problemas ocasionales de red pueden causar timeouts; reintentar la operación puede resolverlo, especialmente en Search" — pero para Book/Cancel la propia documentación pide comprobar el estado real antes de reintentar (ver secciones 8-9), coherente con el propio catálogo de estados ambiguos (`ON_REQUEST`/`UNKNOWN`). **[CONFIRMADO]**

---

## 15. Rate limits

- **No se ha encontrado ningún límite numérico de peticiones/segundo o /minuto impuesto por Travelgate sobre el propio Buyer**, en la documentación pública consultada en esta auditoría. **[DESCONOCIDO]**
- Lo único documentado y relacionado es el error **103 "demasiadas peticiones al supplier"** — pero es un error que refleja el límite que EL SUPPLIER impone (no Travelgate), y es una respuesta de error, no un contrato de rate-limit publicado con cifras. **[CONFIRMADO que existe el error; DESCONOCIDO cualquier cifra de rate-limit propio de Travelgate]**
- La documentación sí recomienda buenas prácticas de rendimiento: limitar `hotels[]` a ~200 códigos por Search, desactivar `auditTransactions` cuando no se necesite para mejorar el rendimiento. **[CONFIRMADO]**
- **Pregunta directa necesaria a Travelgate** antes de cualquier prueba de volumen real (ver sección 23).

---

## 16. Seguridad

- Transporte: `https://api.travelgate.com` (HTTPS). **[CONFIRMADO, implícito en toda la documentación — no se ha encontrado una página dedicada de política de seguridad/certificaciones]**
- Autenticación: API key en header `Authorization: Apikey ...`; existe también un protocolo "Identity" (SSO/social login, OAuth playground) cuyo caso de uso exacto **[DESCONOCIDO]**, no profundizado. **[CONFIRMADO la existencia de ambos mecanismos]**
- Pago con tarjeta: soporta 3D Secure (versión, `DSTransactionID`, `XID`, `ECI`, `CAVV`, estados de verificación) cuando el `paymentType` de la tarifa lo exige. **[CONFIRMADO]**
- Certificaciones de seguridad (PCI-DSS u otras), política de retención de datos de tarjeta, cumplimiento GDPR explícito — **[DESCONOCIDO]**, no encontrado en la documentación técnica consultada (fuera del alcance típico de la documentación de API; normalmente vive en documentos legales/comerciales aparte).

---

## 17. Modelo comercial

- **Acceso técnico al API (sandbox)**: gratuito y sin fricción — confirmado, sección 4. **[SANDBOX] [CONFIRMADO]**
- **Acceso a inventario real**: requiere acuerdo comercial **individual por supplier**, no con Travelgate como entidad única (sección 12). **[REQUIERE COMERCIAL] [CONFIRMADO]**
- **¿Cobra Travelgate a VIAO una tarifa propia por usar la plataforma** (por encima de lo que cada supplier cobre), tipo fee de marketplace/transacción? — **[DESCONOCIDO]**, no publicado en ninguna página consultada.
- **¿Cuál es el modelo económico de cada supplier individual** (neto+markup como Hotelbeds, comisión como Booking.com, o varía por supplier)? — **[DESCONOCIDO]**, depende de cada acuerdo comercial concreto, no es un dato único de "Travelgate" como plataforma.
- Del lado Supply (para quien VENDE inventario a través de Travelgate, no el caso de VIAO): "integración Pull gratuita para suppliers" — **dato que confirma que Travelgate monetiza principalmente del lado supplier/volumen, no necesariamente cobrando por API key al Buyer**, pero esto es una inferencia razonable, no una confirmación directa de que el acceso Buyer sea gratis en producción. **[CONFIRMADO el dato de Sellers; INFERENCIA, no confirmación, para el caso Buyer]**
- Comparación directa con Hotelbeds (FPR-01): Hotelbeds = tarifa neta mayorista + markup propio de VIAO, con una única certificación. Travelgate = desconocido a nivel de plataforma, potencialmente distinto por cada supplier detrás del marketplace.

---

## 18. Cobertura

- Cifra declarada por Travelgate (marketing propio, no auditado de forma independiente): "1.000+ suppliers", cobertura global. **[CONFIRMADO como declaración oficial; no verificado de forma independiente]**
- Cobertura específica en Barcelona/España, número real de hoteles reservables en el mercado objetivo de VIAO — **[DESCONOCIDO]**, no publicado de forma pública desglosada; solo sería visible tras acceder a accesos reales de suppliers concretos.
- Los 3 suppliers de test del sandbox (sección 4) son de alcance muy limitado (unos pocos códigos de hotel de ejemplo, ES284122/BR1518) — **útiles para validar el flujo técnico, no representativos de cobertura real**. **[CONFIRMADO]**

---

## 19. Compatibilidad con VIAO

Contrastado directamente contra `lib/travel-provider/types.ts`, `types/travel.ts`, `lib/travel-provider/errors.ts` y `lib/travel-provider/hotelbeds-provider.ts` (código real, leído en esta auditoría):

- **`HotelProvider.search()`** ↔ Hotel-X `Search`: compatible conceptualmente sin fricción — ambos son "destino/hoteles + fechas + ocupación → lista de opciones". **Match directo.**
- **`checkAvailability()` + `getPrice()` + `getConditions()`** (3 métodos separados en el contrato de VIAO) ↔ Hotel-X en realidad no separa "disponibilidad" de "precio" de "condiciones" como 3 conceptos independientes — todo viene junto en el mismo resultado de Search/Quote (igual que ya ocurre con Hotelbeds: `HotelbedsProvider` ya resuelve exactamente este mismo desajuste llamando una vez a `requestHotels()` y troceando el resultado en 3 formas distintas, ver `hotelbeds-provider.ts` líneas 392-477). **El patrón ya existe y ya funciona — no requiere ningún cambio de contrato, solo una nueva implementación que repita el mismo truco.**
- **`book(request, clientReference?)`** ↔ Hotel-X `Book`: **coincidencia notablemente directa**. El campo `clientReference` de Travelgate ("Booking ID en el sistema del cliente") es conceptualmente idéntico al `clientReference`/`booking_intents.client_reference` que VIAO YA construyó específicamente para Hotelbeds (FPR-04.6/04.9) — el mismo parámetro opcional que el contrato `HotelProvider.book()` ya expone hoy serviría sin cambios.
- **Estados de Book** (`OK`/`ON_REQUEST`/`UNKNOWN`/`CANCELLED`) ↔ `BookingStatus` de VIAO (`'pending'|'confirmed'|'cancelled'`, deliberadamente cerrado a solo esos 3 valores): `OK`→`confirmed`, `ON_REQUEST`→`pending` son mapeos directos y ya previstos por el propio diseño ("el mapper debe traducir a uno de estos 3 o fallar explícitamente" — `types/travel.ts` línea 180). `UNKNOWN` (Travelgate ya canceló la reserva por su cuenta para evitar problemas) mapea razonablemente a `cancelled`. **Ningún valor nuevo necesario.**
- **La advertencia oficial de Travelgate "si hay error y status OK, el error prevalece"** (sección 8) describe exactamente la misma clase de ambigüedad que `ProviderAmbiguousError` (`lib/travel-provider/errors.ts`) ya fue diseñado para capturar en Hotelbeds — un timeout de red tras enviar `Book` no debe tratarse nunca como "seguro que falló". **Mismo problema, misma solución arquitectónica ya construida — reutilizable sin cambios de diseño.**
- **`cancelBooking()`** ↔ Hotel-X `Cancel`: mismo match directo; la advertencia de Travelgate ("responsabilidad del Buyer comprobar el estado final") es exactamente el mismo caso que `ProviderAmbiguousError` en `HotelbedsProvider.cancelBooking()` ya maneja.
- **`getCommission()`**: Book/Quote devuelven precio bruto/neto y "detalles de markup si aplica" — plausible pero **no verificado empíricamente** en esta auditoría (requeriría una llamada real de sandbox, fuera de alcance de "no implementar" de este turno).
- **Modelo de errores** (`ProviderUnavailableError`/`ProviderError`/`ProviderAmbiguousError`/`ProviderNotSupportedError`): el catálogo de errores de Travelgate (sección 14) mapea con naturalidad — 204/205/206/301/302 → `ProviderUnavailableError` (respuesta válida de "no disponible"); 101/102/105/201/207/303 → `ProviderError` (fallo técnico); 103/104 → `ProviderError` o `ProviderAmbiguousError` según si el timeout ocurrió antes o después de que el supplier recibiera la petición (mismo criterio que ya aplica `HotelbedsProvider` a `network_error` vs `http_error`).

**Conclusión de compatibilidad**: no hay ningún desajuste estructural que exija cambiar `HotelProviderTypes`/`HotelProvider`/`errors.ts`. Un `TravelGateProvider` sería, arquitectónicamente, una implementación hermana de `HotelbedsProvider` — no un cambio de contrato.

---

## 20. Qué partes de TravelProvider actual podrían mapearse

| Pieza existente de VIAO | Mapeo con Travelgate |
|---|---|
| `lib/travel-provider/types.ts` (`HotelProvider`) | Sin cambios — un `TravelGateProvider` implementaría el mismo contrato, igual que `HotelbedsProvider` |
| `lib/travel-provider/errors.ts` | Sin cambios — las 4 clases ya cubren los casos observados en la documentación de Travelgate (sección 19) |
| `lib/travel-provider/index.ts` (selector `TRAVEL_PROVIDER`) | Extensible de forma aditiva: `TravelProviderKind` pasaría de `"mock" \| "hotelbeds"` a incluir `"travelgate"`, mismo patrón fail-safe ya usado (solo un valor exacto activa el provider real) |
| `types/travel.ts` (`SearchParams`, `Property`, `BookingRequest`, etc.) | Sin cambios de forma — son tipos de dominio ya deliberadamente agnósticos de proveedor; necesitarían un `lib/travelgate/mappers.ts` nuevo (equivalente a `lib/hotelbeds/mappers.ts`), no un cambio de estos tipos |
| `booking_intents` (Supabase) | **Sin cambios de schema** — ya es agnóstica de proveedor (`provider_name text`, `provider_property_id text`, `client_reference text`); un intent de Travelgate usaría `provider_name='travelgate'` |
| `bookings` (Supabase) | Mismo razonamiento — sin cambios de schema esperados |
| `properties` (caché) | Sin cambios de schema; necesitaría un job de sync de contenido equivalente a `lib/hotelbeds/sync-content.ts`, SI el contenido de Travelgate no viene ya incluido en Search (sección 10, punto no verificado) |
| Resolución destino→código (`lib/travel-provider/hotelbeds-destination-resolver.ts`, `destinations` cacheada) | **Mismo problema se repetiría** — Hotel-X también necesita códigos de hotel/destino concretos (`hotels[]`), no búsqueda libre por texto; requeriría su propio resolver/caché, mismo patrón ya construido una vez para Hotelbeds |
| `app/booking/actions.ts` (orquestación de `book()` + `booking_intents`) | Reutilizable tal cual — ya está desacoplado de qué `HotelProvider` concreto está activo |
| `lib/bookings/cancel-booking.ts` | Reutilizable tal cual, mismo razonamiento |

**No se propone ni se diseña ningún cambio de código en este documento** — la tabla anterior es análisis de compatibilidad, no una implementación.

---

## 21. Riesgos

1. **Acceso a inventario real descentralizado y de duración desconocida**: cada supplier requiere su propio acuerdo comercial (sección 12/17) — a diferencia de Hotelbeds, no hay un único proceso de certificación cuya duración se pueda estimar.
2. **Ausencia de cifras de rate-limit publicadas** (sección 15): riesgo de descubrir límites reales solo al toparse con el error 103/104 en producción.
3. **Modelo económico por-supplier desconocido**: sin saber si es neto+markup, comisión, o mixto, VIAO no puede modelar su margen hasta negociar accesos concretos.
4. **`getCommission()` no verificado empíricamente**: el dato de "markup" en la respuesta de Book/Quote no se ha comprobado contra una llamada real.
5. **Cobertura real de Barcelona/España desconocida**: el marketing "1.000+ suppliers" no dice nada sobre qué suppliers concretos cubren el mercado objetivo de VIAO.
6. **Complejidad añadida de FastX/multi-supplier**: aunque Travelgate resuelve la agregación server-side (sección 13), el propio concepto de "access", "client", "context" (sección 12) introduce una capa de configuración que Hotelbeds no tiene (una única cuenta, un único contexto).
7. **Certificaciones de seguridad/cumplimiento no confirmadas** (sección 16) — relevante si VIAO llega a procesar datos de tarjeta a través de Travelgate.

---

## 22. Bloqueadores

- **Para "prueba inmediata del flujo técnico en sandbox" (el objetivo explícito de este turno)**: **ningún bloqueador confirmado**. El sandbox está abierto hoy mismo, sin aprobación ni registro (sección 4).
- **Para inventario real/producción de Barcelona-España**: **bloqueador real y de duración desconocida** — el proceso de "Auto-Activations Form" por cada supplier (sección 12), sin ningún plazo ni criterio de aprobación publicado, estructuralmente equivalente en incertidumbre a la espera actual de Hotelbeds (no la sustituye, la duplica por cada supplier).
- **Para modelar el negocio (margen, comisión)**: bloqueador de información — el modelo económico exacto no es público (sección 17).

---

## 23. Qué debemos preguntar a Travelgate

1. ¿Existe algún límite de rate-limit propio de Travelgate (no del supplier) sobre las peticiones de un Buyer, y cuál es exactamente?
2. ¿Cuál es el proceso, tiempo estimado y criterio de aprobación del "Auto-Activations Form" para un Buyer nuevo, sin trayectoria de reservas, como VIAO en su fase actual?
3. ¿Travelgate cobra alguna tarifa propia (fee de plataforma/transacción) al Buyer, por encima de lo que cobre cada supplier individual?
4. ¿Qué suppliers concretos, de los 1.000+ declarados, tienen cobertura real y reservable en Barcelona/España?
5. ¿El modelo económico (neto+markup / comisión / mixto) se decide por supplier, o hay un modelo por defecto de la plataforma?
6. ¿El contenido de `HotelData` llega incluido en la respuesta de Search, o requiere una sincronización previa aparte (como el Content API de Hotelbeds)?
7. ¿Cuál es la longitud máxima permitida para `clientReference` en Book? (Hotelbeds exige máx. 20 caracteres — dato que ya condicionó el diseño de `booking_intents.client_reference` en VIAO.)
8. ¿Qué certificaciones de seguridad/cumplimiento (PCI-DSS, GDPR) tiene Travelgate como plataforma, especialmente para el manejo de datos de tarjeta en Book?
9. ¿Existen condiciones de terminación/portabilidad si VIAO decide dejar de usar Travelgate más adelante?
10. ¿El timeout máximo de Cancel es también 180.000 ms, o tiene un valor propio no documentado en la página de timeouts consultada?

---

## 24. Comparación Travelgate vs Hotelbeds

| Punto | Hotelbeds (FPR-01) | Travelgate (esta auditoría) |
|---|---|---|
| Protocolo | REST | GraphQL |
| Sandbox | Abierto, requiere registro developer, 50 req/día | Abierto, API key de test pública, sin registro confirmado necesario |
| Acceso a producción | Un único proceso de certificación, un único interlocutor (`apitude@hotelbeds.com`) | Descentralizado — un acuerdo comercial por cada supplier, sin interlocutor único |
| Modelo económico | Tarifa neta mayorista + markup propio de VIAO (confirmado) | Desconocido a nivel de plataforma — depende de cada supplier |
| Cobertura España | Origen y fuerte presencia histórica confirmada | Declarado "global", cobertura España no desglosada públicamente |
| Idempotencia de Book | `clientReference` (maxLength 20, ya integrado en `booking_intents`) | `clientReference` equivalente confirmado, longitud máxima desconocida |
| Ambigüedad tras timeout de Book | Documentado y ya resuelto en `HotelbedsProvider` (`ProviderAmbiguousError`) | Documentado de forma explícita por Travelgate ("el error prevalece sobre status OK") — mismo patrón, ya resuelto arquitectónicamente en VIAO |
| Multi-supplier | No aplica (un único wholesaler) | Núcleo del producto — agregación server-side, transparente para VIAO |
| Rate limits publicados | 50 req/día en sandbox (cifra exacta) | Ninguna cifra publicada |
| Compatibilidad con `HotelProvider` de VIAO | Ya implementado y probado (`HotelbedsProvider`) | Compatible sin cambios de contrato (análisis, sección 19) — no implementado |

**Lectura de esta comparación**: Travelgate no es "mejor o peor" que Hotelbeds de forma genérica — es **más fácil de empezar a probar técnicamente hoy**, pero **más incierto y potencialmente más lento para llegar a inventario real de Barcelona/España**, precisamente por su modelo descentralizado de acceso a suppliers. Esta tabla no sustituye la matriz comparativa de 10 proveedores que el propietario ha indicado que vendrá después.

---

## 25. VERDICT

# GREEN — candidato real para prueba inmediata

**Alcance exacto de este VERDICT (léase con precisión, no se está dando luz verde a producción)**:

- **GREEN, específicamente, para**: validar el flujo técnico completo de VIAO (Search → Quote → Book → Cancel, mapeado contra `HotelProvider`/`booking_intents`/el modelo de errores ya existente) usando el sandbox de Travelgate, **hoy, sin ninguna aprobación previa** — responde de forma directa a la pregunta exacta que abre este documento: "¿podemos validar el flujo real de hoteles de VIAO de forma rápida, segura y compatible... mientras esperamos a Hotelbeds?" — la respuesta técnica es sí.
- **NO es GREEN para**: sustituir a Hotelbeds como fuente de inventario real de Barcelona/España a corto plazo. Esa vía tiene un bloqueador comercial real y de duración desconocida (sección 22), estructuralmente distinto (descentralizado, por supplier) del proceso de Hotelbeds, no necesariamente más rápido.
- Esta auditoría **no decide el proveedor final de VIAO** — es un insumo para la matriz comparativa de 10 proveedores que sigue a este documento, tal como se ha indicado explícitamente.

---

## Fuentes consultadas

- [Travelgate Docs — Quickstart, Hotel-X Pull Buyers API](https://docs.travelgate.com/docs/apis/for-buyers/hotel-x-pull-buyers-api/quickstart/)
- [Travelgate Docs — Overview, Hotel-X Pull Buyers API](https://docs.travelgate.com/docs/apis/for-buyers/hotel-x-pull-buyers-api/content/overview/)
- [Travelgate — Demand & Supply APIs](https://www.travelgate.com/apis)
- [Travelgate — FastX](https://www.travelgate.com/fastx)
- [Travelgate Docs — Search](https://docs.travelgate.com/docs/apis/for-buyers/hotel-x-pull-buyers-api/booking-flow/search/)
- [Travelgate Docs — Book](https://docs.travelgate.com/docs/apis/for-buyers/hotel-x-pull-buyers-api/booking-flow/book/)
- [Travelgate Docs — Cancel](https://docs.travelgate.com/docs/apis/for-buyers/hotel-x-pull-buyers-api/booking-management/cancel/)
- [Travelgate Docs — Timeout Settings](https://docs.travelgate.com/kb/connectivity-products/for-buyers/hotel-x/booking-flow/timeout-settings/)
- [Travelgate Docs — Errors: connection timeout with supplier](https://docs.travelgate.com/kb/connectivity-products/for-buyers/errors-and-warnings/connection-timeout-provider/)
- [Travelgate Docs — HotelData object](https://docs.travelgate.com/api/types/objects/hotel-data/)
- [Travelgate Docs — Key Concepts](https://docs.travelgate.com/docs/get-started/key-concepts/)
- [Travelgate Docs — Connectivity products](https://docs.travelgate.com/docs/get-started/connectivity-products/)
- [Travelgate Docs — Hotel-X Credentials](https://docs.travelgate.com/kb/connectivity-products/for-buyers/hotel-x/hotel-x-credentials/)
- [Travelgate Docs — Quote Query](https://docs.travelgate.com/kb/connectivity-products/for-buyers/hotel-x/booking-flow/quote/quote-query/)
- [Travelgate Docs — Book Status](https://docs.travelgate.com/kb/connectivity-products/for-buyers/hotel-x/booking-flow/book/book-status/)
- [Travelgate Docs — API Settings](https://docs.travelgate.com/kb/connections/connections-settings/)
- `docs/99_ARCHIVE_V1/providers/FPR-01_evaluacion_proveedores.md` — investigación previa de VIAO, origen de la identificación de TravelgateX como candidato.
- `lib/travel-provider/types.ts`, `lib/travel-provider/index.ts`, `lib/travel-provider/errors.ts`, `lib/travel-provider/hotelbeds-provider.ts`, `types/travel.ts`, `supabase/migrations/20260820120000_create_booking_intents.sql` — código real de VIAO, leído directamente para el análisis de compatibilidad (sección 19-20).

---

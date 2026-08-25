---
STATUS: HISTORICAL
ERA: V1 temprano
DOMAIN: Travel/Providers
AUTHORITY: Ninguna — investigación, nunca fue una decisión (autoetiquetado en el propio documento)
SUPERSEDES: —
SUPERSEDED BY: docs/03_RESEARCH_VALIDATION/providers/ (investigación posterior de Travelgate/RateHawk)
LAST REVIEWED: 2026-08-19 (fecha propia del documento)
NOTA: este documento referencia un "FPR-02 (selección final)" que no existe en el repositorio — hueco de documentación, no inventado aquí.
---

# FPR-01 — Evaluación de proveedores hoteleros candidatos

**Estado:** Documento de investigación — NO es una decisión. No sustituye FPR-02 (selección final).
**Fecha de la investigación:** 2026-08-19.
**Alcance:** exclusivamente investigación pública sobre APIs de proveedores hoteleros candidatos para `HotelProvider` (VIAO_ARCHITECTURE.md sección 9). No se ha modificado código, `TravelProvider`, Supabase, ni Vercel. No se ha elegido ningún proveedor.
**Método:** búsqueda y lectura de fuentes públicas (documentación oficial de cada proveedor cuando ha sido posible, y fuentes del sector cuando la documentación oficial no publica el dato). Cada dato no confirmado en fuente oficial se marca explícitamente. Ningún precio/comisión/requisito ha sido inventado.

---

## 1. Booking.com — Demand API

| Punto | Hallazgo |
|---|---|
| A) Search | Sí — incluye alojamientos, coches y vuelos |
| B) Disponibilidad/precios | Sí, incluido en el mismo API |
| C) Reservas | Sí — permite crear y gestionar reservas |
| D) Sandbox | Sí — "Demand API Sandbox", entorno no-productivo dedicado que usa las mismas credenciales que producción, con propiedades de muestra. Para probar el flujo de pago se requiere una tarjeta real (cargos temporales, cancelados y reembolsados automáticamente cada lunes) |
| E) Cómo se obtiene acceso | **Cerrado, no self-service.** Hay que estar registrado como "Managed Affiliate Partner"; el acceso a Partner Centre lo proporciona el Account Manager de Booking.com **tras firmar un contrato** |
| F) Aprobación comercial | Sí, obligatoria — vía Account Manager y contrato firmado |
| G) Empresa/volumen mínimo | No confirmado públicamente ningún umbral exacto — la documentación oficial no lo publica; ocurre durante la negociación con el Account Manager |
| H) Modelo económico | Comisión sobre reservas — **se paga solo cuando la estancia se completa** ("stayed booking"), no en el momento de la reserva |
| I) Comisión/affiliate | Según fuentes del sector (no confirmado en documentación oficial con cifra exacta): entre **25% y 40%** de la comisión que Booking.com cobra al hotel, escalado según volumen mensual de reservas completadas |
| J) Deep links / reserva dentro de VIAO | Sí, **ambos modelos son posibles**: desde un simple redirect a Booking.com hasta un flujo de reserva y pago totalmente embebido en VIAO |
| K) Cobertura geográfica | Global; presencia consolidada en España/Europa (percepción de mercado general, sin cifra oficial verificada en esta investigación) |
| L) Documentación técnica | Sí, completa — `developers.booking.com`, con OpenAPI spec y guías |
| M) Complejidad de integración | Media una vez dentro (API REST bien documentada); la barrera real está en el acceso comercial previo |
| N) Riesgos | Acceso discrecional sin proceso público; el reconocimiento de ingresos se retrasa hasta la estancia completada, no la reserva |
| O) Encaje MVP | Técnicamente el más flexible (soporta desde redirect simple hasta reserva completa, igual que contempla `VIAO_ARCHITECTURE.md` sección 11); la incertidumbre está en el tiempo/criterio de aprobación como partner nuevo |

---

## 2. Expedia Group — Rapid API

| Punto | Hallazgo |
|---|---|
| A) Search | Sí — Shopping API dentro de Rapid |
| B) Disponibilidad/precios | Sí |
| C) Reservas | Sí — Rapid API cubre el flujo de booking completo |
| D) Sandbox | Sí — entorno de test (`test.ean.com`), herramientas de autocertificación |
| E) Cómo se obtiene acceso | Solicitud a través de Expedia Partner Solutions; evaluación por modelo de negocio y volumen de reservas proyectado |
| F) Aprobación comercial | Sí, obligatoria |
| G) Empresa/volumen mínimo | Sin IATA obligatorio, pero según fuentes del sector está dirigido a OTAs, plataformas white-label, portales de fidelización de aerolíneas y herramientas corporativas de reserva — "developers individuales y negocios no-de-viaje no califican" (fuente del sector, no confirmado en documentación oficial de Expedia con esa literalidad) |
| H) Modelo económico | Dos modelos: **Expedia Collect** (comisión) o **Partner Collect** (tarifa neta + markup propio) |
| I) Comisión/affiliate | Según fuentes del sector (no oficial con cifra exacta confirmada): ~15-25% del valor de la reserva post-estancia en el modelo de comisión |
| J) Deep links / reserva dentro de VIAO | Sí, ambos modelos posibles |
| K) Cobertura geográfica | Global, incluye España/Europa |
| L) Documentación técnica | Sí, completa — `developers.expediagroup.com`, con Postman collection y SDKs |
| M) Complejidad de integración | Media-alta — de las 5 candidatas, la que más fuentes del sector describen como difícil de conseguir para una startup pequeña |
| N) Riesgos | Múltiples fuentes del sector coinciden: "si eres una startup pequeña, puede ser difícil entrar... probar primero su programa de afiliados es mejor idea" |
| O) Encaje MVP | Capacidad técnica equivalente a Booking.com, pero con la barrera de entrada percibida más alta de las 5 candidatas para una empresa sin trayectoria |

---

## 3. Hotelbeds

| Punto | Hallazgo |
|---|---|
| A) Search | Sí — Content API (contenido) + Cache API (precios/disponibilidad en tiempo real) |
| B) Disponibilidad/precios | Sí |
| C) Reservas | Sí — Booking API |
| D) Sandbox | Sí, **abierto sin aprobación comercial previa**: `api.test.hotelbeds.com`, servidores idénticos a producción, sin cargos ni reservas reales. Límite: **50 requests/día** en sandbox |
| E) Cómo se obtiene acceso | Registro directo en `developer.hotelbeds.com` → 3 API keys (Hotel/Activities/Transfers) + secret, **sin aprobación previa para empezar a desarrollar** |
| F) Aprobación comercial | Solo para pasar a **producción real**: proceso de certificación tras completar el desarrollo (contacto `apitude@hotelbeds.com`) |
| G) Empresa/volumen mínimo | No hay umbral publicado para el uso de la API de desarrollo; para su plataforma B2B relacionada (Bedsonline) sí se exige "empresa de viajes legalmente registrada", con aprobación discrecional incluso para agencias nuevas |
| H) Modelo económico | **Tarifa neta mayorista** — VIAO añadiría su propio markup de venta |
| I) Comisión/affiliate | No es comisión pura sino net rate + markup propio (markup típico de mercado 15-25%, según fuentes del sector, no oficial de Hotelbeds). Una fuente comparativa de terceros (no Hotelbeds) señala que en algunos casos su tarifa "neta" ya incluiría margen previo — **dato de un competidor comparativo, no confirmado por Hotelbeds directamente, se marca con reserva** |
| J) Deep links / reserva dentro de VIAO | Modelo API completo — la reserva se gestiona dentro de la UI propia de VIAO, no es un modelo de redirect |
| K) Cobertura geográfica | Origen y fuerte presencia histórica en España; cobertura global amplia como mayorista |
| L) Documentación técnica | Sí, completa — `developer.hotelbeds.com` |
| M) Complejidad de integración | Media — dos/tres APIs a coordinar (contenido + disponibilidad/precio + booking), más el proceso de certificación antes de producción |
| N) Riesgos | El modelo mayorista traslada a VIAO la responsabilidad de fijar y gestionar su propio precio de venta — más carga operativa/económica que un modelo de comisión simple |
| O) Encaje MVP | **Es el único de los 5 candidatos con sandbox de desarrollo 100% self-service, sin aprobación previa** — permite empezar a construir/probar hoy mismo sin esperar a ningún Account Manager, aunque la certificación para producción real sí requiere aprobación |

---

## 4. Amadeus for Developers (Hotel Search + Hotel Booking API)

⚠️ **Hallazgo crítico y muy reciente, confirmado por múltiples fuentes de prensa del sector (PhocusWire entre ellas):** Amadeus **cerró por completo su portal Self-Service** — pausó nuevos registros aproximadamente en junio de 2026 y **decomisionó el portal el 17 de julio de 2026**. Las API keys de Self-Service existentes dejaron de funcionar en esa fecha. Este es un hecho ocurrido hace apenas un mes respecto a hoy, no una suposición.

| Punto | Hallazgo |
|---|---|
| A) Search | Sí, técnicamente (Hotel Search API) — pero la vía de acceso gratuita ya no existe |
| B) Disponibilidad/precios | Sí, incluido en Hotel Search |
| C) Reservas | Sí, Hotel Booking API completa la reserva tras Hotel Search |
| D) Sandbox | **Ya no disponible para nuevos desarrolladores** — el entorno de test gratuito con datos limitados formaba parte del portal Self-Service ahora cerrado |
| E) Cómo se obtiene acceso | Solo queda el portal **Enterprise**, vía acuerdo comercial directo con Amadeus — sin autoservicio |
| F) Aprobación comercial | Ahora obligatoria en todos los casos |
| G) Empresa/volumen mínimo | No confirmado públicamente ningún umbral — acceso vía contacto comercial directo |
| H) Modelo económico | Enterprise: "pricing is not a flat fee but driven by how your business operates" — sin tarifa pública fija, cada búsqueda/pricing/booking contribuye al coste |
| I) Comisión/affiliate | No confirmado públicamente |
| J) Deep links / reserva dentro de VIAO | Soportado técnicamente por el API Enterprise, pero ya no accesible sin contrato |
| K) Cobertura geográfica | Amplia (150.000+ hoteles reportados en su día vía Self-Service), incluye España/Europa |
| L) Documentación técnica | Existe, pero la vía de entrada ligera ya no existe |
| M) Complejidad de integración | Alta ahora — **ha empeorado activamente en el último mes**, perdiendo la ventaja que tenía frente a Booking.com/Expedia |
| N) Riesgos | El propio cierre reciente del self-service es en sí mismo una señal de riesgo — la compañía no dio ninguna razón pública del cambio |
| O) Encaje MVP | **Bajo, y ha empeorado activamente hace apenas un mes.** Ya no ofrece ninguna ventaja diferencial de acceso frente a Booking.com/Expedia; hoy tiene la misma barrera de entrada que ellos, sin su reconocimiento de marca de cara al usuario final |

---

## 5. RateHawk / Emerging Travel Group (candidato adicional)

*(Incluido como el candidato "otros" más relevante encontrado — mayorista/agregador con más de 330 proveedores integrados detrás de una única API)*

| Punto | Hallazgo |
|---|---|
| A) Search | Sí — API RESTful |
| B) Disponibilidad/precios | Sí, con "instant confirmation" declarada |
| C) Reservas | Sí |
| D) Sandbox | **No confirmado públicamente** en el nivel de detalle de los otros 4 candidatos — no se ha encontrado documentación pública equivalente a las de Booking.com/Expedia/Hotelbeds sobre un entorno de sandbox específico; requiere verificación directa con el proveedor |
| E) Cómo se obtiene acceso | Registro con detalles del negocio, caso de uso previsto y volumen estimado de reservas |
| F) Aprobación comercial | Sí, hay revisión de onboarding, pero **explícitamente abierta** a "tech startups and new OTAs" |
| G) Empresa/volumen mínimo | **Explícitamente sin requisito de número IATA** — es el único de los 5 candidatos que lo declara así de forma pública y directa |
| H) Modelo económico | Tres modelos a elegir: **precio neto, comisión, o afiliado** |
| I) Comisión/affiliate | Confirmada la existencia de los 3 modelos; sin porcentajes públicos concretos encontrados |
| J) Deep links / reserva dentro de VIAO | El modelo "afiliado" sugiere soporte a redirect; el modelo API completo permite reserva embebida |
| K) Cobertura geográfica | Muy amplia — 2.9M+ alojamientos en 220 países, contenido en 32+ idiomas, incluye España/Europa |
| L) Documentación técnica | Sí — `docs.emergingtravel.com` |
| M) Complejidad de integración | Aparentemente media-baja — una única integración da acceso a 330+ proveedores agregados |
| N) Riesgos | Modelo mayorista (igual que Hotelbeds): VIAO gestiona su propio margen; menor reconocimiento de marca ante el usuario final que Booking.com/Expedia; menos escrutado en esta investigación que las 3 grandes OTAs |
| O) Encaje MVP | El que declara de forma más explícita y pública dar la bienvenida a startups tecnológicas sin trayectoria — pero con menos verificación pública disponible que el resto |

---

## Candidatos adicionales identificados, no analizados en la misma profundidad

- **TravelgateX**: agregador B2B con API única (HotelX, GraphQL) sobre 600+ proveedores. Mismo enfoque que RateHawk ("una integración, muchos proveedores"). No se ha profundizado al mismo nivel en esta pasada.
- **Travelpayouts** (red de afiliados): agrega Booking.com, Expedia, Agoda y 60+ marcas mediante deep-links con tracking de comisión. Registro abierto e inmediato, sin aprobación comercial previa — el más rápido de arrancar de todos los candidatos vistos. Pero es esencialmente un modelo de redirección con tracking, no una integración de reserva embebida real — encaja peor con la visión a largo plazo de "reservar dentro de VIAO" (MVP sección 6, punto 5) que los 5 candidatos principales.

---

## Tabla comparativa

| Proveedor | Search | Availability | Booking | Sandbox | Acceso | Modelo comercial | Cobertura | Complejidad | Encaje MVP |
|---|---|---|---|---|---|---|---|---|---|
| **Booking.com Demand API** | Sí | Sí | Sí | Sí (mismas credenciales) | Cerrado — Managed Affiliate Partner vía Account Manager + contrato | Comisión (25-40% de la comisión de Booking, según sector) | Global, fuerte en España/Europa | Media (tras superar barrera comercial) | Bueno técnicamente; incierto en velocidad de acceso |
| **Expedia Rapid API** | Sí | Sí | Sí | Sí | Cerrado — evaluación de Expedia Partner Solutions, prioriza volumen | Comisión (Expedia Collect) o neto (Partner Collect) | Global, incluye España/Europa | Media-alta | El más difícil de los 5 para una startup pequeña, según fuentes del sector |
| **Hotelbeds** | Sí | Sí | Sí | Sí, abierto (50 req/día) | Registro developer abierto; certificación solo para producción | Tarifa neta + markup propio | Fuerte en España (origen), global | Media | Único con sandbox 100% self-service desde hoy |
| **Amadeus** | Sí | Sí | Sí | **Cerrado desde el 17-jul-2026** | Solo Enterprise, vía contrato comercial | No público (según uso) | Global, incluye España/Europa | Alta (ha empeorado recientemente) | Bajo — perdió su ventaja de entrada fácil hace un mes |
| **RateHawk / ETG** | Sí | Sí | Sí | No confirmado públicamente | Registro con revisión, explícitamente sin IATA, abierto a startups | Neto / comisión / afiliado (a elegir) | Muy amplia (220 países) | Media-baja (aparente) | El más explícitamente accesible de los 5 en su discurso público |

---

## TOP 3 candidatos objetivamente más viables (para investigar en profundidad, no una recomendación final)

Criterio objetivo usado: barrera de entrada verificable hoy + disponibilidad de sandbox + fit con el mercado España/Europa del MVP. **Amadeus queda fuera del top 3 por un hecho verificado (cierre de su self-service, 17-jul-2026), no por una opinión.**

### 1. Hotelbeds
**Ventajas:** único con desarrollo/sandbox 100% self-service desde hoy, sin esperar aprobación comercial; documentación completa; origen y fuerte presencia en España.
**Desventajas:** modelo de tarifa neta obliga a VIAO a fijar y gestionar su propio margen de venta; la certificación para producción real sigue siendo discrecional; una fuente comparativa de terceros (no confirmada por Hotelbeds) sugiere posible falta de transparencia en cómo presentan su "comisión" frente al net rate real.

### 2. Booking.com Demand API
**Ventajas:** mayor reconocimiento de marca/confianza para el usuario español — probablemente la mayor tasa de conversión una vez integrado; soporta tanto un modelo simple de redirect como reserva completa embebida, sin tener que elegir de antemano.
**Desventajas:** sin vía de acceso self-service — depende por completo de la aprobación de un Account Manager, sin criterio ni plazo público; el ingreso solo se reconoce cuando la estancia se completa, no en la reserva.

### 3. RateHawk / Emerging Travel Group
**Ventajas:** el único que declara explícitamente, en su propia comunicación pública, dar la bienvenida a startups tecnológicas sin número IATA ni trayectoria; cobertura muy amplia vía agregación de 330+ proveedores en una sola integración; 3 modelos comerciales a elegir.
**Desventajas:** menos verificado públicamente en esta investigación que los otros dos (sandbox no confirmado, comisiones no confirmadas); menor reconocimiento de marca ante el usuario final; modelo mayorista con la misma carga de gestión de margen propio que Hotelbeds.

*(Expedia queda fuera del top 3 no por incapacidad técnica sino porque múltiples fuentes del sector, de forma consistente, la describen como la más difícil de las 5 para una startup pequeña sin trayectoria — el mismo criterio objetivo de "barrera de entrada verificable" usado arriba.)*

---

## Información que necesitamos pedir directamente a cada proveedor antes de decidir (FPR-02)

1. Comisión/tarifa **exacta** aplicable a VIAO — no la cifra genérica de mercado encontrada en esta investigación.
2. Requisitos exactos de aprobación/volumen mínimo, si los hay, para una empresa española en fase de piloto (50-100 testers), sin trayectoria de reservas previa.
3. Tiempo estimado real desde la solicitud hasta tener acceso productivo (no solo sandbox).
4. Quién asume el riesgo económico en cancelaciones/no-shows, y en qué condiciones.
5. Si permiten mostrar disponibilidad/precio sin necesidad de que cada búsqueda dispare una reserva confirmable al instante (relevante para la fase de resultados de búsqueda de VIAO).
6. Requisitos legales/de marca: ¿hay que mostrar su logo o mencionar su nombre en el flujo de reserva? ¿restricciones sobre cómo se presenta su inventario dentro de VIAO?
7. Condiciones de terminación de contrato y portabilidad si VIAO decide cambiar de proveedor más adelante (relevante porque la arquitectura ya está diseñada para permitirlo, `TravelProvider`).
8. Confirmación explícita y por escrito de que aceptan a una empresa en la fase actual de VIAO (sin volumen demostrado todavía).

---

## Qué decisión queda en manos de Andrés/Annie

- **FPR-02 completa**: la selección final del proveedor y la negociación de condiciones comerciales — nada de esta investigación sustituye esa decisión.
- Si iniciar contacto comercial con más de un candidato en paralelo (p. ej. Hotelbeds + Booking.com a la vez) o de forma secuencial.
- Si priorizar **velocidad de acceso** (Hotelbeds/RateHawk parecen los más rápidos de empezar hoy) frente a **reconocimiento de marca/conversión esperada** (Booking.com).
- Si el modelo de negocio de VIAO prefiere asumir la gestión de su propio margen de venta (Hotelbeds/RateHawk, modelo mayorista) o prefiere un modelo de comisión pura, operativamente más simple (Booking.com/Expedia).
- Si merece la pena una segunda ronda de FPR-01 investigando TravelgateX y/o Travelpayouts con el mismo nivel de detalle que los 5 candidatos aquí analizados.

---

## Fuentes consultadas

- [Demand API sandbox](https://developers.booking.com/demand/docs/getting-started/sandbox)
- [Booking.com Demand API — overview](https://developers.booking.com/demand/docs/getting-started/overview)
- [Booking.com Demand API — prerequisites](https://developers.booking.com/demand/docs/getting-started/prerequisites)
- [Booking.com Demand API — documento OpenAPI](https://developers.booking.com/demand/docs/open-api/demand-api)
- [Booking.com Partnerships: APIs, Extranet, Pulse App, and Boo — AltexSoft](https://www.altexsoft.com/blog/booking-com-partnerships-apis-extranet-pulse-app/)
- [Booking.com Affiliate Program: Operator Teardown 2026 — track360](https://track360.io/blog/booking-com-affiliate-partner-program-operator-teardown-2026)
- [Expedia Group Developer Hub — Rapid API](https://developers.expediagroup.com/rapid/lodging/shopping/about-shopping-api)
- [Expedia Hotel API Integration: Complete Guide for OTAs — ZentrumHub](https://www.zentrumhub.com/blog/expedia-rapid-hotel-api-integration/)
- [Rapid API Integration & Scalable Travel Bookings — Expedia Group](https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/rapid-api)
- [Certified Technology Partners Program — Expedia Group](https://partner.expediagroup.com/en-us/solutions/build-your-travel-experience/rapid-api/certified-technology-partners-program)
- [How to become expedia partner API how much does it cost — AltexSoft](https://www.altexsoft.com/techtalks/how-to-become-expedia-partner-api-how-much-does-it-cost/)
- [Hotelbeds Developer portal](https://developer.hotelbeds.com/)
- [Hotelbeds — Booking API](https://developer.hotelbeds.com/documentation/hotels/booking-api/)
- [Hotelbeds — Content API](https://developer.hotelbeds.com/documentation/hotels/content-api/)
- [Hotelbeds — Certification process](https://developer.hotelbeds.com/documentation/hotels/knowledge-base/certification-process/)
- [Hotelbeds API Integration: Hands-on Experience — AltexSoft](https://www.altexsoft.com/blog/hotelbeds-api-integration/)
- [Best Hotelbeds Alternative for Travel Agents — DMC Quote](https://dmcquote.com/compare/hotelbeds-alternative)
- [Amadeus Hotel Search API](https://developers.amadeus.com/self-service/category/hotels/api-doc/hotel-search)
- [Hotel Booking APIs | Enterprise APIs — Amadeus for Developers](https://developers.amadeus.com/enterprise/category/hotel/api/booking)
- [Self-Service Pricing — Amadeus for Developers](https://developers.amadeus.com/pricing)
- [Amadeus to shut down self-service APIs portal for developers — PhocusWire](https://www.phocuswire.com/amadeus-shut-down-self-service-apis-portal-developers)
- [Amadeus Self-Service API Shutdown: Migrate Before July 17 — Tripgic](https://www.tripgic.com/playbook/amadeus-api-shutdown-migration/)
- [Amadeus Self-Service API Shutdown (July 2026): Migration Guide — Ignav](https://ignav.com/docs/amadeus-self-service-shutdown)
- [TravelgateX launches HotelX — ProgrammableWeb](https://www.programmableweb.com/news/travelgatex-launches-hotelx-api-hotel-search-and-booking/2018/08/09)
- [Demand & Supply APIs — Travelgate](https://www.travelgate.com/apis)
- [Emerging Travel Group Reports Record Revenue — Hospitality Net](https://www.hospitalitynet.org/news/4131152/emerging-travel-group-reports-record-revenue-with-ratehawks-expansion-and-agentic-ai-integration)
- [RateHawk Hotel Booking Platform for Travel Agents — Adivaha](https://www.adivaha.com/what-is-rate-hawk.html)
- [B2B Travel API Integration: Hotel Booking for Travel Agents — RateHawk](https://www.ratehawk.com/lp/en-us/API/)
- [Emerging Travel Group API docs](https://docs.emergingtravel.com/)
- [Best hotel affiliate programs — Travelpayouts](https://www.travelpayouts.com/blog/best-hotel-affiliate-program/)
- [Detecting the best travel affiliate programs — Travelpayouts](https://www.travelpayouts.com/blog/best-travel-affiliate-programs-and-networks/)

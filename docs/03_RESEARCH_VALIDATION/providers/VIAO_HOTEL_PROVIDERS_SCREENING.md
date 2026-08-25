---
STATUS: VALIDATION
ERA: Esta sesión
DOMAIN: Travel/Providers
AUTHORITY: Screening documental de 8 proveedores hoteleros alternativos
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — Screening comparativo de 8 proveedores hoteleros alternativos

### Estado: SCREENING — NO ES UNA AUDITORÍA PROFUNDA NI UNA DECISIÓN DE PROVEEDOR. No se ha implementado nada, no se ha tocado código/Supabase/migraciones/RLS/UI/rutas/dependencias/`.env`.
### Contexto: Travelgate ya está auditado y validado técniacamente (`docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_AUDIT.md`, `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_SANDBOX_VALIDATION.md`, VERDICT GREEN). Hotelbeds sigue **PENDIENTE DE RESPUESTA** — no descartado, no sustituido, no re-auditado aquí. Este documento no repite ninguno de los dos.
### Método: para Amadeus, Expedia Rapid API y Booking.com Demand API se reutilizan los hallazgos de `docs/99_ARCHIVE_V1/providers/FPR-01_evaluacion_proveedores.md` (investigación primaria propia de VIAO, 2026-08-19 — 6 días antes de este screening), citados explícitamente, sin re-investigar desde cero. Para WebBeds, RateHawk/ETG (actualización), TBO Holidays, DOTW y HotelRunner se ha hecho investigación primaria nueva en esta sesión.

**Taxonomía de evidencia usada en todo el documento**: `CONFIRMADO` (documentación/fuente oficial del propio proveedor) · `DOCUMENTADO` (fuente técnica de terceros — integradores especializados — no la documentación oficial completa, que no es accesible sin ser partner) · `INFERIDO` (deducción razonable, no verificada directamente) · `NO VERIFICADO` (no se ha podido confirmar; explícitamente no se infiere solo porque el proveedor diga "cobertura global").

---

## 1. Amadeus

*(Reutilizado de FPR-01, 2026-08-19 — no re-investigado en este screening; ver `docs/99_ARCHIVE_V1/providers/FPR-01_evaluacion_proveedores.md` sección 4 para el detalle completo)*

**ACCESO**: `CONFIRMADO` — el portal Self-Service (el único con entrada ligera) fue **decomisionado el 17 de julio de 2026**, confirmado por múltiples fuentes de prensa del sector (PhocusWire entre ellas). Las API keys de Self-Service existentes dejaron de funcionar esa fecha. Hoy solo queda el portal **Enterprise**, vía acuerdo comercial directo — sin autoservicio, sin sandbox público para nuevos desarrolladores.

**FLUJO HOTELERO**: `DOCUMENTADO` la existencia de Hotel Search API + Hotel Booking API (Search→Book); Quote/CheckRate como paso explícito y Cancel: `NO VERIFICADO` en el nivel de detalle de esta pasada.

**COBERTURA**: "150.000+ hoteles" reportados en su día vía Self-Service (cifra propia, `DOCUMENTADO`, no reverificada). Barcelona: `NO VERIFICADO`.

**COMPATIBILIDAD CON VIAO**: técnicamente plausible (API REST), pero irrelevante en la práctica — el problema no es de compatibilidad de tipos, es de acceso.

**MODELO COMERCIAL**: Enterprise, "pricing driven by how your business operates" — sin tarifa plana pública.

**CLASIFICACIÓN: DESCARTAR POR AHORA.** No por incapacidad técnica, sino porque el único camino de entrada ligera que tenía desapareció hace apenas un mes — hoy tiene la misma barrera (o peor, sin ninguna vía de prueba) que Booking.com/Expedia, sin ofrecer ninguna ventaja de "probar rápido" (criterio #1 de este screening).

---

## 2. Expedia Rapid API

*(Reutilizado de FPR-01, 2026-08-19)*

**ACCESO**: `CONFIRMADO` sandbox existente (`test.ean.com`), pero el acceso completo requiere evaluación de Expedia Partner Solutions. Múltiples fuentes del sector, de forma consistente, la describen como la más difícil de las grandes OTAs para una startup pequeña sin trayectoria.

**FLUJO HOTELERO**: `CONFIRMADO` Shopping API (Search+disponibilidad+precio) + flujo de booking completo. Quote/CheckRate equivalente y Cancel al detalle: `NO VERIFICADO` en esta pasada.

**COBERTURA**: Global, incluye España/Europa (`DOCUMENTADO`, afirmación general). Barcelona: `NO VERIFICADO`.

**COMPATIBILIDAD CON VIAO**: técnicamente plausible, mismo razonamiento que Amadeus.

**MODELO COMERCIAL**: `CONFIRMADO` — Expedia Collect (comisión) o Partner Collect (neto + markup propio).

**CLASIFICACIÓN: SECUNDARIO.** Técnicamente sólido y bien documentado, con sandbox real — pero el propio criterio #1 de este screening ("probar rápidamente, conseguir acceso real posteriormente") choca con la barrera de entrada descrita de forma consistente por el sector como la más alta de las grandes OTAs para una empresa en la fase actual de VIAO. Reconsiderar si VIAO gana volumen/trayectoria demostrable.

---

## 3. Booking.com Demand API

*(Reutilizado de FPR-01, 2026-08-19)*

**ACCESO**: `CONFIRMADO` sandbox existe, pero **cerrado sin autoservicio** — solo accesible tras ser aprobado como "Managed Affiliate Partner" vía Account Manager y contrato firmado. Ningún criterio ni plazo público de aprobación.

**FLUJO HOTELERO**: `CONFIRMADO` Search/disponibilidad/creación y gestión de reservas. Cancel al detalle: `NO VERIFICADO` en esta pasada.

**COBERTURA**: Global, fuerte presencia percibida en España/Europa (`DOCUMENTADO`, sin cifra oficial). Barcelona: `NO VERIFICADO`.

**COMPATIBILIDAD CON VIAO**: la más flexible conceptualmente (desde redirect simple hasta reserva embebida completa) — pero, igual que Amadeus, irrelevante mientras el acceso siga cerrado.

**MODELO COMERCIAL**: comisión (25-40% de la comisión de Booking según fuentes del sector, no oficial), pagada solo tras la estancia completada.

**CLASIFICACIÓN: DESCARTAR POR AHORA (para este screening).** No existe ningún camino de prueba propio sin pasar antes por una aprobación comercial discrecional y sin plazo — no cumple el criterio #1 de este screening ("probar rápidamente"). El reconocimiento de marca (mayor conversión esperada) es real, pero es un argumento para una fase posterior con más trayectoria de VIAO, no para esta ronda de screening técnico.

---

## 4. WebBeds

*(Investigación nueva en esta sesión)*

**ACCESO**: `DOCUMENTADO` (fuentes de integradores especializados, no documentación oficial pública de WebBeds — no existe un portal developer público) — acceso completamente cerrado: "la documentación de la API y las credenciales de sandbox/test se comparten solo una vez finalizados los términos comerciales." Sin registro de autoservicio, sin API key de prueba pública, sin catálogo de endpoints públicos.

**FLUJO HOTELERO**: `DOCUMENTADO` (no oficial) — Hotel API, Booking API, Content API, Geolocation API, basadas en XML. Detalle operativo real (Search/Quote/Book/Cancel exactos): `NO VERIFICADO`, imposible de auditar sin ser partner.

**COBERTURA**: "350.000+ hoteles en 12.000+ destinos, 139 mercados de origen" (cifra propia de WebBeds, `DOCUMENTADO`). Barcelona: `NO VERIFICADO`.

**COMPATIBILIDAD CON VIAO**: `INFERIDO` — patrón search-book estándar del sector, probablemente compatible en principio, pero no verificable contra el contrato real de VIAO sin documentación.

**MODELO COMERCIAL**: no público.

**CLASIFICACIÓN: DESCARTAR POR AHORA (para este screening).** Mismo patrón cerrado que Booking.com/Amadeus-hoy — sin ninguna vía de autoservicio, no cumple el criterio #1. Ver también hallazgo especial de la sección 9 (relación con DOTW).

---

## 5. RateHawk / Emerging Travel Group (ETG)

*(Actualización de FPR-01 con investigación nueva — FPR-01 marcaba el sandbox como "no confirmado públicamente"; esta sesión lo confirma con detalle)*

**ACCESO**: `CONFIRMADO` — **existe un sandbox real**, documentado por el propio blog oficial de RateHawk (`blog.ratehawk.com`), con endpoint propio: `https://api-sandbox.worldota.net` (nota de nomenclatura: el dominio técnico es "worldota.net", distinto de la marca comercial "RateHawk" y de la razón social "Emerging Travel Group" — un caso más de divergencia nombre comercial / producto técnico, como pedía la tarea). **No es autoservicio instantáneo**: el proceso documentado son 3 etapas — (1) un manager asignado envía un cuestionario breve para alinear requisitos técnicos, (2) desarrollo independiente en el Sandbox con documentación propia, (3) certificación por el equipo de API Launch, **documentada explícitamente en 14–30 días**. Las credenciales de sandbox son propias (no una key pública compartida como la de Travelgate) y no sirven para producción. El propio blog indica que este es el proceso vigente "para nuevos partners desde Q4 2025 en adelante" — es decir, es la vía actual, no una restricción que excluya a VIAO hoy.

**FLUJO HOTELERO**: `DOCUMENTADO` — existe una API B2B v3 (`docs.emergingtravel.com`) con un flujo de tipo Search→Rate/Prebook→Booking→Check booking process (nombres de página reales encontrados: "Retrieve rate info", "Check booking process"). El detalle granular de Cancel/idempotencia no se pudo verificar en esta pasada (página de documentación específica devolvió 403 sin autenticación) — `NO VERIFICADO` a nivel granular.

**COBERTURA**: `DOCUMENTADO` (FPR-01) — 2,9M+ alojamientos, 220 países, contenido en 32+ idiomas (cifra propia). Barcelona: `NO VERIFICADO`.

**COMPATIBILIDAD CON VIAO**: `INFERIDO` razonable — patrón Search/Rate/Book estándar, aparentemente compatible con `HotelProvider`, pendiente de verificar con el mismo rigor que se hizo con Travelgate (introspección/llamadas reales) una vez haya credenciales de sandbox.

**MODELO COMERCIAL**: `CONFIRMADO` (FPR-01) — tres modelos a elegir: precio neto, comisión, o afiliado.

**CLASIFICACIÓN: PRIORITARIO.** El más maduro de los 6 candidatos "nuevos" evaluados en este screening — es el único, aparte de Travelgate/Hotelbeds, con un sandbox real y documentado con endpoint propio, y el único con un plazo de certificación explícito y razonable (14-30 días). Requiere un contacto inicial con un manager (no es autoservicio puro como Travelgate/Hotelbeds), pero es un proceso acotado y predecible. Es el mejor candidato de este screening para pasar a una auditoría técnica profunda del mismo tipo que se hizo con Travelgate.

---

## 6. TBO Holidays API

*(Investigación nueva en esta sesión)*

**ACCESO**: mixto — `DOCUMENTADO` por el propio TBO: "no hay coste de integración... solo se paga por las reservas" (declaración pública explícita, uno de los pocos proveedores de este screening con esa claridad). Registro por categoría (Travel Agent / Supplier / Hotelier) vía formulario. Existen credenciales de test, pero **no son autoservicio**: se solicitan al equipo de soporte de API (`apisupport@tboholidays.com`) tras contacto, no hay un botón de "generar API key de prueba" público. Contacto de partnerships: `partners@tboholidays.com`.

**FLUJO HOTELERO**: `DOCUMENTADO` (vía guía técnica de un integrador especializado, Vervotech, no la documentación oficial completa que requiere login) — API v2.1/v7 con métodos de Search, Prebook (equivalente a Quote/CheckRate), Book y Cancel, tanto en REST-JSON como SOAP-XML.

**COBERTURA**: "700.000+ propiedades" vía 60+ proveedores de alojamiento agregados, "100+ países" (cifra propia). Origen y fuerza histórica en India/Asia-Pacífico. Barcelona/España: `NO VERIFICADO` — no inferido solo por la cifra global.

**COMPATIBILIDAD CON VIAO**: `INFERIDO` — el patrón Search→Prebook→Book→Cancel es conceptualmente muy parecido al de Hotelbeds (Availability→CheckRate→Booking), lo que sugiere buen encaje con `HotelProvider`, pero no verificado contra documentación oficial completa.

**MODELO COMERCIAL**: `CONFIRMADO` (declaración propia) — sin coste de integración, pago solo por reserva.

**CLASIFICACIÓN: SECUNDARIO.** El flujo documentado (vía fuente técnica de integrador) es el más parecido conceptualmente al patrón ya conocido de Hotelbeds/RateHawk, y la ausencia declarada de coste de integración es un dato comercial favorable — pero sin sandbox self-service confirmado ni ninguna confirmación de cobertura España/Barcelona. Merece un contacto de verificación directo antes de comprometer una auditoría técnica profunda.

---

## 7. DOTW (Destinations of the World)

*(Investigación nueva en esta sesión)*

**ACCESO**: cerrado — `DOCUMENTADO` registro como partner, aprobación, y solo entonces entrega de credenciales de sandbox y producción (API key, partner ID, tokens). El propio subdominio histórico de desarrollo de DOTW (`xmldev.dotwconnect.com`), visitado directamente en esta sesión, **redirige hoy a un portal de login marcado como WebBeds**, sin ninguna documentación pública visible — `VERIFICADO` directamente en esta sesión (no una suposición).

**FLUJO HOTELERO**: `DOCUMENTADO` (fuentes de integradores) — SOAP/XML y REST, disponibilidad en tiempo real, tarifas, confirmaciones, cancelaciones, contenido. Detalle operativo real: `NO VERIFICADO`, no auditable sin ser partner.

**COBERTURA**: "130.000+ hoteles, 10.000+ destinos" (cifra propia), con concentración histórica fuerte en Asia (EAU, Tailandia, Singapur, Indonesia) — más de 1.200 ciudades conectadas. Barcelona/España: `NO VERIFICADO`.

**COMPATIBILIDAD CON VIAO**: no evaluable en profundidad sin documentación real.

**MODELO COMERCIAL**: no público.

**CLASIFICACIÓN: DESCARTAR — ver hallazgo especial (sección 9).** No solo por el acceso cerrado (igual que WebBeds), sino porque, comercialmente, DOTW y WebBeds ya no son candidatos independientes.

---

## 8. HotelRunner API

*(Investigación nueva en esta sesión)*

**ACCESO**: n/a para el caso de uso de VIAO — ver más abajo.

**FLUJO HOTELERO**: **no aplica**. HotelRunner es, `CONFIRMADO` directamente en su propio sitio oficial, un **channel manager** — un producto que ayuda a un hotel individual a distribuir SU PROPIO inventario hacia canales externos (OTAs), más un motor de reservas para el sitio web del propio hotel y herramientas de metasearch/marketing directo. No existe ningún API de demanda pública para que un tercero (como VIAO) consulte/reserve inventario agregado de múltiples hoteles. Su sección para "Travel Companies" (agencias, bedbanks, tour operators) ofrece herramientas como "Direct Contracting"/"Live Inventory" — pero esto describe **negociar y contratar hoteles individuales uno a uno a través de su plataforma**, no consumir una API de agregación lista para usar como las otras 7 candidatas de este documento.

**COBERTURA**: "49.000+ propiedades afiliadas en 193 países" — pero como **clientes** del channel manager (hoteles que lo usan para gestionar su propia distribución), no como inventario consultable por un comprador externo. No es una cifra comparable a la cobertura de las otras 7.

**COMPATIBILIDAD CON VIAO**: **NO ENCAJA.** HotelRunner resuelve el problema inverso al de VIAO: ayuda a UN hotel a distribuirse a MUCHOS canales; VIAO necesita que UN canal (VIAO) consulte inventario de MUCHOS hoteles. No es una diferencia de matiz técnico — es una categoría de producto distinta.

**MODELO COMERCIAL**: n/a para este caso de uso (es una plataforma "freemium" para hoteles, no un proveedor mayorista/agregador para compradores).

**CLASIFICACIÓN: DESCARTAR — no es la categoría de producto correcta.** Tal como anticipaba el propio encargo de este screening ("si alguno no ofrece realmente una API adecuada para el caso de uso de VIAO, indícalo claramente y NO intentes justificarlo"), este es exactamente ese caso. No se fuerza ninguna comparación adicional con `HotelProvider`.

---

## 9. Hallazgo especial: WebBeds y DOTW son, hoy, el mismo grupo comercial

`CONFIRMADO` (fuente oficial: `webbeds.com/webjet-acquires-destinations-of-the-world/`, más `xmldev.dotwconnect.com` redirigiendo en vivo a un login de WebBeds, verificado directamente en esta sesión): Webjet Group adquirió DOTW en 2018 (operación de ~173M USD) y la integró en el portfolio de WebBeds, junto a JacTravel, TotalStay, Sunhotels, Lots of Hotels y FIT Ruums. **Evaluar WebBeds y DOTW como dos candidatos independientes en una futura auditoría profunda sería redundante** — cualquier proceso de acceso comercial pasaría, en la práctica, por la misma estructura de WebBeds. Se recomienda tratarlos como una única línea de evaluación futura ("WebBeds/DOTW"), no dos.

---

## 10. Matriz comparativa resumen

| Proveedor | Acceso | Sandbox | Flujo hotelero | Cobertura Barcelona/España | Compatibilidad VIAO | Clasificación |
|---|---|---|---|---|---|---|
| Amadeus | Cerrado (self-service decomisionado 17-jul-2026) | No disponible hoy | Documentado, parcial | NO VERIFICADO | Plausible, irrelevante por acceso | **DESCARTAR** |
| Expedia Rapid API | Cerrado, evaluación previa | Sí, tras aprobación | Confirmado, completo | NO VERIFICADO | Plausible | **SECUNDARIO** |
| Booking.com Demand API | Cerrado, Account Manager + contrato | Sí, tras aprobación | Confirmado, completo | NO VERIFICADO | Plausible, muy flexible | **DESCARTAR (por ahora)** |
| WebBeds | Cerrado, comercial previo | Solo tras acuerdo | Documentado (terceros) | NO VERIFICADO | Inferido | **DESCARTAR (por ahora)** |
| RateHawk / ETG | Semi-abierto (manager + cuestionario, 14-30 días certificación) | **Sí, confirmado, endpoint propio** | Documentado, con nombres de método reales | NO VERIFICADO | Inferido, favorable | **PRIORITARIO** |
| TBO Holidays | Registro + contacto, sin autoservicio pleno | Test creds no autoservicio | Documentado (terceros), completo | NO VERIFICADO | Inferido, favorable | **SECUNDARIO** |
| DOTW | Cerrado, comercial previo | Solo tras acuerdo | Documentado (terceros) | NO VERIFICADO | No evaluable | **DESCARTAR** (ver sección 9) |
| HotelRunner | N/A — categoría de producto distinta | N/A | N/A | N/A | **NO ENCAJA** | **DESCARTAR** |

*(Referencia, no re-auditados aquí: Travelgate = GREEN sandbox validado; Hotelbeds = PENDIENTE DE RESPUESTA, sandbox self-service ya confirmado en FPR-01.)*

---

## 11. Recomendación final

**Candidato que merece pasar a auditoría técnica profunda a continuación, del mismo tipo que se hizo con Travelgate (documental + validación real de sandbox)**:

1. **RateHawk / Emerging Travel Group** — el único, aparte de Travelgate/Hotelbeds, con sandbox confirmado y un proceso de acceso acotado en el tiempo (14-30 días de certificación tras el desarrollo). Siguiente paso natural.

**Candidatos a mantener en observación, sin invertir en auditoría profunda todavía**:

2. **TBO Holidays** — modelo comercial favorable (sin coste de integración) y flujo conceptualmente compatible, pero sin sandbox self-service ni cobertura España confirmada. Un contacto de verificación directo (sin comprometer una auditoría completa) podría resolver ambas dudas rápido.
3. **Expedia Rapid API** — técnicamente sólido, pero la barrera de entrada documentada lo hace más adecuado para una fase posterior de VIAO con más trayectoria.

**Descartados para esta ronda, con motivo explícito, no genérico**:

4. **Amadeus** — perdió su única vía de entrada ligera hace apenas un mes; hoy sin ninguna ventaja frente a las OTAs cerradas.
5. **Booking.com Demand API** — sin ningún camino de prueba sin aprobación comercial previa; no cumple el criterio de "probar rápidamente" de este screening.
6. **WebBeds** — completamente cerrado, sin ninguna vía de autoservicio.
7. **DOTW** — mismo motivo que WebBeds, y además comercialmente parte del mismo grupo (sección 9) — evaluarlo por separado sería redundante.
8. **HotelRunner** — no es la categoría de producto correcta para el caso de uso de VIAO (sección 8) — no se fuerza la comparación.

Esta recomendación **no decide el proveedor final de VIAO** ni afecta el estado de Hotelbeds (sigue pendiente, sin cambios) ni el de Travelgate (sigue GREEN, sin cambios). Es un insumo para decidir dónde invertir el próximo esfuerzo de auditoría profunda.

---

## Fuentes consultadas (nuevas en esta sesión)

- [WebBeds Hotel API Integration and Documentation Review — Traveltekpro](https://www.traveltekpro.com/webbeds-hotel-api-integration-and-documentation-review/)
- [Webjet acquires Destinations of the World — WebBeds (oficial)](https://www.webbeds.com/webjet-acquires-destinations-of-the-world/)
- `http://xmldev.dotwconnect.com/interface/` — verificado directamente en esta sesión (redirige a login WebBeds)
- [TBO Holidays — Hotels](https://apiintegration.tboholidays.com/hotels.aspx)
- [TBO Holidays — XML/API](https://apiintegration.tboholidays.com/xml_api.aspx)
- [TBO Hotel API Docs, Integration Guide — Vervotech](https://www.vervotech.com/hub/integrations/tbo-hotel-api-documentation/)
- [HotelRunner — sitio oficial](https://www.hotelrunner.com)
- [Introducing the RateHawk API Sandbox — blog.ratehawk.com (oficial)](https://blog.ratehawk.com/introducing-the-ratehawk-api-sandbox/)
- [Emerging Travel Group API docs](https://docs.emergingtravel.com/)
- `docs/99_ARCHIVE_V1/providers/FPR-01_evaluacion_proveedores.md` — fuente reutilizada para Amadeus, Expedia Rapid API, Booking.com Demand API, y base de RateHawk (actualizada aquí).
- `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_AUDIT.md`, `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_SANDBOX_VALIDATION.md` — referencia de contexto, no re-auditados.

---

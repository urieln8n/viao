---
STATUS: PROPOSAL
ERA: Esta sesión
DOMAIN: Travel/Providers
AUTHORITY: Mensaje de contacto comercial preparado, no enviado
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — Contacto y desbloqueo de acceso a Sandbox de RateHawk / Emerging Travel Group

### Estado: PREPARACIÓN DE CONTACTO COMERCIAL/TÉCNICO — NADA ENVIADO TODAVÍA. No es una integración, no es una decisión de proveedor. No se ha modificado código, `HotelProvider`, tipos, `errors.ts`, `booking_intents`, `bookings`, Supabase, migraciones, RLS, UI, rutas, dependencias, `.env` ni configuración.
### Continúa de: `docs/03_RESEARCH_VALIDATION/providers/VIAO_RATEHAWK_AUDIT.md` (VEREDICTO `YELLOW` — documentación sólida, cero validación en vivo posible sin credenciales privadas).

---

## 1. Estado actual de los tres proveedores (sin cambios)

- **Travelgate** = `GREEN` — sandbox validado en vivo de punta a punta (`docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_AUDIT.md`, `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_SANDBOX_VALIDATION.md`).
- **Hotelbeds** = `PENDIENTE DE RESPUESTA` — no descartado, no sustituido.
- **RateHawk / Emerging Travel Group** = `YELLOW` — sandbox pendiente de credenciales (`docs/03_RESEARCH_VALIDATION/providers/VIAO_RATEHAWK_AUDIT.md`).

**RateHawk NO está aprobado como proveedor de VIAO. RateHawk NO sustituye a Hotelbeds. RateHawk NO sustituye a Travelgate.** El único objetivo de este documento es preparar el contacto para conseguir acceso a su Sandbox — nada más.

---

## 2. Canal oficial de contacto

Investigado directamente contra fuentes oficiales de RateHawk/Emerging Travel Group (no inventado, no asumido):

| Canal | URL | Estado de verificación |
|---|---|---|
| Página de producto API (RateHawk) | `https://www.ratehawk.com/lp/en-us/API/` | `CONFIRMADO` — accedida directamente. Contiene un CTA visible **"GET STARTED"** que enlaza a `/registration/?lang=en` |
| Formulario de alta (RateHawk) | `https://www.ratehawk.com/registration/?lang=en` | `CONFIRMADO` — accedido directamente. **Es el alta general de cuenta de agencia B2B** (nombre, email, entidad legal, NIF/ITN, dirección) — no un formulario específico de "solicitar API/Sandbox". Tras enviarlo, se recibe un email para crear contraseña y acceder a la cuenta. No se muestra ningún plazo de revisión ni contacto de manager en el propio formulario. |
| Página de partnerships (Emerging Travel Group) | `https://www.emergingtravel.com/partnerships/` | `CONFIRMADO` que la página existe y distingue 3 categorías: **Marketing Partners**, **Payment Partners**, **Technology Partners**. `NO VERIFICADO` el formulario/CTA exacto de esa página — el acceso directo fue bloqueado por la protección anti-bot del dominio (`403 Forbidden`, mismo comportamiento ya observado con `docs.emergingtravel.com` en la auditoría anterior). |
| Email directo | — | `NO VERIFICADO`. Las búsquedas devolvieron cadenas de tipo `[email protected]` que son claramente un placeholder genérico del motor de búsqueda, no una dirección real — **no se incluye ninguna dirección de email en este documento por no estar confirmada**, tal como exige la regla de esta tarea ("no asumir emails si no están confirmados"). |

**Recomendación de canal**: dado que VIAO es una plataforma tecnológica que quiere integrar la API (no una agencia de viajes que revende su inventario vía el portal web de RateHawk), el canal conceptualmente correcto es la categoría **"Technology Partners"** de `emergingtravel.com/partnerships/` — aunque su formulario exacto no se pudo verificar por el bloqueo anti-bot. Como alternativa confirmada y funcional, el flujo `ratehawk.com/lp/en-us/API/` → **GET STARTED** → `registration/` es una vía real y accesible hoy, aunque su formulario esté orientado a agencias — es razonable rellenarlo igualmente y especificar el interés en API/Sandbox en el campo de "propósito de registro" (visible en el formulario, contenido de las opciones no confirmado).

**Requisitos iniciales pedidos por el formulario confirmado** (`ratehawk.com/registration/`): nombre y apellidos, email, país/teléfono, ciudad, nombre de la empresa, NIF/ITN, entidad legal (nombre/ciudad/dirección/código postal), dirección real del negocio, sitio web (opcional, con opción "no tengo web"), si forma parte de una cadena/franquicia, y un campo de "propósito de registro" (opciones no detalladas en el contenido accedido).

**¿Se puede solicitar explícitamente Sandbox antes de producción?** `CONFIRMADO` por la propia auditoría anterior — sí, el sandbox es una etapa previa y distinta de producción en el proceso documentado de RateHawk (manager → cuestionario → desarrollo en Sandbox → certificación). No se ha encontrado, sin embargo, un campo específico en el formulario de registro para pedirlo explícitamente — se recomienda indicarlo por escrito en el mensaje (sección 3).

---

## 3. Mensaje preparado (NO enviado)

Redactado en inglés — es el idioma de toda la documentación, formularios y comunicación pública de RateHawk/ETG (empresa internacional, sin versión en español de sus canales B2B/API) — listo para que Andrés lo revise y envíe por el canal que elija (formulario de registro + este texto en el campo de propósito/mensaje, o el canal de Technology Partners si se confirma su formulario).

> **Subject: VIAO — Technology Partner / API Sandbox Access Inquiry**
>
> Hello,
>
> My name is [nombre], and I represent VIAO, a Barcelona-based travel/loyalty platform currently in MVP stage. We are evaluating hotel content/booking API providers, and RateHawk/ETG's B2B API looks like a strong technical fit for our architecture.
>
> We would like to request:
>
> 1. Access to the API Sandbox environment and test credentials, to validate the technical integration (Search, Prebook, Create booking process, Check booking process, Cancel, Retrieve bookings) against our own internal architecture before any commercial commitment.
> 2. The technical documentation required to complete this evaluation.
> 3. Details on the certification process and requirements once sandbox development is complete.
> 4. Information on your available commercial models (net rate, commission, affiliate) and which would be most appropriate for a company at our current stage (MVP, pre-launch, no booking volume yet).
> 5. Initial rate limits during the sandbox/pre-certification phase.
> 6. Confirmation of your inventory coverage in Barcelona and Spain specifically — we've found general coverage figures, but nothing broken down by city/market.
>
> We also have one specific technical question about the booking flow, which would help us design the integration correctly on our side:
>
> "Your documentation recommends retrying `Create booking process` with a new `partner_order_id` after a timeout, an `unknown` error, or a 5xx response. If the original request had actually been processed successfully on your side but the response was lost due to a network timeout, what mechanism ensures that a retry with a new `partner_order_id` does not result in a duplicate confirmed booking?"
>
> We are not requesting production access at this stage — only sandbox access to validate the integration technically.
>
> Thank you in advance,
> [nombre] — VIAO

**Nota**: el mensaje evita cualquier tono acusatorio en la pregunta crítica — se presenta explícitamente como una cuestión de diseño de integración por parte de VIAO, no como una acusación de fallo del proveedor, tal como exigía la tarea.

---

## 4. Información que VIAO debe proporcionar

Según el formulario confirmado (`ratehawk.com/registration/`): nombre/apellidos, email, país, teléfono, ciudad, nombre de la empresa, NIF/ITN de la empresa, entidad legal (nombre, ciudad, dirección, código postal), dirección real del negocio, sitio web (o marcar "no tengo web"), y el propósito del registro. Esta información **no ha sido rellenada ni enviada** — queda pendiente de que Andrés decida qué datos legales/fiscales de VIAO usar.

---

## 5. Preguntas técnicas prioritarias (para incluir en el contacto)

1. La pregunta crítica de duplicidad de reserva (sección 3, texto completo) — la más importante de las siete.
2. ¿Cuál es el rate limit real durante la fase de sandbox/pre-certificación (antes de que "los límites aumenten tras la certificación")?
3. ¿Qué cobertura real existe en Barcelona específicamente, no solo "España" a nivel de mercado?
4. ¿Cuánto tiempo toma, en la práctica, desde el cuestionario inicial del manager hasta recibir las credenciales de Sandbox? (la única cifra pública confirmada, 14-30 días, cubre la certificación posterior, no esta primera etapa).
5. ¿Cuáles son las condiciones exactas de cada uno de los 3 modelos comerciales (neto/comisión/afiliado) para una empresa en la fase actual de VIAO (MVP, sin volumen de reservas todavía)?
6. Confirmación de si Cancel es realmente seguro de reintentar directamente (tal como sugiere la guía documentada) o si también requiere un identificador nuevo en algún escenario.
7. Confirmación de si el flujo de pago con tarjeta (`3ds`, datos de tarjeta) puede probarse en Sandbox sin ningún dato real — coherente con la práctica ya confirmada en Travelgate, pero no verificada todavía para RateHawk.

---

## 6. Checklist para cuando lleguen las credenciales

### ACCESO
- [ ] Cuenta creada
- [ ] Contrato firmado/activo
- [ ] Manager asignado, cuestionario técnico completado
- [ ] Credenciales de Sandbox recibidas (`KEY_ID:API_KEY`)
- [ ] Endpoint de Sandbox confirmado (`https://api-sandbox.worldota.net`)
- [ ] Credenciales de Producción — **solo como información futura, NO solicitar integración de producción todavía**

### VALIDACIÓN TÉCNICA (repetir el mismo rigor que con Travelgate — llamadas reales, nunca simuladas)
- [ ] Autenticación (HTTP Basic con `KEY_ID:API_KEY`)
- [ ] Search (by hotel IDs / by region)
- [ ] Retrieve hotelpage (`book_hash` tipo "h-…")
- [ ] Prebook (desde hotelpage y desde search) → `book_hash` tipo "p-…"
- [ ] Create booking process (`partner_order_id`)
- [ ] Check booking process — verificar los 3 estados reales: `processing`, `ok`, `error`
- [ ] Comportamiento real ante timeout/`unknown` durante Create — **intentar reproducir de forma controlada, si es posible, para acercarse a responder la pregunta de duplicidad**
- [ ] Cancel
- [ ] Retrieve booking (reconciliación)
- [ ] Webhook, si el sandbox lo permite probar
- [ ] Expiración real de los hashes (6h / 38min documentados — verificar en vivo)
- [ ] Catálogo de errores real observado
- [ ] Rate limits reales observados
- [ ] Tiempos de respuesta reales
- [ ] Comportamiento real ante retry con `partner_order_id` nuevo tras un error simulado
- [ ] Confirmar o descartar el riesgo de duplicación (Fase 4 de la auditoría anterior)

### COMPATIBILIDAD VIAO (solo auditar, NO modificar el contrato todavía)
- [ ] Confirmar si `HotelProvider` sigue siendo suficiente tal como está
- [ ] Confirmar el diseño de orquestación necesario para Search → Prebook → Book asíncrono (Create + poll) → Cancel
- [ ] Confirmar cómo representar la relación `clientReference`/`partner_order_id` frente al diseño actual de `booking_intents` (pensado para un identificador estable, no para una secuencia de hasta 10 intentos)
- [ ] Confirmar mapeo de reconciliación (`Retrieve bookings`) frente al patrón ya usado con Travelgate

---

## 7. Próximos pasos

1. Andrés decide qué canal usar (formulario `ratehawk.com/registration/` rellenado + mensaje de la sección 3, o intentar de nuevo `emergingtravel.com/partnerships/` → Technology Partners si se confirma su formulario por otra vía).
2. Andrés decide qué datos legales/fiscales de VIAO proporcionar (sección 4) — no se han inventado ni asumido aquí.
3. Enviar el mensaje preparado (sección 3), sin que este documento lo haya enviado por ningún medio.
4. Esperar respuesta — sin plazo público confirmado para esta primera etapa.
5. Cuando lleguen credenciales de Sandbox: repetir sobre RateHawk el mismo ejercicio de validación en vivo ya hecho con Travelgate, usando la checklist de la sección 6.
6. Mientras tanto: Hotelbeds sigue pendiente sin cambios; Travelgate sigue `GREEN` sin cambios; no se toma ninguna decisión de proveedor final.

---

## Fuentes consultadas en este documento

- [RateHawk — B2B Travel API](https://www.ratehawk.com/lp/en-us/API/) — accedida directamente, confirmado el CTA "GET STARTED" → registro.
- [RateHawk — Registration](https://www.ratehawk.com/registration/?lang=en) — accedida directamente, campos del formulario confirmados.
- `https://www.emergingtravel.com/partnerships/` — existencia y categorías confirmadas vía búsqueda; contenido exacto de la página bloqueado por protección anti-bot (`403 Forbidden`), no verificado en detalle.
- `docs/03_RESEARCH_VALIDATION/providers/VIAO_RATEHAWK_AUDIT.md` — fuente de todo el contexto técnico (Fase 1, Fase 4) reutilizado aquí.

---

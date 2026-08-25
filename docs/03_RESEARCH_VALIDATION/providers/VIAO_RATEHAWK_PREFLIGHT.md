---
STATUS: PROPOSAL
ERA: Esta sesión
DOMAIN: Travel/Providers
AUTHORITY: Checklist pre-vuelo, condicionado a credenciales reales + autorización explícita
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-25
---

# VIAO — PRE-FLIGHT para la futura validación en vivo de RateHawk / ETG

### Estado: PREPARACIÓN — SIN CREDENCIALES TODAVÍA. No se ejecuta nada en este documento. No se ha modificado código, `HotelProvider`, tipos, `errors.ts`, `booking_intents`, `bookings`, Supabase, migraciones, RLS, UI, rutas, dependencias ni `.env`.
### Contexto: Account Manager asignada — Laura Gurumeta. Credenciales de Sandbox todavía no recibidas. RateHawk **no está aprobado** como proveedor de VIAO. Travelgate sigue `GREEN`. Hotelbeds sigue pendiente. Ver `docs/03_RESEARCH_VALIDATION/providers/VIAO_RATEHAWK_AUDIT.md` (auditoría documental completa) y `docs/03_RESEARCH_VALIDATION/providers/VIAO_TRAVELGATE_SANDBOX_VALIDATION.md` (metodología ya probada, a repetir aquí).

---

## Condición de disparo

Este checklist **no se ejecuta** hasta que se cumplan, en este orden, las dos condiciones explícitas del encargo:

1. Existan credenciales de Sandbox reales, recibidas de Laura Gurumeta (o del canal oficial que ella indique).
2. Andrés autorice explícitamente el inicio de la Fase de Validación en Vivo.

Ninguna de las dos se da por supuesta por la mera existencia de este documento.

---

## A. Checklist PRE-FLIGHT (antes de ejecutar ninguna llamada)

1. **Confirmar la naturaleza de las credenciales** con Laura antes de usarlas: par `KEY_ID:API_KEY` explícitamente de **Sandbox**, nunca de producción. No asumir por el formato — pedir confirmación explícita si hay cualquier duda.
2. **Reconfirmar el endpoint vigente en ese momento**, no reutilizar sin comprobar el que aparece en este o en `VIAO_RATEHAWK_AUDIT.md` — en esta misma sesión ya apareció una discrepancia entre fuentes (`api-sandbox.worldota.net` confirmado en fuentes oficiales primarias vs `api-sandbox.ratehawk.com` citado solo por terceros) que se resolvió verificando de nuevo; repetir esa misma disciplina de verificación en el momento real, no fiarse de una fecha anterior.
3. **Pedir a Laura, junto con las credenciales, acceso a la documentación técnica completa** (`docs.emergingtravel.com` bloqueó lectura directa por protección anti-bot durante la auditoría — es posible que la documentación completa solo sea accesible tras autenticarse como partner).
4. **Aislamiento del entorno de prueba**: mismo criterio ya aplicado con Travelgate — ninguna llamada desde código de VIAO, ninguna variable nueva en `.env`, todo mediante herramientas de sesión/scratchpad, fuera del repositorio.
5. **Nunca pegar las credenciales reales en texto plano** en ningún documento, chat, o archivo del repositorio — a diferencia de la key pública de Travelgate (esa sí era pública por diseño), esta es privada y de un contrato real.
6. **Confirmar los valores de prueba permitidos**: verificar si RateHawk exige datos de holder/paxes realistas o si, como en Travelgate ("no es obligatorio dar nombres/edades reales"), acepta datos ficticios en Sandbox — no asumirlo, preguntarlo si no queda claro en la documentación que llegue.
7. **Releer antes de empezar**: `docs/03_RESEARCH_VALIDATION/providers/VIAO_RATEHAWK_AUDIT.md` Fase 4 (idempotencia) y Fase 5 (compatibilidad) — son las dos fases con preguntas abiertas reales que esta validación debe intentar cerrar.
8. **Confirmar el alcance ya comunicado a RateHawk** (mensaje de `docs/03_RESEARCH_VALIDATION/providers/VIAO_RATEHAWK_ACCESS.md`) para no contradecirlo durante las pruebas — explícitamente Sandbox, explícitamente no producción.
9. **Ningún cambio de código se prepara ni se anticipa antes de esta validación** — ni siquiera un borrador de `RateHawkProvider`. La validación es puramente exploratoria, igual que lo fue con Travelgate antes de que existiera ningún código.

---

## B. Evidencias a capturar durante la validación

Mismo criterio que `VIAO_TRAVELGATE_SANDBOX_VALIDATION.md`: **cada bloque de evidencia debe ser el request/response real y literal**, nunca parafraseado ni reconstruido de memoria. Si algo no se puede probar de forma segura, se documenta como `NO PROBADO`, nunca se rellena con un resultado inventado.

| Operación | Evidencia mínima a capturar |
|---|---|
| **Authentication** | Confirmación de que las credenciales autentican correctamente (y, opcionalmente, un intento fallido controlado para ver el error real de credenciales inválidas) |
| **Search** | Request completo (criteria+settings) y response real — incluyendo al menos un `search_hash` real devuelto |
| **Hotelpage** | Response real — el `book_hash` real devuelto (prefijo `"h-…"`) |
| **Prebook** (desde hotelpage y desde search, si ambas rutas se prueban) | Response real de cada variante — el `book_hash` resultante (prefijo `"p-…"`), y el precio/condiciones para comparar contra el de Search |
| **Create Booking** | Request real (`partner_order_id`, `book_hash`, holder/paxes) y la respuesta inicial cruda, tal cual |
| **Check Booking (poll)** | **Cada** respuesta del poll, no solo la última — con marca de tiempo de cada intento, para poder medir cuánto tarda en llegar a un estado final |
| **`processing` / `ok` / `error`** | Al menos un ejemplo real de cada estado si es posible reproducirlo de forma segura (p. ej. provocar un `error` con datos inválidos controlados) |
| **timeout / unknown** | Documentar honestamente si se pudo o no reproducir de forma segura — no forzar una desconexión de red real de forma insegura; si no es reproducible, decirlo explícitamente en vez de simularlo |
| **Retrieve Booking** | Response real tras Create, y de nuevo tras Cancel — para comparar el estado antes/después, mismo patrón ya usado con `hotelX.booking()` en Travelgate |
| **Cancel** | Request/response real completo |
| **Retry — la prueba crítica** | Capturar íntegras las respuestas de: (a) reenviar con el **mismo** `partner_order_id`, (b) reenviar con un `partner_order_id` **nuevo** — este es el hallazgo más importante pendiente de cerrar de toda la auditoría (Fase 4 de `VIAO_RATEHAWK_AUDIT.md`) |
| **Reconciliation** | Confirmar si `Retrieve Booking` permite localizar la reserva original después de un retry, con y sin `bookingID`/referencia a mano |
| **Expiración de `search_hash`/`book_hash`** | Si es viable dentro de la sesión de pruebas (38 min / 6 h documentados), intentar observarlo; si no es viable en el tiempo disponible, decirlo explícitamente en vez de darlo por hecho |
| **Rate limits** | Capturar las cabeceras reales de respuesta (límite/restantes/ventana) de al menos una llamada, si existen |
| **commission / net / gross** | Capturar los campos reales de precio de al menos una respuesta de Search y una de Prebook — es el dato que confirmaría (o no) si `getCommission()` sería viable con RateHawk, algo que no se pudo verificar con Travelgate |

---

## C. Recordatorios explícitos (sin cambios respecto al encargo)

- No asumir que RateHawk es mejor que Travelgate, ni que será el proveedor final de VIAO.
- No realizar ningún cambio técnico (código, tipos, `HotelProvider`, Supabase, etc.) hasta que esta validación se complete y Andrés decida los siguientes pasos.
- Hotelbeds sigue pendiente, sin cambios. Travelgate sigue `GREEN`, sin cambios.

---

## Confirmación

Repositorio intacto en este turno — no se ha modificado código, `HotelProvider`, tipos, `errors.ts`, `booking_intents`, `bookings`, Supabase, migraciones, RLS, UI, rutas, dependencias, `.env` ni configuración. Sin commit, sin push.

---

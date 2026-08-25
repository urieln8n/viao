---
STATUS: CURRENT
ERA: V1 checkpoint
DOMAIN: Travel/Providers, estado operativo
AUTHORITY: Estado operativo vigente (🟡 CONGELADO, caso #60019483)
SUPERSEDES: —
SUPERSEDED BY: —
LAST REVIEWED: 2026-08-23 (fecha propia del documento)
---

# VIAO — Estado de certificación Hotelbeds

**Estado:** 🟡 CONGELADO — esperando respuesta de Hotelbeds al caso **#60019483**.
**Fecha de congelación:** 2026-08-23.
**Regla activa:** 0 llamadas reales a Hotelbeds hasta nueva autorización explícita.

> **VIAO no está todavía certificado por Hotelbeds y no está preparado para producción comercial.** Toda la integración descrita aquí opera contra el entorno de evaluación (`api.test.hotelbeds.com`), nunca contra producción, y nunca ha ejecutado una reserva ni una cancelación reales.

---

## 1. Estado actual

- **Branch:** `main`
- **Último commit estable (HEAD):** `a4c9fd7` — "feat: complete hotel booking provider flow" (2026-08-23 13:50)
- **Working tree:** sucio, sin commitear — 23 archivos afectados (13 modificados + 10 grupos de archivos nuevos, ver sección 3)
- **Tests:** 695 total / 691 pass / 0 fail / 4 skipped
- **TSC (`npx tsc --noEmit`):** 0 errores
- **Lint (`npm run lint`):** 0 errores
- **Build (`npm run build`):** exitoso
- **Cambios accidentales fuera de alcance:** ninguno detectado (diff completo escaneado contra patrones de secretos, sin coincidencias; ningún archivo `.env`/`.pem`/`.key`/`.cert` entre los untracked)

Ninguno de estos cambios está commiteado, pusheado ni desplegado. Producción (Vercel) sigue exactamente como quedó al cierre de FPR-HOTELS-03: `HOTELBEDS_FIXED_HOTEL_CODES` activo (bypass restaurado), `TRAVEL_PROVIDER=hotelbeds` activo.

---

## 2. Caso Hotelbeds #60019483

Abierto tras el diagnóstico de FPR-HOTELS-04, relacionado con:

- El bloqueo HTTP 403 de la API de Booking/Availability.
- Certificación (paso de evaluación a certificación/producción).
- Condiciones comerciales (contrato, comisión, liquidación).
- Confirmación de si existe capacidad de consulta de reserva por `clientReference`/`provider_booking_reference` (necesaria para reconciliación).

**A la espera de respuesta.** No se realizará ninguna llamada real adicional mientras tanto.

---

## 3. Arquitectura actual

```
Usuario → destino (autocomplete, catálogo real Supabase) → destinationCode
        → SearchParams.destinationCode → HotelbedsProvider.resolveSearchScope()
        → [fixedHotelCodes > destinationCode > resolver por texto] (nunca combinados)
        → Availability (Hotelbeds, mTLS) → resultados
        → getPrice() en lotes pequeños (PRICE_BATCH_SIZE=4, máx. MAX_PRICED_RESULTS=12)

Booking (solo tras acción explícita del usuario en /booking/[propertyId]):
        → booking_intents (idempotencia atómica, dedup)
        → resolveBookableRate() [Availability fresca → CheckRate si RECHECK]
        → HotelbedsProvider.book() [POST /hotel-api/1.0/bookings, mTLS]
        → bookings (persistencia) → booking_intents.completed

Cancelación (aislada, sin UI todavía):
        → HotelbedsProvider.cancelBooking() [DELETE /hotel-api/1.0/bookings/{id}, mTLS]
```

**Archivos por bloque:**

| Bloque | Archivos |
|---|---|
| FPR-HOTELS-02 (catálogo de destinos) | `supabase/migrations/20260823140000_create_destinations.sql`; `lib/hotelbeds/destinations.ts`(+test); `lib/hotelbeds/destinations-mappers.ts`(+test); `lib/hotelbeds/sync-destinations.ts`(+test); `lib/destinations/get-cached-destinations.ts`(+test); `lib/destinations/upsert-destination-cache.ts`(+test); `lib/travel-provider/hotelbeds-destination-resolver.ts`(+test); `components/search/destination-input.tsx`; `app/search/search-form.tsx`; `app/search/page.tsx`; `app/search/results/page.tsx`; `app/home-search-form.tsx`; `app/page.tsx`; `types/travel.ts` |
| FPR-HOTELS-03 (activación real + límite de concurrencia) | `app/search/actions.ts` (MAX_PRICED_RESULTS/PRICE_BATCH_SIZE); `app/search/actions.test.ts` |
| FPR-HOTELS-04 | Solo investigación — sin cambios de código |
| FPR-HOTELS-COMMERCIAL-01 | Solo investigación — sin cambios de código |
| FPR-HOTELS-COMMERCIAL-02 (preparación de certificación) | `app/booking/[propertyId]/page.tsx` (maxDuration); `app/booking/[propertyId]/page.test.ts`; `lib/hotelbeds/http.ts` (GZIP); `lib/hotelbeds/content-http.ts` (GZIP); `lib/hotelbeds/response-body.ts`(+test); `lib/hotelbeds/log-http-error.ts`(+test); `lib/travel-provider/hotelbeds-provider.ts` (logging); `lib/travel-provider/hotelbeds-provider.test.ts` (logging) |

---

## 4. Qué está listo

- `destinationCode`/resolver/catálogo — funcional, probado, con prioridad `fixedHotelCodes > destinationCode > resolver` intacta y nunca combinada.
- Separación arquitectónica Search → Availability → CheckRate (solo si RECHECK) → Booking → Cancel — verificada sin gaps (ningún camino automático de Search hacia Booking).
- `Accept-Encoding: gzip` en peticiones + descompresión correcta de respuestas gzip y no-gzip (`response-body.ts`, 7 tests con buffers reales generados en memoria).
- `maxDuration = 60` en `app/booking/[propertyId]/page.tsx` — sitio correcto según la documentación oficial de Next.js (una Server Action solo hereda `maxDuration` de la página, nunca de su propio archivo `"use server"`).
- Logging estructurado seguro (`logHotelbedsHttpError`) en los 4 puntos donde antes se perdía el `cause` de Hotelbeds (availability, checkrate, booking, cancellation) — nunca imprime API key/secret/certificado/Authorization/X-Signature/datos de tarjeta/holder, verificado con tests.
- Máquina de estados de `booking_intents` (`in_progress`/`completed`/`failed`/`provider_confirmed_orphaned`) — sin camino a reserva duplicada (índice único parcial `booking_intents_dedup`).

## 5. Qué depende de Hotelbeds

- Resolución del caso #60019483.
- Confirmación de si la cuenta sigue bloqueada por la cuota de evaluación de **50 requests/día** (confirmado oficialmente en developer.hotelbeds.com/documentation/getting-started/) o si ya se liberó.
- Condiciones de certificación, comerciales, de liquidación y de margen.
- Confirmación de capacidad de consulta de reserva por `clientReference`/`provider_booking_reference` (bloquea la reconciliación).
- Credenciales/certificado/endpoints de producción, cuando corresponda.

## 6. Qué depende de VIAO

- Preparar la información comercial que Hotelbeds pueda solicitar (Escenario C).
- Diseñar (no implementar) el disparo de reconciliación una vez confirmada la capacidad técnica de Hotelbeds.
- Definir el modelo de pago/liquidación propio de VIAO (no existe todavía).
- Auditar cualquier credencial/certificado nuevo que Hotelbeds entregue antes de sustituir nada (Escenario E).

## 7. Qué está bloqueado

- Toda llamada real a Availability/CheckRate/Booking/Cancel — **0 hasta nueva autorización**.
- Implementación de reconciliación — depende de confirmación técnica de Hotelbeds (sección 5).
- Cualquier reserva o cancelación real.
- Cambios en `.env`, Vercel, certificados, credenciales, endpoints.
- Commit/push/deploy de este bloque.

---

## 8. Reconciliación — pendiente, solo diseñada

Riesgo: un `network_error`/2xx no interpretable en `book()`/`cancelBooking()` deja el `booking_intent` en `in_progress` sin forma de confirmar si Hotelbeds procesó la operación. Arquitectura mínima propuesta (sin implementar): proceso que localiza intents `in_progress` antiguos, consulta a Hotelbeds por `client_reference`/`provider_booking_reference`, y resuelve a `completed`/`failed` según la respuesta. **Bloqueada** hasta confirmar si Hotelbeds expone esa capacidad de consulta — grep del código actual confirma que **no existe ninguna llamada `GET` de booking implementada** (solo `POST` para crear y `DELETE` para cancelar).

---

## 9. Checklist para certificación

- [ ] Caso #60019483 resuelto
- [ ] Cuota de evaluación liberada o plan de consumo acordado
- [x] `destinationCode` funcional y probado
- [x] GZIP implementado
- [x] `maxDuration >= 60` configurado
- [x] Logging seguro de errores HTTP
- [ ] Confirmación de capacidad de consulta de booking (clientReference/provider_booking_reference)
- [ ] Condiciones comerciales conocidas
- [ ] Reserva de prueba de certificación autorizada explícitamente (6 meses vista, nunca NRF, cancelar de inmediato — requisito de Hotelbeds, NO ejecutar sin autorización)

## 10. Checklist para producción

- [ ] Certificación completada
- [ ] Credenciales/certificado de producción recibidos y auditados
- [ ] Endpoints de producción confirmados (`api-mtls.hotelbeds.com`)
- [ ] Modelo de liquidación/pago de VIAO definido
- [ ] Reconciliación implementada
- [ ] Margen/comisión confirmado
- [x] Máquina de estados de `booking_intents` sin riesgo de duplicado
- [ ] Monitorización de producción activa

---

## Escenarios de respuesta previstos

| Escenario | Acción |
|---|---|
| A — Hotelbeds confirma avance a certificación | Preparar FPR-HOTELS-CERTIFICATION |
| B — Hotelbeds pide cambios técnicos | Auditar cada requisito antes de tocar código |
| C — Hotelbeds pide información comercial | No tocar código; preparar la información pedida |
| D — Hotelbeds confirma reseteo de cuota | No probar de inmediato; definir estrategia de consumo primero |
| E — Hotelbeds entrega credenciales/certificado nuevos | No sustituir nada sin auditar primero qué se entregó y a qué entorno corresponde |

**Siguiente paso: ninguno, hasta recibir y analizar la respuesta de Hotelbeds al caso #60019483.**

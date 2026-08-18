"use server";

// F6-04 (VIAO_ROADMAP.md) — registra `booking_clicked` (VIAO_ARCHITECTURE.md
// sección 10, VIAO_DATABASE.md sección 12) en el momento exacto en que el
// usuario pulsa el CTA "Reservar" de `/properties/[id]` — el punto en el
// que se inicia/pretende el flujo de reserva, NO cuando el provider acepta
// ni cuando existe una fila en `bookings` (eso es `booking_completed`,
// `app/booking/actions.ts`).
//
// Por qué existe este archivo (y no un `logAnalyticsEvent()` inline en
// `page.tsx`, como hace `hotel_viewed` en `resolve.ts`): `hotel_viewed` se
// registra cuando el SERVIDOR resuelve el detalle (una vez por render de
// esa página, lo cual es correcto para "el usuario vio este alojamiento").
// `booking_clicked` necesita representar un CLIC real del usuario, no un
// render de página — de lo contrario un `refresh`/`back`/visita directa a
// `/booking/[propertyId]` (todos ellos re-renders del lado servidor de esa
// ruta) generarían eventos falsos sin que el usuario haya pulsado nada.
// `/properties/[id]` es un Server Component (F5-04) sin necesidad objetiva
// de convertirse en Client Component completo — la solución mínima
// coherente es que solo el CTA (`book-cta-link.tsx`, nuevo, "use client")
// capture el `onClick` real y llame a esta Server Action, que a su vez
// reutiliza `logAnalyticsEvent()` (F5-05) — el único punto de escritura en
// `analytics_events` en todo el proyecto, sin crear un segundo sistema.
//
// Identidad: `logAnalyticsEvent()` ya resuelve el usuario internamente vía
// `createClient()` + `auth.getUser()` (F3-06), exactamente igual que
// `hotel_viewed`/`search_started` — esta función no recibe ni acepta
// ningún id de usuario del cliente. Un visitante anónimo puede pulsar
// "Reservar" (la página de detalle es pública) y el evento se registra
// igual, con `user_id = null` (mismo comportamiento que `hotel_viewed`).
//
// Resiliencia: `logAnalyticsEvent()` ya es best-effort (nunca lanza) — no
// se añade ningún try/catch adicional aquí, igual que en `resolve.ts`.
import { logAnalyticsEvent } from "../../../lib/analytics/log-event";
import { isValidUuid } from "./resolve";

export interface LogBookingClickedInput {
  providerPropertyId: string;
  searchId?: string;
}

export async function logBookingClickedAction({
  providerPropertyId,
  searchId,
}: LogBookingClickedInput): Promise<void> {
  const validSearchId = searchId && isValidUuid(searchId) ? searchId : undefined;

  await logAnalyticsEvent("booking_clicked", {
    providerPropertyId,
    ...(validSearchId ? { searchId: validSearchId } : {}),
  });
}

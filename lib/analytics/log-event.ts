import { createClient as createSessionClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import type { AnalyticsEventName } from "./events";

// F5-05 (VIAO_ROADMAP.md) — Registro server-side de `analytics_events`
// (VIAO_ARCHITECTURE.md sección 10 punto 5, sección 18; VIAO_DATABASE.md
// sección 12). Único punto del código que escribe en esta tabla: el resto
// de VIAO (Server Actions, resolución de detalle) llama a
// `logAnalyticsEvent()`, nunca inserta directamente.
//
// Identidad del usuario: se reutiliza exactamente el mecanismo ya
// establecido por F3-06 (`createClient()` de `lib/supabase/server.ts` +
// `auth.getUser()`, que valida el JWT vía la sesión de cookies) — ningún
// mecanismo paralelo de autenticación. `/search`, `/search/results` y
// `/properties/[id]` son rutas públicas (no protegidas por F3-06), así que
// puede no haber sesión: `user_id` es nullable en `analytics_events`
// ("Usuario, cuando esté disponible") y aquí se guarda `null` en ese caso
// — un evento de un visitante anónimo es válido y se registra igual.
//
// La escritura en sí usa el cliente de servicio (`lib/supabase/service.ts`,
// F5-05), la única vía permitida por el Patrón B de `analytics_events`
// (RLS activo, sin ninguna política — ni siquiera para `authenticated`).
//
// Best-effort, no bloqueante: un fallo al registrar un evento nunca debe
// romper la búsqueda o la visualización de un alojamiento (son la
// operación principal; analytics es un efecto secundario auditable). Se
// captura cualquier error y se registra en consola — no se relanza.
export async function logAnalyticsEvent(
  eventName: AnalyticsEventName,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient.from("analytics_events").insert({
      event_name: eventName,
      user_id: user?.id ?? null,
      metadata,
    });

    if (error) {
      console.error(
        `[analytics] No se pudo registrar el evento "${eventName}":`,
        error.message,
      );
    }
  } catch (error) {
    console.error(
      `[analytics] Error inesperado registrando el evento "${eventName}":`,
      error,
    );
  }
}

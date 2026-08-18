import { createClient as createSessionClient } from "../supabase/server";
import { createServiceRoleClient } from "../supabase/service";
import type { AnalyticsEventName } from "./events";
import { sendPostHogServerEvent } from "./posthog";

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
// `explicitUserId` (F12-02): algunos eventos críticos se otorgan a un
// usuario DISTINTO del de la sesión actual — p. ej. `reward_earned` del
// referrer en `completeReferralActionIfPending()` (F8-04), donde la
// sesión activa es la del usuario REFERIDO, no la del referrer. Cuando se
// proporciona, se usa tal cual (nunca se resuelve de la sesión); cuando se
// omite, se mantiene el comportamiento exacto de F5-05 (resolver de la
// sesión actual). No cambia ningún call site existente (parámetro
// opcional).
//
// La escritura en sí usa el cliente de servicio (`lib/supabase/service.ts`,
// F5-05), la única vía permitida por el Patrón B de `analytics_events`
// (RLS activo, sin ninguna política — ni siquiera para `authenticated`).
//
// PostHog (F12-01/F12-02, VIAO_ARCHITECTURE.md sección 18): los eventos
// críticos se reenvían también a PostHog server-side desde este mismo
// punto único, para que no dependan de que el navegador del usuario
// ejecute JavaScript de terceros sin bloqueos — exactamente la razón ya
// documentada en la arquitectura. `sendPostHogServerEvent()` es best-effort
// y nunca lanza (ver lib/analytics/posthog.ts); si PostHog no está
// configurado (sin `NEXT_PUBLIC_POSTHOG_KEY`), es un no-op silencioso.
//
// Best-effort, no bloqueante: un fallo al registrar un evento nunca debe
// romper la búsqueda o la visualización de un alojamiento (son la
// operación principal; analytics es un efecto secundario auditable). Se
// captura cualquier error y se registra en consola — no se relanza.
export async function logAnalyticsEvent(
  eventName: AnalyticsEventName,
  metadata: Record<string, unknown> = {},
  explicitUserId?: string,
): Promise<void> {
  let userId: string | null = explicitUserId ?? null;

  try {
    if (!explicitUserId) {
      const sessionClient = await createSessionClient();
      const {
        data: { user },
      } = await sessionClient.auth.getUser();
      userId = user?.id ?? null;
    }

    const serviceClient = createServiceRoleClient();
    const { error } = await serviceClient.from("analytics_events").insert({
      event_name: eventName,
      user_id: userId,
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

  await sendPostHogServerEvent(eventName, metadata, userId);
}

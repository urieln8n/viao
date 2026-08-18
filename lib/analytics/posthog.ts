// F12-01 (VIAO_ROADMAP.md) — Única puerta de entrada a PostHog
// (VIAO_MVP_v0.1.md sección 16; VIAO_ARCHITECTURE.md secciones 10, 18, 30).
// Ningún otro archivo debe importar `posthog-js` directamente ni construir
// una llamada HTTP a PostHog por su cuenta.
//
// Configuración vía variables de entorno, nunca hardcodeada (ver
// .env.example): `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST`.
// Ambas usan el prefijo `NEXT_PUBLIC_` deliberadamente — la "project API
// key" de PostHog es, por diseño del propio producto, una clave pública de
// solo-ingesta (equivalente a un ID de Google Analytics o una publishable
// key de Stripe): sirve para ENVIAR eventos, nunca para leerlos ni
// administrar el proyecto, así que exponerla en el cliente no es una fuga
// de secreto. Lo que nunca se usa aquí ni en ningún otro punto de VIAO es
// una "Personal API Key" de PostHog (esa sí sería un secreto real, capaz de
// leer/administrar datos) — no existe ninguna necesidad de F12 que la
// requiera.
//
// Sin credenciales configuradas: todo este módulo se convierte en un no-op
// silencioso (nunca lanza, nunca bloquea el registro de un usuario ni una
// reserva) — VIAO funciona igual sin PostHog configurado, exactamente como
// ya ocurre con `analytics_events` cuando falla (F5-05).
//
// Lectura de `process.env` DENTRO de cada función (no como constante de
// módulo) — mismo patrón que `lib/openai/config.ts` (F9-01): permite que
// los tests controlen el estado configurado/no-configurado sin depender
// del momento exacto en que Node cachea el módulo.
function getPostHogKey(): string | undefined {
  return process.env.NEXT_PUBLIC_POSTHOG_KEY || undefined;
}

function getPostHogHost(): string {
  return process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
}

export function isPostHogConfigured(): boolean {
  return Boolean(getPostHogKey());
}

export function getPostHogClientConfig(): { key: string; host: string } | undefined {
  const key = getPostHogKey();
  if (!key) {
    return undefined;
  }
  return { key, host: getPostHogHost() };
}

// Captura server-side (F12-02) — reenvía los eventos críticos que ya se
// registran en `analytics_events` (lib/analytics/log-event.ts) también a
// PostHog, sin depender de que el navegador del usuario ejecute JavaScript
// de terceros sin bloqueos (razón ya documentada en
// VIAO_ARCHITECTURE.md sección 18). Usa `fetch()` directo al endpoint de
// captura de PostHog — sin el paquete `posthog-node` (pensado para
// procesos Node de larga duración con `shutdown()`/flush manual, un
// encaje pobre para Server Actions de vida corta; una única petición HTTP
// es la solución mínima, VIAO_MVP_v0.1.md sección 14 "sin sobreingeniería").
//
// Sin `userId`: no se envía nada. Fabricar un `distinct_id` para un
// visitante anónimo aquí (server-side) mezclaría eventos de usuarios
// distintos bajo una identidad falsa en PostHog — el seguimiento de
// comportamiento anónimo ya lo cubre `posthog-js` en el cliente con su
// propio id de dispositivo real.
export async function sendPostHogServerEvent(
  eventName: string,
  properties: Record<string, unknown>,
  userId: string | null,
): Promise<void> {
  const key = getPostHogKey();
  if (!key || !userId) {
    return;
  }

  try {
    const response = await fetch(`${getPostHogHost()}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        event: eventName,
        distinct_id: userId,
        properties: { ...properties, $lib: "viao-server" },
      }),
    });

    if (!response.ok) {
      console.error(
        `[posthog] No se pudo enviar el evento "${eventName}" (HTTP ${response.status})`,
      );
    }
  } catch (error) {
    console.error(`[posthog] Error inesperado enviando el evento "${eventName}":`, error);
  }
}

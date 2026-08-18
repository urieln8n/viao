import { createServiceRoleClient } from "../supabase/service";
import { logAnalyticsEvent } from "./log-event";

// F12-05 (VIAO_ROADMAP.md) — `return_visit`: se registra cuando un usuario
// autenticado inicia una nueva sesión POSTERIOR a su primer uso registrado
// (VIAO_MVP_v0.1.md sección 19, "la métrica más importante del MVP es la
// retención"). Recibe `userId` explícito (nunca resuelve la sesión aquí) —
// mismo patrón que `associateBookingWithTrip`/F11: la lógica vive en una
// función sin `next/headers`, testable directamente contra Supabase local
// real; el Server Action que sí depende de la sesión
// (app/(auth)/login/actions.ts) es una envoltura fina.
//
// "Primer uso registrado" = el evento MÁS ANTIGUO de `analytics_events`
// para este usuario (siempre existe al menos `registered`, insertado por
// el trigger en el momento real del signUp). Deliberadamente NO se usa
// `profiles.created_at`: al auditar los GRANTs reales antes de escribir
// este archivo (Paso 0 de F12), `service_role` no tenía NINGÚN privilegio
// sobre `profiles` (mismo vacío recurrente BYPASSRLS≠GRANT de F5-F11) —
// en vez de añadir una migración nueva solo para esto, se reutiliza
// `analytics_events`, donde `service_role` YA tiene SELECT+INSERT
// (F5-05) y es semánticamente equivalente ("primer uso registrado" es,
// literalmente, el primer evento de analytics que existe de este
// usuario).
//
// Si la fecha (UTC) de hoy es la MISMA que la del primer evento, no es un
// return_visit — es simplemente el usuario terminando de registrarse y
// entrando a su cuenta el mismo día (login inmediato tras `signUp`, ya
// cubierto por `registered`). Comparación por día (no por hora) porque el
// propio roadmap enmarca la prueba como "simulando un segundo día" — no
// se exige (ni se ha definido) una ventana más fina.
//
// Deduplicación (F12-05, "protección razonable contra duplicarlo múltiples
// veces durante la misma sesión"): como máximo un `return_visit` por
// usuario por día UTC — se comprueba si ya existe uno con `created_at`
// dentro del día de hoy antes de insertar. No se inventa un concepto de
// "sesión" distinto del que ya existe (no hay session_id de servidor en
// VIAO); un día es la granularidad más simple y verificable con los datos
// reales de `analytics_events`.
export interface RecordReturnVisitResult {
  recorded: boolean;
}

export async function recordReturnVisitIfApplicable(
  userId: string,
): Promise<RecordReturnVisitResult> {
  const service = createServiceRoleClient();

  const { data: firstEvent, error: firstEventError } = await service
    .from("analytics_events")
    .select("created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstEventError || !firstEvent) {
    return { recorded: false };
  }

  const todayUtc = new Date().toISOString().slice(0, 10);
  const firstUseUtc = new Date(firstEvent.created_at as string).toISOString().slice(0, 10);

  if (todayUtc === firstUseUtc) {
    return { recorded: false };
  }

  const startOfTodayUtc = `${todayUtc}T00:00:00.000Z`;
  const { data: existing, error: existingError } = await service
    .from("analytics_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_name", "return_visit")
    .gte("created_at", startOfTodayUtc)
    .limit(1);

  if (existingError) {
    return { recorded: false };
  }
  if (existing && existing.length > 0) {
    return { recorded: false };
  }

  await logAnalyticsEvent("return_visit", {}, userId);
  return { recorded: true };
}

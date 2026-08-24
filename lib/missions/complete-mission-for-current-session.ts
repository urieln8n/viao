import { createClient as createSessionClient } from "../supabase/server";
import { completeMission } from "./complete-mission";

// Bloque Missions (Prompt Maestro 24/08/2026) — envoltorio best-effort
// para enganchar una Mission en rutas públicas donde puede o no haber
// sesión (`/search`, `/properties/[id]`) — mismo criterio "best-effort,
// no bloqueante" ya documentado en `lib/analytics/log-event.ts`, que ya
// resuelve la sesión exactamente así en esos mismos puntos. Nunca
// lanza: un fallo aquí (sin sesión, fuera de una petición real de
// Next.js, pool agotado, `mission_key` desconocida) nunca debe romper
// la acción real que lo dispara — buscar, ver un alojamiento, etc.
export async function completeMissionForCurrentSession(missionKey: string): Promise<void> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    if (!user) {
      return;
    }
    await completeMission(user.id, missionKey);
  } catch (error) {
    console.error(`[missions] No se pudo completar la Mission "${missionKey}":`, error);
  }
}

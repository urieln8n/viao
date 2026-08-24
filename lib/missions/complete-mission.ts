import { createServiceRoleClient } from "../supabase/service";
import { getMissionDefinition } from "./rules";

// Bloque Missions (Prompt Maestro 24/08/2026) — único punto que invoca
// `complete_mission()`
// (supabase/migrations/20260824101000_create_complete_mission_rpc.sql).
// El RPC hace todo el trabajo atómico real (idempotencia, kill-switch,
// INSERT en `mission_completions` + `rewards_transactions`) — este
// archivo solo resuelve el `period_key` (server-side, nunca del
// cliente) y traduce el resultado. Ningún otro archivo debe llamar a
// este RPC ni escribir en `mission_completions` directamente.
//
// `userId` SIEMPRE debe venir de la sesión real resuelta server-side
// por quien llama a esta función (`auth.getUser()`, mismo patrón que
// `lib/rewards/redeem-reward.ts`) — esta función no vuelve a comprobar
// la sesión, confía en que su llamante ya lo hizo. El backend valida el
// evento/acción real (búsqueda, visita, Goal creado) ANTES de llamar
// aquí — nunca se otorgan Points por una llamada arbitraria sin que la
// acción real ya haya ocurrido.
export type CompleteMissionOutcome =
  | { outcome: "completed"; pointsAwarded: number }
  | { outcome: "mission_not_found" }
  | { outcome: "pool_exhausted" }
  | { outcome: "error"; message: string };

/**
 * Semana ISO 8601 (`AAAA-Wss`) de la fecha dada, en UTC. Función pura
 * (sin `Date.now()` interno) para poder probarla con fechas fijas —
 * `currentIsoWeekKey()` es el único punto que la ata al reloj real.
 * Algoritmo estándar (semana que contiene el jueves de esa semana
 * decide el año/número), verificado contra casos límite de fin/inicio
 * de año antes de usarlo aquí.
 */
export function isoWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNumber = (d.getUTCDay() + 6) % 7; // lunes=0 ... domingo=6
  d.setUTCDate(d.getUTCDate() - dayNumber + 3); // jueves de esa semana ISO
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7,
    );
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function currentIsoWeekKey(): string {
  return isoWeekKey(new Date());
}

const LIFETIME_PERIOD_KEY = "lifetime";

export async function completeMission(userId: string, missionKey: string): Promise<CompleteMissionOutcome> {
  const mission = getMissionDefinition(missionKey);
  if (!mission) {
    return { outcome: "mission_not_found" };
  }

  const periodKey = mission.periodicity === "lifetime" ? LIFETIME_PERIOD_KEY : currentIsoWeekKey();

  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("complete_mission", {
    p_user_id: userId,
    p_mission_key: missionKey,
    p_period_key: periodKey,
  });

  if (error) {
    // Mismo criterio de traducción por texto ya usado en
    // `lib/rewards/redeem-reward.ts`: PostgREST no distingue "excepción
    // de negocio esperada" de "fallo técnico" con un código propio.
    if (error.message.includes("mission_not_found")) {
      return { outcome: "mission_not_found" };
    }
    if (error.message.includes("missions_pool_exhausted")) {
      return { outcome: "pool_exhausted" };
    }
    return { outcome: "error", message: error.message };
  }
  if (!data) {
    return { outcome: "error", message: "complete_mission no devolvió ninguna fila." };
  }

  return { outcome: "completed", pointsAwarded: data.points_awarded as number };
}

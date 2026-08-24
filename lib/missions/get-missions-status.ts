import { createClient as createSessionClient } from "../supabase/server";
import { isoWeekKey } from "./complete-mission";
import { MISSIONS, type MissionDefinition } from "./rules";

// Bloque Missions (Prompt Maestro 24/08/2026) — lectura de solo estado
// (nunca completa nada): cliente de SESIÓN, `mission_completions`
// concede SELECT propio directo a `authenticated` (RLS
// `mission_completions_select_own`) — mismo criterio que
// `get-rewards-catalog.ts`. Nunca lanza: un fallo aquí se trata como
// "ninguna Mission completada todavía", nunca rompe Home.
export interface MissionStatus extends MissionDefinition {
  completed: boolean;
}

export async function getMissionsStatus(): Promise<MissionStatus[]> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return MISSIONS.map((mission) => ({ ...mission, completed: false }));
    }

    const { data: completions, error } = await sessionClient
      .from("mission_completions")
      .select("mission_key, period_key");

    if (error) {
      return MISSIONS.map((mission) => ({ ...mission, completed: false }));
    }

    const currentWeek = isoWeekKey(new Date());
    const completedKeys = new Set(
      (completions ?? []).map((row) => `${row.mission_key as string}:${row.period_key as string}`),
    );

    return MISSIONS.map((mission) => {
      const periodKey = mission.periodicity === "lifetime" ? "lifetime" : currentWeek;
      return { ...mission, completed: completedKeys.has(`${mission.key}:${periodKey}`) };
    });
  } catch {
    return MISSIONS.map((mission) => ({ ...mission, completed: false }));
  }
}

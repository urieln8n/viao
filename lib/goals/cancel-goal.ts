import { createClient as createSessionClient } from "../supabase/server";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — cancelación de un Goal. Patrón A
// directo (RLS `goals_update_own`): cancelar no tiene ninguna
// implicación económica que proteger (no se tocan Points), por eso no
// pasa por service_role, a diferencia de Rewards.
export type CancelGoalResult = { outcome: "success" } | { outcome: "not_found" } | { outcome: "error"; message: string };

export async function cancelGoal(goalId: string): Promise<CancelGoalResult> {
  const sessionClient = await createSessionClient();

  const { data, error } = await sessionClient
    .from("goals")
    .update({ status: "cancelled" })
    .eq("id", goalId)
    .eq("status", "active")
    .select("id")
    .maybeSingle();

  if (error) {
    return { outcome: "error", message: error.message };
  }
  if (!data) {
    return { outcome: "not_found" };
  }

  return { outcome: "success" };
}

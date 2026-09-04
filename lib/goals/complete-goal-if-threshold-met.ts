import { createServiceRoleClient } from "../supabase/service";

// P14.4-F (F4 — Goal Completion) — capa fina sobre el RPC
// `complete_goal_if_threshold_met()`
// (supabase/migrations/20260904110000_add_complete_goal_if_threshold_met_rpc.sql),
// que hace TODO el trabajo atómico real (lock de la fila, recómputo
// autoritativo de `earnedPoints` en SQL, señal transaccional para
// atravesar `protect_goal_immutable_fields()`, UPDATE condicional) — este
// archivo solo traduce el resultado, mismo patrón exacto que
// `lib/rewards/redeem-reward.ts`/`lib/partners/register-partner-activity.ts`:
// `service_role` internamente (el RPC no está concedido a `authenticated`),
// nunca el cliente de sesión.
//
// `userId` SIEMPRE debe venir de la sesión real resuelta server-side por
// quien llama (mismo patrón que el resto de `lib/`) — esta función no
// vuelve a comprobar la sesión, confía en que su llamante (`get-goal.ts`)
// ya lo hizo.
export type GoalStatus = "active" | "completed" | "cancelled" | "not_found";

export interface GoalCompletionResult {
  goalStatus: GoalStatus;
  /** true ÚNICAMENTE en la llamada exacta que transiciona el Goal a 'completed' por primera vez — nunca en un reintento/replay/carrera perdida (garantizado por el propio RPC, verificado empíricamente con 5 llamadas concurrentes reales: exactamente 1 `justCompleted:true`). */
  justCompleted: boolean;
}

export async function completeGoalIfThresholdMet(goalId: string, userId: string): Promise<GoalCompletionResult> {
  const service = createServiceRoleClient();
  const { data, error } = await service.rpc("complete_goal_if_threshold_met", {
    p_goal_id: goalId,
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) {
    // Fail-closed: cualquier fallo se trata como "no se pudo confirmar la
    // completion" — nunca se inventa un estado. El llamante decide qué
    // hacer (get-goal.ts lo trata igual que "sin Goal activo").
    return { goalStatus: "not_found", justCompleted: false };
  }

  const row = data[0] as { goal_status: string; just_completed: boolean };
  return {
    goalStatus: row.goal_status as GoalStatus,
    justCompleted: row.just_completed,
  };
}

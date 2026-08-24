"use server";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Server Actions de Goals. Capa
// fina sobre `lib/goals/*` — mismas 2 reglas de validación que ya derivan
// del propio `createGoal()` (título no vacío, target_points > 0), sin
// duplicar lógica.
import { createGoal, type CreateGoalResult } from "../../lib/goals/create-goal";
import { cancelGoal, type CancelGoalResult } from "../../lib/goals/cancel-goal";

export async function createGoalAction(input: {
  title: string;
  targetPoints: number;
  targetDate?: string;
}): Promise<CreateGoalResult> {
  return createGoal(input);
}

export async function cancelGoalAction(goalId: string): Promise<CancelGoalResult> {
  return cancelGoal(goalId);
}

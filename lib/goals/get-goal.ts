import { createClient as createSessionClient } from "../supabase/server";

// Bloque Goals V1 (VIAO_GOALS_V1_DECISION_LOCK.md, GOAL_PROGRESS_MODEL=
// WALLET_BALANCE, aprobado por el propietario) — lectura del Goal
// activo. El progreso hacia el objetivo ya NO se calcula aquí: es
// `min(100, round(wallet_balance / target_points * 100))`
// (`calculateGoalProgressPercent()`, más abajo), donde `wallet_balance`
// es el saldo real del usuario (`get-wallet-balance.ts`/
// `rewards_wallets`) — la MISMA cifra que "Points disponibles ahora".
// Este módulo deja de leer `rewards_transactions` por completo: ya no
// necesita `points_at_goal_creation` ni ninguna suma histórica de
// earnings para nada del cálculo de progreso (la columna
// `points_at_goal_creation` se conserva en la tabla sin usarse aquí —
// ver Decision Lock, "no eliminar todavía").
//
// Sustituye al modelo híbrido anterior (`points_at_goal_creation + SUM
// de earned desde la creación, excluyendo redemption_refund`) — ese
// modelo no fue un error, fue una decisión de producto previa, superada
// por la decisión V1 (ver Decision Lock, sección "Historical Decision").
export interface ActiveGoal {
  id: string;
  title: string;
  targetPoints: number;
  targetDate?: string;
  createdAt: string;
}

// `calculateGoalProgressPercent()` vive en `./calculate-progress.ts`
// (función pura, sin `next/headers`) — nunca aquí, para que un Client
// Component pueda importarla sin arrastrar `createSessionClient` (más
// abajo) a su bundle. Ver el comentario de cabecera de ese archivo.

export async function getActiveGoal(): Promise<ActiveGoal | undefined> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) {
      return undefined;
    }

    const { data: goal, error: goalError } = await sessionClient
      .from("goals")
      .select("id, title, target_points, target_date, created_at")
      .eq("status", "active")
      .maybeSingle();

    if (goalError || !goal) {
      return undefined;
    }

    return {
      id: goal.id as string,
      title: goal.title as string,
      targetPoints: goal.target_points as number,
      targetDate: (goal.target_date as string | null) ?? undefined,
      createdAt: goal.created_at as string,
    };
  } catch {
    return undefined;
  }
}

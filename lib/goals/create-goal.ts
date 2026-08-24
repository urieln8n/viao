import { createClient as createSessionClient } from "../supabase/server";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — creación de un Goal. Cliente de
// SESIÓN (Patrón A, igual que `trips`): el usuario inserta directamente
// bajo RLS (`goals_insert_own`), nunca vía service_role — a diferencia
// de Rewards (Patrón B, operación puramente económica de ledger), Goals
// es metadata de producto de bajo riesgo.
//
// `points_at_goal_creation`: el valor que se envía aquí (0) es
// deliberadamente un placeholder — el trigger `security definer`
// `set_goal_points_at_creation()`
// (supabase/migrations/20260823153000_create_goals.sql) lo SOBRESCRIBE
// siempre con el saldo real en el momento del INSERT, ignorando
// cualquier valor enviado. Nunca confiar en el cliente para este dato.
//
// Único Goal activo: el índice único parcial `goals_one_active_per_user_idx`
// (WHERE status='active') es quien decide atómicamente si ya existe uno
// — por eso esta función nunca hace un SELECT previo para comprobarlo
// (mismo criterio que `create-booking-intent.ts`/F7-01).
export interface CreateGoalInput {
  title: string;
  targetPoints: number;
  targetDate?: string;
}

export type CreateGoalResult =
  | { outcome: "success"; goalId: string }
  | { outcome: "already_has_active_goal" }
  | { outcome: "invalid_input"; message: string }
  | { outcome: "error"; message: string };

export async function createGoal(input: CreateGoalInput): Promise<CreateGoalResult> {
  if (!input.title.trim()) {
    return { outcome: "invalid_input", message: "El título del objetivo es obligatorio." };
  }
  if (!(input.targetPoints > 0)) {
    return { outcome: "invalid_input", message: "El objetivo de Points debe ser mayor que cero." };
  }

  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return { outcome: "error", message: "No hay sesión activa." };
  }

  const { data, error } = await sessionClient
    .from("goals")
    .insert({
      user_id: user.id,
      title: input.title.trim(),
      target_points: input.targetPoints,
      target_date: input.targetDate ?? null,
      points_at_goal_creation: 0,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation real de Postgres sobre
    // goals_one_active_per_user_idx — ya existe un Goal 'active'.
    if (error.code === "23505") {
      return { outcome: "already_has_active_goal" };
    }
    return { outcome: "error", message: error.message };
  }
  if (!data) {
    return { outcome: "error", message: "No se pudo crear el objetivo (sin datos devueltos)." };
  }

  return { outcome: "success", goalId: data.id as string };
}

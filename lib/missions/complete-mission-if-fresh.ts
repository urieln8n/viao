import type { SupabaseClient } from "@supabase/supabase-js";
import { completeMission } from "./complete-mission";

// P14.4-F (F3 — Points Feedback) — `completeMission()` (RPC
// `complete_mission()`) es idempotente por diseño: una Mission `lifetime`
// ya completada devuelve la MISMA fila (mismo `pointsAwarded`) en un
// segundo/tercer intento, sin distinguir "recién completada" de "ya
// estaba completada". Para que un toast de feedback nunca afirme "+N
// Points" cuando en realidad no se otorgó nada nuevo (p. ej. el segundo
// Goal que un usuario crea, tras el primero), esta envoltura comprueba
// la preexistencia ANTES de llamar al RPC — con el MISMO cliente de
// sesión ya en uso por el llamante (Patrón A, `mission_completions_select_own`
// ya concede SELECT a `authenticated`, sin necesidad de service_role
// para esta lectura). La comprobación es SOLO para la precisión del
// feedback — la otorgación real de Points sigue siendo, exclusivamente,
// la del propio RPC `complete_mission()`, sin cambios de autorización.
//
// Vive en su propio archivo (recibe `sessionClient` como parámetro, en
// vez de resolverlo internamente vía `next/headers`) para ser testeable
// directamente en `node:test`, mismo motivo exacto que
// `lib/goals/get-earned-points.ts`/`complete-goal-if-threshold-met.ts`.
export async function completeMissionIfFresh(
  sessionClient: SupabaseClient,
  userId: string,
  missionKey: string,
  periodKey: string,
): Promise<number | undefined> {
  const { data: existingCompletion } = await sessionClient
    .from("mission_completions")
    .select("id")
    .eq("user_id", userId)
    .eq("mission_key", missionKey)
    .eq("period_key", periodKey)
    .maybeSingle();

  const result = await completeMission(userId, missionKey);

  if (!existingCompletion && result.outcome === "completed") {
    return result.pointsAwarded;
  }
  return undefined;
}

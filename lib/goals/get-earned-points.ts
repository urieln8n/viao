import type { SupabaseClient } from "@supabase/supabase-js";

// P14.4-E (Goal Progress Model — Decision Lock OPCIÓN B, reactivación
// del modelo histórico ya construido en 20260823153000_create_goals.sql,
// abandonado por GOAL_PROGRESS_MODEL=WALLET_BALANCE y ahora revertido)
// — cálculo de "Points acumulados ganados hacia un Goal desde su
// creación": NUNCA baja al canjear una Reward (a diferencia del modelo
// WALLET_BALANCE que sustituye). Vive en su propio archivo, separado de
// `get-goal.ts` (que sí importa `createSessionClient`, con `next/headers`,
// solo válido en Server Components) por el MISMO motivo exacto que
// `calculate-progress.ts` está separado de `get-goal.ts`: recibe el
// cliente de sesión ya construido como parámetro (mismo patrón que
// `resendPartnerAccess(sessionClient, ...)`, `lib/partners/resend-partner-access.ts`)
// en vez de crear uno internamente — así es invocable directamente en
// `node:test` contra un usuario real (`signUp` + este cliente), sin
// necesitar mockear `next/headers`.
//
// Fórmula (idéntica a la ya usada en la versión histórica del proyecto,
// ver comentario de cabecera de `20260823153000_create_goals.sql`):
//   earnedTowardGoal = pointsAtGoalCreation
//                     + SUM(rewards_transactions.amount
//                           WHERE type='earned'
//                             AND reason <> 'redemption_refund'
//                             AND created_at > goalCreatedAt)
//
// `type='earned'` ya excluye por sí solo cualquier movimiento `spent`
// (la única razón `spent` que existe hoy es `'redemption'`,
// `redeem_reward()`) — un canje JAMÁS entra en esta suma, así que jamás
// puede reducir `earnedTowardGoal`. `reason <> 'redemption_refund'` es
// la protección explícita contra doble contabilidad (ver el informe
// P14.4-D, sección 6, y los tests de este mismo bloque): sin ella, un
// ciclo canjear→cancelar (que hoy nunca resta de `earnedTowardGoal` al
// canjear, por el motivo de arriba) volvería a SUMAR esos mismos Points
// una segunda vez al refund — inflando el progreso sin que el usuario
// haya ganado nada nuevo. Con la exclusión, el ciclo completo
// canjear+refund tiene efecto neto CERO sobre `earnedTowardGoal`,
// verificado en los tests 2/3/7 de `get-earned-points.test.ts`.
//
// `reason` de Missions sigue el patrón `'mission:' || mission_key`
// (`complete_mission()`, 20260824101000_create_complete_mission_rpc.sql)
// — NUNCA el valor fijo `'mission'`. El filtro de arriba (excluir solo
// `redemption_refund`) no necesita conocer ese patrón: cualquier
// `reason` de tipo `earned` que no sea exactamente `'redemption_refund'`
// ya cuenta correctamente (`'mission:goal_created'`, `'partner_activity'`,
// `'registration'`, `'referral'`, o cualquier fuente `earned` legítima
// futura) — una lista blanca de prefijos sería más estricta/robusta
// frente a un `reason` nuevo no anticipado, pero el propio Decision Lock
// de este bloque (P14.4-D §6) especifica la lista negra exacta
// (excluir únicamente `redemption_refund`) — queda documentado como
// mejora futura, no implementado aquí sin autorización explícita.
//
// Nunca lanza hacia FUERA de este módulo salvo que el propio llamante
// decida propagarlo: a diferencia del resto de `lib/goals/`/`lib/rewards/`
// (que atrapan cualquier fallo y devuelven un valor seguro), esta función
// SÍ relanza el error de Supabase tal cual — es `getActiveGoal()` (el
// único llamante real en producción) quien decide, en su propio
// try/catch ya existente, tratar cualquier fallo aquí como "no se puede
// determinar el Goal activo ahora mismo" (mismo criterio fail-closed que
// ya aplica a `goalError` en ese archivo) — nunca mostrar un progreso
// inventado o parcial.
export async function getEarnedPointsTowardGoal(
  sessionClient: SupabaseClient,
  userId: string,
  goalCreatedAt: string,
  pointsAtGoalCreation: number,
): Promise<number> {
  const { data, error } = await sessionClient
    .from("rewards_transactions")
    .select("amount")
    .eq("user_id", userId)
    .eq("type", "earned")
    .neq("reason", "redemption_refund")
    .gt("created_at", goalCreatedAt);

  if (error) {
    throw new Error(`getEarnedPointsTowardGoal: fallo leyendo rewards_transactions: ${error.message}`);
  }

  const earnedSinceCreation = (data ?? []).reduce((sum, row) => sum + (row.amount as number), 0);
  return pointsAtGoalCreation + earnedSinceCreation;
}

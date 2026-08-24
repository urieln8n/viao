import { createServiceRoleClient } from "../supabase/service";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — canje de un Reward. Único punto
// de la aplicación que invoca el RPC `redeem_reward()`
// (supabase/migrations/20260823152000_create_redeem_reward_rpc.sql),
// que hace TODO el trabajo atómico real (lock de usuario, idempotencia,
// comprobación de saldo/kill-switch, INSERT en el ledger + en
// reward_redemptions) — este archivo solo traduce el resultado del RPC
// al modelo de la aplicación, nunca duplica esa lógica en TypeScript.
//
// `service_role`: mismo criterio que `create-reward-transaction.ts` —
// nunca el cliente de sesión, el RPC no está concedido a `authenticated`
// (ver `revoke execute ... from ... authenticated` en la migración).
//
// `userId` SIEMPRE debe venir de la sesión real resuelta server-side por
// quien llama a esta función (mismo patrón que `app/booking/actions.ts`:
// `auth.getUser()`, nunca un valor enviado por el cliente) — esta
// función no vuelve a comprobar la sesión, confía en que su llamante ya
// lo hizo, igual que el resto de `lib/rewards/`.
export type RedemptionStatus = "pending" | "fulfilled" | "cancelled";

export interface RedeemRewardResult {
  id: string;
  rewardCatalogId: string;
  pointsSpent: number;
  status: RedemptionStatus;
  redemptionCode: string;
  createdAt: string;
}

export type RedeemRewardOutcome =
  | { outcome: "success"; redemption: RedeemRewardResult }
  | { outcome: "reward_not_available" }
  | { outcome: "limit_per_user_exceeded" }
  | { outcome: "insufficient_balance" }
  | { outcome: "pool_exhausted" }
  | { outcome: "error"; message: string };

/**
 * `attemptId` lo genera el LLAMANTE (Server Action) vía `crypto.randomUUID()`
 * ANTES de invocar esta función — mismo mecanismo ya usado para nombres
 * de archivo en `app/trips/[id]/add-photo-form.tsx`/`app/vision/vision-view.tsx`.
 * Reenviar la MISMA llamada con el mismo `attemptId` (timeout + reintento
 * del cliente) nunca descuenta Points dos veces — lo garantiza la
 * constraint única de `reward_redemptions.redemption_attempt_id`, no
 * ninguna comprobación aquí.
 */
export async function redeemReward(
  userId: string,
  rewardCatalogId: string,
  attemptId: string,
): Promise<RedeemRewardOutcome> {
  const service = createServiceRoleClient();

  const { data, error } = await service.rpc("redeem_reward", {
    p_user_id: userId,
    p_reward_catalog_id: rewardCatalogId,
    p_attempt_id: attemptId,
  });

  if (error) {
    // Los `raise exception` de la función SQL llegan aquí como
    // `error.message` con el texto literal lanzado (p. ej.
    // "insufficient_balance") — PostgREST no distingue "excepción de
    // negocio esperada" de "fallo técnico" con un código propio, así que
    // se traduce por coincidencia de texto. Cualquier mensaje no
    // reconocido se devuelve como `error` genérico, nunca se oculta.
    if (error.message.includes("reward_not_available")) {
      return { outcome: "reward_not_available" };
    }
    if (error.message.includes("limit_per_user_exceeded")) {
      return { outcome: "limit_per_user_exceeded" };
    }
    if (error.message.includes("insufficient_balance")) {
      return { outcome: "insufficient_balance" };
    }
    if (error.message.includes("pool_exhausted") || error.message.includes("reward_missing_real_cost")) {
      return { outcome: "pool_exhausted" };
    }
    return { outcome: "error", message: error.message };
  }

  if (!data) {
    return { outcome: "error", message: "redeem_reward no devolvió ninguna fila." };
  }

  return {
    outcome: "success",
    redemption: {
      id: data.id as string,
      rewardCatalogId: data.reward_catalog_id as string,
      pointsSpent: data.points_spent as number,
      status: data.status as RedemptionStatus,
      redemptionCode: data.redemption_code as string,
      createdAt: data.created_at as string,
    },
  };
}

import { createServiceRoleClient } from "../supabase/service";
import type { RedeemRewardResult, RedemptionStatus } from "./redeem-reward";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — cancelación de una redención.
// Único punto que invoca `cancel_redemption()`
// (supabase/migrations/20260823152000_create_redeem_reward_rpc.sql):
// el RPC hace todo el trabajo (lock, comprobación de estado, refund
// append-only) — este archivo solo traduce el resultado.
export type CancelRedemptionOutcome =
  | { outcome: "success"; redemption: RedeemRewardResult }
  | { outcome: "redemption_not_found" }
  | { outcome: "cannot_cancel_fulfilled_redemption" }
  | { outcome: "error"; message: string };

export async function cancelRedemption(
  userId: string,
  redemptionId: string,
): Promise<CancelRedemptionOutcome> {
  const service = createServiceRoleClient();

  const { data, error } = await service.rpc("cancel_redemption", {
    p_redemption_id: redemptionId,
    p_user_id: userId,
  });

  if (error) {
    if (error.message.includes("redemption_not_found")) {
      return { outcome: "redemption_not_found" };
    }
    if (error.message.includes("cannot_cancel_fulfilled_redemption")) {
      return { outcome: "cannot_cancel_fulfilled_redemption" };
    }
    return { outcome: "error", message: error.message };
  }

  if (!data) {
    return { outcome: "error", message: "cancel_redemption no devolvió ninguna fila." };
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

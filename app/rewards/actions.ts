"use server";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — Server Action de canje. Único
// punto donde se resuelve la sesión REAL (`auth.getUser()`, nunca un
// `userId` enviado por el cliente — mismo patrón que
// `app/booking/actions.ts`) antes de invocar `redeemReward()`.
import { createClient as createSessionClient } from "../../lib/supabase/server";
import { redeemReward, type RedeemRewardOutcome } from "../../lib/rewards/redeem-reward";
import { cancelRedemption, type CancelRedemptionOutcome } from "../../lib/rewards/cancel-redemption";

export type RedeemRewardActionResult = RedeemRewardOutcome | { outcome: "unauthenticated" };

export async function redeemRewardAction(
  rewardCatalogId: string,
  attemptId: string,
): Promise<RedeemRewardActionResult> {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return { outcome: "unauthenticated" };
  }

  return redeemReward(user.id, rewardCatalogId, attemptId);
}

export type CancelRedemptionActionResult = CancelRedemptionOutcome | { outcome: "unauthenticated" };

export async function cancelRedemptionAction(
  redemptionId: string,
): Promise<CancelRedemptionActionResult> {
  const sessionClient = await createSessionClient();
  const {
    data: { user },
  } = await sessionClient.auth.getUser();

  if (!user) {
    return { outcome: "unauthenticated" };
  }

  return cancelRedemption(user.id, redemptionId);
}

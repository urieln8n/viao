import { createClient as createSessionClient } from "../supabase/server";

// FASE UX-1.1 (Core UX Quick-Fix Pass, P0-8) — lectura del historial de
// canjes del usuario autenticado. `redemption_code` ya se persiste de
// forma permanente en `reward_redemptions` (constraint UNIQUE, columna
// NOT NULL) desde que se creó la tabla — este archivo solo expone una
// lectura ya posible con el esquema y RLS existentes
// (`reward_redemptions_select_own`, `user_id = auth.uid()`), sin ningún
// cambio de esquema ni de economía: resuelve que hasta ahora el código
// de canje solo se mostraba una vez en pantalla (`reward-catalog.tsx`)
// sin ningún sitio donde recuperarlo después.
//
// Mismo cliente de sesión que `get-reward-transactions.ts` — RLS filtra
// automáticamente, sin `.eq("user_id", ...)` manual ni service_role.
export interface RewardRedemptionView {
  id: string;
  rewardTitle: string;
  pointsSpent: number;
  status: "pending" | "fulfilled" | "cancelled";
  redemptionCode: string;
  createdAt: string;
}

export async function getRewardRedemptions(): Promise<RewardRedemptionView[]> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("reward_redemptions")
      .select("id, points_spent, status, redemption_code, created_at, rewards_catalog(title)")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => {
      const catalogEntry = row.rewards_catalog as { title: string } | { title: string }[] | null;
      const rewardTitle = Array.isArray(catalogEntry)
        ? (catalogEntry[0]?.title ?? "")
        : (catalogEntry?.title ?? "");

      return {
        id: row.id as string,
        rewardTitle,
        pointsSpent: row.points_spent as number,
        status: row.status as RewardRedemptionView["status"],
        redemptionCode: row.redemption_code as string,
        createdAt: row.created_at as string,
      };
    });
  } catch {
    return [];
  }
}

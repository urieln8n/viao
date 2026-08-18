import { createClient as createSessionClient } from "../supabase/server";

// F7-02/F7-03 (VIAO_ROADMAP.md) — Lectura del historial de transacciones
// del usuario autenticado, para la UI de Wallet.
//
// Mismo cliente de sesión que `get-wallet-balance.ts` — `rewards_transactions`
// ya concede SELECT a `authenticated` bajo `rewards_transactions_select_own`
// (`user_id = auth.uid()`), así que RLS filtra automáticamente sin
// necesidad de un `.eq("user_id", ...)` manual ni de `service_role`.
export interface RewardTransactionView {
  id: string;
  amount: number;
  type: "earned" | "spent";
  reason: string;
  referenceType?: string;
  referenceId?: string;
  createdAt: string;
}

export async function getRewardTransactions(): Promise<RewardTransactionView[]> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("rewards_transactions")
      .select("id, amount, type, reason, reference_type, reference_id, created_at")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id as string,
      amount: row.amount as number,
      type: row.type as "earned" | "spent",
      reason: row.reason as string,
      referenceType: (row.reference_type as string | null) ?? undefined,
      referenceId: (row.reference_id as string | null) ?? undefined,
      createdAt: row.created_at as string,
    }));
  } catch {
    return [];
  }
}

"use server";

import { getWalletBalance } from "../../lib/rewards/get-wallet-balance";

// Bloque 16 ("Perfil") — Profile es un Client Component (getWalletBalance()
// usa `next/headers` vía el cliente de sesión, lib/supabase/server.ts, y
// por eso NO es invocable directamente desde código de cliente). Este
// wrapper reutiliza exactamente esa función existente en vez de duplicar
// su query (mismo criterio que recordReturnVisitAction en
// app/(auth)/login/actions.ts) — no añade ninguna lógica propia.
export async function getProfileRewardsBalanceAction(): Promise<number | undefined> {
  return getWalletBalance();
}

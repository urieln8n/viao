"use server";

import { createClient as createSessionClient } from "../../lib/supabase/server";
import { getWalletBalance } from "../../lib/rewards/get-wallet-balance";
import { completeMissionForCurrentSession } from "../../lib/missions/complete-mission-for-current-session";

// Bloque 16 ("Perfil") — Profile es un Client Component (getWalletBalance()
// usa `next/headers` vía el cliente de sesión, lib/supabase/server.ts, y
// por eso NO es invocable directamente desde código de cliente). Este
// wrapper reutiliza exactamente esa función existente en vez de duplicar
// su query (mismo criterio que recordReturnVisitAction en
// app/(auth)/login/actions.ts) — no añade ninguna lógica propia.
export async function getProfileRewardsBalanceAction(): Promise<number | undefined> {
  return getWalletBalance();
}

// FASE J-B4 (Core Reset — Dependency Exit, Product Decision Lock
// 2026-08-27) — Mission "profile_completed" (reemplaza a `search_started`,
// que dependía de Travel). Se completa ÚNICAMENTE tras un guardado real y
// exitoso del perfil desde app/profile/page.tsx — nunca al abrir el
// formulario ni en un intento fallido. Vuelve a leer `name`/`avatar_url`
// server-side (cliente de sesión, RLS ya permite leer la fila propia) en
// vez de confiar en el estado del cliente, para no completar la Mission
// si el guardado real no dejó ambos campos rellenos. `periodicity:
// "lifetime"` (lib/missions/rules.ts) + la constraint UNIQUE de
// `mission_completions` impiden farmearla guardando el perfil repetidas
// veces. Best-effort: un fallo aquí nunca debe romper el guardado del
// perfil ya confirmado.
export async function completeProfileCompletedMissionAction(): Promise<void> {
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    if (!user) {
      return;
    }

    const { data: profile } = await sessionClient
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", user.id)
      .single();

    if (!profile?.name?.trim() || !profile?.avatar_url?.trim()) {
      return;
    }

    await completeMissionForCurrentSession("profile_completed");
  } catch (error) {
    console.error('[missions] No se pudo completar la Mission "profile_completed":', error);
  }
}

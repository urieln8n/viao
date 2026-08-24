import { createClient as createSessionClient } from "../supabase/server";

// Bloque 1 (VIAO_V1_LOOP_DECISION.md) — lectura del catálogo de Rewards
// activos. Cliente de SESIÓN (nunca service_role): `rewards_catalog`
// concede SELECT directo a `authenticated`
// (`rewards_catalog_select_all`, using(true)) — mismo criterio que
// `properties`/`destinations` en cuanto a ser un catálogo, no dato
// personal, pero aquí no hace falta el rodeo de service_role porque no
// necesita funcionar para usuarios anónimos (el catálogo solo tiene
// sentido dentro de Wallet, ya autenticado).
export interface RewardCatalogEntry {
  id: string;
  title: string;
  description?: string;
  pointsCost: number;
  fundingType: "viao" | "partner";
  partnerName?: string;
  limitPerUser?: number;
}

/** Nunca lanza: mismo criterio que el resto de `lib/rewards/` — un fallo aquí se trata como "catálogo vacío todavía", nunca rompe la pantalla. */
export async function getRewardsCatalog(): Promise<RewardCatalogEntry[]> {
  try {
    const sessionClient = await createSessionClient();
    const { data, error } = await sessionClient
      .from("rewards_catalog")
      .select("id, title, description, points_cost, funding_type, partner_name, limit_per_user")
      .eq("active", true)
      .order("points_cost", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id as string,
      title: row.title as string,
      description: (row.description as string | null) ?? undefined,
      pointsCost: row.points_cost as number,
      fundingType: row.funding_type as "viao" | "partner",
      partnerName: (row.partner_name as string | null) ?? undefined,
      limitPerUser: (row.limit_per_user as number | null) ?? undefined,
    }));
  } catch {
    return [];
  }
}

import { createServiceRoleClient } from "../supabase/service";

// UX-10 (Partners Visible + Discovery + Registration) — lectura pública
// mínima para `/partners` (Discovery). `partners` sigue sin ninguna
// policy de cliente (Patrón B, ver 20260825120000_create_partners.sql):
// esta función es la única vía de lectura, vía service_role, con el
// mismo criterio ya usado en resolve-partner-access.ts — allowlist
// explícito de columnas (nunca `select *`), `access_token`/
// `contact_email`/`contact_phone` JAMÁS se seleccionan aquí, así que
// estructuralmente no pueden llegar al cliente por este camino.
//
// `status = 'active'` excluye `pending`/`inactive`; `is_test = false`
// excluye las fixtures de test (20260830160000_add_partners_is_test_flag.sql)
// — sin esta segunda condición, las >1.400 filas de fixtures ya
// existentes aparecerían en Discovery.
export interface ActivePartnerSummary {
  id: string;
  slug: string;
  name: string;
  category: string;
  imageUrl?: string;
  description?: string;
  address?: string;
}

/** Nunca lanza: mismo criterio que getRewardsCatalog() — un fallo aquí se trata como "catálogo vacío todavía", nunca rompe la pantalla. */
export async function getActivePartners(): Promise<ActivePartnerSummary[]> {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("partners")
      .select("id, slug, name, category, image_url, description, address")
      .eq("status", "active")
      .eq("is_test", false)
      .order("name", { ascending: true });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id as string,
      slug: row.slug as string,
      name: row.name as string,
      category: row.category as string,
      imageUrl: (row.image_url as string | null) ?? undefined,
      description: (row.description as string | null) ?? undefined,
      address: (row.address as string | null) ?? undefined,
    }));
  } catch {
    return [];
  }
}

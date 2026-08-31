import { createServiceRoleClient } from "../supabase/service";
import type { ActivePartnerSummary } from "./get-active-partners";

// UX-10 (Partners Visible + Discovery + Registration) — lectura pública
// mínima para `/partners/[slug]` (Partner Profile). Mismo allowlist y
// mismo criterio de seguridad que get-active-partners.ts (service_role,
// nunca `select *`, `access_token`/`contact_email`/`contact_phone`
// nunca seleccionados).
//
// Deliberadamente exige `status = 'active'` y `is_test = false` igual
// que Discovery: un slug de un Partner `pending`/`inactive`/de test
// nunca debe ser visitable directamente aunque alguien adivine o
// comparta la URL — mismo criterio "no distinguir la razón" ya aplicado
// en resolve-partner-access.ts (un partner inactivo se trata igual que
// uno inexistente).
export async function getPartnerBySlug(slug: string): Promise<ActivePartnerSummary | undefined> {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("partners")
      .select("id, slug, name, category, image_url, description, address")
      .eq("slug", slug)
      .eq("status", "active")
      .eq("is_test", false)
      .maybeSingle();

    if (error || !data) {
      return undefined;
    }

    return {
      id: data.id as string,
      slug: data.slug as string,
      name: data.name as string,
      category: data.category as string,
      imageUrl: (data.image_url as string | null) ?? undefined,
      description: (data.description as string | null) ?? undefined,
      address: (data.address as string | null) ?? undefined,
    };
  } catch {
    return undefined;
  }
}

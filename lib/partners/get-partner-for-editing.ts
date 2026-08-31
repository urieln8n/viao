import { createServiceRoleClient } from "../supabase/service";
import { resolvePartnerAccess } from "./resolve-partner-access";

// UX-12 (Partner Self-Service C1) — lectura dedicada para precargar el
// formulario "Mi comercio" (`/partners/dashboard/[accessToken]`).
// Reutiliza `resolvePartnerAccess()` (PB3) TAL CUAL, sin modificarlo —
// esa función ya tiene 2 consumidores probados (Ops, Dashboard de solo
// lectura) y cambiar su forma de retorno arriesgaría romperlos; esta
// función solo añade una SEGUNDA consulta, con su propio allowlist, para
// los campos editables que resolvePartnerAccess() nunca ha necesitado
// devolver. Mismo criterio de seguridad que get-partner-by-slug.ts:
// service_role, select() explícito, `access_token`/`contact_email`/
// `is_test`/`status`/`slug` JAMÁS se seleccionan aquí.
export interface PartnerEditableProfile {
  id: string;
  name: string;
  category: string;
  description?: string;
  contactPhone?: string;
  address?: string;
  imageUrl?: string;
}

export async function getPartnerForEditing(accessToken: string): Promise<PartnerEditableProfile | undefined> {
  const access = await resolvePartnerAccess(accessToken);
  if (access.status !== "granted") {
    return undefined;
  }

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("partners")
    .select("id, name, category, description, contact_phone, address, image_url")
    .eq("id", access.partner.id)
    .maybeSingle();

  if (error || !data) {
    return undefined;
  }

  return {
    id: data.id as string,
    name: data.name as string,
    category: data.category as string,
    description: (data.description as string | null) ?? undefined,
    contactPhone: (data.contact_phone as string | null) ?? undefined,
    address: (data.address as string | null) ?? undefined,
    imageUrl: (data.image_url as string | null) ?? undefined,
  };
}

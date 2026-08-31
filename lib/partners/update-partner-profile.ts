import { createServiceRoleClient } from "../supabase/service";
import { resolvePartnerAccess } from "./resolve-partner-access";
import { PARTNER_CATEGORIES } from "./request-partner-registration";

// UX-12 (Partner Self-Service C1) — único punto de escritura del propio
// Partner sobre su fila de `partners`. Mismo criterio de "mínimo
// privilegio" ya aplicado en request-partner-registration.ts: la
// autorización pasa siempre por `resolvePartnerAccess()` (nunca se
// confía en un `partnerId` enviado por el cliente), y el UPDATE
// construye el objeto campo a campo — nunca `...input` — así que ningún
// valor fuera de este allowlist explícito puede llegar a la base, aunque
// el llamante intente enviar `status`/`access_token`/`is_test`/`slug`/
// `id`: esos campos ni siquiera existen en `PartnerProfileUpdateInput`,
// y aunque existieran en el objeto en tiempo de ejecución, nunca se leen.
export interface PartnerProfileUpdateInput {
  name: string;
  category: string;
  description?: string;
  contactPhone?: string;
  address?: string;
  imageUrl?: string;
}

export type PartnerProfileUpdateOutcome =
  | { outcome: "updated" }
  | { outcome: "invalid_input" }
  | { outcome: "access_denied" }
  | { outcome: "error"; message: string };

function isValidCategory(value: string): boolean {
  return (PARTNER_CATEGORIES as readonly string[]).includes(value);
}

export async function updatePartnerProfile(
  accessToken: string,
  input: PartnerProfileUpdateInput,
): Promise<PartnerProfileUpdateOutcome> {
  const access = await resolvePartnerAccess(accessToken);
  if (access.status !== "granted") {
    return { outcome: "access_denied" };
  }

  const name = input.name.trim();
  const category = input.category.trim();

  if (!name || name.length > 200 || !isValidCategory(category)) {
    return { outcome: "invalid_input" };
  }

  const service = createServiceRoleClient();
  const { error } = await service
    .from("partners")
    .update({
      name,
      category,
      description: input.description?.trim().slice(0, 1000) || null,
      contact_phone: input.contactPhone?.trim().slice(0, 50) || null,
      address: input.address?.trim().slice(0, 300) || null,
      image_url: input.imageUrl?.trim().slice(0, 2000) || null,
    })
    .eq("id", access.partner.id);

  if (error) {
    return { outcome: "error", message: error.message };
  }

  return { outcome: "updated" };
}

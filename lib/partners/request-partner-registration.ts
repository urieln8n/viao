import { createServiceRoleClient } from "../supabase/service";

// UX-10 (Partners Visible + Discovery + Registration) — único punto de
// escritura pública sobre `partners` en todo el proyecto. Sin GRANT
// nuevo, sin policy de cliente nueva (`partners` sigue siendo Patrón B,
// service_role-only): esta función es el "mínimo privilegio posible"
// pedido en la auditoría §13 — el formulario público (Server Action,
// app/partners/join-actions.ts) nunca toca Supabase directamente, solo
// llama a esta función, que es la ÚNICA que conoce `service_role` para
// este flujo.
//
// `status: "pending"` e `is_test: false` están hardcodeados, nunca
// aceptados como parámetro — ningún llamante (ni siquiera uno que
// manipule la petición) puede dar de alta un Partner ya `active`, ni
// establecer su propio `access_token` (columna ni siquiera se toca aquí:
// conserva el `gen_random_uuid()` por defecto de la tabla). Aprobar a
// `active` sigue siendo, deliberadamente, un paso manual vía Supabase
// Studio (§14 de la auditoría, sin panel admin nuevo).
export const PARTNER_CATEGORIES = ["restaurant", "experience", "barbershop", "gym", "shop", "service"] as const;
export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];

export interface PartnerRegistrationInput {
  name: string;
  category: string;
  description?: string;
  address?: string;
  contactEmail?: string;
  contactPhone?: string;
  imageUrl?: string;
}

export type PartnerRegistrationOutcome =
  | { outcome: "submitted"; partnerId: string }
  | { outcome: "invalid_input" }
  | { outcome: "error"; message: string };

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isValidCategory(value: string): value is PartnerCategory {
  return (PARTNER_CATEGORIES as readonly string[]).includes(value);
}

const MAX_ATTEMPTS = 5;

export async function requestPartnerRegistration(
  input: PartnerRegistrationInput,
): Promise<PartnerRegistrationOutcome> {
  const name = input.name.trim();
  const category = input.category.trim();

  if (!name || name.length > 200 || !isValidCategory(category)) {
    return { outcome: "invalid_input" };
  }

  const baseSlug = slugify(name) || "partner";
  const service = createServiceRoleClient();

  // "join"/"dashboard"/"ops" son segmentos estáticos ya existentes bajo
  // /partners/ — Next.js los prioriza sobre la ruta dinámica
  // /partners/[slug], así que un Partner cuyo slug coincidiera con uno
  // de ellos nunca sería alcanzable en /partners/[slug]. Se evita
  // reservando esos 3 valores exactos, sin tocar ningún constraint de
  // base de datos.
  const RESERVED_SLUGS = new Set(["join", "dashboard", "ops"]);
  const startAttempt = RESERVED_SLUGS.has(baseSlug) ? 1 : 0;

  for (let attempt = startAttempt; attempt < MAX_ATTEMPTS; attempt++) {
    const slug = attempt === 0 ? baseSlug : `${baseSlug}-${attempt + 1}`;
    const { data, error } = await service
      .from("partners")
      .insert({
        name,
        slug,
        category,
        status: "pending",
        is_test: false,
        description: input.description?.trim().slice(0, 1000) || null,
        address: input.address?.trim().slice(0, 300) || null,
        contact_email: input.contactEmail?.trim().slice(0, 200) || null,
        contact_phone: input.contactPhone?.trim().slice(0, 50) || null,
        image_url: input.imageUrl?.trim().slice(0, 2000) || null,
      })
      .select("id")
      .single();

    if (!error && data) {
      return { outcome: "submitted", partnerId: data.id as string };
    }

    // 23505 = unique_violation (constraint partners_slug_key): colisión de
    // slug generado a partir del nombre — se reintenta con un sufijo,
    // nunca se expone el conflicto al llamante.
    if (error?.code === "23505") {
      continue;
    }

    return { outcome: "error", message: error?.message ?? "No se pudo registrar la solicitud." };
  }

  return { outcome: "error", message: "No se pudo generar un identificador único para este Partner." };
}

import { createServiceRoleClient } from "../supabase/service";
import {
  sendPartnerApplicationReceivedEmail,
  sendPartnerApplicationNotificationEmail,
} from "../email/send-partner-emails";

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
  // P10.1 (Partner Onboarding Hardening) — el tipo se mantiene opcional
  // a propósito (compatibilidad de firma, sin romper otros llamantes
  // hipotéticos), pero requestPartnerRegistration() ahora lo exige en
  // tiempo de ejecución: sin él, o con un formato inválido, devuelve
  // `invalid_input` — es el único canal de entrega del email de
  // aprobación/`access_token` y de Commerce Identity, ya no tiene
  // sentido aceptar una solicitud nueva sin él (ver auditoría "P10.1 —
  // Partner Access & Onboarding Audit").
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

// P10.1 (Partner Onboarding Hardening) — el sistema entero, construido
// en bloques anteriores, ya asumía implícitamente que `contact_email`
// existía (email de solicitud recibida, email de aprobación con
// `access_token`, `link_partner_owner()`), pero el formulario público lo
// dejaba opcional — la única pieza que no seguía esa asunción (auditoría
// P10.1, "Partner Access & Onboarding Audit"). Este bloque cierra ese
// gap exclusivamente en el flujo NUEVO: `contact_email` pasa a ser
// obligatorio y validado aquí, en el único punto de escritura pública
// real. Deliberadamente NO cambia el schema (`partners.contact_email`
// sigue siendo `nullable`): Partners históricos con el campo vacío deben
// seguir existiendo y funcionando exactamente igual (Camino A por
// `access_token` nunca dependió de este campo) — esta validación es de
// aplicación, no de base de datos, y solo se aplica al escribir una
// solicitud nueva.
const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidEmail(value: string): boolean {
  return EMAIL_FORMAT.test(value);
}

const MAX_ATTEMPTS = 5;

export async function requestPartnerRegistration(
  input: PartnerRegistrationInput,
): Promise<PartnerRegistrationOutcome> {
  const name = input.name.trim();
  const category = input.category.trim();
  const contactEmail = input.contactEmail?.trim().slice(0, 200);

  if (!name || name.length > 200 || !isValidCategory(category) || !contactEmail || !isValidEmail(contactEmail)) {
    return { outcome: "invalid_input" };
  }

  // PARTNER APPLICATION NOTIFICATION V1 — extraídos como variables (antes
  // vivían solo dentro del objeto del insert) para que el email de
  // notificación a Andrés reciba exactamente los mismos valores ya
  // truncados/normalizados que quedan persistidos, sin duplicar la lógica
  // de trim/slice en dos sitios. Cero cambio de comportamiento del insert.
  const description = input.description?.trim().slice(0, 1000) || undefined;
  const address = input.address?.trim().slice(0, 300) || undefined;
  const contactPhone = input.contactPhone?.trim().slice(0, 50) || undefined;
  const imageUrl = input.imageUrl?.trim().slice(0, 2000) || undefined;

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
        description: description ?? null,
        address: address ?? null,
        contact_email: contactEmail ?? null,
        contact_phone: contactPhone ?? null,
        image_url: imageUrl ?? null,
      })
      .select("id")
      .single();

    if (!error && data) {
      // Email V2 — best-effort, nunca convierte la solicitud ya creada en
      // un fallo: sendEmail() (lib/email/send-email.ts) nunca lanza.
      // `contactEmail` es obligatorio desde P10.1 (validado arriba), así
      // que este `if` es hoy siempre verdadero para cualquier solicitud
      // nueva — se mantiene como guarda explícita, sin asumir en este
      // punto concreto que la validación de arriba nunca cambiará, y
      // porque Partners históricos (anteriores a P10.1, sin este campo)
      // pueden seguir pasando por otras vías de este mismo módulo en el
      // futuro. `await` deliberado (no fire-and-forget): en un entorno
      // serverless, el proceso puede congelarse en cuanto esta función
      // devuelve, así que un envío sin esperar no está garantizado.
      if (contactEmail) {
        await sendPartnerApplicationReceivedEmail({
          to: contactEmail,
          businessName: name,
        });
      }

      // PARTNER APPLICATION NOTIFICATION V1 — mismo criterio best-effort
      // y mismo `await` deliberado que arriba. Nunca condicional aquí:
      // sendPartnerApplicationNotificationEmail() ya decide internamente
      // si hay algo que hacer (PARTNER_NOTIFICATION_EMAIL configurada) —
      // este punto de llamada no necesita saberlo. INSERT ya está
      // confirmado en este punto (`!error && data`): ningún fallo de este
      // email puede invalidar la solicitud ya creada.
      await sendPartnerApplicationNotificationEmail({
        businessName: name,
        category,
        description,
        address,
        contactEmail,
        contactPhone,
        submittedAt: new Date().toISOString(),
      });

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

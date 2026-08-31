// Bloque Partners PB3 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — mecanismo
// de acceso del Partner vía `access_token` (LOCKED, P7). Sigue el mismo
// patrón ya establecido en el repositorio para "resolver un identificador
// externo no confiable en un contexto server-side validado" (ver
// `app/properties/[id]/resolve.ts`, `isValidUuid`): función pura,
// testable sin contexto de Next.js, que solo conoce `service_role` — el
// resto del código (Server Actions de PB4, UI de PB5) solo debe conocer
// `PartnerAccessResult`.
//
// PB3 no crea ninguna ruta ni página — "la ruta exacta... puede
// resolverse dentro de PB3" no implica que deba materializarse ya; PB4
// (Server Actions) y PB5 (UI) son quienes decidirán dónde y cómo se llama
// a esta función. Esto evita convertir la ruta ilustrativa del Technical
// Spec (`/partners/ops/<access_token>`) en una decisión de producto
// prematura.
//
// Diseño deliberado, dentro del margen que PB3 puede resolver (P7 fija el
// MECANISMO — token opaco, sin Auth — pero no el comportamiento exacto
// ante un token de un Partner `inactive`): un token válido de un Partner
// `inactive` se trata IGUAL que un token inexistente (`denied`), nunca se
// distingue la razón al llamante. Mismo criterio de no filtrar
// información que ya se aplica en el resto del proyecto (ej.
// `redeem_reward()` nunca revela por qué falló más allá de lo necesario).
//
// El resultado NUNCA incluye `access_token` — ni el del propio Partner
// resuelto ni, por construcción, el de ningún otro (la consulta es un
// match exacto sobre una columna `UNIQUE`, así que solo puede devolver
// como máximo 1 fila, la del propio Partner cuyo token se pasó). Quien
// llama a esta función obtiene un `partner.id` ya validado server-side —
// nunca debe confiar en un `partner_id` que el cliente afirme tener.
import { createServiceRoleClient } from "../supabase/service";

export interface PartnerAccessContext {
  id: string;
  name: string;
  category: string;
}

export type PartnerAccessResult = { status: "granted"; partner: PartnerAccessContext } | { status: "denied" };

/** Formato UUID estándar (8-4-4-4-12 hex) — mismo criterio que `isValidUuid` en app/properties/[id]/resolve.ts. */
export function isValidAccessToken(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export async function resolvePartnerAccess(accessToken: string): Promise<PartnerAccessResult> {
  if (!isValidAccessToken(accessToken)) {
    return { status: "denied" };
  }

  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("partners")
    .select("id, name, category")
    .eq("access_token", accessToken)
    .eq("status", "active")
    .maybeSingle();

  if (error || !data) {
    return { status: "denied" };
  }

  return {
    status: "granted",
    partner: { id: data.id as string, name: data.name as string, category: data.category as string },
  };
}

// UX-16.3 (Commerce Identity) — "Camino B": resuelve el/los Partner(s) de
// un Commerce ya vinculado (`partners.owner_id`) a partir de un `userId`
// de sesión REAL, en vez de un `access_token` de URL ("Camino A", función
// de arriba, sin cambios). Usa `service_role` deliberadamente (no el
// cliente de sesión): necesita leer `access_token` para poder construir
// el enlace de vuelta al Dashboard existente
// (`/partners/dashboard/[accessToken]`, sin tocar esa ruta ni su lógica
// de autorización) — el mismo valor que ya viaja hoy en cualquier enlace
// de Dashboard ya bookmarkeado por un Partner, nunca expuesto al cliente
// vía `SELECT` directo (esa columna sigue excluida del GRANT de RLS,
// 20260831140000_add_partners_owner_id_identity.sql). "Un usuario nunca
// puede resolver un Commerce ajeno" queda garantizado por el propio
// `WHERE owner_id = userId` — no por confiar en nada que el cliente
// afirme.
export interface OwnedPartnerSummary {
  id: string;
  name: string;
  accessToken: string;
}

export async function resolveOwnedPartners(userId: string): Promise<OwnedPartnerSummary[]> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("partners")
    .select("id, name, access_token")
    .eq("owner_id", userId)
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id as string,
    name: row.name as string,
    accessToken: row.access_token as string,
  }));
}

// UX-16.3 (Commerce Identity) — lectura mínima para que el Dashboard sepa
// si debe mostrar "Vincula tu cuenta VIAO" o "Cuenta VIAO vinculada".
// Deliberadamente NO reutiliza/extiende `getPartnerForEditing()`
// (mismo criterio ya documentado ahí: cambiar la forma de un retorno ya
// consumido arriesga romper a sus consumidores existentes) — una
// consulta nueva y separada, con su propio allowlist mínimo (`owner_id`
// nunca sale de aquí como valor, solo se usa para calcular `boolean`).
export async function isPartnerOwnerLinked(partnerId: string): Promise<boolean> {
  const service = createServiceRoleClient();
  const { data, error } = await service
    .from("partners")
    .select("owner_id")
    .eq("id", partnerId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return data.owner_id !== null;
}

import { createServiceRoleClient } from "../supabase/service";

// P10 (Admin Partners V1) — lectura administrativa de `partners` para
// quien tenga autoridad `raw_app_meta_data.role='partner_admin'`. `partners`
// sigue siendo Patrón B (service_role-only, 20260825120000_create_partners.sql):
// la única policy de cliente (`partners_select_own`, 20260831140000)
// restringe las filas a `owner_id = auth.uid()`, sin ninguna relación con
// la autoridad de `partner_admin` — un admin no tiene por qué poseer los
// Partners que administra. Además `contact_email` ni siquiera está en el
// GRANT de columnas de `authenticated` (mismo archivo). Mismo patrón
// exacto que getActivePartners()/resolvePartnerAccess(): service_role,
// allowlist explícito (nunca `select *`), nunca `access_token`/`owner_id`/
// `is_test` fuera de aquí.
//
// Sin filtro por `status` (a diferencia de getActivePartners()) — el
// propio alcance de P10 exige poder actuar sobre las 4 transiciones
// (pending→active, pending→inactive, active→inactive, inactive→active),
// así que necesita ver Partners en cualquier estado, no solo pending. Sin
// paginación: volumen actual (0-10 Partners, VIAO_PARTNERS_MASTER_ROADMAP.md)
// no lo justifica — mismo criterio ya aplicado en el resto de Partners
// para evitar sobre-ingeniería sin evidencia de necesidad.
export interface AdminPartnerSummary {
  id: string;
  name: string;
  category: string;
  contactEmail: string | null;
  status: string;
  createdAt: string;
}

/** Nunca lanza: mismo criterio que getActivePartners() — un fallo aquí se trata como "lista vacía todavía", nunca rompe la pantalla. */
export async function getPartnersForAdmin(): Promise<AdminPartnerSummary[]> {
  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("partners")
      .select("id, name, category, contact_email, status, created_at")
      .order("created_at", { ascending: false });

    if (error || !data) {
      return [];
    }

    return data.map((row) => ({
      id: row.id as string,
      name: row.name as string,
      category: row.category as string,
      contactEmail: (row.contact_email as string | null) ?? null,
      status: row.status as string,
      createdAt: row.created_at as string,
    }));
  } catch {
    return [];
  }
}

// Guard de autorización de /admin/partners — comprueba únicamente el rol
// que el propio JWT de sesión ya trae en `app_metadata` (sin ninguna
// consulta adicional). Extraído como función pura y testable en este
// mismo archivo (en vez de un archivo nuevo, fuera del alcance de
// archivos autorizado para este bloque) para poder cubrirla con tests
// sin necesitar un arnés de Server Components. Es SOLO UX — la autoridad
// real sigue siendo exclusivamente set_partner_status() (auth.uid() +
// raw_app_meta_data dentro del propio RPC): si esta función tuviera un
// bug y dejara pasar a alguien indebido, cada acción seguiría siendo
// rechazada por el RPC.
export function isPartnerAdmin(
  user: { app_metadata?: Record<string, unknown> | null } | null | undefined,
): boolean {
  return user?.app_metadata?.role === "partner_admin";
}

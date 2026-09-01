"use server";

// PARTNER APPROVAL V1 — única Server Action que puede cambiar
// partners.status. Deliberadamente sin ninguna UI/pantalla que la
// invoque todavía (alcance explícito de este bloque: "no construir panel
// administrativo" — ver el informe de este bloque para cómo invocarla
// durante esta fase piloto). Mismo patrón exacto que
// linkPartnerOwnerAction() (app/partners/dashboard/[accessToken]/actions.ts):
// resuelve el cliente de SESIÓN real (nunca service_role — set_partner_status()
// necesita que auth.uid() sea la sesión de quien llama), fail-closed:
// fuera de una petición real de Next.js, cookies() lanza en vez de
// devolver una sesión vacía — se trata como "not_updated", nunca se
// propaga la excepción como si fuera un error del RPC. Esta Server
// Action NO valida quién puede aprobar/rechazar/reactivar/desactivar —
// esa autorización vive íntegramente dentro del RPC
// (set_partner_status()), nunca aquí: esta capa nunca debe convertirse
// en la única barrera de seguridad.
import { createClient as createSessionClient } from "../../lib/supabase/server";
import {
  setPartnerStatus,
  type PartnerStatus,
  type SetPartnerStatusOutcome,
} from "../../lib/partners/set-partner-status";

export async function setPartnerStatusAction(
  partnerId: string,
  newStatus: PartnerStatus,
): Promise<SetPartnerStatusOutcome> {
  try {
    const sessionClient = await createSessionClient();
    return await setPartnerStatus(sessionClient, partnerId, newStatus);
  } catch {
    return { outcome: "not_updated" };
  }
}

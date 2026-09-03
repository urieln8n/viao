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
import {
  resendPartnerAccess,
  type ResendPartnerAccessOutcome,
} from "../../lib/partners/resend-partner-access";

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

// P14.1.1 (Partner Onboarding + Access Recovery) — fallback manual al
// webhook de aprobación (app/api/webhooks/partner-status/route.ts, sin
// tocar). Mismo patrón exacto que setPartnerStatusAction() de arriba:
// resuelve el cliente de SESIÓN real, fail-closed (fuera de una petición
// real de Next.js, cookies() lanza, se trata como "not_sent"). A
// diferencia de setPartnerStatusAction(), esta acción SÍ valida
// partner_admin — pero lo hace dentro de resendPartnerAccess(), nunca
// aquí, por el mismo motivo de arquitectura: esta capa nunca debe
// convertirse en la única barrera de seguridad. Recibe únicamente
// `partnerId` — nunca un access_token del cliente.
export async function resendPartnerAccessAction(partnerId: string): Promise<ResendPartnerAccessOutcome> {
  try {
    const sessionClient = await createSessionClient();
    return await resendPartnerAccess(sessionClient, partnerId);
  } catch {
    return { outcome: "not_sent" };
  }
}

import { NextResponse } from "next/server";

import {
  sendPartnerApprovedEmail,
  sendPartnerRejectedEmail,
} from "../../../../lib/email/send-partner-emails";

// Email V2 — receptor del Database Webhook de Supabase sobre `partners`
// (UPDATE OF status), configurado manualmente en el Dashboard de
// producción (ver EMAIL V2 IMPLEMENTATION REPORT, "MANUAL ACTION
// REQUIRED"; no existe forma de crear Database Webhooks vía migración sin
// incrustar el secreto en el repositorio). Sustituye el paso manual de
// "copiar el access_token y enviarlo a mano" — no crea ningún panel
// admin, ningún rol nuevo, ninguna autenticación nueva: la aprobación
// sigue siendo 100% manual en Supabase Studio (editar `status`), esto
// solo reacciona a ese cambio ya existente.
interface PartnerWebhookRow {
  id: string;
  name: string;
  status: string;
  contact_email: string | null;
  access_token: string;
}

interface DatabaseWebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: PartnerWebhookRow;
  old_record: PartnerWebhookRow;
}

function getSiteUrl(): string {
  return process.env.SITE_URL || "http://localhost:3000";
}

function isPartnerRow(value: unknown): value is PartnerWebhookRow {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.status === "string" &&
    typeof row.access_token === "string" &&
    (row.contact_email === null || typeof row.contact_email === "string")
  );
}

export async function POST(request: Request): Promise<Response> {
  // Secreto compartido, no una nueva forma de autenticación de usuario —
  // solo confirma que la petición viene realmente del Database Webhook de
  // Supabase, nunca de un tercero. Comprobado ANTES de tocar el body.
  const providedSecret = request.headers.get("x-viao-webhook-secret");
  const expectedSecret = process.env.PARTNER_STATUS_WEBHOOK_SECRET;
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as Record<string, unknown>).type !== "UPDATE" ||
    (payload as Record<string, unknown>).table !== "partners" ||
    !isPartnerRow((payload as Record<string, unknown>).record) ||
    !isPartnerRow((payload as Record<string, unknown>).old_record)
  ) {
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }

  const { record, old_record: oldRecord } = payload as DatabaseWebhookPayload;

  // pending -> active: aprobación real. pending -> inactive: solicitud no
  // aprobada (convención ya documentada en el Runbook Operativo — el
  // schema no tiene `rejected`). active -> inactive (baja de un Partner ya
  // activo) es un evento de negocio distinto y NUNCA dispara el email de
  // rechazo — se distingue exclusivamente por `old_record.status`, sin
  // tocar el schema.
  if (oldRecord.status === "pending" && record.status === "active") {
    if (record.contact_email) {
      await sendPartnerApprovedEmail({
        to: record.contact_email,
        businessName: record.name,
        dashboardUrl: `${getSiteUrl()}/partners/dashboard/${record.access_token}`,
      });
    }
    return NextResponse.json({ handled: "approved" });
  }

  if (oldRecord.status === "pending" && record.status === "inactive") {
    if (record.contact_email) {
      await sendPartnerRejectedEmail({
        to: record.contact_email,
        businessName: record.name,
      });
    }
    return NextResponse.json({ handled: "rejected" });
  }

  return NextResponse.json({ handled: "ignored" });
}

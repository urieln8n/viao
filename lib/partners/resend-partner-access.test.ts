// P14.1.1 (Partner Onboarding + Access Recovery) — Tests de
// resendPartnerAccess(). Mismo patrón exacto que set-partner-status.test.ts
// y link-partner-owner.test.ts: usuarios reales vía signUp +
// createServiceRoleClient para fixtures, nunca simulado — la autorización
// solo queda demostrada probándola contra Supabase local real. El envío de
// email usa un doble de prueba inyectado (ResendLikeClient, mismo criterio
// que send-email.test.ts) — nunca red real desde `npm test`.

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { resendPartnerAccess } from "./resend-partner-access";
import type { ResendLikeClient } from "../email/send-email";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `resend-access-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "resend-access-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

// Solo service_role puede escribir raw_app_meta_data — mismo mecanismo que
// un administrador real usaría en Supabase Studio.
async function signUpPartnerAdmin(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const { userId, sessionClient } = await signUpUser();
  const service = createServiceRoleClient();
  const { error } = await service.auth.admin.updateUserById(userId, {
    app_metadata: { role: "partner_admin" },
  });
  assert.equal(error, null, `no se pudo marcar partner_admin: ${error?.message}`);
  return { userId, sessionClient };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPartner(options: {
  status?: "pending" | "active" | "inactive";
  contactEmail?: string | null;
} = {}): Promise<{ id: string; accessToken: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({
      name: `Test Partner Resend ${suffix}`,
      slug: `test-partner-resend-${suffix}`,
      category: "restaurant",
      status: options.status ?? "active",
      is_test: true,
      contact_email: options.contactEmail ?? null,
    })
    .select("id, access_token")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { id: data!.id as string, accessToken: data!.access_token as string };
}

function fakeResendClient(): { client: ResendLikeClient; calls: unknown[] } {
  const calls: unknown[] = [];
  const client: ResendLikeClient = {
    emails: {
      send: async (params) => {
        calls.push(params);
        return { data: { id: "fake-id" }, error: null };
      },
    },
  };
  return { client, calls };
}

// ══════════════════════════ AUTORIZACIÓN ══════════════════════════

test("resendPartnerAccess: sin sesión (cliente anon) -> not_sent", async () => {
  const anonClient = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const partner = await createTestPartner({ contactEmail: "negocio@example.com" });

  const result = await resendPartnerAccess(anonClient, partner.id);
  assert.equal(result.outcome, "not_sent");
});

test("resendPartnerAccess: usuario autenticado normal (sin partner_admin) -> not_sent", async () => {
  const { userId, sessionClient } = await signUpUser();
  const partner = await createTestPartner({ contactEmail: "negocio@example.com" });
  try {
    const result = await resendPartnerAccess(sessionClient, partner.id);
    assert.equal(result.outcome, "not_sent");
  } finally {
    await deleteTestUser(userId);
  }
});

test("resendPartnerAccess: partner_admin real -> sent (con Partner active + contact_email)", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partner = await createTestPartner({ status: "active", contactEmail: "negocio@example.com" });
  const { client: emailClient, calls } = fakeResendClient();
  try {
    const result = await resendPartnerAccess(sessionClient, partner.id, emailClient);
    assert.equal(result.outcome, "sent");
    assert.equal(calls.length, 1, "debe intentar exactamente un envío");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ ESTADO DEL PARTNER ══════════════════════════

test("resendPartnerAccess: Partner inexistente -> not_sent", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  try {
    const result = await resendPartnerAccess(sessionClient, crypto.randomUUID());
    assert.equal(result.outcome, "not_sent");
  } finally {
    await deleteTestUser(userId);
  }
});

test("resendPartnerAccess: Partner 'pending' -> not_sent (el enlace todavía no resuelve)", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partner = await createTestPartner({ status: "pending", contactEmail: "negocio@example.com" });
  const { client: emailClient, calls } = fakeResendClient();
  try {
    const result = await resendPartnerAccess(sessionClient, partner.id, emailClient);
    assert.equal(result.outcome, "not_sent");
    assert.equal(calls.length, 0, "nunca debe intentar el envío para un Partner no active");
  } finally {
    await deleteTestUser(userId);
  }
});

test("resendPartnerAccess: Partner 'inactive' -> not_sent", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partner = await createTestPartner({ status: "inactive", contactEmail: "negocio@example.com" });
  const { client: emailClient, calls } = fakeResendClient();
  try {
    const result = await resendPartnerAccess(sessionClient, partner.id, emailClient);
    assert.equal(result.outcome, "not_sent");
    assert.equal(calls.length, 0);
  } finally {
    await deleteTestUser(userId);
  }
});

test("resendPartnerAccess: Partner active sin contact_email -> not_sent, rechazado de forma segura (nunca intenta enviar)", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partner = await createTestPartner({ status: "active", contactEmail: null });
  const { client: emailClient, calls } = fakeResendClient();
  try {
    const result = await resendPartnerAccess(sessionClient, partner.id, emailClient);
    assert.equal(result.outcome, "not_sent");
    assert.equal(calls.length, 0, "sin contact_email, nunca debe llamarse a Resend");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ SEGURIDAD DEL TOKEN ══════════════════════════

test("resendPartnerAccess: el cliente no puede aportar access_token — la función solo acepta partnerId, el token se lee siempre server-side", async () => {
  // Verificación de tipos/contrato, no de runtime: la firma de
  // resendPartnerAccess() es (sessionClient, partnerId, emailClient?) — no
  // existe ningún parámetro por el que un llamante pueda inyectar un
  // access_token. Este test documenta esa garantía comprobando que el
  // Partner correcto se resuelve exclusivamente por id.
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partner = await createTestPartner({ status: "active", contactEmail: "negocio@example.com" });
  const { client: emailClient, calls } = fakeResendClient();
  try {
    await resendPartnerAccess(sessionClient, partner.id, emailClient);
    const sentParams = calls[0] as { html: string };
    assert.ok(
      sentParams.html.includes(partner.accessToken),
      "el email debe contener el access_token real del Partner (construido server-side, nunca recibido del llamante)",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

test("resendPartnerAccess: el resultado nunca incluye access_token, dashboardUrl ni contact_email — solo {outcome}", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partner = await createTestPartner({ status: "active", contactEmail: "negocio@example.com" });
  const { client: emailClient } = fakeResendClient();
  try {
    const result = await resendPartnerAccess(sessionClient, partner.id, emailClient);
    assert.deepEqual(Object.keys(result), ["outcome"], "el resultado expuesto al llamante (y por tanto a la UI) debe limitarse a outcome");
  } finally {
    await deleteTestUser(userId);
  }
});

// ══════════════════════════ IDEMPOTENCIA ══════════════════════════

test("resendPartnerAccess: reenviar dos veces usa el MISMO access_token — nunca lo regenera", async () => {
  const { userId, sessionClient } = await signUpPartnerAdmin();
  const partner = await createTestPartner({ status: "active", contactEmail: "negocio@example.com" });
  const { client: emailClient, calls } = fakeResendClient();
  try {
    await resendPartnerAccess(sessionClient, partner.id, emailClient);
    await resendPartnerAccess(sessionClient, partner.id, emailClient);

    assert.equal(calls.length, 2);
    const firstHtml = (calls[0] as { html: string }).html;
    const secondHtml = (calls[1] as { html: string }).html;
    assert.ok(firstHtml.includes(partner.accessToken) && secondHtml.includes(partner.accessToken));

    const service = createServiceRoleClient();
    const { data } = await service.from("partners").select("access_token").eq("id", partner.id).single();
    assert.equal(data?.access_token, partner.accessToken, "access_token no debe cambiar entre reenvíos");
  } finally {
    await deleteTestUser(userId);
  }
});

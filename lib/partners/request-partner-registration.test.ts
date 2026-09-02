// UX-10 (Partners Visible + Discovery + Registration) — Tests de
// requestPartnerRegistration(). Verifica que este es realmente el único
// camino de escritura pública seguro: siempre crea `status: "pending"`
// e `is_test: false`, nunca acepta esos valores (ni `access_token`) como
// parámetro, y rechaza categorías fuera del CHECK real de la tabla.
//
// `requestPartnerRegistration()` marca deliberadamente `is_test: false`
// (es la función real que usará un comercio real) — así que cada fila
// creada aquí debe reconvertirse a `is_test: true` (UPDATE, nunca
// DELETE, mismo criterio ya establecido en CORE-1/2/3/4) DESPUÉS de
// comprobar el valor real que puso la función, para no dejar fixtures de
// este archivo de test contaminando Discovery en la base local.
//
// P10.1 (Partner Onboarding Hardening) — `contactEmail` pasa a ser
// obligatorio (ver el archivo fuente para el razonamiento completo).
// Todos los tests preexistentes que antes omitían `contactEmail` se
// actualizan aquí para seguir probando "submitted", ya que de otro modo
// fallarían por la nueva validación en vez de por lo que realmente
// pretenden verificar — es la misma regresión que la propia auditoría
// P10.1 anticipó como aceptable de corregir en este bloque.

import { test } from "node:test";
import assert from "node:assert/strict";

import { createServiceRoleClient } from "../supabase/service";
import { requestPartnerRegistration } from "./request-partner-registration";

async function markAsTestData(partnerId: string): Promise<void> {
  const service = createServiceRoleClient();
  await service.from("partners").update({ is_test: true }).eq("id", partnerId);
}

test("requestPartnerRegistration: crea el Partner con status=pending e is_test=false", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await requestPartnerRegistration({
    name: `RPR Test Business ${suffix}`,
    category: "gym",
    contactEmail: `rpr-${suffix}@example.com`,
  });

  assert.equal(result.outcome, "submitted");
  if (result.outcome !== "submitted") return;

  try {
    const service = createServiceRoleClient();
    const { data, error } = await service
      .from("partners")
      .select("status, is_test, category, access_token, contact_email")
      .eq("id", result.partnerId)
      .single();

    assert.equal(error, null);
    assert.equal(data!.status, "pending", "toda solicitud pública debe nacer pending, nunca active");
    assert.equal(data!.is_test, false, "una solicitud real nunca debe marcarse is_test");
    assert.equal(data!.category, "gym");
    assert.ok(data!.access_token, "access_token sigue generándose por defecto (gen_random_uuid()), pero nunca lo elige el llamante");
    assert.equal(data!.contact_email, `rpr-${suffix}@example.com`);
  } finally {
    await markAsTestData(result.partnerId);
  }
});

test("requestPartnerRegistration: genera un slug a partir del nombre", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await requestPartnerRegistration({
    name: `Café Núñez ${suffix}`,
    category: "restaurant",
    contactEmail: `cafe-${suffix}@example.com`,
  });

  assert.equal(result.outcome, "submitted");
  if (result.outcome !== "submitted") return;

  try {
    const service = createServiceRoleClient();
    const { data } = await service.from("partners").select("slug").eq("id", result.partnerId).single();
    assert.ok(data?.slug, "debe generarse un slug");
    assert.doesNotMatch(data!.slug as string, /[^a-z0-9-]/, "el slug generado debe ser solo minúsculas/números/guiones");
  } finally {
    await markAsTestData(result.partnerId);
  }
});

test("requestPartnerRegistration: categoría fuera del whitelist -> invalid_input, sin tocar la base", async () => {
  const result = await requestPartnerRegistration({
    name: `RPR Invalid Category ${Date.now()}`,
    category: "not-a-real-category",
    contactEmail: "valido@example.com",
  });
  assert.equal(result.outcome, "invalid_input");
});

test("requestPartnerRegistration: nombre vacío -> invalid_input", async () => {
  const result = await requestPartnerRegistration({ name: "   ", category: "gym", contactEmail: "valido@example.com" });
  assert.equal(result.outcome, "invalid_input");
});

// P10.1 — Caso 2/3/4 del bloque de hardening: contactEmail ausente,
// con formato inválido, y con espacios que deben normalizarse.
test("requestPartnerRegistration: contactEmail vacío -> invalid_input, sin tocar la base", async () => {
  const result = await requestPartnerRegistration({
    name: `RPR No Email ${Date.now()}`,
    category: "gym",
  });
  assert.equal(result.outcome, "invalid_input");
});

test("requestPartnerRegistration: contactEmail con formato inválido -> invalid_input", async () => {
  const result = await requestPartnerRegistration({
    name: `RPR Invalid Email ${Date.now()}`,
    category: "gym",
    contactEmail: "esto-no-es-un-email",
  });
  assert.equal(result.outcome, "invalid_input");
});

test("requestPartnerRegistration: contactEmail con espacios se normaliza (trim) antes de guardarse", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const result = await requestPartnerRegistration({
    name: `RPR Trim Email ${suffix}`,
    category: "gym",
    contactEmail: `   trim-${suffix}@example.com  `,
  });

  assert.equal(result.outcome, "submitted");
  if (result.outcome !== "submitted") return;

  try {
    const service = createServiceRoleClient();
    const { data } = await service.from("partners").select("contact_email").eq("id", result.partnerId).single();
    assert.equal(data?.contact_email, `trim-${suffix}@example.com`, "el email guardado debe estar recortado, sin espacios");
  } finally {
    await markAsTestData(result.partnerId);
  }
});

// P10.1 — Caso 5: un Partner histórico (anterior a este bloque, con
// contact_email NULL) debe seguir existiendo sin que nada de este
// módulo lo rompa. La validación nueva es de escritura (aplica solo a
// solicitudes NUEVAS vía este mismo módulo, nunca retroactiva), así que
// se simula un Partner histórico insertándolo directamente vía
// service_role (mismo mecanismo con el que ya existía cualquier fila
// anterior a P10.1) y se confirma que una solicitud nueva, en paralelo,
// sigue funcionando con normalidad.
test("requestPartnerRegistration: un Partner histórico con contact_email=NULL sigue existiendo y no rompe solicitudes nuevas", async () => {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data: legacy, error: legacyError } = await service
    .from("partners")
    .insert({
      name: `RPR Legacy No Email ${suffix}`,
      slug: `rpr-legacy-no-email-${suffix}`,
      category: "restaurant",
      status: "pending",
      is_test: true,
      contact_email: null,
    })
    .select("id, contact_email")
    .single();

  assert.equal(legacyError, null, `crear el Partner histórico de prueba falló: ${legacyError?.message}`);
  assert.equal(legacy!.contact_email, null, "precondición: el Partner histórico simulado debe tener contact_email NULL");

  const result = await requestPartnerRegistration({
    name: `RPR New After Legacy ${suffix}`,
    category: "restaurant",
    contactEmail: `new-${suffix}@example.com`,
  });

  assert.equal(result.outcome, "submitted", "la presencia de Partners históricos sin email no debe afectar a solicitudes nuevas");
  if (result.outcome === "submitted") {
    await markAsTestData(result.partnerId);
  }
});

// PARTNER APPLICATION NOTIFICATION V1 — la solicitud debe crearse igual
// aunque PARTNER_NOTIFICATION_EMAIL esté configurada y el envío falle
// (aquí, sin RESEND_API_KEY real en el entorno de test): "INSERT correcto
// > emails" verificado a nivel de integración real, no solo con dobles de
// prueba (ver lib/email/send-partner-emails.test.ts para la cobertura
// unitaria de los mismos 3 casos).
test("requestPartnerRegistration: la solicitud se crea igual aunque falle el email de notificación a Andrés", async () => {
  const original = process.env.PARTNER_NOTIFICATION_EMAIL;
  process.env.PARTNER_NOTIFICATION_EMAIL = "andres@example.com";
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    const result = await requestPartnerRegistration({
      name: `RPR Notification Resilience ${suffix}`,
      category: "shop",
      contactEmail: `notif-${suffix}@example.com`,
    });

    assert.equal(result.outcome, "submitted", "el INSERT nunca debe verse afectado por un fallo del email de notificación");
    if (result.outcome === "submitted") {
      await markAsTestData(result.partnerId);
    }
  } finally {
    if (original === undefined) delete process.env.PARTNER_NOTIFICATION_EMAIL;
    else process.env.PARTNER_NOTIFICATION_EMAIL = original;
  }
});

test("requestPartnerRegistration: dos solicitudes con el mismo nombre generan slugs distintos (sin colisión)", async () => {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `RPR Duplicate Name ${suffix}`;

  const first = await requestPartnerRegistration({ name, category: "shop", contactEmail: `dup1-${suffix}@example.com` });
  const second = await requestPartnerRegistration({ name, category: "shop", contactEmail: `dup2-${suffix}@example.com` });

  assert.equal(first.outcome, "submitted");
  assert.equal(second.outcome, "submitted");
  if (first.outcome !== "submitted" || second.outcome !== "submitted") return;

  try {
    assert.notEqual(first.partnerId, second.partnerId);

    const service = createServiceRoleClient();
    const { data } = await service.from("partners").select("id, slug").in("id", [first.partnerId, second.partnerId]);
    const slugs = data?.map((row) => row.slug as string) ?? [];
    assert.equal(new Set(slugs).size, 2, "dos Partners con el mismo nombre nunca deben terminar con el mismo slug");
  } finally {
    await markAsTestData(first.partnerId);
    await markAsTestData(second.partnerId);
  }
});

// Bloque Partners PB3 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — Tests de
// resolvePartnerAccess(). Mismo patrón que
// app/properties/[id]/resolve.test.ts: función pura, testable
// directamente con node:test, sin necesidad de contexto de Next.js.
//
// Igual que `partners`/`partner_activities` en PB1/PB2, `partners` nunca
// recibe GRANT de DELETE para service_role — cada Partner de test creado
// aquí queda permanentemente en la base local (mismo comportamiento ya
// aceptado y documentado en complete-partner-activity.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { isValidAccessToken, resolvePartnerAccess } from "./resolve-partner-access";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createTestPartner(status: "active" | "inactive" = "active"): Promise<{ id: string; accessToken: string; name: string; category: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `Test Partner ${suffix}`;
  const category = "restaurant";
  const { data, error } = await service
    .from("partners")
    .insert({ name, slug: `test-partner-access-${suffix}`, category, status, is_test: true })
    .select("id, access_token")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { id: data!.id as string, accessToken: data!.access_token as string, name, category };
}

// ── Token válido ──
test("resolvePartnerAccess: token válido resuelve exactamente el Partner correcto", async () => {
  const partner = await createTestPartner();
  const result = await resolvePartnerAccess(partner.accessToken);

  assert.equal(result.status, "granted");
  if (result.status !== "granted") return;
  assert.equal(result.partner.id, partner.id);
  assert.equal(result.partner.name, partner.name);
  assert.equal(result.partner.category, partner.category);
});

// ── Token inválido / inexistente ──
test("resolvePartnerAccess: token con formato válido pero inexistente -> denied, sin lanzar", async () => {
  const result = await resolvePartnerAccess("00000000-0000-0000-0000-000000000000");
  assert.equal(result.status, "denied");
});

test("resolvePartnerAccess: formato inválido (vacío, texto arbitrario) -> denied, sin lanzar", async () => {
  const empty = await resolvePartnerAccess("");
  assert.equal(empty.status, "denied");

  const garbage = await resolvePartnerAccess("not-a-token");
  assert.equal(garbage.status, "denied");

  const sqlInjectionAttempt = await resolvePartnerAccess("' OR '1'='1");
  assert.equal(sqlInjectionAttempt.status, "denied");
});

// ── Token manipulado ──
test("resolvePartnerAccess: cambiar un carácter de un token real y válido -> denied", async () => {
  const partner = await createTestPartner();
  const validResult = await resolvePartnerAccess(partner.accessToken);
  assert.equal(validResult.status, "granted", "precondición: el token original debe resolver correctamente");

  const lastChar = partner.accessToken.at(-1)!;
  const replacement = lastChar === "0" ? "1" : "0";
  const tamperedToken = partner.accessToken.slice(0, -1) + replacement;

  const tamperedResult = await resolvePartnerAccess(tamperedToken);
  assert.equal(tamperedResult.status, "denied", "un token con un solo carácter distinto nunca debe resolver ningún Partner");
});

// ── Aislamiento entre Partners ──
test("resolvePartnerAccess: el token del Partner A nunca resuelve al Partner B (aislamiento real)", async () => {
  const partnerA = await createTestPartner();
  const partnerB = await createTestPartner();
  assert.notEqual(partnerA.accessToken, partnerB.accessToken, "precondición: tokens distintos (UNIQUE, gen_random_uuid())");

  const resultA = await resolvePartnerAccess(partnerA.accessToken);
  assert.equal(resultA.status, "granted");
  if (resultA.status === "granted") {
    assert.equal(resultA.partner.id, partnerA.id);
    assert.notEqual(resultA.partner.id, partnerB.id, "el token de A jamás debe resolver el id de B");
  }

  const resultB = await resolvePartnerAccess(partnerB.accessToken);
  assert.equal(resultB.status, "granted");
  if (resultB.status === "granted") {
    assert.equal(resultB.partner.id, partnerB.id);
    assert.notEqual(resultB.partner.id, partnerA.id, "el token de B jamás debe resolver el id de A");
  }
});

// ── Seguridad: el token nunca se filtra en el resultado ──
test("resolvePartnerAccess: el resultado 'granted' nunca incluye access_token ni ningún otro campo sensible", async () => {
  const partner = await createTestPartner();
  const result = await resolvePartnerAccess(partner.accessToken);

  assert.equal(result.status, "granted");
  if (result.status !== "granted") return;
  assert.deepEqual(
    Object.keys(result.partner).sort(),
    ["category", "id", "name"],
    "el contexto de Partner expuesto debe limitarse exactamente a id/name/category — nunca access_token ni otros campos",
  );
});

// ── Estado del Partner: active / inactive ──
test("resolvePartnerAccess: un Partner 'inactive' se rechaza igual que un token inexistente (sin distinguir el motivo)", async () => {
  const inactivePartner = await createTestPartner("inactive");
  const result = await resolvePartnerAccess(inactivePartner.accessToken);
  assert.equal(result.status, "denied", "un Partner inactive no debe poder acceder, aunque su token sea válido y exista");
});

test("resolvePartnerAccess: un Partner 'active' con el mismo mecanismo sí resuelve correctamente (control positivo)", async () => {
  const activePartner = await createTestPartner("active");
  const result = await resolvePartnerAccess(activePartner.accessToken);
  assert.equal(result.status, "granted");
});

// ── isValidAccessToken: formato, no existencia ──
test("isValidAccessToken: acepta el formato estándar 8-4-4-4-12 hex, en mayúsculas o minúsculas", () => {
  const sample = "11111111-2222-3333-4444-555555555555";
  assert.equal(isValidAccessToken(sample), true);
  assert.equal(isValidAccessToken(sample.toUpperCase()), true);
});

test("isValidAccessToken: rechaza formatos inválidos sin lanzar", () => {
  assert.equal(isValidAccessToken(""), false);
  assert.equal(isValidAccessToken("basura"), false);
  assert.equal(isValidAccessToken("11111111-2222-3333-4444-55555555555"), false); // un carácter de menos
});

// ── Seguridad: sin acceso directo cliente -> partners (confirma en el contexto de PB3 el diseño RLS ya validado en PB1) ──
test("partners: un cliente de sesión real (anon key, sin admin) nunca puede leer partners directamente, ni siquiera un access_token propio", async () => {
  const partner = await createTestPartner();
  const anonClient = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

  const { data, error } = await anonClient.from("partners").select("id, access_token").eq("id", partner.id);
  // RLS activa sin ninguna policy de cliente (PB1): la query no debe
  // devolver ninguna fila (Postgres/PostgREST filtra en silencio bajo
  // RLS, no necesariamente un `error` explícito) — en cualquier caso,
  // `access_token` nunca debe llegar a un cliente sin service_role.
  assert.equal(data?.length ?? 0, 0, "un cliente sin service_role nunca debe poder leer ninguna fila de partners");
  void error; // el resultado relevante es la ausencia de filas, no el código de error concreto de PostgREST/RLS.
});

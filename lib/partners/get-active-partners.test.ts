// UX-10 (Partners Visible + Discovery + Registration) — Tests de
// getActivePartners(). Mismo patrón que resolve-partner-access.test.ts:
// función pura, testable directamente con node:test. `partners` nunca
// recibe GRANT de DELETE (mismo criterio ya documentado en
// complete-partner-activity.test.ts) — cada Partner de test creado aquí
// queda permanentemente en la base local.
//
// Los "controles positivos" de este archivo (Partner real y activo, para
// comprobar que SÍ aparece) crean deliberadamente `is_test: false` —
// exactamente el mismo dato que produciría un alta real — así que cada
// uno de ellos DEBE reconvertirse a `is_test: true` en un `finally`
// después de comprobarlo, o cada `npm test` dejaría fixtures
// indistinguibles de Partners reales contaminando Discovery en la base
// local (detectado visualmente en este mismo bloque: 5 filas de "GAP/
// GPBS Test Partner" aparecían en `/partners` tras la primera versión de
// este archivo, antes de este `finally`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { getActivePartners } from "./get-active-partners";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function createPartner(overrides: {
  status?: "active" | "pending" | "inactive";
  isTest?: boolean;
}): Promise<{ id: string; slug: string; name: string }> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const name = `GAP Test Partner ${suffix}`;
  const slug = `gap-test-partner-${suffix}`;
  const { data, error } = await service
    .from("partners")
    .insert({
      name,
      slug,
      category: "restaurant",
      status: overrides.status ?? "active",
      is_test: overrides.isTest ?? true,
    })
    .select("id")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return { id: data!.id as string, slug, name };
}

async function markAsTestData(partnerId: string): Promise<void> {
  const service = createServiceRoleClient();
  await service.from("partners").update({ is_test: true }).eq("id", partnerId);
}

test("getActivePartners: un Partner status=active, is_test=false aparece en Discovery", async () => {
  const partner = await createPartner({ status: "active", isTest: false });
  try {
    const partners = await getActivePartners();
    assert.ok(partners.some((p) => p.id === partner.id), "el Partner real y activo debe aparecer en Discovery");
  } finally {
    await markAsTestData(partner.id);
  }
});

test("getActivePartners: un Partner status=pending NUNCA aparece en Discovery", async () => {
  const partner = await createPartner({ status: "pending", isTest: false });
  try {
    const partners = await getActivePartners();
    assert.ok(!partners.some((p) => p.id === partner.id), "un Partner pending no debe aparecer en Discovery");
  } finally {
    await markAsTestData(partner.id);
  }
});

test("getActivePartners: un Partner status=inactive NUNCA aparece en Discovery", async () => {
  const partner = await createPartner({ status: "inactive", isTest: false });
  try {
    const partners = await getActivePartners();
    assert.ok(!partners.some((p) => p.id === partner.id), "un Partner inactive no debe aparecer en Discovery");
  } finally {
    await markAsTestData(partner.id);
  }
});

test("getActivePartners: un Partner is_test=true NUNCA aparece en Discovery, aunque esté active", async () => {
  const partner = await createPartner({ status: "active", isTest: true });
  const partners = await getActivePartners();
  assert.ok(!partners.some((p) => p.id === partner.id), "una fixture de test no debe aparecer en Discovery");
});

test("getActivePartners: la forma devuelta nunca incluye access_token, contact_email ni contact_phone", async () => {
  const partner = await createPartner({ status: "active", isTest: false });
  try {
    const partners = await getActivePartners();
    assert.ok(partners.length > 0, "precondición: debe existir al menos un Partner real y activo");

    for (const p of partners) {
      const keys = Object.keys(p);
      assert.ok(!keys.includes("access_token") && !keys.includes("accessToken"), "Discovery jamás debe exponer access_token");
      assert.ok(!keys.includes("contact_email") && !keys.includes("contactEmail"), "Discovery jamás debe exponer contact_email");
      assert.ok(!keys.includes("contact_phone") && !keys.includes("contactPhone"), "Discovery jamás debe exponer contact_phone");
    }
  } finally {
    await markAsTestData(partner.id);
  }
});

test("partners: un cliente de sesión real (anon key, sin admin) nunca puede insertar ni actualizar partners directamente", async () => {
  const partner = await createPartner({ status: "active", isTest: false });
  try {
    const anonClient = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));

    const insertAttempt = await anonClient
      .from("partners")
      .insert({ name: "Intento anon", slug: `intento-anon-${Date.now()}`, category: "restaurant", status: "active" });
    assert.ok(insertAttempt.error, "un cliente sin service_role nunca debe poder insertar en partners (RLS sin policy de cliente)");

    const updateAttempt = await anonClient.from("partners").update({ status: "active" }).eq("id", partner.id).select();
    assert.equal(updateAttempt.data?.length ?? 0, 0, "un cliente sin service_role nunca debe poder actualizar ninguna fila de partners");
  } finally {
    await markAsTestData(partner.id);
  }
});

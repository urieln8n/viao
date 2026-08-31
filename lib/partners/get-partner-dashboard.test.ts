// Bloque Partners PB6 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — Tests de
// getPartnerDashboard(). Mismo patrón que el resto de lib/partners/: usuario
// real vía signUp + createServiceRoleClient, Partner real vía INSERT
// directo (mismo criterio que complete-partner-activity.test.ts). Las
// filas de partner_activities se insertan directamente vía service_role
// (bypass del RPC) para construir escenarios exactos y conocidos — este
// archivo prueba la AGREGACIÓN de lectura, no la economía de PB2 (ya
// cubierta exhaustivamente en complete-partner-activity.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { getPartnerDashboard } from "./get-partner-dashboard";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser(): Promise<{ userId: string; sessionClient: SupabaseClient }> {
  const client = createClient(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"));
  const email = `partners-pb6-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await client.auth.signUp({ email, password: "partners-pb6-test-password-12345" });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  return { userId: data.user!.id as string, sessionClient: client };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function createTestPartner(): Promise<string> {
  const service = createServiceRoleClient();
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const { data, error } = await service
    .from("partners")
    .insert({ name: `Test Partner PB6 ${suffix}`, slug: `test-partner-pb6-${suffix}`, category: "restaurant", is_test: true })
    .select("id")
    .single();
  assert.equal(error, null, `crear Partner de test falló: ${error?.message}`);
  return data!.id as string;
}

async function insertActivity(params: {
  partnerId: string;
  userId: string;
  attributionMechanism: "qr" | "reservation";
  amountConfidence: "declared" | "confirmed_by_reservation";
  declaredAmountEur: number;
  pointsAwarded?: number;
  createdAt?: string;
}) {
  const service = createServiceRoleClient();
  const { error } = await service.from("partner_activities").insert({
    partner_id: params.partnerId,
    user_id: params.userId,
    attribution_mechanism: params.attributionMechanism,
    amount_confidence: params.amountConfidence,
    declared_amount_eur: params.declaredAmountEur,
    points_awarded: params.pointsAwarded ?? 0,
    attempt_id: crypto.randomUUID(),
    ...(params.createdAt ? { created_at: params.createdAt } : {}),
  });
  assert.equal(error, null, `insertar Actividad de test falló: ${error?.message}`);
}

// UX-12 (Partner Self-Service + Measurement) — inserta directamente en
// `analytics_events` (bypass de logAnalyticsEvent/app/partners/[slug]/page.tsx),
// mismo criterio ya establecido arriba para `insertActivity`: este
// archivo prueba la AGREGACIÓN de lectura de getPartnerDashboard(), no
// la emisión real del evento (cubierta por lib/analytics/taxonomy.test.ts).
async function insertProfileView(partnerId: string) {
  const service = createServiceRoleClient();
  const { error } = await service
    .from("analytics_events")
    .insert({ event_name: "partner_profile_viewed", metadata: { partnerId } });
  assert.equal(error, null, `insertar vista de perfil de test falló: ${error?.message}`);
}

// ── Partner sin actividad ──
test("getPartnerDashboard: Partner sin ninguna Actividad -> las 6 métricas en su valor vacío correcto, sin lanzar", async () => {
  const partnerId = await createTestPartner();
  const dashboard = await getPartnerDashboard(partnerId);

  assert.equal(dashboard.clientesNuevos, 0);
  assert.equal(dashboard.clientesRecurrentes, 0);
  assert.equal(dashboard.ventasDeclaradasEur, 0);
  assert.equal(dashboard.ventasConfirmadasReservaEur, 0);
  assert.deepEqual(dashboard.actividadReciente, []);
  assert.equal(dashboard.partnerActivo, false);
  assert.equal(dashboard.profileViews, 0);
});

// ── clientes_nuevos / clientes_recurrentes ──
test("getPartnerDashboard: clientes_nuevos cuenta usuarios distintos; clientes_recurrentes solo los que tienen >=2 Actividades", async () => {
  const partnerId = await createTestPartner();
  const { userId: userA } = await signUpUser();
  const { userId: userB } = await signUpUser();
  const { userId: userC } = await signUpUser();
  try {
    // A: 1 actividad (nuevo, no recurrente). B: 2 actividades (nuevo Y recurrente). C: 3 actividades (nuevo Y recurrente).
    await insertActivity({ partnerId, userId: userA, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });
    await insertActivity({ partnerId, userId: userB, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });
    await insertActivity({ partnerId, userId: userB, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });
    await insertActivity({ partnerId, userId: userC, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });
    await insertActivity({ partnerId, userId: userC, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });
    await insertActivity({ partnerId, userId: userC, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });

    const dashboard = await getPartnerDashboard(partnerId);
    assert.equal(dashboard.clientesNuevos, 3, "3 usuarios distintos en total (A, B, C)");
    assert.equal(dashboard.clientesRecurrentes, 2, "solo B y C tienen >=2 Actividades");
  } finally {
    await deleteTestUser(userA);
    await deleteTestUser(userB);
    await deleteTestUser(userC);
  }
});

// ── ventas_declaradas_eur / ventas_confirmadas_reserva_eur ──
test("getPartnerDashboard: ventas_declaradas_eur y ventas_confirmadas_reserva_eur suman correctamente y permanecen separadas (QR y Reserva)", async () => {
  const partnerId = await createTestPartner();
  const { userId } = await signUpUser();
  try {
    await insertActivity({ partnerId, userId, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 10 });
    await insertActivity({ partnerId, userId, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 5.5 });
    await insertActivity({ partnerId, userId, attributionMechanism: "reservation", amountConfidence: "confirmed_by_reservation", declaredAmountEur: 20 });

    const dashboard = await getPartnerDashboard(partnerId);
    assert.equal(dashboard.ventasDeclaradasEur, 15.5, "10 + 5.5 = 15.5, solo las 'declared'");
    assert.equal(dashboard.ventasConfirmadasReservaEur, 20, "solo la 'confirmed_by_reservation', nunca mezclada con 'declared'");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── actividad_reciente: orden descendente ──
test("getPartnerDashboard: actividad_reciente está ordenada por created_at DESC", async () => {
  const partnerId = await createTestPartner();
  const { userId } = await signUpUser();
  try {
    const now = Date.now();
    await insertActivity({
      partnerId,
      userId,
      attributionMechanism: "qr",
      amountConfidence: "declared",
      declaredAmountEur: 1,
      createdAt: new Date(now - 3000).toISOString(),
    });
    await insertActivity({
      partnerId,
      userId,
      attributionMechanism: "qr",
      amountConfidence: "declared",
      declaredAmountEur: 2,
      createdAt: new Date(now - 1000).toISOString(),
    });
    await insertActivity({
      partnerId,
      userId,
      attributionMechanism: "qr",
      amountConfidence: "declared",
      declaredAmountEur: 3,
      createdAt: new Date(now - 2000).toISOString(),
    });

    const dashboard = await getPartnerDashboard(partnerId);
    assert.equal(dashboard.actividadReciente.length, 3);
    assert.deepEqual(
      dashboard.actividadReciente.map((a) => a.declaredAmountEur),
      [2, 3, 1],
      "más reciente primero: -1000ms, -2000ms, -3000ms",
    );
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Actividad con points_awarded=0 sigue apareciendo (P5, LOCKED) ──
test("getPartnerDashboard: una Actividad con points_awarded=0 (pool agotado, P5) sigue contando en todas las métricas", async () => {
  const partnerId = await createTestPartner();
  const { userId } = await signUpUser();
  try {
    await insertActivity({
      partnerId,
      userId,
      attributionMechanism: "qr",
      amountConfidence: "declared",
      declaredAmountEur: 12,
      pointsAwarded: 0,
    });

    const dashboard = await getPartnerDashboard(partnerId);
    assert.equal(dashboard.clientesNuevos, 1, "la Actividad con 0 Points sigue contando como cliente nuevo");
    assert.equal(dashboard.ventasDeclaradasEur, 12, "la venta declarada se cuenta igual, independientemente de los Points otorgados");
    assert.equal(dashboard.actividadReciente.length, 1, "no se excluye de actividad_reciente");
    assert.equal(dashboard.actividadReciente[0].pointsAwarded, 0);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── partner_activo ──
test("getPartnerDashboard: partner_activo=true con Actividad dentro de los últimos 14 días", async () => {
  const partnerId = await createTestPartner();
  const { userId } = await signUpUser();
  try {
    await insertActivity({ partnerId, userId, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });
    const dashboard = await getPartnerDashboard(partnerId);
    assert.equal(dashboard.partnerActivo, true);
  } finally {
    await deleteTestUser(userId);
  }
});

test("getPartnerDashboard: partner_activo=false cuando la única Actividad tiene más de 14 días", async () => {
  const partnerId = await createTestPartner();
  const { userId } = await signUpUser();
  try {
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setUTCDate(fifteenDaysAgo.getUTCDate() - 15);
    await insertActivity({
      partnerId,
      userId,
      attributionMechanism: "qr",
      amountConfidence: "declared",
      declaredAmountEur: 1,
      createdAt: fifteenDaysAgo.toISOString(),
    });

    const dashboard = await getPartnerDashboard(partnerId);
    assert.equal(dashboard.partnerActivo, false, "una Actividad de hace 15 días no cuenta como Partner activo (ventana de 14 días)");
    assert.equal(dashboard.clientesNuevos, 1, "sigue contando para las demás métricas, solo partner_activo depende de la ventana de 14 días");
  } finally {
    await deleteTestUser(userId);
  }
});

// ── profileViews (UX-12) ──
test("getPartnerDashboard: profileViews cuenta las filas reales de analytics_events (partner_profile_viewed) de este Partner", async () => {
  const partnerId = await createTestPartner();
  await insertProfileView(partnerId);
  await insertProfileView(partnerId);
  await insertProfileView(partnerId);

  const dashboard = await getPartnerDashboard(partnerId);
  assert.equal(dashboard.profileViews, 3);
});

test("getPartnerDashboard: profileViews del Partner A nunca incluye vistas del Partner B (aislamiento por metadata->>partnerId)", async () => {
  const partnerA = await createTestPartner();
  const partnerB = await createTestPartner();

  await insertProfileView(partnerA);
  await insertProfileView(partnerB);
  await insertProfileView(partnerB);

  const dashboardA = await getPartnerDashboard(partnerA);
  const dashboardB = await getPartnerDashboard(partnerB);
  assert.equal(dashboardA.profileViews, 1, "el conteo de A no debe incluir las 2 vistas de B");
  assert.equal(dashboardB.profileViews, 2, "el conteo de B no debe incluir la vista de A");
});

// ── Aislamiento entre Partners ──
test("Aislamiento: el dashboard del Partner A nunca incluye Actividades del Partner B", async () => {
  const partnerA = await createTestPartner();
  const partnerB = await createTestPartner();
  const { userId } = await signUpUser();
  try {
    await insertActivity({ partnerId: partnerA, userId, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 100 });
    await insertActivity({ partnerId: partnerB, userId, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 999 });

    const dashboardA = await getPartnerDashboard(partnerA);
    assert.equal(dashboardA.ventasDeclaradasEur, 100, "el dashboard de A no debe incluir la venta de B (999)");
    assert.equal(dashboardA.actividadReciente.length, 1);

    const dashboardB = await getPartnerDashboard(partnerB);
    assert.equal(dashboardB.ventasDeclaradasEur, 999, "el dashboard de B no debe incluir la venta de A (100)");
    assert.equal(dashboardB.actividadReciente.length, 1);
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Seguridad: sin access_token ni datos de otro Partner en la forma devuelta ──
test("getPartnerDashboard: el resultado nunca incluye access_token ni ningún identificador de otro Partner", async () => {
  const partnerId = await createTestPartner();
  const { userId } = await signUpUser();
  try {
    await insertActivity({ partnerId, userId, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });
    const dashboard = await getPartnerDashboard(partnerId);

    assert.equal(
      Object.keys(dashboard).sort().join(","),
      ["actividadReciente", "clientesNuevos", "clientesRecurrentes", "partnerActivo", "profileViews", "ventasConfirmadasReservaEur", "ventasDeclaradasEur"].sort().join(","),
    );
    for (const activity of dashboard.actividadReciente) {
      assert.equal(
        Object.keys(activity).sort().join(","),
        ["amountConfidence", "attributionMechanism", "createdAt", "declaredAmountEur", "pointsAwarded"].sort().join(","),
        "actividad_reciente no debe exponer user_id ni ningún otro campo no previsto",
      );
    }
  } finally {
    await deleteTestUser(userId);
  }
});

// ── Solo lectura ──
test("getPartnerDashboard: no realiza ninguna escritura (código fuente sin INSERT/UPDATE/DELETE; el número de filas no cambia tras llamarlo)", async () => {
  const source = readFileSync(path.join(process.cwd(), "lib/partners/get-partner-dashboard.ts"), "utf-8");
  assert.ok(!/\.insert\s*\(/.test(source), "get-partner-dashboard.ts no debe contener ningún .insert(");
  assert.ok(!/\.update\s*\(/.test(source), "get-partner-dashboard.ts no debe contener ningún .update(");
  assert.ok(!/\.delete\s*\(/.test(source), "get-partner-dashboard.ts no debe contener ningún .delete(");

  const partnerId = await createTestPartner();
  const { userId } = await signUpUser();
  try {
    await insertActivity({ partnerId, userId, attributionMechanism: "qr", amountConfidence: "declared", declaredAmountEur: 1 });

    const service = createServiceRoleClient();
    const before = await service.from("partner_activities").select("id", { count: "exact", head: true }).eq("partner_id", partnerId);

    await getPartnerDashboard(partnerId);
    await getPartnerDashboard(partnerId);
    await getPartnerDashboard(partnerId);

    const after = await service.from("partner_activities").select("id", { count: "exact", head: true }).eq("partner_id", partnerId);
    assert.equal(after.count, before.count, "llamar al dashboard varias veces nunca debe cambiar el número de filas");
  } finally {
    await deleteTestUser(userId);
  }
});

// F12-03 (VIAO_ROADMAP.md) — Tests de Activación/Conversión/Retención
// contra Supabase local real, con datos ficticios (Casos G/H/I del
// checklist obligatorio de F12).
//
// La base local ya tiene datos de fases/tests anteriores en esta misma
// sesión — estos tests NUNCA asumen una base vacía. Se toma una foto
// ANTES de fabricar los datos ficticios y se comprueba el DELTA exacto
// tras crearlos (mismo patrón usado para verificar contadores agregados
// contra una base compartida real).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).

import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { logAnalyticsEvent } from "./log-event";
import { recordReturnVisitIfApplicable } from "./record-return-visit";
import {
  calculateActivationMetrics,
  calculateConversionMetrics,
  calculateRetentionMetrics,
  fetchAllRows,
  METRICS_PAGE_SIZE,
} from "./metrics";

function requireEnv(name: string): string {
  const value = process.env[name];
  assert.ok(value, `falta ${name} en el entorno de prueba`);
  return value!;
}

async function signUpUser() {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const anonClient = createClient(supabaseUrl, anonKey);

  const email = `f1203-test-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await anonClient.auth.signUp({
    email,
    password: "f1203-test-password-12345",
  });
  assert.equal(error, null, `signUp falló: ${error?.message}`);
  assert.ok(data.session);

  return { userId: data.user!.id as string };
}

async function deleteTestUser(userId: string) {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

async function simulatePastFirstUse(userId: string, daysAgo: number) {
  const service = createServiceRoleClient();
  const pastDate = new Date();
  pastDate.setUTCDate(pastDate.getUTCDate() - daysAgo);
  await service.from("analytics_events").insert({
    event_name: "registered",
    user_id: userId,
    created_at: pastDate.toISOString(),
  });
}

// ── Regresión: bug real encontrado al verificar F12-03 con datos reales.
// La base local de esta sesión ya tenía >1000 filas en analytics_events
// (por encima de max_rows de PostgREST, supabase/config.toml) — un SELECT
// sin paginar truncaba el resultado a 1000 filas y las métricas
// infracontaban en silencio. fetchAllRows() pagina con .range() hasta
// agotar la tabla; este test aísla esa lógica con datos ficticios de
// laboratorio (sin depender de que la base tenga miles de filas reales). ──
test("fetchAllRows: agrega correctamente varias páginas, sin duplicar ni truncar", async () => {
  const totalRows = METRICS_PAGE_SIZE * 2 + 137;
  const allData = Array.from({ length: totalRows }, (_, i) => ({ id: i }));

  const calls: Array<{ from: number; to: number }> = [];
  const rows = await fetchAllRows<{ id: number }>(async (from, to) => {
    calls.push({ from, to });
    return { data: allData.slice(from, to + 1), error: null };
  });

  assert.equal(rows.length, totalRows, "debe devolver TODAS las filas, no solo la primera página");
  assert.deepEqual(rows.map((r) => r.id), allData.map((r) => r.id));
  assert.equal(calls.length, 3, "debe pedir 3 páginas para cubrir 2*PAGE_SIZE + 137 filas");
});

test("fetchAllRows: una sola página (menos filas que PAGE_SIZE) no pide una segunda página", async () => {
  const allData = Array.from({ length: 5 }, (_, i) => ({ id: i }));
  let calls = 0;
  const rows = await fetchAllRows<{ id: number }>(async (from, to) => {
    calls += 1;
    return { data: allData.slice(from, to + 1), error: null };
  });

  assert.equal(rows.length, 5);
  assert.equal(calls, 1);
});

test("fetchAllRows: propaga el error de una página en vez de devolver datos parciales silenciosamente", async () => {
  await assert.rejects(() =>
    fetchAllRows(async () => ({ data: null, error: { message: "boom" } })),
  );
});

// ── F12 FINAL REVIEW: prueba real (no mockeada) de que >1000 filas reales
// en analytics_events se contabilizan correctamente. Inserta MÁS de
// METRICS_PAGE_SIZE filas reales, marcadas con un identificador único de
// esta ejecución, y compara el delta de calculateConversionMetrics()
// contra un conteo directo por SQL (verdad de terreno vía count exacto)
// — deben coincidir exactamente: ni se pierden ni se duplican filas al
// cruzar el límite de paginación de PostgREST. ──
test("Paginación real: >1000 filas reales en analytics_events se contabilizan sin pérdidas ni duplicados", async () => {
  const service = createServiceRoleClient();
  const marker = `pagtest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const totalRows = METRICS_PAGE_SIZE + 300;

  const before = await calculateConversionMetrics();

  const batchSize = 500;
  for (let inserted = 0; inserted < totalRows; inserted += batchSize) {
    const chunk = Array.from({ length: Math.min(batchSize, totalRows - inserted) }, () => ({
      event_name: "search_started",
      metadata: { paginationTestMarker: marker },
    }));
    const { error } = await service.from("analytics_events").insert(chunk);
    assert.equal(error, null, `fallo insertando lote de prueba de paginación: ${error?.message}`);
  }

  const { count: groundTruthCount, error: countError } = await service
    .from("analytics_events")
    .select("id", { count: "exact", head: true })
    .eq("metadata->>paginationTestMarker", marker);
  assert.equal(countError, null);
  assert.equal(groundTruthCount, totalRows, "verdad de terreno: deben existir exactamente las filas insertadas");

  const after = await calculateConversionMetrics();
  const delta = after.searchesStarted - before.searchesStarted;

  assert.equal(
    delta,
    totalRows,
    `calculateConversionMetrics debe contar las ${totalRows} filas reales (> METRICS_PAGE_SIZE=${METRICS_PAGE_SIZE}) sin perder ni duplicar ninguna`,
  );

  // Limpieza: no queda ningún GRANT de DELETE para service_role sobre
  // analytics_events (ledger append-only, ver auditoría de seguridad) —
  // las filas de prueba se quedan en la tabla marcadas, igual que
  // cualquier otro dato de test de esta sesión; no se puede ni se debe
  // borrar desde aquí.
});

test("Caso G: calculateActivationMetrics — registeredUsers y activatedUsers reflejan datos reales fabricados", async () => {
  const before = await calculateActivationMetrics();

  const activatedUser = await signUpUser();
  const inactiveUser = await signUpUser();
  try {
    // activatedUser realiza una "acción útil" real (hotel_viewed).
    await logAnalyticsEvent("hotel_viewed", { providerPropertyId: "test-property" }, activatedUser.userId);
    // inactiveUser solo se registra, ninguna acción útil adicional.

    const after = await calculateActivationMetrics();

    assert.equal(after.registeredUsers - before.registeredUsers, 2, "2 usuarios nuevos registrados");
    assert.equal(after.activatedUsers - before.activatedUsers, 1, "solo 1 de los 2 completó una acción útil");
    assert.ok(after.activationRate >= 0 && after.activationRate <= 1, "activationRate debe estar en [0,1]");
  } finally {
    await deleteTestUser(activatedUser.userId);
    await deleteTestUser(inactiveUser.userId);
  }
});

test("Caso H: calculateConversionMetrics — el embudo cuenta cada evento real fabricado", async () => {
  const before = await calculateConversionMetrics();

  const { userId } = await signUpUser();
  try {
    await logAnalyticsEvent("search_started", {}, userId);
    await logAnalyticsEvent("search_completed", {}, userId);
    await logAnalyticsEvent("hotel_viewed", {}, userId);
    await logAnalyticsEvent("recommendation_requested", {}, userId);
    await logAnalyticsEvent("booking_clicked", {}, userId);
    await logAnalyticsEvent("booking_completed", {}, userId);

    const after = await calculateConversionMetrics();

    assert.equal(after.searchesStarted - before.searchesStarted, 1);
    assert.equal(after.searchesCompleted - before.searchesCompleted, 1);
    assert.equal(after.hotelsViewed - before.hotelsViewed, 1);
    assert.equal(after.recommendationsRequested - before.recommendationsRequested, 1);
    assert.equal(after.bookingsClicked - before.bookingsClicked, 1);
    assert.equal(after.bookingsCompleted - before.bookingsCompleted, 1);
  } finally {
    await deleteTestUser(userId);
  }
});

test("Caso I: calculateRetentionMetrics — returningUsers y retentionRate reflejan datos reales fabricados", async () => {
  const before = await calculateRetentionMetrics();

  const returningUser = await signUpUser();
  const nonReturningUser = await signUpUser();
  try {
    await simulatePastFirstUse(returningUser.userId, 3);
    const result = await recordReturnVisitIfApplicable(returningUser.userId);
    assert.equal(result.recorded, true);
    // nonReturningUser nunca vuelve.

    const after = await calculateRetentionMetrics();

    assert.equal(after.registeredUsers - before.registeredUsers, 2);
    assert.equal(after.returningUsers - before.returningUsers, 1);
    assert.ok(after.retentionRate >= 0 && after.retentionRate <= 1);
    assert.ok(after.averageReturnVisitsPerReturningUser >= 1);
  } finally {
    await deleteTestUser(returningUser.userId);
    await deleteTestUser(nonReturningUser.userId);
  }
});

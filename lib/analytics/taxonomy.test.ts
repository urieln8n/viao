// F12-04 (VIAO_ROADMAP.md) — Checklist permanente de la taxonomía de 12
// eventos (VIAO_MVP_v0.1.md sección 13). Cada evento de `AnalyticsEventName`
// (lib/analytics/events.ts, que ya replica el CHECK constraint real de
// `analytics_events`) debe tener AL MENOS un punto real de emisión en el
// código — o, en el caso de `reward_redeemed`, una ausencia documentada y
// explícita (F7 no implementa canje todavía). Si en el futuro alguien
// borra el último call site de un evento sin querer, este test debe
// empezar a fallar — es la garantía pedida por F12-04 ("detectar si
// posteriormente desaparece algún evento").
//
// Escaneo de texto fuente (mismo patrón que
// app/properties/[id]/resolve.test.ts para "hotel_viewed"): no ejecuta el
// código, solo confirma que la cadena literal del evento aparece en el
// archivo que se supone que lo emite. No sustituye a los tests de
// comportamiento real de cada evento (ya existentes por fase, o añadidos
// en F12 para los 4 nuevos) — es una red de seguridad estructural
// adicional.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { AnalyticsEventName } from "./events";

// `process.cwd()`, no `__dirname`: mismo patrón ya establecido en
// app/booking/actions.test.ts — `__dirname` apuntaría al directorio de
// salida de la compilación ad-hoc de tests (dist/...), no a la raíz real
// del proyecto donde viven estos archivos fuente.
function readSource(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

// La taxonomía cerrada tal y como está documentada en VIAO_MVP_v0.1.md
// sección 13 y en el CHECK constraint real
// (supabase/migrations/20260817140010_create_analytics_events.sql) — 12
// eventos, ni uno más ni uno menos.
const EXPECTED_TAXONOMY: AnalyticsEventName[] = [
  "registered",
  "search_started",
  "search_completed",
  "hotel_viewed",
  "recommendation_requested",
  "booking_clicked",
  "booking_completed",
  "vision_used",
  "reward_earned",
  "reward_redeemed",
  "referral_created",
  "return_visit",
];

test("taxonomía: exactamente 12 eventos, coincide con el CHECK constraint real de analytics_events", () => {
  const migrationSource = readSource(
    "supabase/migrations/20260817140010_create_analytics_events.sql",
  );
  for (const eventName of EXPECTED_TAXONOMY) {
    assert.ok(
      migrationSource.includes(`'${eventName}'`),
      `el CHECK constraint real debe incluir '${eventName}'`,
    );
  }
  assert.equal(EXPECTED_TAXONOMY.length, 12, "la taxonomía del MVP tiene exactamente 12 eventos");
});

test("taxonomía: 'registered' se emite desde el trigger handle_new_user() (F3-07)", () => {
  const source = readSource(
    "supabase/migrations/20260817190000_add_registered_event_to_profiles_trigger.sql",
  );
  assert.ok(source.includes("'registered'"), "falta la emisión de 'registered'");
});

// J-B8.1 (Travel Legacy Purge — Search & AI Recommendation) — se retira
// aquí el test que comprobaba la emisión de 'search_started'/
// 'search_completed' desde app/search/actions.ts: ese archivo se elimina
// en este bloque, y con él desaparece el único emisor real de ambos
// eventos. Se quedan sin punto de emisión de forma INTENCIONAL (igual
// que 'reward_redeemed' más abajo, ausencia documentada, no un olvido) —
// EXPECTED_TAXONOMY no se toca porque el CHECK constraint real de
// analytics_events (supabase/migrations/, sin modificar en este bloque)
// sigue permitiendo ambos valores.

// J-B8.2 (Travel Legacy Purge — Properties) — se retiran aquí los tests
// que comprobaban la emisión de 'hotel_viewed' (desde
// app/properties/[id]/resolve.ts) y 'booking_clicked' (desde
// app/properties/[id]/log-booking-clicked-action.ts): ambos archivos se
// eliminan en este bloque, y con ellos desaparece su único emisor real.
// Mismo tratamiento que 'search_started'/'search_completed' en B8.1:
// ausencia documentada como intencional, no un olvido — EXPECTED_TAXONOMY
// no se toca porque el CHECK constraint real de analytics_events (sin
// modificar en este bloque) sigue permitiendo ambos valores.

test("taxonomía: 'recommendation_requested' se emite desde lib/openai/log.ts", () => {
  const source = readSource("lib/openai/log.ts");
  assert.ok(source.includes('logAnalyticsEvent("recommendation_requested"'));
});

test("taxonomía: 'booking_completed' se emite desde app/booking/actions.ts", () => {
  const source = readSource("app/booking/actions.ts");
  assert.ok(source.includes('logAnalyticsEvent("booking_completed"'));
});

test("taxonomía: 'vision_used' se emite desde lib/openai/log.ts", () => {
  const source = readSource("lib/openai/log.ts");
  assert.ok(source.includes('logAnalyticsEvent("vision_used"'));
});

test("taxonomía (F12-02): 'reward_earned' se emite desde 3 puntos reales — registro (trigger), reserva confirmada, referido", () => {
  const triggerSource = readSource(
    "supabase/migrations/20260818200000_add_reward_earned_and_referral_created_events_to_profiles_trigger.sql",
  );
  assert.ok(triggerSource.includes("'reward_earned'"), "falta reward_earned en el trigger de registro");

  const bookingSource = readSource("app/booking/actions.ts");
  assert.ok(bookingSource.includes('logAnalyticsEvent("reward_earned"'), "falta reward_earned en la recompensa de reserva");

  const referralSource = readSource("lib/referrals/complete-referral-action.ts");
  assert.ok(referralSource.includes('"reward_earned"'), "falta reward_earned en la recompensa de referido");
});

test("taxonomía (F12-02): 'reward_redeemed' está definida en la taxonomía pero SIN emisor real — F7 no implementa canje de Points todavía", () => {
  // No se inventa un flujo de canje para "completar" este evento (fuera
  // de alcance de F12: sería una funcionalidad de producto nueva). Este
  // test documenta el estado actual como una ausencia INTENCIONAL, no un
  // olvido — si en una fase futura se implementa el canje, este test debe
  // actualizarse junto con esa implementación.
  const rewardsFiles = [
    "lib/rewards/create-reward-transaction.ts",
    "lib/rewards/rules.ts",
  ];
  for (const file of rewardsFiles) {
    const source = readSource(file);
    assert.ok(
      !source.includes('"reward_redeemed"') && !source.includes("'reward_redeemed'"),
      `${file} no debería emitir reward_redeemed todavía (F7 no implementa canje)`,
    );
  }
});

test("taxonomía (F12-02): 'referral_created' se emite desde el trigger de registro (F8-02 extendido en F12-02)", () => {
  const source = readSource(
    "supabase/migrations/20260818200000_add_reward_earned_and_referral_created_events_to_profiles_trigger.sql",
  );
  assert.ok(source.includes("'referral_created'"));
});

test("taxonomía (F12-05): 'return_visit' se emite desde lib/analytics/record-return-visit.ts", () => {
  const source = readSource("lib/analytics/record-return-visit.ts");
  assert.ok(source.includes('logAnalyticsEvent("return_visit"'));
});

// UX-12 (Partner Self-Service + Measurement) — 'partner_profile_viewed'
// amplía la taxonomía DESPUÉS del CHECK original de F3-07
// (20260831090000_add_partner_profile_viewed_event.sql, migración
// aditiva y separada) — por eso no se añade a EXPECTED_TAXONOMY de
// arriba (ese test verifica específicamente el CHECK original de
// 20260817140010_create_analytics_events.sql, no el estado actual tras
// migraciones posteriores). Mismo patrón que el resto de tests
// individuales de esta suite: confirma que existe al menos un punto real
// de emisión en el código.
test("taxonomía (UX-12): 'partner_profile_viewed' se emite desde app/partners/[slug]/page.tsx", () => {
  const source = readSource("app/partners/[slug]/page.tsx");
  assert.ok(source.includes('logAnalyticsEvent("partner_profile_viewed"'));
});

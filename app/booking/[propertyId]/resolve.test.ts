// F6-01 (VIAO_ROADMAP.md) — Tests de la resolución de la pantalla de
// confirmación de reserva. Mismo motivo que el resto de Fase 4/5 para usar
// `node:test` y compilar a un directorio temporal antes de ejecutar
// (imports relativos, no el alias `@/` — ver el comando exacto en el
// reporte de la fase).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { classifyBookingError, resolveBookingContext } from "./resolve";
import { ProviderError, ProviderUnavailableError } from "../../../lib/travel-provider/errors";

const VALID_UUID = "11111111-2222-3333-4444-555555555555";

// ── 1. Alojamiento válido, sin search_id: funciona igual que F5-04 ──
test("propiedad válida sin search_id: found, sin prefill ni precio", async () => {
  const result = await resolveBookingContext("mock-001");

  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.context.property.name, "Hotel Central Madrid");
  assert.equal(result.context.searchId, undefined);
  assert.equal(result.context.prefill, undefined);
  assert.equal(result.context.price, undefined);
});

// ── 2. Alojamiento inexistente → not_found (se traduce a notFound() en la página) ──
test("propiedad inexistente: not_found, no lanza ni crashea", async () => {
  const result = await resolveBookingContext("does-not-exist");

  assert.equal(result.status, "not_found");
});

// ── 3. Error del provider: mapeado a un resultado controlado y distinguible ──
test("classifyBookingError: ProviderUnavailableError se interpreta como not_found", () => {
  const result = classifyBookingError(
    new ProviderUnavailableError("El alojamiento no existe."),
  );
  assert.deepEqual(result, { status: "not_found" });
});

test("classifyBookingError: ProviderError (fallo técnico) se interpreta como provider_error, no se oculta", () => {
  const result = classifyBookingError(new ProviderError("Fallo de red simulado."));
  assert.deepEqual(result, {
    status: "provider_error",
    message: "Fallo de red simulado.",
  });
});

test("classifyBookingError: un error que no es del modelo de F4-03 se relanza, nunca se convierte en éxito", () => {
  assert.throws(() => classifyBookingError(new Error("inesperado")), /inesperado/);
});

// ── 4. search_id válido (formato): se conserva en el resultado ──
test("resolveBookingContext: con search_id de formato válido, se conserva en el resultado", async () => {
  const result = await resolveBookingContext("mock-001", VALID_UUID);

  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.context.searchId, VALID_UUID);
  // Fuera de una petición real de Next.js, getSearchById no puede resolver
  // sesión (mismo motivo que F5-06/F6-01): prefill/price se quedan
  // undefined aquí, sin crashear — el flujo con datos reales precargados
  // se verifica en el reporte de la fase mediante navegador real.
  assert.equal(result.context.prefill, undefined);
  assert.equal(result.context.price, undefined);
});

// ── 5. search_id con formato inválido: se trata como ausencia, sin crash ──
test("resolveBookingContext: search_id con formato inválido se ignora, sin crash", async () => {
  const result = await resolveBookingContext("mock-001", "basura");

  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.context.searchId, undefined);
});

// ── Compatibilidad: id inexistente sigue siendo not_found incluso con search_id válido ──
test("resolveBookingContext: id inexistente sigue not_found incluso con un search_id válido", async () => {
  const result = await resolveBookingContext("does-not-exist", VALID_UUID);

  assert.equal(result.status, "not_found");
});

// ── 6. No importa MockHotelProvider directamente ──
test("resolve.ts (booking) no importa MockHotelProvider directamente; usa getTravelProvider() del adapter", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/booking/[propertyId]/resolve.ts"),
    "utf-8",
  );

  assert.ok(
    !/mock-provider/i.test(source),
    "resolve.ts no debe referenciar mock-provider.ts directamente",
  );
  assert.ok(
    /getTravelProvider/.test(source),
    "resolve.ts debe obtener el provider mediante getTravelProvider() (F4-05)",
  );
  assert.ok(
    !/\.book\(/.test(source),
    "F6-01 no debe llamar todavía a TravelProvider.book()",
  );
});

// F5-04 (VIAO_ROADMAP.md) — Tests de la resolución del detalle de un
// alojamiento. Mismo motivo que el resto de Fase 4/5 para usar `node:test`
// y compilar a un directorio temporal antes de ejecutar (imports relativos,
// no el alias `@/` — ver el comando exacto en el reporte de la fase).

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { classifyDetailError, isValidUuid, resolvePropertyDetail } from "./resolve";
import { ProviderError, ProviderUnavailableError } from "../../../lib/travel-provider/errors";

const VALID_UUID = "11111111-2222-3333-4444-555555555555";

// ── 1. id válido: se obtiene y muestra el alojamiento correcto ──
test("id válido: devuelve el Property real del catálogo del provider activo", async () => {
  const result = await resolvePropertyDetail("mock-001");

  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.property.name, "Hotel Central Madrid");
  assert.equal(result.property.providerPropertyId, "mock-001");
});

// ── 2. id inexistente: not_found (se traduce a notFound() en la página) ──
test("id inexistente: not_found, no lanza ni crashea", async () => {
  const result = await resolvePropertyDetail("does-not-exist");

  assert.equal(result.status, "not_found");
});

// ── id vacío/con caracteres extraños: mismo tratamiento, sin crash ──
test("id vacío o con caracteres inesperados: not_found, sin excepción no controlada", async () => {
  const empty = await resolvePropertyDetail("");
  assert.equal(empty.status, "not_found");

  const weird = await resolvePropertyDetail("../../etc/passwd");
  assert.equal(weird.status, "not_found");
});

// ── 3. Error del provider: mapeado a un resultado controlado y distinguible ──
test("classifyDetailError: ProviderUnavailableError se interpreta como not_found", () => {
  const result = classifyDetailError(
    new ProviderUnavailableError("El alojamiento no existe."),
  );
  assert.deepEqual(result, { status: "not_found" });
});

test("classifyDetailError: ProviderError (fallo técnico) se interpreta como provider_error, no se oculta", () => {
  const result = classifyDetailError(new ProviderError("Fallo de red simulado."));
  assert.deepEqual(result, {
    status: "provider_error",
    message: "Fallo de red simulado.",
  });
});

test("classifyDetailError: un error que no es del modelo de F4-03 se relanza, nunca se convierte en éxito", () => {
  assert.throws(() => classifyDetailError(new Error("inesperado")), /inesperado/);
});

// ── 4. La página utiliza getTravelProvider() y no importa MockHotelProvider ──
test("resolve.ts no importa MockHotelProvider directamente; usa getTravelProvider() del adapter", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/properties/[id]/resolve.ts"),
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
});

// ── F5-05: hotel_viewed conectado únicamente en el camino "found" ──
//
// Igual que en actions.test.ts: el comportamiento real de escritura solo
// es observable dentro de una petición real de Next.js (`next/headers`).
// Esta prueba comprueba la conexión estructural: `hotel_viewed` se
// registra después de un `getDetails()` exitoso y antes del `return
// found`, nunca dentro de `classifyDetailError` (that covers not_found y
// provider_error).
test("resolve.ts registra hotel_viewed solo tras un getDetails() exitoso, nunca en not_found/provider_error", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/properties/[id]/resolve.ts"),
    "utf-8",
  );

  const getDetailsIndex = source.indexOf("provider.getDetails(id)");
  const viewedIndex = source.indexOf('logAnalyticsEvent("hotel_viewed"');
  const foundReturnIndex = source.indexOf('return { status: "found"');
  const classifyFnIndex = source.indexOf("export function classifyDetailError");

  assert.ok(viewedIndex > -1, 'falta logAnalyticsEvent("hotel_viewed", ...)');
  assert.ok(
    getDetailsIndex > -1 && getDetailsIndex < viewedIndex && viewedIndex < foundReturnIndex,
    "hotel_viewed debe registrarse entre provider.getDetails(id) y el return found",
  );
  assert.ok(
    viewedIndex > classifyFnIndex,
    "hotel_viewed no debe estar dentro de classifyDetailError (not_found/provider_error)",
  );
});

// ── 5. Los datos mostrados corresponden al Property real devuelto por el provider ──
test("Property devuelto coincide exactamente con el catálogo (ciudad, país, valoración)", async () => {
  const result = await resolvePropertyDetail("mock-003");

  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.property.city, "Sevilla");
  assert.equal(result.property.country, "España");
  assert.equal(result.property.rating, 4.6);
});

// ── 6. Un id existente sin campos opcionales no rompería la resolución (contrato) ──
// El catálogo actual del mock siempre informa city/country/rating/mainPhotoUrl
// para sus 4 propiedades, así que no hay ningún id real del catálogo con un
// campo opcional ausente contra el que probar esto de extremo a extremo. Lo
// que sí depende de esta fase (que la página no se rompa si faltase un campo
// opcional) se prueba directamente sobre `formatLocation`/`formatRating` en
// app/search/results/format.test.ts (F5-03) — reutilizados aquí sin
// duplicarlos, ver page.tsx.

// ══════════════════════════════════════════════════════════════════════
// F5-07 (VIAO_ROADMAP.md) — search_id como input externo no confiable.
// ══════════════════════════════════════════════════════════════════════

// ── isValidUuid: formato, no existencia (no se consulta searches) ──
test("isValidUuid: acepta el formato estándar 8-4-4-4-12 hex, en mayúsculas o minúsculas", () => {
  assert.equal(isValidUuid(VALID_UUID), true);
  assert.equal(isValidUuid(VALID_UUID.toUpperCase()), true);
});

test("isValidUuid: rechaza 'basura' y otros valores mal formados, sin lanzar", () => {
  assert.equal(isValidUuid("basura"), false);
  assert.equal(isValidUuid(""), false);
  assert.equal(isValidUuid("11111111-2222-3333-4444-55555555555"), false); // un carácter de menos
  assert.equal(isValidUuid("mock-001"), false);
});

// ── E/F. El detalle recibe correctamente el search_id; sin él, sigue funcionando ──
test("resolvePropertyDetail: sin search_id (visita directa), searchId queda undefined y el detalle funciona igual que F5-04", async () => {
  const result = await resolvePropertyDetail("mock-001");

  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.searchId, undefined);
  assert.equal(result.property.name, "Hotel Central Madrid");
});

test("resolvePropertyDetail: con search_id válido, se conserva tal cual en el resultado", async () => {
  const result = await resolvePropertyDetail("mock-001", VALID_UUID);

  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.searchId, VALID_UUID);
});

// ── G. search_id con formato inválido no rompe el detalle: se trata como ausencia ──
test("resolvePropertyDetail: search_id con formato inválido se ignora (tratado como ausencia), sin crash", async () => {
  const result = await resolvePropertyDetail("mock-001", "basura");

  assert.equal(result.status, "found");
  if (result.status !== "found") return;
  assert.equal(result.searchId, undefined);
});

// ── H. Compatibilidad con F5-04: id inexistente sigue siendo 404, con o sin search_id ──
test("resolvePropertyDetail: id inexistente sigue siendo not_found incluso con un search_id válido", async () => {
  const result = await resolvePropertyDetail("does-not-exist", VALID_UUID);

  assert.equal(result.status, "not_found");
});

// ── hotel_viewed incorpora search_id a la metadata solo cuando es válido (VIAO_DATABASE.md sección 12 ya prevé search_id en metadata) ──
test("resolve.ts añade searchId a la metadata de hotel_viewed solo cuando hay un search_id válido, sin duplicar la llamada", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/properties/[id]/resolve.ts"),
    "utf-8",
  );

  const viewedCalls = source.match(/logAnalyticsEvent\("hotel_viewed"/g) ?? [];
  assert.equal(
    viewedCalls.length,
    1,
    "debe existir una única llamada a logAnalyticsEvent(\"hotel_viewed\", ...) — F5-07 no debe duplicarla",
  );

  const viewedCallIndex = source.indexOf('logAnalyticsEvent("hotel_viewed"');
  const nextClosingParenIndex = source.indexOf("});", viewedCallIndex);
  const callBody = source.slice(viewedCallIndex, nextClosingParenIndex);
  assert.ok(
    /searchId/.test(callBody),
    "la llamada a hotel_viewed debe incorporar searchId a la metadata (F5-07)",
  );
});

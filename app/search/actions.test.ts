// F5-02 (VIAO_ROADMAP.md) — Tests de la Server Action de búsqueda.
//
// Mismo motivo que F4-03/F4-04/F4-05/F4-06 para no instalar Jest/Vitest
// (framework de testing "no fijado todavía", VIAO_ARCHITECTURE.md sección
// 34): se usa `node:test`. Mismo motivo para compilar a un directorio
// temporal antes de ejecutar (imports relativos reales en tiempo de
// ejecución, incompatibles con la resolución ESM estricta de Node bajo el
// `tsconfig.json` del proyecto en modo `bundler`, sin tocarlo). Por eso
// `actions.ts` usa imports relativos en vez del alias `@/`: `tsc --module
// commonjs` no reescribe alias de `paths` en el `require()` emitido — ver
// el comando exacto en el reporte de la fase.
//
// F5-03: `searchAction` ahora compone precio por resultado (ver nota en
// actions.ts) — los tests existentes de F5-02 se extendieron para
// cubrirlo, sin quitar ninguna cobertura previa.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";

import { searchAction } from "./actions";
import type { SearchParams } from "../../types/travel";

const VALID_SEARCH: SearchParams = {
  destination: "Madrid",
  checkIn: "2026-10-01",
  checkOut: "2026-10-04",
  guests: 2,
  rooms: 1,
};

// ── 1. Búsqueda válida contra MockHotelProvider ──
test("búsqueda válida: devuelve resultados normalizados desde el provider activo", async () => {
  const result = await searchAction(VALID_SEARCH);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.ok(result.results.length > 0);
  assert.ok(result.results.some((property) => property.name === "Hotel Central Madrid"));
});

// ── F5-03: cada resultado trae precio compuesto (mock-001, 3 noches, 1 habitación) ──
test("búsqueda válida: cada resultado incluye el precio de esa búsqueda concreta (getPrice compuesto por F5-03)", async () => {
  const result = await searchAction(VALID_SEARCH);

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  const madrid = result.results.find((property) => property.providerPropertyId === "mock-001");
  assert.ok(madrid);
  assert.deepEqual(madrid.price, { amount: 90 * 3 * 1, currency: "EUR" });
});

// ── 2. Búsqueda sin resultados ──
test("búsqueda sin resultados: input válido pero sin coincidencias en el catálogo devuelve success con lista vacía", async () => {
  const result = await searchAction({ ...VALID_SEARCH, destination: "Narnia" });

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.deepEqual(result.results, []);
});

// ── 3. destino inválido rechazado server-side ──
test("destino vacío: rechazado server-side aunque el tipo declarado sea string", async () => {
  const result = await searchAction({ ...VALID_SEARCH, destination: "   " });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.destination);
});

// ── checkIn / checkOut obligatorios ──
test("checkIn vacío: rechazado server-side", async () => {
  const result = await searchAction({ ...VALID_SEARCH, checkIn: "" });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.checkIn);
});

test("checkOut vacío: rechazado server-side", async () => {
  const result = await searchAction({ ...VALID_SEARCH, checkOut: "" });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.checkOut);
});

// ── 4. checkOut <= checkIn rechazado ──
test("checkOut anterior a checkIn: rechazado server-side", async () => {
  const result = await searchAction({
    ...VALID_SEARCH,
    checkIn: "2026-10-04",
    checkOut: "2026-10-01",
  });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.checkOut);
});

test("checkOut igual a checkIn (límite): rechazado server-side, igual que la CHECK constraint estricta de searches", async () => {
  const result = await searchAction({
    ...VALID_SEARCH,
    checkIn: "2026-10-01",
    checkOut: "2026-10-01",
  });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.checkOut);
});

// ── 5. guests <= 0 rechazado ──
test("guests = 0: rechazado server-side aunque el formulario cliente ya lo hubiera dejado pasar", async () => {
  const result = await searchAction({ ...VALID_SEARCH, guests: 0 });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.guests);
});

// ── 6. rooms <= 0 rechazado ──
test("rooms = 0: rechazado server-side", async () => {
  const result = await searchAction({ ...VALID_SEARCH, rooms: 0 });

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.rooms);
});

// ── No confiar en el cliente: payload con tipos que no cumplen el contrato ──
test("payload con tipos inesperados en runtime (no solo fuera de rango): rechazado, no crashea", async () => {
  const malformed = {
    ...VALID_SEARCH,
    guests: "2" as unknown as number,
  };

  const result = await searchAction(malformed);

  assert.equal(result.status, "invalid_input");
  if (result.status !== "invalid_input") return;
  assert.ok(result.fieldErrors.guests);
});

// ── Error del provider: no se oculta ni se convierte en éxito ──
test("fechas no parseables: pasan la validación de forma (no vacías, orden lexicográfico correcto) pero el provider las rechaza como fecha inválida — provider_error, nunca success", async () => {
  const result = await searchAction({
    ...VALID_SEARCH,
    checkIn: "aaaa",
    checkOut: "bbbb",
  });

  assert.equal(result.status, "provider_error");
  if (result.status !== "provider_error") return;
  assert.ok(result.message.length > 0);
});

// ── 7. La Action usa el provider activo (adapter F4-05), no el mock directamente ──
test("actions.ts no importa MockHotelProvider directamente; pasa por getTravelProvider() del adapter", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/search/actions.ts"),
    "utf-8",
  );

  assert.ok(
    !/mock-provider/i.test(source),
    "actions.ts no debe referenciar mock-provider.ts directamente",
  );
  assert.ok(
    /getTravelProvider/.test(source),
    "actions.ts debe obtener el provider mediante getTravelProvider() (F4-05)",
  );
});

// ── F5-05: search_started/search_completed conectados en los puntos correctos ──
//
// El comportamiento real (se registra o no, con qué metadata) solo es
// observable dentro de una petición real de Next.js, porque
// `logAnalyticsEvent` depende de `next/headers` (ver
// lib/supabase/service.test.ts para la parte que SÍ es ejercitable aquí:
// que el cliente de servicio puede escribir en `analytics_events` y que el
// cliente anon no puede). Esta prueba comprueba la conexión estructural:
// `search_started` antes de llamar al provider, `search_completed` solo
// dentro del bloque de éxito (nunca en el catch de provider_error).
test("actions.ts registra search_started antes de provider.search() y search_completed solo en el camino de éxito", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/search/actions.ts"),
    "utf-8",
  );

  const startedIndex = source.indexOf('logAnalyticsEvent("search_started"');
  const providerSearchIndex = source.indexOf("provider.search(validatedParams)");
  const completedIndex = source.indexOf('logAnalyticsEvent("search_completed"');
  const successReturnIndex = source.indexOf('return { status: "success"');
  const catchIndex = source.indexOf("} catch (error) {");

  assert.ok(startedIndex > -1, 'falta logAnalyticsEvent("search_started", ...)');
  assert.ok(completedIndex > -1, 'falta logAnalyticsEvent("search_completed", ...)');
  assert.ok(
    startedIndex < providerSearchIndex,
    "search_started debe registrarse antes de llamar a provider.search()",
  );
  assert.ok(
    providerSearchIndex < completedIndex && completedIndex < successReturnIndex,
    "search_completed debe registrarse después de provider.search() y antes de devolver éxito",
  );
  assert.ok(
    completedIndex < catchIndex,
    "search_completed no debe estar dentro del catch (provider_error)",
  );
});

// ── F5-06: searches se crea solo en el camino de éxito, con resultsCount ya conocido ──
//
// El comportamiento real (se crea o no la fila, con qué datos) solo es
// observable dentro de una petición real de Next.js (createSearchRecord
// depende de next/headers) — ver lib/searches/create-search-record.test.ts
// para la parte de seguridad/RLS que sí es ejercitable aquí, y el reporte
// de la fase para la verificación E2E real. Esta prueba comprueba la
// conexión estructural: createSearchRecord se llama después de
// provider.search() (con resultsCount = properties.length — FPR-HOTELS-03,
// ver nota abajo) y antes del return de éxito — nunca en invalid_input ni
// en el catch de provider_error, así que ninguno de esos dos casos puede
// crear una fila.
test("actions.ts crea el registro de searches solo en el camino de éxito, después de conocer resultsCount", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/search/actions.ts"),
    "utf-8",
  );

  const invalidInputReturnIndex = source.indexOf('return { status: "invalid_input"');
  const providerSearchIndex = source.indexOf("provider.search(validatedParams)");
  const createSearchIndex = source.indexOf("createSearchRecord({");
  const resultsCountIndex = source.indexOf("resultsCount: properties.length,");
  const successReturnIndex = source.lastIndexOf('return { status: "success"');
  const catchIndex = source.indexOf("} catch (error) {");

  assert.ok(createSearchIndex > -1, "falta la llamada a createSearchRecord({ ... })");
  assert.ok(
    invalidInputReturnIndex > -1 && invalidInputReturnIndex < providerSearchIndex,
    "invalid_input debe resolverse (return temprano) antes de llegar a provider.search(), " +
      "de forma que ese camino nunca alcance la llamada a createSearchRecord",
  );
  assert.ok(
    providerSearchIndex < createSearchIndex && createSearchIndex < successReturnIndex,
    "createSearchRecord debe llamarse después de provider.search() y antes de devolver éxito",
  );
  assert.ok(
    createSearchIndex < catchIndex,
    "createSearchRecord no debe estar dentro del catch (provider_error)",
  );
  assert.ok(
    resultsCountIndex > -1 && resultsCountIndex < successReturnIndex,
    "createSearchRecord debe recibir resultsCount = properties.length (el total real del " +
      "provider, no el subconjunto limitado por MAX_PRICED_RESULTS)",
  );
});

// ── FPR-HOTELS-03: límite de resultados cotizados/mostrados ──
//
// Con destinationCode real, un destino puede devolver cientos de
// propiedades (Barcelona ~308) — sin límite, getPrice() (una llamada real
// de Availability a Hotelbeds por propiedad) se dispararía sin límite de
// concurrencia. MockHotelProvider solo tiene 4 propiedades fijas (ninguna
// búsqueda real dispara el límite en test), así que esto se verifica
// estructuralmente, igual que search_started/search_completed arriba.
test("actions.ts limita properties.slice(0, MAX_PRICED_RESULTS) antes de cotizar/devolver resultados", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/search/actions.ts"),
    "utf-8",
  );

  const maxConstIndex = source.indexOf("const MAX_PRICED_RESULTS");
  const providerSearchIndex = source.indexOf("provider.search(validatedParams)");
  const sliceIndex = source.indexOf("properties.slice(0, MAX_PRICED_RESULTS)");
  const getPriceIndex = source.indexOf("provider.getPrice(");

  assert.ok(maxConstIndex > -1, "falta la constante MAX_PRICED_RESULTS");
  assert.ok(
    sliceIndex > -1,
    "falta properties.slice(0, MAX_PRICED_RESULTS) antes de componer resultados",
  );
  assert.ok(
    providerSearchIndex < sliceIndex && sliceIndex < getPriceIndex,
    "el límite debe aplicarse después de provider.search() y antes de llamar a getPrice() por resultado",
  );
});

// ── FPR-HOTELS-03: getPrice() en lotes pequeños, no todo en paralelo ──
//
// Una prueba real contra Production (ver informe de la fase) demostró que
// pedir MAX_PRICED_RESULTS precios a la vez con Promise.all sin agrupar
// dispara HTTP 429/403 de Hotelbeds bajo carga. Se verifica
// estructuralmente que existe PRICE_BATCH_SIZE y que el bucle de
// getPrice() está dentro de un `for` que avanza por lotes (`i +=
// PRICE_BATCH_SIZE`), no en un único Promise.all sobre todo
// propertiesToPrice.
test("actions.ts pide precios en lotes de PRICE_BATCH_SIZE, no todos en paralelo a la vez", () => {
  const source = readFileSync(
    path.join(process.cwd(), "app/search/actions.ts"),
    "utf-8",
  );

  const batchConstIndex = source.indexOf("const PRICE_BATCH_SIZE");
  const forLoopIndex = source.indexOf("i += PRICE_BATCH_SIZE");
  const getPriceIndex = source.indexOf("provider.getPrice(");

  assert.ok(batchConstIndex > -1, "falta la constante PRICE_BATCH_SIZE");
  assert.ok(
    forLoopIndex > -1,
    "falta el bucle por lotes (i += PRICE_BATCH_SIZE) que agrupa las llamadas a getPrice()",
  );
  assert.ok(
    forLoopIndex < getPriceIndex,
    "getPrice() debe llamarse dentro del bucle por lotes, no en un único Promise.all sin agrupar",
  );
});

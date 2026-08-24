// Hotelbeds — tests de sync-destinations.ts. `transport`/`upsert` FALSOS
// inyectados (nunca red real ni Supabase real) — mismo criterio que
// sync-content.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import { syncHotelbedsDestinations } from "./sync-destinations";
import type { HotelbedsDestinationsResponse } from "./destinations";
import type { HotelbedsContentHttpResult } from "./content-http";
import type { HotelbedsDestination } from "./destinations-mappers";

function fakeTransport(
  pages: HotelbedsContentHttpResult<HotelbedsDestinationsResponse>[],
): (path: string) => Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>> {
  let call = 0;
  return async () => {
    const page = pages[Math.min(call, pages.length - 1)];
    call += 1;
    return page;
  };
}

function fakeUpsert(): {
  upsert: (providerName: string, destination: HotelbedsDestination) => Promise<string>;
  calls: { providerName: string; destination: HotelbedsDestination }[];
} {
  const calls: { providerName: string; destination: HotelbedsDestination }[] = [];
  return {
    calls,
    upsert: async (providerName, destination) => {
      calls.push({ providerName, destination });
      return `row-${destination.code}`;
    },
  };
}

test("syncHotelbedsDestinations: una sola página (total <= pageSize) sincroniza todos los destinos correctamente", async () => {
  const { upsert, calls } = fakeUpsert();
  const transport = fakeTransport([
    {
      outcome: "success",
      httpStatus: 200,
      body: {
        total: 2,
        destinations: [
          { code: "BCN", countryCode: "ES", name: { content: "Barcelona" } },
          { code: "MAD", countryCode: "ES", name: { content: "Madrid" } },
        ],
      },
    },
  ]);

  const result = await syncHotelbedsDestinations(["ES"], { transport, upsert });

  assert.deepEqual(result, { status: "success", syncedCount: 2, skippedCount: 0 });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].providerName, "hotelbeds");
  assert.deepEqual(calls.map((c) => c.destination.code), ["BCN", "MAD"]);
});

test("syncHotelbedsDestinations: pagina correctamente cuando total > pageSize (varias llamadas al transport)", async () => {
  const { upsert, calls } = fakeUpsert();
  const capturedPaths: string[] = [];
  const transport = async (path: string): Promise<HotelbedsContentHttpResult<HotelbedsDestinationsResponse>> => {
    capturedPaths.push(path);
    if (capturedPaths.length === 1) {
      return { outcome: "success", httpStatus: 200, body: { total: 3, destinations: [{ code: "BCN", countryCode: "ES", name: { content: "Barcelona" } }, { code: "MAD", countryCode: "ES", name: { content: "Madrid" } }] } };
    }
    return { outcome: "success", httpStatus: 200, body: { total: 3, destinations: [{ code: "VLC", countryCode: "ES", name: { content: "Valencia" } }] } };
  };

  const result = await syncHotelbedsDestinations(["ES"], { transport, upsert, pageSize: 2 });

  assert.deepEqual(result, { status: "success", syncedCount: 3, skippedCount: 0 });
  assert.equal(capturedPaths.length, 2, "debe haber pedido 2 páginas (pageSize=2, total=3)");
  assert.match(capturedPaths[0], /from=1&to=2/);
  assert.match(capturedPaths[1], /from=3&to=4/);
  assert.deepEqual(calls.map((c) => c.destination.code), ["BCN", "MAD", "VLC"]);
});

test("syncHotelbedsDestinations: descarta en silencio filas incompletas (skippedCount), sin abortar el resto", async () => {
  const { upsert, calls } = fakeUpsert();
  const transport = fakeTransport([
    {
      outcome: "success",
      httpStatus: 200,
      body: {
        total: 2,
        destinations: [
          { code: "BCN", countryCode: "ES", name: { content: "Barcelona" } },
          { code: "SIN-NOMBRE", countryCode: "ES" },
        ],
      },
    },
  ]);

  const result = await syncHotelbedsDestinations(["ES"], { transport, upsert });

  assert.deepEqual(result, { status: "success", syncedCount: 1, skippedCount: 1 });
  assert.equal(calls.length, 1);
});

test("syncHotelbedsDestinations: propaga missing_credentials sin llamar a upsert", async () => {
  const { upsert, calls } = fakeUpsert();
  const transport = fakeTransport([{ outcome: "missing_credentials", message: "HOTELBEDS_API_KEY no está configurada." }]);

  const result = await syncHotelbedsDestinations(["ES"], { transport, upsert });

  assert.deepEqual(result, { status: "missing_credentials", message: "HOTELBEDS_API_KEY no está configurada." });
  assert.equal(calls.length, 0);
});

test("syncHotelbedsDestinations: propaga http_error sin llamar a upsert", async () => {
  const { upsert, calls } = fakeUpsert();
  const transport = fakeTransport([{ outcome: "http_error", httpStatus: 400, body: { error: "INVALID_DATA" } }]);

  const result = await syncHotelbedsDestinations(["ES"], { transport, upsert });

  assert.equal(result.status, "http_error");
  assert.equal(calls.length, 0);
});

test("syncHotelbedsDestinations: propaga network_error sin llamar a upsert", async () => {
  const { upsert, calls } = fakeUpsert();
  const transport = fakeTransport([{ outcome: "network_error", message: "socket hang up" }]);

  const result = await syncHotelbedsDestinations(["ES"], { transport, upsert });

  assert.equal(result.status, "network_error");
  assert.equal(calls.length, 0);
});

test("syncHotelbedsDestinations: una página vacía corta la paginación sin bucle infinito", async () => {
  const { upsert, calls } = fakeUpsert();
  const transport = fakeTransport([
    { outcome: "success", httpStatus: 200, body: { total: 100, destinations: [] } },
  ]);

  const result = await syncHotelbedsDestinations(["ES"], { transport, upsert, pageSize: 1 });

  assert.deepEqual(result, { status: "success", syncedCount: 0, skippedCount: 0 });
  assert.equal(calls.length, 0);
});

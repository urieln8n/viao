// HotelbedsProvider — tests con fetchAvailability y destinationResolver
// FALSOS inyectados (nunca postHotelbeds/fetchHotelbedsAvailability
// reales) — ninguno de estos tests llama a Hotelbeds ni gasta cuota de
// sandbox, mismo criterio que el resto del proyecto.

import { test } from "node:test";
import assert from "node:assert/strict";

import type { HotelbedsAvailabilityRequest, HotelbedsAvailabilityResponse, HotelbedsRawHotel } from "../hotelbeds/availability";
import type { HotelbedsHttpResult } from "../hotelbeds/http";
import { ProviderError, ProviderUnavailableError } from "./errors";
import {
  HotelbedsProvider,
  UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER,
} from "./hotelbeds-provider";

function makeHotel(overrides: Partial<HotelbedsRawHotel> = {}): HotelbedsRawHotel {
  return {
    code: 12345,
    name: "Hotel de Prueba",
    destinationCode: "MAD",
    destinationName: "Madrid",
    latitude: "40.4168",
    longitude: "-3.7038",
    currency: "EUR",
    rooms: [{ code: "DBL.ST", name: "DOUBLE STANDARD", rates: [{ rateKey: "rk-1", net: "100.00" }] }],
    ...overrides,
  };
}

function fakeFetchAvailability(
  hotels: HotelbedsRawHotel[],
): (request: HotelbedsAvailabilityRequest) => Promise<HotelbedsHttpResult<HotelbedsAvailabilityResponse>> {
  return async () => ({ outcome: "success", httpStatus: 200, body: { hotels: { hotels: hotels.map((h) => ({ ...h })) } } });
}

const VALID_SEARCH_PARAMS = {
  destination: "Madrid",
  checkIn: "2026-09-01",
  checkOut: "2026-09-03",
  guests: 2,
  rooms: 1,
};

// ── UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER (comportamiento por defecto) ──

test("UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER: siempre devuelve undefined, cualquiera sea el destino", () => {
  assert.equal(UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER("Madrid"), undefined);
  assert.equal(UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER("cualquier cosa"), undefined);
});

// ── search() ──

test("search: sin destinationResolver (por defecto), lanza ProviderError explicando que la resolución destino->código está pendiente", async () => {
  const provider = new HotelbedsProvider();
  await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.match((error as Error).message, /Madrid/);
    assert.match((error as Error).message, /destino/i);
    return true;
  });
});

test("search: nunca inventa un código de destino aunque el nombre sea uno de los conocidos del Mock (Madrid/Barcelona/Sevilla/Valencia)", async () => {
  const provider = new HotelbedsProvider();
  for (const destination of ["Madrid", "Barcelona", "Sevilla", "Valencia"]) {
    await assert.rejects(() => provider.search({ ...VALID_SEARCH_PARAMS, destination }));
  }
});

test("search: con un destinationResolver inyectado que sí resuelve, mapea los hoteles devueltos a Property[]", async () => {
  const provider = new HotelbedsProvider({
    destinationResolver: (destination) => (destination === "Madrid" ? "MAD" : undefined),
    fetchAvailability: fakeFetchAvailability([makeHotel()]),
  });
  const results = await provider.search(VALID_SEARCH_PARAMS);
  assert.equal(results.length, 1);
  assert.equal(results[0].providerName, "hotelbeds");
  assert.equal(results[0].providerPropertyId, "12345");
});

test("search: fechas inválidas (checkOut <= checkIn) lanzan ProviderError antes de llamar al transport", async () => {
  let called = false;
  const provider = new HotelbedsProvider({
    destinationResolver: () => "MAD",
    fetchAvailability: async () => {
      called = true;
      return { outcome: "success", httpStatus: 200, body: { hotels: { hotels: [] } } };
    },
  });
  await assert.rejects(() =>
    provider.search({ ...VALID_SEARCH_PARAMS, checkIn: "2026-09-05", checkOut: "2026-09-01" }),
  );
  assert.equal(called, false);
});

// ── search() con fixedHotelCodes (bloque "conectar HotelbedsProvider de forma controlada") ──

test("search: con fixedHotelCodes, usa scope hotelCodes directamente y NO llama a destinationResolver", async () => {
  let resolverCalled = false;
  let capturedRequest: HotelbedsAvailabilityRequest | undefined;
  const provider = new HotelbedsProvider({
    destinationResolver: () => {
      resolverCalled = true;
      return "MAD";
    },
    fixedHotelCodes: [3424, 168],
    fetchAvailability: async (request) => {
      capturedRequest = request;
      return { outcome: "success", httpStatus: 200, body: { hotels: { hotels: [makeHotel({ code: 3424 }), makeHotel({ code: 168 })] } } };
    },
  });

  const results = await provider.search(VALID_SEARCH_PARAMS);

  assert.equal(resolverCalled, false);
  assert.deepEqual(capturedRequest?.scope, { type: "hotelCodes", codes: [3424, 168] });
  assert.equal(results.length, 2);
});

test("search: fixedHotelCodes vacío ([]) se trata como ausente — sigue intentando resolver destino", async () => {
  const provider = new HotelbedsProvider({
    fixedHotelCodes: [],
    fetchAvailability: async () => ({ outcome: "success", httpStatus: 200, body: { hotels: { hotels: [] } } }),
  });
  await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), ProviderError);
});

// ── checkAvailability() ──

test("checkAvailability: available=true cuando el hotel buscado aparece en la respuesta con tarifas", async () => {
  const provider = new HotelbedsProvider({ fetchAvailability: fakeFetchAvailability([makeHotel()]) });
  const result = await provider.checkAvailability({
    providerPropertyId: "12345",
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
    guests: 2,
    rooms: 1,
  });
  assert.deepEqual(result, { available: true });
});

test("checkAvailability: available=false cuando el hotel buscado no aparece en la respuesta", async () => {
  const provider = new HotelbedsProvider({ fetchAvailability: fakeFetchAvailability([]) });
  const result = await provider.checkAvailability({
    providerPropertyId: "12345",
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
    guests: 2,
    rooms: 1,
  });
  assert.deepEqual(result, { available: false });
});

test("checkAvailability: providerPropertyId no numérico lanza ProviderError", async () => {
  const provider = new HotelbedsProvider({ fetchAvailability: fakeFetchAvailability([]) });
  await assert.rejects(
    () =>
      provider.checkAvailability({
        providerPropertyId: "mock-001",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
        guests: 2,
        rooms: 1,
      }),
    ProviderError,
  );
});

// ── getDetails() ──

test("getDetails: no implementado todavía, lanza ProviderError con mensaje explícito sobre el Content API", async () => {
  const provider = new HotelbedsProvider();
  await assert.rejects(() => provider.getDetails("12345"), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.match((error as Error).message, /Content API/);
    return true;
  });
});

// ── getPrice() ──

test("getPrice: devuelve la tarifa más barata mapeada a PriceQuote", async () => {
  const provider = new HotelbedsProvider({ fetchAvailability: fakeFetchAvailability([makeHotel()]) });
  const quote = await provider.getPrice({
    providerPropertyId: "12345",
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
    guests: 2,
    rooms: 1,
  });
  assert.deepEqual(quote, { amount: 100, currency: "EUR" });
});

test("getPrice: hotel no encontrado en la respuesta lanza ProviderUnavailableError", async () => {
  const provider = new HotelbedsProvider({ fetchAvailability: fakeFetchAvailability([]) });
  await assert.rejects(
    () =>
      provider.getPrice({
        providerPropertyId: "12345",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
        guests: 2,
        rooms: 1,
      }),
    ProviderUnavailableError,
  );
});

test("getPrice: hotel encontrado pero sin currency lanza ProviderUnavailableError (nunca asume EUR)", async () => {
  const provider = new HotelbedsProvider({
    fetchAvailability: fakeFetchAvailability([makeHotel({ currency: undefined })]),
  });
  await assert.rejects(
    () =>
      provider.getPrice({
        providerPropertyId: "12345",
        checkIn: "2026-09-01",
        checkOut: "2026-09-03",
        guests: 2,
        rooms: 1,
      }),
    ProviderUnavailableError,
  );
});

// ── getConditions() ──

test("getConditions: mapea cancellationPolicy de la tarifa más barata del hotel encontrado", async () => {
  const provider = new HotelbedsProvider({
    fetchAvailability: fakeFetchAvailability([
      makeHotel({
        rooms: [
          {
            code: "DBL.ST",
            name: "DOUBLE STANDARD",
            rates: [{ rateKey: "rk-1", net: "100.00", cancellationPolicies: [{ amount: "50.00", from: "2026-08-30" }] }],
          },
        ],
      }),
    ]),
  });
  const conditions = await provider.getConditions({
    providerPropertyId: "12345",
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
  });
  assert.match(conditions.cancellationPolicy ?? "", /50\.00/);
});

test("getConditions: hotel no encontrado en la respuesta lanza ProviderUnavailableError", async () => {
  const provider = new HotelbedsProvider({ fetchAvailability: fakeFetchAvailability([]) });
  await assert.rejects(
    () => provider.getConditions({ providerPropertyId: "12345", checkIn: "2026-09-01", checkOut: "2026-09-03" }),
    ProviderUnavailableError,
  );
});

// ── errores de transporte (missing_credentials/missing_certificate/network_error/http_error) ──

test("requestHotels: cualquier outcome de error del transport se traduce a ProviderError (missing_credentials)", async () => {
  const provider = new HotelbedsProvider({
    destinationResolver: () => "MAD",
    fetchAvailability: async () => ({ outcome: "missing_credentials", message: "HOTELBEDS_API_KEY no está configurada." }),
  });
  await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), ProviderError);
});

test("requestHotels: http_error del transport se traduce a ProviderError con el status en el mensaje", async () => {
  const provider = new HotelbedsProvider({
    destinationResolver: () => "MAD",
    fetchAvailability: async () => ({ outcome: "http_error", httpStatus: 401, body: { error: "Request signature verification failed" } }),
  });
  await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.match((error as Error).message, /401/);
    return true;
  });
});

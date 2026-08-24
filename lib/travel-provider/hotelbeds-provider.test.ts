// HotelbedsProvider — tests con fetchAvailability y destinationResolver
// FALSOS inyectados (nunca postHotelbeds/fetchHotelbedsAvailability
// reales) — ninguno de estos tests llama a Hotelbeds ni gasta cuota de
// sandbox, mismo criterio que el resto del proyecto.

import { test } from "node:test";
import assert from "node:assert/strict";

import type { HotelbedsAvailabilityRequest, HotelbedsAvailabilityResponse, HotelbedsRawHotel } from "../hotelbeds/availability";
import type { HotelbedsHttpResult } from "../hotelbeds/http";
import type { CachedPropertyContent } from "../properties/get-cached-properties";
import type { ResolveBookableRateResult } from "../hotelbeds/resolve-booking-rate";
import type { HotelbedsBookingRQ } from "../hotelbeds/booking";
import type { HotelbedsBookingResponseEnvelope } from "../hotelbeds/book";
import type { HotelbedsCancellationResponseEnvelope } from "../hotelbeds/cancel";
import type { BookingRequest } from "../../types/travel";
import { ProviderAmbiguousError, ProviderError, ProviderUnavailableError } from "./errors";
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

test("UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER: siempre devuelve undefined, cualquiera sea el destino", async () => {
  assert.equal(await UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER("Madrid"), undefined);
  assert.equal(await UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER("cualquier cosa"), undefined);
});

// ── search() ──

// FPR-HOTELS-02: el resolver por defecto (`resolveHotelbedsDestinationCodeByName`)
// SÍ consulta Supabase real — por eso estos dos tests inyectan
// explícitamente `UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER` en vez de
// dejar el default implícito: mantiene la convención de este archivo
// ("ninguno de estos tests llama a Hotelbeds ni a Supabase") sin importar
// qué destinos haya sincronizados de verdad en el entorno donde corra la
// suite (p. ej. localmente, tras un sync real, "Madrid" SÍ resolvería con
// el default real). El resolver real ya tiene su propia cobertura
// dedicada en hotelbeds-destination-resolver.test.ts.

test("search: con un destinationResolver que no resuelve, lanza ProviderError explicando que la resolución destino->código está pendiente", async () => {
  const provider = new HotelbedsProvider({ destinationResolver: UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER });
  await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.match((error as Error).message, /Madrid/);
    assert.match((error as Error).message, /destino/i);
    return true;
  });
});

test("search: nunca inventa un código de destino aunque el nombre sea uno de los conocidos del Mock (Madrid/Barcelona/Sevilla/Valencia)", async () => {
  const provider = new HotelbedsProvider({ destinationResolver: UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER });
  for (const destination of ["Madrid", "Barcelona", "Sevilla", "Valencia"]) {
    await assert.rejects(() => provider.search({ ...VALID_SEARCH_PARAMS, destination }));
  }
});

test("search: con un destinationResolver inyectado que sí resuelve, mapea los hoteles devueltos a Property[]", async () => {
  const provider = new HotelbedsProvider({
    destinationResolver: async (destination) => (destination === "Madrid" ? "MAD" : undefined),
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
    destinationResolver: async () => "MAD",
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

// ── search() con destinationCode (FPR-HOTELS-02) ──

test("search: con destinationCode en SearchParams, lo usa DIRECTAMENTE y NO llama a destinationResolver", async () => {
  let resolverCalled = false;
  let capturedRequest: HotelbedsAvailabilityRequest | undefined;
  const provider = new HotelbedsProvider({
    destinationResolver: async () => {
      resolverCalled = true;
      return "MAD";
    },
    fetchAvailability: async (request) => {
      capturedRequest = request;
      return { outcome: "success", httpStatus: 200, body: { hotels: { hotels: [makeHotel()] } } };
    },
  });

  await provider.search({ ...VALID_SEARCH_PARAMS, destination: "Barcelona", destinationCode: "BCN" });

  assert.equal(resolverCalled, false, "con destinationCode ya resuelto, nunca debe volver a resolverse por nombre");
  assert.deepEqual(capturedRequest?.scope, { type: "destination", code: "BCN" });
});

test("search: sin destinationCode, cae al resolver por nombre (compatibilidad con búsquedas antiguas)", async () => {
  let capturedRequest: HotelbedsAvailabilityRequest | undefined;
  const provider = new HotelbedsProvider({
    destinationResolver: async (destination) => (destination === "Barcelona" ? "BCN" : undefined),
    fetchAvailability: async (request) => {
      capturedRequest = request;
      return { outcome: "success", httpStatus: 200, body: { hotels: { hotels: [makeHotel()] } } };
    },
  });

  await provider.search({ ...VALID_SEARCH_PARAMS, destination: "Barcelona" });

  assert.deepEqual(capturedRequest?.scope, { type: "destination", code: "BCN" });
});

test("search: destinationCode vacío se trata como ausente — sigue intentando resolver por nombre", async () => {
  let resolverCalled = false;
  const provider = new HotelbedsProvider({
    destinationResolver: async () => {
      resolverCalled = true;
      return "MAD";
    },
    fetchAvailability: fakeFetchAvailability([makeHotel()]),
  });

  await provider.search({ ...VALID_SEARCH_PARAMS, destinationCode: "" });

  assert.equal(resolverCalled, true);
});

// ── search() con fixedHotelCodes (bloque "conectar HotelbedsProvider de forma controlada") ──

test("search: con fixedHotelCodes, usa scope hotelCodes directamente y NO llama a destinationResolver", async () => {
  let resolverCalled = false;
  let capturedRequest: HotelbedsAvailabilityRequest | undefined;
  const provider = new HotelbedsProvider({
    destinationResolver: async () => {
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
    destinationResolver: UNRESOLVED_HOTELBEDS_DESTINATION_RESOLVER,
    fetchAvailability: async () => ({ outcome: "success", httpStatus: 200, body: { hotels: { hotels: [] } } }),
  });
  await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), ProviderError);
});

// ── search() con enriquecimiento de properties (FASE 2, bloque "Search ↔ properties") ──
// getCachedProperties inyectado (falso) en todos estos tests — nunca
// Supabase real, nunca Hotelbeds real, nunca Content API.

test("search: hotel 3424 (As Americas) recibe mainPhotoUrl de la caché de properties", async () => {
  let calls = 0;
  const provider = new HotelbedsProvider({
    fixedHotelCodes: [3424],
    fetchAvailability: fakeFetchAvailability([makeHotel({ code: 3424, name: "As Americas" })]),
    getCachedProperties: async (providerName, ids) => {
      calls += 1;
      assert.equal(providerName, "hotelbeds");
      assert.deepEqual(ids, ["3424"]);
      const cache = new Map<string, CachedPropertyContent>();
      cache.set("3424", {
        mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/003424/003424a_hb_a_009.jpg",
        country: "PT",
      });
      return cache;
    },
  });

  const [property] = await provider.search(VALID_SEARCH_PARAMS);

  assert.equal(calls, 1);
  assert.equal(property.mainPhotoUrl, "https://photos.hotelbeds.com/giata/bigger/00/003424/003424a_hb_a_009.jpg");
  assert.equal(property.country, "PT");
});

test("search: hotel 168 (Eurostars Marivent) recibe mainPhotoUrl de la caché de properties", async () => {
  const provider = new HotelbedsProvider({
    fixedHotelCodes: [168],
    fetchAvailability: fakeFetchAvailability([makeHotel({ code: 168, name: "Eurostars Marivent" })]),
    getCachedProperties: async () => {
      const cache = new Map<string, CachedPropertyContent>();
      cache.set("168", {
        mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/000168/000168a_hb_a_036.jpg",
        country: "ES",
      });
      return cache;
    },
  });

  const [property] = await provider.search(VALID_SEARCH_PARAMS);

  assert.equal(property.mainPhotoUrl, "https://photos.hotelbeds.com/giata/bigger/00/000168/000168a_hb_a_036.jpg");
  assert.equal(property.country, "ES");
});

test("search: un hotel sin fila en properties sigue apareciendo en los resultados, sin mainPhotoUrl (nunca se descarta)", async () => {
  const provider = new HotelbedsProvider({
    fixedHotelCodes: [3424, 168, 999],
    fetchAvailability: fakeFetchAvailability([
      makeHotel({ code: 3424 }),
      makeHotel({ code: 168 }),
      makeHotel({ code: 999, name: "Hotel Sin Cache" }),
    ]),
    getCachedProperties: async () => {
      const cache = new Map<string, CachedPropertyContent>();
      cache.set("3424", { mainPhotoUrl: "https://photos.hotelbeds.com/x/3424.jpg" });
      cache.set("168", { mainPhotoUrl: "https://photos.hotelbeds.com/x/168.jpg" });
      // 999 deliberadamente ausente de la caché.
      return cache;
    },
  });

  const results = await provider.search(VALID_SEARCH_PARAMS);

  assert.equal(results.length, 3, "los 3 hoteles de Availability deben seguir apareciendo, con o sin caché");
  const uncached = results.find((property) => property.providerPropertyId === "999");
  assert.equal(uncached?.name, "Hotel Sin Cache");
  assert.equal(uncached?.mainPhotoUrl, undefined);
});

test("search: varios resultados usan UNA sola llamada a getCachedProperties, nunca una por hotel (sin N+1)", async () => {
  let callCount = 0;
  let receivedIds: string[] = [];
  const provider = new HotelbedsProvider({
    fixedHotelCodes: [3424, 168],
    fetchAvailability: fakeFetchAvailability([makeHotel({ code: 3424 }), makeHotel({ code: 168 })]),
    getCachedProperties: async (_providerName, ids) => {
      callCount += 1;
      receivedIds = ids;
      return new Map<string, CachedPropertyContent>();
    },
  });

  const results = await provider.search(VALID_SEARCH_PARAMS);

  assert.equal(results.length, 2);
  assert.equal(callCount, 1, "getCachedProperties debe llamarse exactamente una vez por búsqueda, no una por hotel");
  assert.deepEqual(receivedIds.sort(), ["168", "3424"]);
});

test("search: los datos dinámicos de Availability (name/providerPropertyId) no son sobrescritos por la caché estática", async () => {
  const provider = new HotelbedsProvider({
    fixedHotelCodes: [3424],
    fetchAvailability: fakeFetchAvailability([makeHotel({ code: 3424, name: "Nombre real de Availability" })]),
    getCachedProperties: async () => {
      const cache = new Map<string, CachedPropertyContent>();
      // La caché nunca trae "name" (CachedPropertyContent no lo tiene) —
      // esto comprueba que mergePropertyWithCache no toca ese campo.
      cache.set("3424", { mainPhotoUrl: "https://photos.hotelbeds.com/x.jpg" });
      return cache;
    },
  });

  const [property] = await provider.search(VALID_SEARCH_PARAMS);

  assert.equal(property.name, "Nombre real de Availability");
  assert.equal(property.providerPropertyId, "3424");
});

test("search: si getCachedProperties devuelve Map vacío (p. ej. Supabase caído), Search sigue funcionando con los datos de Availability", async () => {
  const provider = new HotelbedsProvider({
    fixedHotelCodes: [3424],
    fetchAvailability: fakeFetchAvailability([makeHotel({ code: 3424, name: "As Americas" })]),
    getCachedProperties: async () => new Map<string, CachedPropertyContent>(),
  });

  const results = await provider.search(VALID_SEARCH_PARAMS);

  assert.equal(results.length, 1);
  assert.equal(results[0].name, "As Americas");
  assert.equal(results[0].mainPhotoUrl, undefined);
});

test("search: sin getCachedProperties inyectado, usa el real por defecto (no rompe la construcción del provider)", () => {
  const provider = new HotelbedsProvider({ fixedHotelCodes: [3424] });
  assert.ok(provider instanceof HotelbedsProvider);
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

// ── getDetails() (FASE 3, bloque "Property detail") ──
// getCachedProperties inyectado (falso) en todos estos tests — nunca
// Supabase real, nunca Hotelbeds real (ni Availability ni Content API):
// getDetails() no debe llamar a ninguna de las dos.

test("getDetails('3424'): con el hotel en caché, devuelve As Americas con su mainPhotoUrl real", async () => {
  const rawContent = { images: [{ path: "00/003424/003424a_hb_a_009.jpg", imageTypeCode: "GEN" }] };
  let capturedIds: string[] | undefined;
  const provider = new HotelbedsProvider({
    getCachedProperties: async (providerName, ids) => {
      capturedIds = ids;
      assert.equal(providerName, "hotelbeds");
      const cache = new Map<string, CachedPropertyContent>();
      cache.set("3424", {
        name: "As Americas",
        city: "AVEIRO",
        country: "PT",
        latitude: 40.6444523509645,
        longitude: -8.64594072098043,
        mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/003424/003424a_hb_a_009.jpg",
        raw: rawContent,
      });
      return cache;
    },
  });

  const property = await provider.getDetails("3424");

  assert.deepEqual(capturedIds, ["3424"]);
  assert.equal(property.providerName, "hotelbeds");
  assert.equal(property.providerPropertyId, "3424");
  assert.equal(property.name, "As Americas");
  assert.equal(property.city, "AVEIRO");
  assert.equal(property.country, "PT");
  assert.equal(property.mainPhotoUrl, "https://photos.hotelbeds.com/giata/bigger/00/003424/003424a_hb_a_009.jpg");
  assert.deepEqual(property.raw, rawContent, "raw debe conservar el raw_data completo de la caché");
});

test("getDetails('168'): con el hotel en caché, devuelve Eurostars Marivent con su mainPhotoUrl real", async () => {
  const provider = new HotelbedsProvider({
    getCachedProperties: async () => {
      const cache = new Map<string, CachedPropertyContent>();
      cache.set("168", {
        name: "Eurostars Marivent",
        city: "CALA MAYOR",
        country: "ES",
        latitude: 39.5526831653502,
        longitude: 2.61092998087406,
        mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/000168/000168a_hb_a_036.jpg",
      });
      return cache;
    },
  });

  const property = await provider.getDetails("168");

  assert.equal(property.name, "Eurostars Marivent");
  assert.equal(property.mainPhotoUrl, "https://photos.hotelbeds.com/giata/bigger/00/000168/000168a_hb_a_036.jpg");
});

test("getDetails: hotel inexistente/no sincronizado en la caché lanza ProviderUnavailableError, nunca inventa datos", async () => {
  const provider = new HotelbedsProvider({
    getCachedProperties: async () => new Map<string, CachedPropertyContent>(),
  });

  await assert.rejects(() => provider.getDetails("999999"), (error: unknown) => {
    assert.ok(error instanceof ProviderUnavailableError);
    assert.match((error as Error).message, /no está disponible en caché/);
    return true;
  });
});

test("getDetails: propertyId no numérico sigue rechazándose vía parseHotelCode, sin llegar a consultar la caché", async () => {
  let called = false;
  const provider = new HotelbedsProvider({
    getCachedProperties: async () => {
      called = true;
      return new Map<string, CachedPropertyContent>();
    },
  });

  await assert.rejects(() => provider.getDetails("mock-001"), ProviderError);
  assert.equal(called, false);
});

test("getDetails: getCachedProperties se llama exactamente una vez, con [propertyId]", async () => {
  let callCount = 0;
  const provider = new HotelbedsProvider({
    getCachedProperties: async (_providerName, ids) => {
      callCount += 1;
      assert.deepEqual(ids, ["3424"]);
      const cache = new Map<string, CachedPropertyContent>();
      cache.set("3424", { name: "As Americas" });
      return cache;
    },
  });

  await provider.getDetails("3424");

  assert.equal(callCount, 1);
});

test("getDetails: sin getCachedProperties inyectado, usa el real por defecto (no rompe la construcción del provider)", () => {
  const provider = new HotelbedsProvider();
  assert.ok(provider instanceof HotelbedsProvider);
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
    destinationResolver: async () => "MAD",
    fetchAvailability: async () => ({ outcome: "missing_credentials", message: "HOTELBEDS_API_KEY no está configurada." }),
  });
  await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), ProviderError);
});

test("requestHotels: http_error del transport se traduce a ProviderError con el status en el mensaje", async () => {
  const provider = new HotelbedsProvider({
    destinationResolver: async () => "MAD",
    fetchAvailability: async () => ({ outcome: "http_error", httpStatus: 401, body: { error: "Request signature verification failed" } }),
  });
  await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.match((error as Error).message, /401/);
    return true;
  });
});

// FPR-HOTELS-COMMERCIAL-01/02 — cierra el hueco de FPR-HOTELS-04: un
// http_error real (403/429/...) debe quedar registrado server-side, no
// solo convertido en ProviderError. console.error se intercepta aquí, no
// se deja escribir a stdout de verdad durante el test.
test("requestHotels: http_error del transport registra un log estructurado (endpoint=availability) antes de lanzar ProviderError", async () => {
  const provider = new HotelbedsProvider({
    destinationResolver: async () => "MAD",
    fetchAvailability: async () => ({ outcome: "http_error", httpStatus: 403, body: { error: "quota exceeded" } }),
  });
  const originalConsoleError = console.error;
  const logs: string[] = [];
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  try {
    await assert.rejects(() => provider.search(VALID_SEARCH_PARAMS), ProviderError);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(logs.length, 1);
  const parsed = JSON.parse(logs[0]);
  assert.equal(parsed.provider, "hotelbeds");
  assert.equal(parsed.endpoint, "availability");
  assert.equal(parsed.httpStatus, 403);
});

// ── book() (FPR-04.8/04.9) — resolveRate/fetchBooking FALSOS inyectados, nunca resolveBookableRate/fetchHotelbedsBooking reales. ──

const VALID_BOOKING_REQUEST: BookingRequest = {
  providerPropertyId: "12345",
  checkIn: "2026-09-01",
  checkOut: "2026-09-03",
  guests: 1,
  rooms: 1,
  holder: { name: "Juan", surname: "Perez" },
  paxes: [{ roomId: 1, type: "AD" }],
};

// FPR-04.9 — clientReference SIEMPRE llega como segundo argumento externo
// (nunca lo genera HotelbedsProvider): se usa el mismo valor fijo en todos
// los tests salvo los que prueban explícitamente su ausencia/paso exacto.
const VALID_CLIENT_REFERENCE = "test-client-ref-1";

function fakeResolveRate(
  result: ResolveBookableRateResult,
): (...args: unknown[]) => Promise<ResolveBookableRateResult> {
  return async () => result;
}

function fakeFetchBooking(
  outcome: HotelbedsHttpResult<HotelbedsBookingResponseEnvelope>,
): (bookingRQ: HotelbedsBookingRQ) => Promise<HotelbedsHttpResult<HotelbedsBookingResponseEnvelope>> {
  return async () => outcome;
}

test("book: fechas inválidas (checkOut <= checkIn) lanza ProviderError sin llamar a resolveRate", async () => {
  let resolveRateCalled = false;
  const provider = new HotelbedsProvider({
    resolveRate: async () => {
      resolveRateCalled = true;
      return { outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" };
    },
  });
  await assert.rejects(
    () =>
      provider.book(
        { ...VALID_BOOKING_REQUEST, checkIn: "2026-09-05", checkOut: "2026-09-01" },
        VALID_CLIENT_REFERENCE,
      ),
    ProviderError,
  );
  assert.equal(resolveRateCalled, false);
});

test("book: guests <= 0 lanza ProviderError sin llamar a resolveRate", async () => {
  let resolveRateCalled = false;
  const provider = new HotelbedsProvider({
    resolveRate: async () => {
      resolveRateCalled = true;
      return { outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" };
    },
  });
  await assert.rejects(
    () => provider.book({ ...VALID_BOOKING_REQUEST, guests: 0 }, VALID_CLIENT_REFERENCE),
    ProviderError,
  );
  assert.equal(resolveRateCalled, false);
});

test("book: rooms <= 0 lanza ProviderError sin llamar a resolveRate", async () => {
  let resolveRateCalled = false;
  const provider = new HotelbedsProvider({
    resolveRate: async () => {
      resolveRateCalled = true;
      return { outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" };
    },
  });
  await assert.rejects(
    () => provider.book({ ...VALID_BOOKING_REQUEST, rooms: 0 }, VALID_CLIENT_REFERENCE),
    ProviderError,
  );
  assert.equal(resolveRateCalled, false);
});

test("book: providerPropertyId no numérico lanza ProviderError sin llamar a resolveRate", async () => {
  let resolveRateCalled = false;
  const provider = new HotelbedsProvider({
    resolveRate: async () => {
      resolveRateCalled = true;
      return { outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" };
    },
  });
  await assert.rejects(
    () =>
      provider.book(
        { ...VALID_BOOKING_REQUEST, providerPropertyId: "no-es-un-codigo" },
        VALID_CLIENT_REFERENCE,
      ),
    ProviderError,
  );
  assert.equal(resolveRateCalled, false);
});

test("book: sin clientReference -> ProviderError, sin llamar a resolveRate (nunca genera uno internamente, FPR-04.9)", async () => {
  let resolveRateCalled = false;
  const provider = new HotelbedsProvider({
    resolveRate: async () => {
      resolveRateCalled = true;
      return { outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" };
    },
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.match((error as Error).message, /clientReference/);
    return true;
  });
  assert.equal(resolveRateCalled, false);
});

test("book: resolveRate se llama con exactamente los mismos checkIn/checkOut/guests/rooms/providerPropertyId de la request, sin transformarlos", async () => {
  let captured: unknown;
  const provider = new HotelbedsProvider({
    resolveRate: async (request) => {
      captured = request;
      return { outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" };
    },
    fetchBooking: fakeFetchBooking({ outcome: "success", httpStatus: 200, body: { booking: { status: "CONFIRMED" } } }),
  });
  await provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE);
  assert.deepEqual(captured, {
    providerPropertyId: "12345",
    checkIn: "2026-09-01",
    checkOut: "2026-09-03",
    guests: 1,
    rooms: 1,
  });
});

test("book: rateType BOOKABLE (Availability directa) — usa ESE rateKey al llamar a fetchBooking, exactamente una vez", async () => {
  let capturedRQ: HotelbedsBookingRQ | undefined;
  let callCount = 0;
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-bookable", rateType: "BOOKABLE" }),
    fetchBooking: async (bookingRQ) => {
      capturedRQ = bookingRQ;
      callCount += 1;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CONFIRMED" } } };
    },
  });
  await provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE);
  assert.equal(callCount, 1);
  assert.equal(capturedRQ?.rooms[0]?.rateKey, "rk-bookable");
});

test("book: rateType RECHECK ya resuelto por resolveRate (rateKey FINAL de CheckRates, distinto del original) — fetchBooking recibe ESE rateKey final", async () => {
  let capturedRQ: HotelbedsBookingRQ | undefined;
  const provider = new HotelbedsProvider({
    // resolveBookableRate (FPR-04.5) ya devuelve el rateKey FINAL tras
    // CheckRates cuando la tarifa original era RECHECK — book() no sabe
    // ni necesita saber que hubo un CheckRates de por medio.
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-final-tras-checkrate", rateType: "BOOKABLE" }),
    fetchBooking: async (bookingRQ) => {
      capturedRQ = bookingRQ;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CONFIRMED" } } };
    },
  });
  await provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE);
  assert.equal(capturedRQ?.rooms[0]?.rateKey, "rk-final-tras-checkrate");
});

test("book: resolveRate devuelve not_bookable_after_checkrate -> ProviderUnavailableError, fetchBooking NUNCA se llama", async () => {
  let fetchBookingCalled = false;
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({
      outcome: "not_bookable_after_checkrate",
      rateType: "RECHECK",
      message: "CheckRates devolvió rateType \"RECHECK\" — no reservable.",
    }),
    fetchBooking: async () => {
      fetchBookingCalled = true;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CONFIRMED" } } };
    },
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), ProviderUnavailableError);
  assert.equal(fetchBookingCalled, false);
});

test("book: resolveRate devuelve no_rate_found -> ProviderUnavailableError", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "no_rate_found", message: "Sin tarifas disponibles." }),
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), ProviderUnavailableError);
});

test("book: resolveRate devuelve un fallo técnico de Availability (availability_missing_credentials) -> ProviderError, fetchBooking NUNCA se llama", async () => {
  let fetchBookingCalled = false;
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "availability_missing_credentials", message: "Credenciales no disponibles." }),
    fetchBooking: async () => {
      fetchBookingCalled = true;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CONFIRMED" } } };
    },
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), ProviderError);
  assert.equal(fetchBookingCalled, false);
});

test("book: resolveRate devuelve un fallo técnico de CheckRates (checkrate_http_error) -> ProviderError con el status en el mensaje", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "checkrate_http_error", httpStatus: 500, body: { error: "internal" } }),
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.match((error as Error).message, /500/);
    return true;
  });
});

test("book: checkrate_http_error registra un log estructurado (endpoint=checkrate)", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "checkrate_http_error", httpStatus: 500, body: { error: "internal" } }),
  });
  const originalConsoleError = console.error;
  const logs: string[] = [];
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  try {
    await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), ProviderError);
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(logs.length, 1);
  const parsed = JSON.parse(logs[0]);
  assert.equal(parsed.endpoint, "checkrate");
  assert.equal(parsed.httpStatus, 500);
});

test("book: BookingRequest sin holder/paxes falla la validación del mapper -> ProviderError, fetchBooking NUNCA se llama", async () => {
  let fetchBookingCalled = false;
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: async () => {
      fetchBookingCalled = true;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CONFIRMED" } } };
    },
  });
  const withoutHolder: BookingRequest = { ...VALID_BOOKING_REQUEST, holder: undefined };
  await assert.rejects(() => provider.book(withoutHolder, VALID_CLIENT_REFERENCE), ProviderError);
  assert.equal(fetchBookingCalled, false);
});

test("book: el clientReference recibido como argumento llega EXACTAMENTE igual al bookingRQ.clientReference, sin regenerarlo ni truncarlo (FPR-04.9)", async () => {
  let capturedRQ: HotelbedsBookingRQ | undefined;
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: async (bookingRQ) => {
      capturedRQ = bookingRQ;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CONFIRMED" } } };
    },
  });
  await provider.book(VALID_BOOKING_REQUEST, "custom-clientref-01");
  assert.equal(capturedRQ?.clientReference, "custom-clientref-01");
});

test("book: éxito completo (CONFIRMED) -> BookingResult con status/providerBookingReference/providerCost/amount/currency correctos", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: fakeFetchBooking({
      outcome: "success",
      httpStatus: 200,
      body: { booking: { reference: "REF-123", cancellationReference: "CAN-123", status: "CONFIRMED", totalNet: "243.32", currency: "EUR" } },
    }),
  });
  const result = await provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE);
  assert.deepEqual(result, {
    status: "confirmed",
    providerBookingReference: "REF-123",
    providerCancellationReference: "CAN-123",
    providerCost: 243.32,
    amount: 243.32,
    currency: "EUR",
  });
});

test("book: éxito con status PRECONFIRMED -> BookingResult.status es \"pending\" (FPR-04.3)", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: fakeFetchBooking({
      outcome: "success",
      httpStatus: 200,
      body: { booking: { reference: "REF-123", status: "PRECONFIRMED", totalNet: "100.00", currency: "EUR" } },
    }),
  });
  const result = await provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE);
  assert.equal(result.status, "pending");
});

test("book: fetchBooking devuelve missing_certificate -> ProviderError (falla antes de enviar nada, nunca ambiguo)", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: fakeFetchBooking({ outcome: "missing_certificate", message: "Certificado cliente de Hotelbeds no disponible." }),
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.ok(!(error instanceof ProviderAmbiguousError));
    return true;
  });
});

test("book: fetchBooking devuelve http_error, registra un log estructurado (endpoint=booking) con correlationId=clientReference, y nunca imprime datos sensibles del holder", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: fakeFetchBooking({
      outcome: "http_error",
      httpStatus: 403,
      body: { error: "quota exceeded", holderName: "Juan" },
    }),
  });
  const originalConsoleError = console.error;
  const logs: string[] = [];
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  try {
    await assert.rejects(
      () => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE),
      ProviderError,
    );
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(logs.length, 1);
  const parsed = JSON.parse(logs[0]);
  assert.equal(parsed.endpoint, "booking");
  assert.equal(parsed.httpStatus, 403);
  assert.equal(parsed.correlationId, VALID_CLIENT_REFERENCE);
  assert.ok(!logs[0].includes("Juan"), "el log nunca debe contener el nombre del holder (VALID_BOOKING_REQUEST.holder.name)");
});

test("book: fetchBooking devuelve http_error -> ProviderError con el status en el mensaje (Hotelbeds SÍ respondió, rechazo claro)", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: fakeFetchBooking({ outcome: "http_error", httpStatus: 400, body: { error: "RATE_STALE" } }),
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.ok(!(error instanceof ProviderAmbiguousError));
    assert.match((error as Error).message, /400/);
    return true;
  });
});

test("book: fetchBooking devuelve network_error -> ProviderAmbiguousError (FPR-04.9, regla crítica: Hotelbeds pudo recibir la petición aunque se perdiera la respuesta)", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: fakeFetchBooking({ outcome: "network_error", message: "socket hang up" }),
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), ProviderAmbiguousError);
});

test("book: respuesta de fetchBooking sin campo booking -> ProviderAmbiguousError (respuesta 2xx no interpretable, nunca un rechazo claro)", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: fakeFetchBooking({ outcome: "success", httpStatus: 200, body: {} }),
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), ProviderAmbiguousError);
});

test("book: status de reserva no reconocido -> ProviderAmbiguousError (Hotelbeds respondió 2xx pero no se puede confirmar el resultado)", async () => {
  const provider = new HotelbedsProvider({
    resolveRate: fakeResolveRate({ outcome: "success", rateKey: "rk-1", rateType: "BOOKABLE" }),
    fetchBooking: fakeFetchBooking({ outcome: "success", httpStatus: 200, body: { booking: { status: "ALGO_NUNCA_VISTO" } } }),
  });
  await assert.rejects(() => provider.book(VALID_BOOKING_REQUEST, VALID_CLIENT_REFERENCE), ProviderAmbiguousError);
});

// ── cancelBooking() (FPR-04.11) — fetchCancellation FALSO inyectado, nunca fetchHotelbedsCancellation real. ──

function fakeFetchCancellation(
  outcome: HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>,
): (providerBookingReference: string) => Promise<HotelbedsHttpResult<HotelbedsCancellationResponseEnvelope>> {
  return async () => outcome;
}

test("cancelBooking: providerBookingReference vacío lanza ProviderError sin llamar a fetchCancellation", async () => {
  let called = false;
  const provider = new HotelbedsProvider({
    fetchCancellation: async () => {
      called = true;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CANCELLED" } } };
    },
  });
  await assert.rejects(() => provider.cancelBooking({ providerBookingReference: "" }), ProviderError);
  assert.equal(called, false);
});

test("cancelBooking: providerBookingReference solo espacios lanza ProviderError sin llamar a fetchCancellation", async () => {
  let called = false;
  const provider = new HotelbedsProvider({
    fetchCancellation: async () => {
      called = true;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CANCELLED" } } };
    },
  });
  await assert.rejects(() => provider.cancelBooking({ providerBookingReference: "   " }), ProviderError);
  assert.equal(called, false);
});

test("cancelBooking: se llama a fetchCancellation con el providerBookingReference exacto de la request, sin transformarlo", async () => {
  let captured: string | undefined;
  const provider = new HotelbedsProvider({
    fetchCancellation: async (providerBookingReference) => {
      captured = providerBookingReference;
      return { outcome: "success", httpStatus: 200, body: { booking: { status: "CANCELLED" } } };
    },
  });
  await provider.cancelBooking({ providerBookingReference: "1-3816248" });
  assert.equal(captured, "1-3816248");
});

test("cancelBooking: éxito completo (CANCELLED) -> CancellationResult con cancelled/cancellationReference/status/cancellationAmount correctos", async () => {
  const provider = new HotelbedsProvider({
    fetchCancellation: fakeFetchCancellation({
      outcome: "success",
      httpStatus: 200,
      body: { booking: { cancellationReference: "PPFPPJXXVZ", status: "CANCELLED", hotel: { cancellationAmount: 15 } } },
    }),
  });
  const result = await provider.cancelBooking({ providerBookingReference: "1-3816248" });
  assert.deepEqual(result, {
    cancelled: true,
    cancellationReference: "PPFPPJXXVZ",
    status: "cancelled",
    cancellationAmount: 15,
  });
});

test("cancelBooking: fetchCancellation devuelve missing_credentials -> ProviderError (falla antes de enviar nada, nunca ambiguo)", async () => {
  const provider = new HotelbedsProvider({
    fetchCancellation: fakeFetchCancellation({ outcome: "missing_credentials", message: "HOTELBEDS_API_KEY no está configurada." }),
  });
  await assert.rejects(() => provider.cancelBooking({ providerBookingReference: "1-3816248" }), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.ok(!(error instanceof ProviderAmbiguousError));
    return true;
  });
});

test("cancelBooking: fetchCancellation devuelve http_error -> ProviderError con el status en el mensaje (Hotelbeds SÍ respondió, rechazo claro)", async () => {
  const provider = new HotelbedsProvider({
    fetchCancellation: fakeFetchCancellation({ outcome: "http_error", httpStatus: 404, body: { error: "BOOKING_NOT_FOUND" } }),
  });
  await assert.rejects(() => provider.cancelBooking({ providerBookingReference: "does-not-exist" }), (error: unknown) => {
    assert.ok(error instanceof ProviderError);
    assert.ok(!(error instanceof ProviderAmbiguousError));
    assert.match((error as Error).message, /404/);
    return true;
  });
});

test("cancelBooking: http_error registra un log estructurado (endpoint=cancellation) con correlationId=providerBookingReference", async () => {
  const provider = new HotelbedsProvider({
    fetchCancellation: fakeFetchCancellation({ outcome: "http_error", httpStatus: 404, body: { error: "BOOKING_NOT_FOUND" } }),
  });
  const originalConsoleError = console.error;
  const logs: string[] = [];
  console.error = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  try {
    await assert.rejects(
      () => provider.cancelBooking({ providerBookingReference: "does-not-exist" }),
      ProviderError,
    );
  } finally {
    console.error = originalConsoleError;
  }
  assert.equal(logs.length, 1);
  const parsed = JSON.parse(logs[0]);
  assert.equal(parsed.endpoint, "cancellation");
  assert.equal(parsed.httpStatus, 404);
  assert.equal(parsed.correlationId, "does-not-exist");
});

test("cancelBooking: fetchCancellation devuelve network_error -> ProviderAmbiguousError (Hotelbeds pudo recibir la petición aunque se perdiera la respuesta)", async () => {
  const provider = new HotelbedsProvider({
    fetchCancellation: fakeFetchCancellation({ outcome: "network_error", message: "socket hang up" }),
  });
  await assert.rejects(() => provider.cancelBooking({ providerBookingReference: "1-3816248" }), ProviderAmbiguousError);
});

test("cancelBooking: respuesta sin campo booking -> ProviderAmbiguousError (respuesta 2xx no interpretable)", async () => {
  const provider = new HotelbedsProvider({
    fetchCancellation: fakeFetchCancellation({ outcome: "success", httpStatus: 200, body: {} }),
  });
  await assert.rejects(() => provider.cancelBooking({ providerBookingReference: "1-3816248" }), ProviderAmbiguousError);
});

test("cancelBooking: status no reconocido -> ProviderAmbiguousError", async () => {
  const provider = new HotelbedsProvider({
    fetchCancellation: fakeFetchCancellation({ outcome: "success", httpStatus: 200, body: { booking: { status: "ALGO_NUNCA_VISTO" } } }),
  });
  await assert.rejects(() => provider.cancelBooking({ providerBookingReference: "1-3816248" }), ProviderAmbiguousError);
});

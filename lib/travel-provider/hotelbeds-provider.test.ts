// HotelbedsProvider — tests con fetchAvailability y destinationResolver
// FALSOS inyectados (nunca postHotelbeds/fetchHotelbedsAvailability
// reales) — ninguno de estos tests llama a Hotelbeds ni gasta cuota de
// sandbox, mismo criterio que el resto del proyecto.

import { test } from "node:test";
import assert from "node:assert/strict";

import type { HotelbedsAvailabilityRequest, HotelbedsAvailabilityResponse, HotelbedsRawHotel } from "../hotelbeds/availability";
import type { HotelbedsHttpResult } from "../hotelbeds/http";
import type { CachedPropertyContent } from "../properties/get-cached-properties";
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

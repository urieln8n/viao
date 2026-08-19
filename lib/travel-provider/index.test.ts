// F4-05 (VIAO_ROADMAP.md) — Tests del adapter/selector del provider activo.
//
// Mismo motivo que F4-03/F4-04 para no instalar Jest/Vitest (framework de
// testing "no fijado todavía", VIAO_ARCHITECTURE.md sección 34): se usa
// `node:test`. Mismo motivo que F4-04 para compilar a un directorio
// temporal antes de ejecutar (imports relativos reales en tiempo de
// ejecución, incompatibles con la resolución ESM estricta de Node bajo el
// `tsconfig.json` del proyecto en modo `bundler`, sin tocarlo). Ver el
// comando exacto en el reporte de la fase.

import { test } from "node:test";
import assert from "node:assert/strict";

import { getFixedHotelbedsHotelCodes, getTravelProvider, resolveTravelProviderKind } from "./index";
import { MockHotelProvider } from "./mock-provider";
import type { ActiveTravelProvider } from "./index";
import type { Property, SearchParams } from "../../types/travel";

function withEnv(name: string, value: string | undefined, run: () => void) {
  const original = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    run();
  } finally {
    if (original === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original;
    }
  }
}

// ── resolveTravelProviderKind: fail-safe, solo "hotelbeds" exacto activa el camino no-mock ──

test('resolveTravelProviderKind: TRAVEL_PROVIDER ausente -> "mock"', () => {
  withEnv("TRAVEL_PROVIDER", undefined, () => {
    assert.equal(resolveTravelProviderKind(), "mock");
  });
});

test('resolveTravelProviderKind: TRAVEL_PROVIDER vacío -> "mock"', () => {
  withEnv("TRAVEL_PROVIDER", "", () => {
    assert.equal(resolveTravelProviderKind(), "mock");
  });
});

test('resolveTravelProviderKind: cualquier valor distinto de "hotelbeds" -> "mock" (mayúsculas incluidas, fail-safe)', () => {
  for (const value of ["Hotelbeds", "HOTELBEDS", "mock", "real", " hotelbeds", "hotelbeds "]) {
    withEnv("TRAVEL_PROVIDER", value, () => {
      assert.equal(resolveTravelProviderKind(), "mock", `se esperaba "mock" para ${JSON.stringify(value)}`);
    });
  }
});

test('resolveTravelProviderKind: TRAVEL_PROVIDER="hotelbeds" exacto -> "hotelbeds"', () => {
  withEnv("TRAVEL_PROVIDER", "hotelbeds", () => {
    assert.equal(resolveTravelProviderKind(), "hotelbeds");
  });
});

// ── getFixedHotelbedsHotelCodes: nunca inventa un código ──

test("getFixedHotelbedsHotelCodes: HOTELBEDS_FIXED_HOTEL_CODES ausente -> undefined", () => {
  withEnv("HOTELBEDS_FIXED_HOTEL_CODES", undefined, () => {
    assert.equal(getFixedHotelbedsHotelCodes(), undefined);
  });
});

test("getFixedHotelbedsHotelCodes: vacío o solo espacios -> undefined", () => {
  for (const value of ["", "   "]) {
    withEnv("HOTELBEDS_FIXED_HOTEL_CODES", value, () => {
      assert.equal(getFixedHotelbedsHotelCodes(), undefined, `se esperaba undefined para ${JSON.stringify(value)}`);
    });
  }
});

test("getFixedHotelbedsHotelCodes: \"3424,168\" -> [3424, 168] (los 2 códigos ya verificados con una petición real)", () => {
  withEnv("HOTELBEDS_FIXED_HOTEL_CODES", "3424,168", () => {
    assert.deepEqual(getFixedHotelbedsHotelCodes(), [3424, 168]);
  });
});

test("getFixedHotelbedsHotelCodes: admite espacios alrededor de cada código", () => {
  withEnv("HOTELBEDS_FIXED_HOTEL_CODES", " 3424 , 168 ", () => {
    assert.deepEqual(getFixedHotelbedsHotelCodes(), [3424, 168]);
  });
});

test("getFixedHotelbedsHotelCodes: descarta tokens no numéricos o no positivos, conserva el resto", () => {
  withEnv("HOTELBEDS_FIXED_HOTEL_CODES", "3424,abc,-5,0,168", () => {
    assert.deepEqual(getFixedHotelbedsHotelCodes(), [3424, 168]);
  });
});

test("getFixedHotelbedsHotelCodes: si NINGÚN token es válido, undefined (nunca un array vacío)", () => {
  withEnv("HOTELBEDS_FIXED_HOTEL_CODES", "abc,-5,0", () => {
    assert.equal(getFixedHotelbedsHotelCodes(), undefined);
  });
});

const VALID_SEARCH: SearchParams = {
  destination: "Madrid",
  checkIn: "2026-09-01",
  checkOut: "2026-09-04",
  guests: 2,
  rooms: 1,
};

test("getTravelProvider(): devuelve un provider funcional, respaldado hoy por MockHotelProvider", async () => {
  const provider = getTravelProvider();
  assert.ok(provider instanceof MockHotelProvider);

  const results = await provider.search(VALID_SEARCH);
  assert.ok(results.length > 0);
});

test("getTravelProvider(): siempre la misma instancia (singleton)", () => {
  assert.equal(getTravelProvider(), getTravelProvider());
});

// ── Prueba clave: el consumidor depende del contrato, no del mock ──
//
// Este "consumidor" es exactamente el tipo de código que vivirá en el
// resto de VIAO (Server Actions de Fase 5/6): solo conoce
// `ActiveTravelProvider` (el contrato re-exportado por el adapter), nunca
// `MockHotelProvider` ni ninguna otra clase concreta.
async function describeFirstResult(
  provider: ActiveTravelProvider,
  params: SearchParams,
): Promise<string | null> {
  const [first] = await provider.search(params);
  return first ? `${first.name} (${first.city ?? "?"})` : null;
}

// Implementación mínima ALTERNATIVA, deliberadamente distinta de
// MockHotelProvider (datos, capacidades y hasta el idioma de sus
// resultados difieren) — solo existe en este test, para demostrar que
// `describeFirstResult` funciona igual sin cambiar una sola línea.
class FakeSingleHotelProvider implements ActiveTravelProvider {
  private readonly property: Property = {
    providerName: "fake",
    providerPropertyId: "fake-1",
    name: "Fake Test Hotel",
    city: "Testville",
  };

  async search(): Promise<Property[]> {
    return [this.property];
  }
  async checkAvailability() {
    return { available: true };
  }
  async getDetails() {
    return this.property;
  }
  async getPrice() {
    return { amount: 1, currency: "EUR" };
  }
  async getConditions() {
    return {};
  }
  // Sin book/cancelBooking/getCommission: son opcionales en el contrato
  // (F4-01) — otra prueba de que una implementación distinta no necesita
  // replicar exactamente el mock para ser válida.
}

test("prueba clave: el mismo código consumidor funciona con MockHotelProvider y con una implementación alternativa mínima", async () => {
  const viaMock = await describeFirstResult(getTravelProvider(), VALID_SEARCH);
  assert.equal(viaMock, "Hotel Central Madrid (Madrid)");

  const viaFake = await describeFirstResult(
    new FakeSingleHotelProvider(),
    VALID_SEARCH,
  );
  assert.equal(viaFake, "Fake Test Hotel (Testville)");

  // Mismo consumidor, mismo tipo de parámetro, resultados distintos y
  // coherentes con cada implementación: la abstracción aísla realmente
  // al proveedor concreto.
  assert.notEqual(viaMock, viaFake);
});

test("prueba clave: cambiar de implementación no requiere que el consumidor conozca las capacidades opcionales ausentes", async () => {
  // Referenciado a través del contrato (no de la clase concreta): así es
  // exactamente como lo vería el código consumidor real.
  const fake: ActiveTravelProvider = new FakeSingleHotelProvider();
  assert.equal(fake.book, undefined);
  assert.equal(fake.cancelBooking, undefined);
  assert.equal(fake.getCommission, undefined);

  // El propio contrato (F4-01) ya expresa esto con `?`; el consumidor
  // solo necesita comprobar existencia antes de usarlas, nunca importar
  // la implementación concreta para saberlo.
  assert.equal(typeof fake.search, "function");
});

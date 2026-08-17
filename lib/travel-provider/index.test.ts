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

import { getTravelProvider } from "./index";
import { MockHotelProvider } from "./mock-provider";
import type { ActiveTravelProvider } from "./index";
import type { Property, SearchParams } from "../../types/travel";

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

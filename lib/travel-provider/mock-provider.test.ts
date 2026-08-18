// F4-04 (VIAO_ROADMAP.md) — Tests unitarios del contrato completo de
// MockHotelProvider.
//
// Mismo motivo que en F4-03 (VIAO_ARCHITECTURE.md sección 34: framework de
// testing "no fijado todavía"): se usa el runner integrado en Node
// (`node:test`), sin instalar Jest/Vitest.
//
// Este archivo importa `mock-provider.ts`, que a su vez importa
// `errors.ts` en tiempo de ejecución (para lanzar las excepciones) — a
// diferencia de F4-03, aquí SÍ hay una cadena real de imports relativos
// entre módulos TypeScript. La resolución de módulos ESM de Node exige
// extensión explícita en cada import relativo, y el `tsconfig.json` del
// proyecto (modo `bundler`, sin tocar) no permite escribirla en el
// código fuente. Por eso estos tests NO se ejecutan con
// `node --test` directamente sobre el `.ts`: se compilan primero a
// CommonJS en un directorio temporal (usando el propio `typescript` ya
// instalado, sin dependencias nuevas ni cambios de configuración) y
// después se ejecutan con el runner de Node sobre ese resultado, donde
// `require(...)` sí resuelve extensiones automáticamente.
//
// Comando exacto para ejecutar (ver también el reporte de la fase):
//   npx tsc lib/travel-provider/errors.ts lib/travel-provider/types.ts \
//     lib/travel-provider/mock-provider.ts \
//     lib/travel-provider/mock-provider.test.ts types/travel.ts \
//     --module commonjs --target es2020 --esModuleInterop --skipLibCheck \
//     --outDir <dir-temporal>
//   node --test <dir-temporal>/lib/travel-provider/mock-provider.test.js

import { test } from "node:test";
import assert from "node:assert/strict";

import { MockHotelProvider } from "./mock-provider";
import {
  ProviderError,
  ProviderNotSupportedError,
  ProviderUnavailableError,
} from "./errors";
import type { HotelProvider } from "./types";
import type { SearchParams } from "../../types/travel";

const VALID_STAY = {
  checkIn: "2026-09-01",
  checkOut: "2026-09-04",
  guests: 2,
  rooms: 1,
};

test("search: encuentra alojamientos por destino y devuelve lista vacía sin coincidencias", async () => {
  const provider = new MockHotelProvider();

  const madrid = await provider.search({
    destination: "Madrid",
    ...VALID_STAY,
  });
  assert.equal(madrid.length, 1);
  assert.equal(madrid[0]?.providerPropertyId, "mock-001");

  const none: SearchParams = { destination: "Nowhereland", ...VALID_STAY };
  const empty = await provider.search(none);
  assert.deepEqual(empty, []);
});

test("search: rechaza un rango de fechas inválido con ProviderError", async () => {
  const provider = new MockHotelProvider();
  await assert.rejects(
    () =>
      provider.search({
        destination: "Madrid",
        checkIn: "2026-09-04",
        checkOut: "2026-09-01",
        guests: 2,
        rooms: 1,
      }),
    ProviderError,
  );
});

test("checkAvailability: disponible dentro de la capacidad, no disponible si se piden más habitaciones de las que hay", async () => {
  const provider = new MockHotelProvider();

  const available = await provider.checkAvailability({
    providerPropertyId: "mock-003",
    ...VALID_STAY,
    rooms: 1,
  });
  assert.equal(available.available, true);

  const unavailable = await provider.checkAvailability({
    providerPropertyId: "mock-003",
    ...VALID_STAY,
    rooms: 2,
  });
  assert.equal(unavailable.available, false);
});

test("checkAvailability: alojamiento inexistente lanza ProviderUnavailableError", async () => {
  const provider = new MockHotelProvider();
  await assert.rejects(
    () =>
      provider.checkAvailability({
        providerPropertyId: "no-existe",
        ...VALID_STAY,
      }),
    ProviderUnavailableError,
  );
});

test("getDetails: devuelve el alojamiento encontrado en search() con el mismo id, y lanza si no existe", async () => {
  const provider = new MockHotelProvider();

  const [result] = await provider.search({
    destination: "Barcelona",
    ...VALID_STAY,
  });
  assert.ok(result);

  const details = await provider.getDetails(result.providerPropertyId);
  assert.equal(details.providerPropertyId, result.providerPropertyId);
  assert.equal(details.name, "Hostal Barceloneta");

  await assert.rejects(
    () => provider.getDetails("no-existe"),
    ProviderUnavailableError,
  );
});

test("getPrice: es determinista/reproducible para la misma consulta", async () => {
  const provider = new MockHotelProvider();
  const query = { providerPropertyId: "mock-001", ...VALID_STAY };

  const first = await provider.getPrice(query);
  const second = await provider.getPrice(query);

  assert.deepEqual(first, second);
  assert.equal(first.amount, 90 * 3 * 1); // 90€/noche * 3 noches * 1 habitación
  assert.equal(first.currency, "EUR");
});

// ── F14-01 (VIAO_ROADMAP.md): cierra el único hueco real detectado en la
// auditoría de cobertura del contrato — getPrice/getConditions ya se
// probaban para un alojamiento válido, pero no para uno inexistente
// (a diferencia de checkAvailability/getDetails, que sí lo hacían desde
// F4-04). Mismo comportamiento consistente en las 4 capacidades de
// solo-lectura del contrato: ProviderUnavailableError, nunca otro tipo
// de error ni un resultado inventado. ──
test("getPrice: alojamiento inexistente lanza ProviderUnavailableError (mismo contrato que checkAvailability/getDetails)", async () => {
  const provider = new MockHotelProvider();
  await assert.rejects(
    () => provider.getPrice({ providerPropertyId: "no-existe", ...VALID_STAY }),
    ProviderUnavailableError,
  );
});

test("getConditions: alojamiento inexistente lanza ProviderUnavailableError (mismo contrato que checkAvailability/getDetails)", async () => {
  const provider = new MockHotelProvider();
  await assert.rejects(
    () =>
      provider.getConditions({
        providerPropertyId: "no-existe",
        checkIn: VALID_STAY.checkIn,
        checkOut: VALID_STAY.checkOut,
      }),
    ProviderUnavailableError,
  );
});

test("getConditions: devuelve condiciones estables para un alojamiento válido", async () => {
  const provider = new MockHotelProvider();
  const conditions = await provider.getConditions({
    providerPropertyId: "mock-002",
    checkIn: VALID_STAY.checkIn,
    checkOut: VALID_STAY.checkOut,
  });
  assert.equal(conditions.cancellationPolicy, "No reembolsable.");
});

test("book + cancelBooking: ciclo completo coherente sobre el mismo alojamiento", async () => {
  const provider = new MockHotelProvider();

  const booking = await provider.book({
    providerPropertyId: "mock-002",
    ...VALID_STAY,
  });
  assert.equal(booking.status, "confirmed");
  assert.ok(booking.providerBookingReference);
  assert.equal(booking.amount, 65 * 3 * 1);
  assert.equal(booking.currency, "EUR");

  const cancellation = await provider.cancelBooking({
    providerBookingReference: booking.providerBookingReference,
  });
  assert.equal(cancellation.cancelled, true);
});

test("book: rechaza si no hay habitaciones suficientes, y cancelBooking rechaza una referencia desconocida", async () => {
  const provider = new MockHotelProvider();

  await assert.rejects(
    () =>
      provider.book({
        providerPropertyId: "mock-003",
        ...VALID_STAY,
        rooms: 2,
      }),
    ProviderUnavailableError,
  );

  await assert.rejects(
    () =>
      provider.cancelBooking({
        providerBookingReference: "referencia-inventada",
      }),
    ProviderUnavailableError,
  );
});

test("getCommission: determinista a partir del importe de una reserva real, y falla sin importe", async () => {
  const provider = new MockHotelProvider();
  const booking = await provider.book({
    providerPropertyId: "mock-001",
    ...VALID_STAY,
  });

  const commission = await provider.getCommission(booking);
  assert.equal(commission.providerCommission, booking.amount! * 0.1);
  assert.equal(commission.viaoRevenue, commission.providerCommission);
  assert.equal(commission.currency, "EUR");

  await assert.rejects(
    () => provider.getCommission({ status: "confirmed" }),
    ProviderError,
  );
});

test("ProviderNotSupportedError: patrón de detección de capacidad ausente en un provider parcial", async () => {
  // Provider mínimo que solo implementa las capacidades obligatorias
  // (F4-01), sin `cancelBooking`, para probar el patrón que usará el
  // resto de VIAO al consumir `HotelProvider` sin saber de antemano si el
  // proveedor activo soporta una capacidad opcional.
  const partialProvider: HotelProvider = {
    search: async () => [],
    checkAvailability: async () => ({ available: false }),
    getDetails: async () => ({}) as never,
    getPrice: async () => ({}) as never,
    getConditions: async () => ({}) as never,
  };

  assert.equal(partialProvider.cancelBooking, undefined);

  function cancelIfSupported(provider: HotelProvider) {
    if (!provider.cancelBooking) {
      throw new ProviderNotSupportedError("cancelBooking");
    }
  }

  assert.throws(
    () => cancelIfSupported(partialProvider),
    ProviderNotSupportedError,
  );

  const provider = new MockHotelProvider();
  assert.doesNotThrow(() => cancelIfSupported(provider));
});

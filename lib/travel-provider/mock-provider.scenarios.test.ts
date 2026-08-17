// F4-06 (VIAO_ROADMAP.md) — Escenarios de prueba de MockHotelProvider.
//
// Un test explícito por cada uno de los 7 escenarios exigidos por el
// roadmap, usando siempre datos fijos del catálogo (F4-04, extendido en
// esta fase con `mock-004` para el escenario de cambio de precio — ver
// mock-provider.ts). Nada de random, timing, red ni servicios externos:
// cada escenario se reproduce a partir de un id de propiedad conocido y
// una secuencia de llamadas determinista.
//
// Mismo motivo que F4-03/F4-04/F4-05 para no instalar Jest/Vitest (
// framework de testing "no fijado todavía", VIAO_ARCHITECTURE.md sección
// 34) y para compilar a un directorio temporal antes de ejecutar con
// `node --test` (ver el comando exacto en el reporte de la fase).

import { test } from "node:test";
import assert from "node:assert/strict";

import { MockHotelProvider } from "./mock-provider";
import { ProviderError, ProviderUnavailableError } from "./errors";

const STAY = {
  checkIn: "2026-10-01",
  checkOut: "2026-10-04", // 3 noches
  guests: 2,
  rooms: 1,
};

// ── 1. Alojamiento disponible ──
test("escenario: alojamiento disponible", async () => {
  const provider = new MockHotelProvider();

  const result = await provider.checkAvailability({
    providerPropertyId: "mock-001", // roomsAvailable: 5
    ...STAY,
    rooms: 1,
  });

  assert.equal(result.available, true);
});

// ── 2. Alojamiento no disponible ──
test("escenario: alojamiento no disponible (resultado observable)", async () => {
  const provider = new MockHotelProvider();

  const result = await provider.checkAvailability({
    providerPropertyId: "mock-003", // roomsAvailable: 1
    ...STAY,
    rooms: 2,
  });

  assert.equal(result.available, false);
});

test("escenario: alojamiento no disponible produce el error estructurado de F4-03 al intentar reservar", async () => {
  const provider = new MockHotelProvider();

  await assert.rejects(
    () =>
      provider.book({
        providerPropertyId: "mock-003", // roomsAvailable: 1
        ...STAY,
        rooms: 2,
      }),
    ProviderUnavailableError,
  );
});

// ── 3. Cambio de precio entre búsqueda y reserva ──
test("escenario: el precio observado en la búsqueda difiere del que recibe la reserva", async () => {
  const provider = new MockHotelProvider();
  const propertyId = "mock-004"; // priceDriftPerQuery: 20, basePricePerNight: 100

  // Fase de búsqueda: primera consulta de precio para este alojamiento.
  const priceDuringSearch = await provider.getPrice({
    providerPropertyId: propertyId,
    ...STAY,
  });

  // Fase de reserva, más tarde: la propia reserva vuelve a calcular el
  // precio internamente (mismo mecanismo que getPrice), y esta vez es la
  // segunda consulta para el mismo alojamiento.
  const booking = await provider.book({
    providerPropertyId: propertyId,
    ...STAY,
  });

  assert.equal(priceDuringSearch.amount, 100 * 3 * 1); // 300
  assert.equal(booking.amount, (100 + 20) * 3 * 1); // 360
  assert.notEqual(booking.amount, priceDuringSearch.amount);

  // Determinista y reproducible: repitiendo la misma secuencia con una
  // instancia nueva se obtiene exactamente el mismo par de importes.
  const providerAgain = new MockHotelProvider();
  const repeatSearch = await providerAgain.getPrice({
    providerPropertyId: propertyId,
    ...STAY,
  });
  const repeatBooking = await providerAgain.book({
    providerPropertyId: propertyId,
    ...STAY,
  });
  assert.equal(repeatSearch.amount, priceDuringSearch.amount);
  assert.equal(repeatBooking.amount, booking.amount);
});

// ── 4. Error del proveedor ──
test("escenario: error del proveedor (fallo técnico, no de disponibilidad)", async () => {
  const provider = new MockHotelProvider();

  await assert.rejects(
    () =>
      provider.getPrice({
        providerPropertyId: "mock-001",
        checkIn: "2026-10-04",
        checkOut: "2026-10-01", // rango de fechas inválido
        guests: 2,
        rooms: 1,
      }),
    ProviderError,
  );
});

// ── 5. Reserva exitosa ──
test("escenario: reserva exitosa", async () => {
  const provider = new MockHotelProvider();

  const booking = await provider.book({
    providerPropertyId: "mock-002",
    ...STAY,
  });

  assert.equal(booking.status, "confirmed");
  assert.ok(booking.providerBookingReference);
  assert.equal(booking.amount, 65 * 3 * 1);
});

// ── 6. Reserva fallida ──
test("escenario: reserva fallida por falta de disponibilidad", async () => {
  const provider = new MockHotelProvider();

  await assert.rejects(
    () =>
      provider.book({
        providerPropertyId: "mock-003", // roomsAvailable: 1
        ...STAY,
        rooms: 2,
      }),
    ProviderUnavailableError,
  );
});

test("escenario: reserva fallida por solicitud inválida (error del proveedor)", async () => {
  const provider = new MockHotelProvider();

  await assert.rejects(
    () =>
      provider.book({
        providerPropertyId: "mock-001",
        ...STAY,
        guests: 0, // inválido
      }),
    ProviderError,
  );
});

// ── 7. Cancelación (el contrato la contempla como capacidad opcional, F4-01) ──
test("escenario: cancelación válida sobre una reserva real", async () => {
  const provider = new MockHotelProvider();

  const booking = await provider.book({
    providerPropertyId: "mock-001",
    ...STAY,
  });

  assert.ok(provider.cancelBooking);
  const cancellation = await provider.cancelBooking({
    providerBookingReference: booking.providerBookingReference!,
  });

  assert.equal(cancellation.cancelled, true);
});

test("escenario: cancelación sobre una referencia desconocida produce el error estructurado de F4-03", async () => {
  const provider = new MockHotelProvider();

  await assert.rejects(
    () =>
      provider.cancelBooking!({
        providerBookingReference: "referencia-que-no-existe",
      }),
    ProviderUnavailableError,
  );
});

test("escenario: cancelar dos veces la misma reserva sigue siendo válido (idempotente)", async () => {
  const provider = new MockHotelProvider();

  const booking = await provider.book({
    providerPropertyId: "mock-002",
    ...STAY,
  });
  const reference = booking.providerBookingReference!;

  const first = await provider.cancelBooking!({
    providerBookingReference: reference,
  });
  const second = await provider.cancelBooking!({
    providerBookingReference: reference,
  });

  assert.equal(first.cancelled, true);
  assert.equal(second.cancelled, true);
});

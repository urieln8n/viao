// Bloque 22 ("Movilidad + recomendaciones del viaje") — tests de las
// funciones puras de nearby-hubs.ts. Sin red, sin Supabase: mismo
// criterio que mock-provider.test.ts.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  NEARBY_AIRPORTS,
  NEARBY_TRAIN_STATIONS,
  calculateDistanceKm,
  findNearestAirport,
  findNearestTrainStation,
} from "./nearby-hubs";

test("NEARBY_TRAIN_STATIONS y NEARBY_AIRPORTS cubren exactamente las 4 ciudades del MVP", () => {
  const expectedCities = ["Madrid", "Barcelona", "Sevilla", "Valencia"];
  assert.deepEqual(
    NEARBY_TRAIN_STATIONS.map((s) => s.city).sort(),
    [...expectedCities].sort(),
  );
  assert.deepEqual(
    NEARBY_AIRPORTS.map((a) => a.city).sort(),
    [...expectedCities].sort(),
  );
});

test("calculateDistanceKm: distancia de un punto a sí mismo es 0", () => {
  assert.equal(calculateDistanceKm(40.4168, -3.7038, 40.4168, -3.7038), 0);
});

test("calculateDistanceKm: Madrid (mock-001) a Madrid Atocha da un resultado real y razonable (~1-2 km)", () => {
  const station = findNearestTrainStation("Madrid")!;
  const distance = calculateDistanceKm(40.4168, -3.7038, station.latitude, station.longitude);
  assert.ok(distance > 0 && distance < 5, `distancia inesperada: ${distance}`);
});

test("calculateDistanceKm: es simétrica (A->B === B->A)", () => {
  const a = calculateDistanceKm(40.4168, -3.7038, 41.3809, 2.1901);
  const b = calculateDistanceKm(41.3809, 2.1901, 40.4168, -3.7038);
  assert.equal(a, b);
});

test("findNearestTrainStation: encuentra la estación de cada una de las 4 ciudades del MVP", () => {
  assert.equal(findNearestTrainStation("Madrid")?.name, "Madrid Atocha");
  assert.equal(findNearestTrainStation("Barcelona")?.name, "Barcelona Sants");
  assert.equal(findNearestTrainStation("Sevilla")?.name, "Sevilla Santa Justa");
  assert.equal(findNearestTrainStation("Valencia")?.name, "Valencia Joaquín Sorolla");
});

test("findNearestTrainStation: no distingue mayúsculas/minúsculas ni espacios sobrantes", () => {
  assert.equal(findNearestTrainStation("  madrid  ")?.name, "Madrid Atocha");
  assert.equal(findNearestTrainStation("BARCELONA")?.name, "Barcelona Sants");
});

test("findNearestTrainStation: ciudad fuera del catálogo del MVP devuelve undefined, nunca inventa un hub", () => {
  assert.equal(findNearestTrainStation("Roma"), undefined);
  assert.equal(findNearestTrainStation(""), undefined);
});

test("findNearestAirport: encuentra el aeropuerto de cada una de las 4 ciudades del MVP", () => {
  assert.equal(findNearestAirport("Madrid")?.name, "Adolfo Suárez Madrid-Barajas");
  assert.equal(findNearestAirport("Barcelona")?.name, "Josep Tarradellas Barcelona-El Prat");
  assert.equal(findNearestAirport("Sevilla")?.name, "Sevilla (San Pablo)");
  assert.equal(findNearestAirport("Valencia")?.name, "Valencia (Manises)");
});

test("findNearestAirport: ciudad fuera del catálogo del MVP devuelve undefined, nunca inventa un hub", () => {
  assert.equal(findNearestAirport("París"), undefined);
});

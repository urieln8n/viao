// F4-05 (VIAO_ROADMAP.md), bloque "conectar HotelbedsProvider de forma
// controlada" — test DELIBERADAMENTE aislado en su propio archivo.
//
// `getTravelProvider()` cachea su resultado una única vez por proceso
// (singleton). `node --test`, al recibir varios archivos, ejecuta cada
// uno en un proceso separado (ver scripts/run-tests.mjs) — así que
// mientras este sea el ÚNICO test de este archivo que llama a
// `getTravelProvider()`, el caché nunca se contamina con lo que hagan
// otros archivos (p. ej. lib/travel-provider/index.test.ts, que llama a
// `getTravelProvider()` sin ninguna variable de entorno puesta y espera
// Mock). Meter este test en index.test.ts habría creado una condición de
// carrera real entre tests: quien llame primero al singleton en ese
// proceso fija la implementación para el resto del archivo.
//
// No hace ninguna llamada real a Hotelbeds: construir `HotelbedsProvider`
// no dispara ninguna petición de red por sí solo (el constructor solo
// guarda dependencias) — solo se comprueba el tipo de la instancia
// devuelta.

import { test } from "node:test";
import assert from "node:assert/strict";

import { getTravelProvider } from "./index";
import { HotelbedsProvider } from "./hotelbeds-provider";

test("getTravelProvider(): con TRAVEL_PROVIDER=hotelbeds, devuelve una instancia de HotelbedsProvider (sin llamar a Hotelbeds)", () => {
  process.env.TRAVEL_PROVIDER = "hotelbeds";
  process.env.HOTELBEDS_FIXED_HOTEL_CODES = "3424,168";
  try {
    const provider = getTravelProvider();
    assert.ok(provider instanceof HotelbedsProvider);
  } finally {
    delete process.env.TRAVEL_PROVIDER;
    delete process.env.HOTELBEDS_FIXED_HOTEL_CODES;
  }
});

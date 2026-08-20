// Hotelbeds — tests puros de content-mappers.ts. Sin red, sin Supabase.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildHotelbedsPhotoUrl,
  mapHotelbedsContentHotelToProperty,
  selectMainGenImage,
} from "./content-mappers";
import type { HotelbedsContentImage, HotelbedsRawContentHotel } from "./content";

test("selectMainGenImage: elige la imagen GEN con menor visualOrder, ignora HAB/RES", () => {
  const images: HotelbedsContentImage[] = [
    { path: "hab-1.jpg", imageTypeCode: "HAB", visualOrder: 1 },
    { path: "gen-alto.jpg", imageTypeCode: "GEN", visualOrder: 33 },
    { path: "gen-bajo.jpg", imageTypeCode: "GEN", visualOrder: 22 },
    { path: "res-1.jpg", imageTypeCode: "RES", visualOrder: 0 },
  ];

  const main = selectMainGenImage(images);

  assert.equal(main?.path, "gen-bajo.jpg");
});

test("selectMainGenImage: reproduce los 2 hoteles reales verificados (3424 y 168) — ninguna imagen tiene visualOrder=0", () => {
  const hotel168Images: HotelbedsContentImage[] = [
    { imageTypeCode: "GEN", path: "00/000168/000168a_hb_a_030.jpg", order: 30, visualOrder: 31 },
    { imageTypeCode: "GEN", path: "00/000168/000168a_hb_a_031.jpg", order: 31, visualOrder: 32 },
    { imageTypeCode: "GEN", path: "00/000168/000168a_hb_a_036.jpg", order: 36, visualOrder: 22 },
    { imageTypeCode: "HAB", path: "00/000168/000168a_hb_ro_008.jpg", roomCode: "DBT.ST", order: 8, visualOrder: 301 },
  ];
  assert.equal(selectMainGenImage(hotel168Images)?.path, "00/000168/000168a_hb_a_036.jpg");

  const hotel3424Images: HotelbedsContentImage[] = [
    { imageTypeCode: "GEN", path: "00/003424/003424a_hb_a_025.jpg", order: 25, visualOrder: 13 },
    { imageTypeCode: "GEN", path: "00/003424/003424a_hb_a_010.jpg", order: 10, visualOrder: 14 },
    { imageTypeCode: "GEN", path: "00/003424/003424a_hb_a_009.jpg", order: 9, visualOrder: 6 },
    { imageTypeCode: "GEN", path: "00/003424/003424a_hb_a_001.jpg", order: 1, visualOrder: 21 },
  ];
  assert.equal(selectMainGenImage(hotel3424Images)?.path, "00/003424/003424a_hb_a_009.jpg");
});

test("selectMainGenImage: undefined si no hay ninguna imagen GEN (nunca cae a HAB/RES)", () => {
  const images: HotelbedsContentImage[] = [
    { path: "hab-1.jpg", imageTypeCode: "HAB", visualOrder: 0 },
    { path: "res-1.jpg", imageTypeCode: "RES", visualOrder: 0 },
  ];

  assert.equal(selectMainGenImage(images), undefined);
});

test("selectMainGenImage: undefined si images es undefined o vacío", () => {
  assert.equal(selectMainGenImage(undefined), undefined);
  assert.equal(selectMainGenImage([]), undefined);
});

test("buildHotelbedsPhotoUrl: antepone el host y el tamaño 'bigger' al path relativo", () => {
  assert.equal(
    buildHotelbedsPhotoUrl("00/003424/003424a_hb_a_009.jpg"),
    "https://photos.hotelbeds.com/giata/bigger/00/003424/003424a_hb_a_009.jpg",
  );
});

test("mapHotelbedsContentHotelToProperty: mapea los campos reales confirmados (hotel 168, Eurostars Marivent)", () => {
  const hotel: HotelbedsRawContentHotel = {
    code: 168,
    name: { content: "Eurostars Marivent" },
    city: { content: "CALA MAYOR" },
    countryCode: "ES",
    coordinates: { latitude: 39.5526831653502, longitude: 2.61092998087406 },
    images: [
      { imageTypeCode: "GEN", path: "00/000168/000168a_hb_a_036.jpg", order: 36, visualOrder: 22 },
      { imageTypeCode: "HAB", path: "00/000168/000168a_hb_ro_008.jpg", visualOrder: 301 },
    ],
  };

  const property = mapHotelbedsContentHotelToProperty(hotel);

  assert.deepEqual(property, {
    providerName: "hotelbeds",
    providerPropertyId: "168",
    name: "Eurostars Marivent",
    city: "CALA MAYOR",
    country: "ES",
    latitude: 39.5526831653502,
    longitude: 2.61092998087406,
    mainPhotoUrl: "https://photos.hotelbeds.com/giata/bigger/00/000168/000168a_hb_a_036.jpg",
    raw: hotel,
  });
});

test("mapHotelbedsContentHotelToProperty: sin imágenes GEN, mainPhotoUrl queda undefined (nunca inventado)", () => {
  const hotel: HotelbedsRawContentHotel = {
    code: 999,
    name: { content: "Hotel Sin Fotos GEN" },
    images: [{ imageTypeCode: "HAB", path: "hab.jpg", visualOrder: 0 }],
  };

  const property = mapHotelbedsContentHotelToProperty(hotel);

  assert.equal(property.mainPhotoUrl, undefined);
});

test("mapHotelbedsContentHotelToProperty: sin name.content, usa el código como fallback (nunca inventa un nombre distinto)", () => {
  const hotel: HotelbedsRawContentHotel = { code: 555 };

  const property = mapHotelbedsContentHotelToProperty(hotel);

  assert.equal(property.name, "555");
  assert.equal(property.city, undefined);
  assert.equal(property.country, undefined);
  assert.equal(property.latitude, undefined);
  assert.equal(property.longitude, undefined);
});

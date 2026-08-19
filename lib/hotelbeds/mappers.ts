// Hotelbeds — funciones puras que convierten la respuesta de
// disponibilidad (lib/hotelbeds/availability.ts) a los tipos de dominio
// de VIAO (types/travel.ts). Regla explícita de este bloque: no inventar
// ningún campo que Hotelbeds no exponga — cuando falta un dato real, el
// campo VIAO correspondiente queda `undefined` (todos son opcionales
// salvo donde se indica) en vez de rellenarse con un valor supuesto.
//
// Dos campos deliberadamente NUNCA se rellenan aquí, por decisión
// explícita ya tomada en este bloque de trabajo:
// - `Property.mainPhotoUrl` / `Property.country`: requieren el Content
//   API de Hotelbeds, fuera de alcance (pendiente para un bloque
//   posterior).
// - `Property.rating`: Hotelbeds solo expone categoría de estrellas
//   (`categoryCode`/`categoryName`), no una puntuación de reseñas como
//   la que usa MockHotelProvider (valores 3.8/4.2/...) — mapear una cosa
//   como la otra cambiaría el significado del campo sin que
//   types/travel.ts lo documente así.
import type { AvailabilityResult, Conditions, PriceQuote, Property } from "../../types/travel";
import type { HotelbedsRawHotel, HotelbedsRawRate } from "./availability";

export function mapHotelbedsHotelToProperty(hotel: HotelbedsRawHotel): Property {
  return {
    providerName: "hotelbeds",
    providerPropertyId: String(hotel.code),
    name: hotel.name,
    city: hotel.destinationName,
    country: undefined,
    latitude: hotel.latitude !== undefined ? Number(hotel.latitude) : undefined,
    longitude: hotel.longitude !== undefined ? Number(hotel.longitude) : undefined,
    mainPhotoUrl: undefined,
    rating: undefined,
    raw: hotel,
  };
}

/** Todas las tarifas de todas las habitaciones de un hotel, aplanadas. */
function allRates(hotel: HotelbedsRawHotel): HotelbedsRawRate[] {
  return hotel.rooms.flatMap((room) => room.rates);
}

export function mapHotelbedsHotelToAvailability(
  hotel: HotelbedsRawHotel | undefined,
): AvailabilityResult {
  return { available: Boolean(hotel && allRates(hotel).length > 0) };
}

/** La tarifa más barata de un hotel (por `net`), o `undefined` si no tiene ninguna. */
export function findCheapestRate(hotel: HotelbedsRawHotel): HotelbedsRawRate | undefined {
  return allRates(hotel).reduce<HotelbedsRawRate | undefined>((cheapest, rate) => {
    if (!cheapest) return rate;
    return Number(rate.net) < Number(cheapest.net) ? rate : cheapest;
  }, undefined);
}

/**
 * `undefined` si no hay ninguna tarifa disponible, o si Hotelbeds no
 * expone la moneda para este hotel (campo `currency` NO CONFIRMADO, ver
 * availability.ts) — `PriceQuote.currency` es obligatorio en
 * types/travel.ts, así que no se puede construir un `PriceQuote` honesto
 * sin ese dato real.
 */
export function mapHotelbedsHotelToPriceQuote(hotel: HotelbedsRawHotel): PriceQuote | undefined {
  const rate = findCheapestRate(hotel);
  if (!rate || !hotel.currency) return undefined;
  return { amount: Number(rate.net), currency: hotel.currency };
}

/**
 * `cancellationPolicy` se construye a partir de `cancellationPolicies`
 * de la tarifa más barata (texto libre, igual que hace
 * MockHotelProvider — types/travel.ts no define un formato
 * estructurado). `requirements` queda siempre `undefined`: Hotelbeds no
 * expone un campo equivalente en esta respuesta.
 */
export function mapHotelbedsHotelToConditions(hotel: HotelbedsRawHotel): Conditions {
  const rate = findCheapestRate(hotel);
  const policies = rate?.cancellationPolicies;
  if (!policies || policies.length === 0) {
    return {};
  }
  return {
    cancellationPolicy: policies
      .map((policy) => `Cargo de cancelación de ${policy.amount} a partir del ${policy.from}.`)
      .join(" "),
  };
}

import { createClient as createSessionClient } from "../supabase/server";

// Bloque 11 — "Conexión del MVP para piloto". Encuentra un viaje propio
// COMPATIBLE con una reserva recién confirmada, o crea uno nuevo si no
// existe ninguno — para que `app/booking/actions.ts` pueda asociar la
// reserva automáticamente (F11-02, `associateBookingWithTrip`, reutilizada
// sin cambios) sin exigir al usuario el paso manual de "crear viaje" que
// hoy hace que "Mi viaje" empiece vacío tras cada reserva.
//
// Definición de "compatible" (decisión de implementación, documentada
// explícitamente porque no está definida en ningún documento del
// proyecto): mismo usuario + mismo `destination` (comparación
// case-insensitive vía `ilike` sin comodines, equivalente a una igualdad
// insensible a mayúsculas) — el único dato que `trips` y el flujo de
// reserva comparten realmente hoy. Se reutiliza el viaje MÁS RECIENTE que
// coincida en vez de inventar una regla de solapamiento de fechas (no
// exigida por ningún documento, y `VIAO_DATABASE.md` sección 15 ya deja
// abierta la política de agrupación). Si el usuario reserva dos viajes
// distintos al mismo destino en fechas distintas, ambas reservas quedan
// bajo el mismo viaje — comportamiento consciente y simple, no un bug: el
// modelo de datos ya permite reasignar una reserva libremente
// (`lib/trips/get-associable-bookings.ts`), así que no es una relación
// irreversible.
//
// `destination`: se calcula en el llamador a partir de `property.city`
// (dato ya conocido del flujo de reserva) con `property.name` como
// respaldo cuando el provider no informa ciudad — nunca se inventa un
// valor aquí.
//
// Cliente de SESIÓN, no `service_role` (auditado antes de escribir esto:
// `service_role` solo tiene GRANT de SELECT sobre `trips`, migración
// 20260818190000_grant_service_role_trips_select.sql, añadido
// específicamente para la comprobación de propiedad de
// `associateBookingWithTrip` — nunca INSERT). `trips` es Patrón A
// (VIAO_DATABASE.md sección 3): el propio usuario autenticado ya puede
// leer/crear sus viajes bajo RLS (`trips_select_own`/`trips_insert_own`),
// exactamente el mismo mecanismo que ya usan `getUserTrips()`/
// `createTripAction`. Esta función se invoca desde dentro de
// `app/booking/actions.ts`, ya en el contexto de una petición real de
// Next.js con la sesión del usuario que reservó — no hace falta ningún
// privilegio elevado ni ninguna migración nueva.
//
// Sin protección de condición de carrera (no se usa un UPSERT/lock): el
// flujo actual invoca esta función una única vez, de forma síncrona,
// dentro de una sola petición de `createBookingAction` — no hay dos
// llamadas concurrentes reales que puedan crear dos viajes duplicados en
// esta fase. Documentado aquí para no ocultar el límite, no para
// justificarlo como deseable a largo plazo.
export interface FindOrCreateTripForBookingInput {
  userId: string;
  destination: string;
  checkIn: string;
  checkOut: string;
}

export interface FindOrCreateTripForBookingResult {
  tripId: string;
  created: boolean;
}

export async function findOrCreateTripForBooking({
  userId,
  destination,
  checkIn,
  checkOut,
}: FindOrCreateTripForBookingInput): Promise<FindOrCreateTripForBookingResult> {
  const sessionClient = await createSessionClient();

  // RLS (`trips_select_own`) ya restringe esta lectura a las filas del
  // propio usuario — no hace falta repetir `.eq("user_id", userId)`,
  // mismo criterio ya establecido por `getUserTrips()`/`getTripById()`.
  const { data: existingTrip, error: findError } = await sessionClient
    .from("trips")
    .select("id")
    .ilike("destination", destination)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw new Error(
      `No se pudo buscar un viaje compatible para "${destination}": ${findError.message}`,
    );
  }

  if (existingTrip) {
    return { tripId: existingTrip.id as string, created: false };
  }

  const { data: newTrip, error: insertError } = await sessionClient
    .from("trips")
    .insert({
      user_id: userId,
      destination,
      start_date: checkIn,
      end_date: checkOut,
    })
    .select("id")
    .single();

  if (insertError || !newTrip) {
    throw new Error(
      `No se pudo crear el viaje para "${destination}": ${insertError?.message ?? "sin datos"}`,
    );
  }

  return { tripId: newTrip.id as string, created: true };
}

// F6-05 (VIAO_ROADMAP.md) — Resolución de la pantalla de estado de una
// reserva existente.
//
// Auditoría previa (Paso 0, antes de escribir este archivo): esquema real
// de `bookings`/`properties` contra Supabase local (`\d`, `pg_policies`).
// Hallazgo clave, distinto del resto de Fase 6: `bookings` SÍ tiene una
// policy de lectura para `authenticated` (`bookings_select_own`,
// `user_id = auth.uid()`, VIAO_DATABASE.md sección 6) — a diferencia de
// las escrituras (F6-02/F6-03, Patrón B, solo `service_role`), leer una
// reserva propia es Patrón A: el propio cliente de sesión
// (`lib/supabase/server.ts`, igual que `lib/searches/get-search-by-id.ts`
// de F6-01) puede consultarla directamente — RLS ya impone el ownership,
// así que NO se usa `service_role` aquí (sería un privilegio más amplio
// del necesario, y F6-02/F6-03 ya establecieron esa distinción). Lo mismo
// aplica a `properties` (`properties_select_all`, cualquier `authenticated`
// puede leer el catálogo compartido).
//
// Property: `bookings.property_id` referencia `properties.id` (el UUID
// interno cacheado por `upsertPropertyCache`, F6-02), NUNCA el
// `providerPropertyId` del proveedor — se usa el embed nativo de
// PostgREST (`property:properties(...)`) sobre esa única FK real, sin
// crear una segunda consulta ni una caché nueva.
//
// Ownership/seguridad: NO se comprueba `user_id` "a mano" en el código —
// RLS ya lo hace de forma más fiable (imposible de olvidar en una rama
// nueva). Una reserva con un UUID válido pero de OTRO usuario, bajo RLS,
// no devuelve ninguna fila (ni error, ni datos) — se trata exactamente
// igual que "no existe" (`not_found`): evita filtrar si el id pertenece a
// alguien más. La identidad viene exclusivamente de
// `createClient()` (`lib/supabase/server.ts`) → `auth.getUser()` — fail
// closed, igual que `app/booking/actions.ts` (F6-02): cualquier fallo al
// resolver la sesión se trata como no autenticado.
//
// `rooms`: NO se lee ni se muestra — `bookings` no tiene esa columna
// (discrepancia ya auditada y documentada en F6-02,
// lib/bookings/create-booking-record.ts). Ningún dato de huésped
// (nombre/email/teléfono) ni económico distinto de `booking_value`/
// `currency` (comisión, revenue, reward): ninguno de esos campos se
// expone en esta vista aunque existan en la fila, porque no hay ningún
// requisito ni pantalla previa que los muestre al usuario final — F6-05
// solo pide "estado, alojamiento, check-in/out, huéspedes, referencia,
// importe, moneda".
//
// Estado inesperado: el `CHECK` de Postgres (`bookings_status_check`)
// hace que un valor fuera de pending/confirmed/cancelled sea, en la
// práctica, imposible de insertar — pero el tipo que devuelve
// supabase-js para esa columna sigue siendo `string`, no el literal
// union, así que el código igualmente valida en runtime
// (`isBookingStatus`) antes de tratar el valor como un `BookingStatus`
// real, en vez de asumirlo por casteo. Si alguna vez no lo fuera, se
// devuelve un error en lugar de inventar/mostrar un estado no soportado.
import { createClient as createSessionClient } from "../../../../lib/supabase/server";
import { isValidUuid } from "../../../../lib/utils/is-valid-uuid";
import type { BookingStatus } from "../../../../types/travel";

export interface BookingStatusPropertyView {
  name: string;
  city?: string;
  country?: string;
  mainPhotoUrl?: string;
  rating?: number;
  providerPropertyId: string;
}

export interface BookingStatusView {
  id: string;
  status: BookingStatus;
  checkIn: string;
  checkOut: string;
  guests: number;
  providerBookingReference?: string;
  bookingValue?: number;
  currency: string;
  searchId?: string;
  /** Points realmente otorgados por esta reserva (Economía VIAO Rewards V1, `lib/rewards/rules.ts`) — leídos del ledger real, nunca recalculados aquí. `undefined` si la reserva no llegó a `confirmed` o no generó recompensa. */
  rewardPoints?: number;
  property: BookingStatusPropertyView;
}

export type BookingStatusResult =
  | { status: "found"; booking: BookingStatusView }
  | { status: "not_found" }
  | { status: "unauthenticated" }
  | { status: "error"; message: string };

const VALID_BOOKING_STATUSES: readonly string[] = [
  "pending",
  "confirmed",
  "cancelled",
];

/** Validación en runtime del `CHECK (status IN (...))` real de la columna — nunca se asume/castea sin comprobar. */
export function isBookingStatus(value: unknown): value is BookingStatus {
  return typeof value === "string" && VALID_BOOKING_STATUSES.includes(value);
}

/** Forma real de la fila que devuelve la consulta de `resolveBookingStatus` — ver la nota junto a su uso sobre por qué hace falta esta aserción. */
interface RawBookingStatusRow {
  id: string;
  status: string;
  check_in: string;
  check_out: string;
  guests: number;
  provider_booking_reference: string | null;
  booking_value: number | string | null;
  currency: string;
  search_id: string | null;
  property: {
    name: string;
    city: string | null;
    country: string | null;
    main_photo_url: string | null;
    rating: number | string | null;
    provider_property_id: string;
  } | null;
}

export async function resolveBookingStatus(
  rawId: string,
): Promise<BookingStatusResult> {
  if (!isValidUuid(rawId)) {
    return { status: "not_found" };
  }

  // Fail closed, igual que app/booking/actions.ts (F6-02): cualquier fallo
  // al obtener el cliente de sesión o al resolver el usuario (incluida la
  // ausencia de un contexto de petición real) se trata como no
  // autenticado, nunca como autenticado por defecto.
  let sessionClient: Awaited<ReturnType<typeof createSessionClient>>;
  try {
    sessionClient = await createSessionClient();
  } catch {
    return { status: "unauthenticated" };
  }

  let user: { id: string } | null = null;
  try {
    const {
      data: { user: sessionUser },
    } = await sessionClient.auth.getUser();
    user = sessionUser;
  } catch {
    user = null;
  }

  if (!user) {
    return { status: "unauthenticated" };
  }

  const { data: rawData, error } = await sessionClient
    .from("bookings")
    .select(
      "id, status, check_in, check_out, guests, provider_booking_reference, booking_value, currency, search_id, property:properties(name, city, country, main_photo_url, rating, provider_property_id)",
    )
    .eq("id", rawId)
    .maybeSingle();

  if (error) {
    return { status: "error", message: error.message };
  }

  // `properties` es un embed de PostgREST sobre la FK real
  // `bookings.property_id -> properties.id` (a-uno, no a-muchos), pero sin
  // tipos `Database<>` (el proyecto no los usa en ningún archivo) el
  // cliente de supabase-js no puede inferir eso y tipa el embed como
  // array — se corrige aquí con una única aserción documentada, no
  // repartida por el resto del archivo.
  const data = rawData as unknown as RawBookingStatusRow | null;

  // RLS (`bookings_select_own`) ya filtró: `data` es `null` tanto si el id
  // no existe como si pertenece a otro usuario — ambos casos son
  // indistinguibles a propósito, y se tratan igual (`not_found`).
  if (!data || !data.property) {
    return { status: "not_found" };
  }

  if (!isBookingStatus(data.status)) {
    return {
      status: "error",
      message: `Estado de reserva no reconocido: "${data.status}".`,
    };
  }

  // Points otorgados por esta reserva (Economía VIAO Rewards V1,
  // `lib/rewards/rules.ts`): se leen del ledger real
  // (`rewards_transactions`), NUNCA se recalculan aquí a partir del
  // precio — así la pantalla siempre muestra exactamente lo que se otorgó,
  // aunque la fórmula cambie en el futuro para reservas nuevas. Mismo
  // Patrón A que el resto de este archivo: cliente de sesión, RLS
  // (`rewards_transactions_select_own`) ya limita el resultado al propio
  // usuario — una fila de otro usuario, bajo RLS, no es alcanzable aquí.
  // Solo relevante si la reserva quedó `confirmed` (único caso en el que
  // `app/booking/actions.ts` otorga la recompensa); para `pending`/
  // `cancelled` no existe ninguna fila y la consulta simplemente no
  // encuentra nada.
  let rewardPoints: number | undefined;
  if (data.status === "confirmed") {
    const { data: rewardRow } = await sessionClient
      .from("rewards_transactions")
      .select("amount")
      .eq("reference_type", "booking")
      .eq("reference_id", rawId)
      .eq("reason", "booking")
      .maybeSingle();
    rewardPoints = rewardRow ? Number(rewardRow.amount) : undefined;
  }

  return {
    status: "found",
    booking: {
      id: data.id,
      status: data.status,
      checkIn: data.check_in,
      checkOut: data.check_out,
      guests: data.guests,
      providerBookingReference: data.provider_booking_reference ?? undefined,
      bookingValue:
        data.booking_value === null || data.booking_value === undefined
          ? undefined
          : Number(data.booking_value),
      currency: data.currency,
      searchId: data.search_id ?? undefined,
      rewardPoints,
      property: {
        name: data.property.name,
        city: data.property.city ?? undefined,
        country: data.property.country ?? undefined,
        mainPhotoUrl: data.property.main_photo_url ?? undefined,
        rating:
          data.property.rating === null || data.property.rating === undefined
            ? undefined
            : Number(data.property.rating),
        providerPropertyId: data.property.provider_property_id,
      },
    },
  };
}

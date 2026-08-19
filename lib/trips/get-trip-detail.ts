import { createClient as createSessionClient } from "../supabase/server";
import { getTripById, type TripRecord } from "./get-trip-by-id";

// F11-04 (VIAO_ROADMAP.md) — Agregación de todo lo que necesita el
// resumen de un viaje, en un único punto — mismo criterio que
// `resolveBookingContext` (F6-01): una función que compone varias
// lecturas relacionadas para una sola pantalla, en vez de que la página
// haga las consultas sueltas. Todo con el cliente de sesión (RLS ya
// filtra cada tabla por `user_id = auth.uid()`), nunca `service_role`
// para lectura — el propio usuario ya puede leer sus datos.
//
// Rewards asociados al viaje (MVP sección 11, F11-04): NO existe ninguna
// columna `trip_id` en `rewards_transactions`, ni se inventa una. La
// única relación REAL con un viaje es indirecta, a través de una reserva
// ya asociada: `rewards_transactions.reference_type = 'booking'` +
// `reference_id` = el id de una reserva de este viaje (mismo
// `reference_type`/`reason` exactos que `app/booking/actions.ts` usa al
// otorgar la recompensa de reserva confirmada, F7-04). Las recompensas de
// registro (`reason: 'registration'`, sin referencia) o de referido
// (`reference_type: 'referral'`) no tienen ninguna relación real con un
// viaje concreto — deliberadamente NUNCA se muestran aquí, para no
// fabricar una asociación que no existe.
export interface TripBookingView {
  id: string;
  propertyId: string;
  propertyName: string | null;
  checkIn: string;
  checkOut: string;
  status: string;
  bookingValue: number | null;
  currency: string;
}

export interface TripPhotoView {
  id: string;
  storagePath: string;
  caption: string | null;
  visionScanId: string | null;
}

export interface TripScanView {
  id: string;
  sourceLanguage: string | null;
  targetLanguage: string;
  translatedText: string | null;
  explanation: string | null;
  imageRetained: boolean;
}

export interface TripRewardView {
  id: string;
  amount: number;
  reason: string;
  referenceId: string;
}

export interface TripDetail {
  trip: TripRecord;
  bookings: TripBookingView[];
  photos: TripPhotoView[];
  scans: TripScanView[];
  rewards: TripRewardView[];
}

export async function getTripDetail(
  tripId: string,
): Promise<TripDetail | undefined> {
  const trip = await getTripById(tripId);
  if (!trip) {
    return undefined;
  }

  try {
    const sessionClient = await createSessionClient();

    const [bookingsResult, photosResult, scansResult] = await Promise.all([
      sessionClient
        .from("bookings")
        .select("id, property_id, check_in, check_out, status, booking_value, currency")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
      sessionClient
        .from("photos")
        .select("id, storage_path, caption, vision_scan_id")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
      sessionClient
        .from("vision_scans")
        .select("id, source_language, target_language, translated_text, explanation, image_retained")
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false }),
    ]);

    // Bloque 11 — nombre humano del alojamiento en vez del UUID en bruto
    // de `bookings.property_id` (hallazgo de la auditoría de retención).
    // `properties` es Patrón B con lectura abierta a cualquier usuario
    // autenticado (VIAO_DATABASE.md sección 4, `USING (true)`) — el
    // cliente de sesión ya usado en esta misma función basta, sin
    // `service_role`. Si la fila no existe (no debería ocurrir: toda
    // reserva pasa por `upsertPropertyCache` antes de crearse) o la
    // consulta falla, `propertyName` queda `null` y la UI cae de vuelta al
    // UUID — nunca se inventa un nombre.
    const rawBookings = bookingsResult.data ?? [];
    const propertyIds = [...new Set(rawBookings.map((row) => row.property_id as string))];
    const propertyNameById = new Map<string, string>();
    if (propertyIds.length > 0) {
      const { data: propertiesData } = await sessionClient
        .from("properties")
        .select("id, name")
        .in("id", propertyIds);
      for (const row of propertiesData ?? []) {
        propertyNameById.set(row.id as string, row.name as string);
      }
    }

    const bookings: TripBookingView[] = rawBookings.map((row) => ({
      id: row.id as string,
      propertyId: row.property_id as string,
      propertyName: propertyNameById.get(row.property_id as string) ?? null,
      checkIn: row.check_in as string,
      checkOut: row.check_out as string,
      status: row.status as string,
      bookingValue: row.booking_value as number | null,
      currency: row.currency as string,
    }));

    const photos: TripPhotoView[] = (photosResult.data ?? []).map((row) => ({
      id: row.id as string,
      storagePath: row.storage_path as string,
      caption: row.caption as string | null,
      visionScanId: row.vision_scan_id as string | null,
    }));

    const scans: TripScanView[] = (scansResult.data ?? []).map((row) => ({
      id: row.id as string,
      sourceLanguage: row.source_language as string | null,
      targetLanguage: row.target_language as string,
      translatedText: row.translated_text as string | null,
      explanation: row.explanation as string | null,
      imageRetained: row.image_retained as boolean,
    }));

    let rewards: TripRewardView[] = [];
    if (bookings.length > 0) {
      const { data: rewardsData } = await sessionClient
        .from("rewards_transactions")
        .select("id, amount, reason, reference_id")
        .eq("reference_type", "booking")
        .in("reference_id", bookings.map((booking) => booking.id));

      rewards = (rewardsData ?? []).map((row) => ({
        id: row.id as string,
        amount: row.amount as number,
        reason: row.reason as string,
        referenceId: row.reference_id as string,
      }));
    }

    return { trip, bookings, photos, scans, rewards };
  } catch (error) {
    console.error("[trips] Error inesperado componiendo el resumen del viaje:", error);
    return { trip, bookings: [], photos: [], scans: [], rewards: [] };
  }
}

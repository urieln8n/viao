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
  /** Coordenadas reales del alojamiento (`properties.latitude/longitude`, ya presentes desde `upsertPropertyCache`) — `null` si el proveedor no las informó. Nunca inventadas: sin ambas, no se construye ningún enlace de ubicación (Bloque 16). */
  latitude: number | null;
  longitude: number | null;
  /** Foto del alojamiento (`properties.main_photo_url`) — usada como fallback de portada en Mi viaje cuando el viaje todavía no tiene ninguna foto propia (Bloque 19). */
  mainPhotoUrl: string | null;
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
  /** URL firmada temporal (Bloque 16) para renderizar la foto real — el bucket `photos` es privado, así que `storagePath` nunca es una URL utilizable directamente. `null` si no se pudo generar (nunca se inventa una URL): la UI cae de vuelta al texto (`caption`/`storagePath`). */
  signedUrl: string | null;
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
    //
    // Bloque 16 — misma consulta ya existente, ampliada con
    // `latitude`/`longitude` (columnas ya presentes en `properties` desde
    // antes de este bloque, pobladas por `upsertPropertyCache` en cada
    // reserva) para el enlace "Ver ubicación" — sin query nueva, sin
    // cambio de arquitectura.
    const rawBookings = bookingsResult.data ?? [];
    const propertyIds = [...new Set(rawBookings.map((row) => row.property_id as string))];
    interface PropertyLocationInfo {
      name: string;
      latitude: number | null;
      longitude: number | null;
      mainPhotoUrl: string | null;
    }
    const propertyInfoById = new Map<string, PropertyLocationInfo>();
    if (propertyIds.length > 0) {
      // Bloque 19 — misma consulta ya existente (Bloque 11/16), ampliada
      // con `main_photo_url` para la portada de Mi viaje (fallback cuando
      // el viaje todavía no tiene ninguna foto propia guardada, ver
      // `photos` más abajo). Sin query nueva, sin cambio de arquitectura.
      const { data: propertiesData } = await sessionClient
        .from("properties")
        .select("id, name, latitude, longitude, main_photo_url")
        .in("id", propertyIds);
      for (const row of propertiesData ?? []) {
        propertyInfoById.set(row.id as string, {
          name: row.name as string,
          latitude: row.latitude === null ? null : Number(row.latitude),
          longitude: row.longitude === null ? null : Number(row.longitude),
          mainPhotoUrl: row.main_photo_url as string | null,
        });
      }
    }

    const bookings: TripBookingView[] = rawBookings.map((row) => {
      const info = propertyInfoById.get(row.property_id as string);
      return {
        id: row.id as string,
        propertyId: row.property_id as string,
        propertyName: info?.name ?? null,
        latitude: info?.latitude ?? null,
        longitude: info?.longitude ?? null,
        mainPhotoUrl: info?.mainPhotoUrl ?? null,
        checkIn: row.check_in as string,
        checkOut: row.check_out as string,
        status: row.status as string,
        bookingValue: row.booking_value as number | null,
        currency: row.currency as string,
      };
    });

    // Bloque 16 — el bucket `photos` es privado (RLS + `owner_id`, ver
    // supabase/migrations/20260817170000_create_storage_policies.sql), así
    // que `storage_path` nunca es una URL renderizable directamente: hace
    // falta una URL firmada temporal. Se piden todas de una vez
    // (`createSignedUrls`, batch real de supabase-js) con el MISMO cliente
    // de sesión ya usado en toda esta función — nunca `service_role` — así
    // que RLS (`photos_select_own` + las políticas de `storage.objects`)
    // sigue siendo quien decide qué puede firmarse: pedir la URL de la
    // foto de otro usuario simplemente falla, nunca se salta la
    // comprobación de ownership. Expiración de 1h: suficiente para ver la
    // página, sin dejar enlaces firmados de larga duración circulando.
    const rawPhotos = photosResult.data ?? [];
    const signedUrlByPath = new Map<string, string>();
    if (rawPhotos.length > 0) {
      const paths = rawPhotos.map((row) => row.storage_path as string);
      const { data: signedUrlsData } = await sessionClient.storage
        .from("photos")
        .createSignedUrls(paths, 3600);
      for (const entry of signedUrlsData ?? []) {
        if (entry.signedUrl && entry.path) {
          signedUrlByPath.set(entry.path, entry.signedUrl);
        }
      }
    }

    const photos: TripPhotoView[] = rawPhotos.map((row) => ({
      id: row.id as string,
      storagePath: row.storage_path as string,
      caption: row.caption as string | null,
      visionScanId: row.vision_scan_id as string | null,
      signedUrl: signedUrlByPath.get(row.storage_path as string) ?? null,
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

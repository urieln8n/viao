import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { getTravelProvider } from "../travel-provider";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "../bookings/create-booking-record";
import { updateBookingStatus } from "../bookings/update-booking-status";
import { createRewardTransaction } from "../rewards/create-reward-transaction";
import { logAnalyticsEvent } from "../analytics/log-event";
import { calculateHotelBookingRewardPoints } from "../rewards/rules";
import type { BookingResult } from "../../types/travel";

// F14-03/F14-04 (VIAO_ROADMAP.md) — Helper compartido para los tests de
// integración de esta fase. `app/booking/actions.ts` (Server Action)
// depende de `next/headers` y por eso no es invocable directamente fuera
// de una petición real de Next.js (misma limitación ya documentada en
// TODOS los `*.test.ts` de Server Actions del proyecto — ver p. ej.
// app/booking/actions.test.ts). Este helper reproduce, orquestando
// directamente las mismas funciones de `lib/` en el MISMO orden exacto
// que esa Server Action, el flujo real completo — no reimplementa
// lógica de negocio nueva, solo compone las piezas ya existentes y
// probadas por separado (F6-02/F6-03/F6-04/F7-04), de la misma forma que
// cualquier test de integración de este proyecto que necesite atravesar
// una Server Action (mismo criterio ya usado en
// lib/bookings/associate-trip.test.ts, F11).
//
// Requiere Supabase local arrancado y sus variables de entorno pasadas al
// proceso (nunca `.env.local`).
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`falta ${name} en el entorno de prueba`);
  }
  return value;
}

export async function signUpIntegrationUser(tag: string): Promise<{
  userId: string;
  authedClient: SupabaseClient;
}> {
  const supabaseUrl = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const authedClient = createClient(supabaseUrl, anonKey);

  const email = `f14-${tag}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`;
  const { data, error } = await authedClient.auth.signUp({
    email,
    password: "f14-integration-password-12345",
  });
  if (error || !data.user || !data.session) {
    throw new Error(`signUp(${tag}) falló: ${error?.message ?? "sin sesión"}`);
  }

  return { userId: data.user.id, authedClient };
}

export async function deleteIntegrationUser(userId: string): Promise<void> {
  const service = createServiceRoleClient();
  await service.auth.admin.deleteUser(userId);
}

export interface RunBookingFlowInput {
  userId: string;
  authedClient: SupabaseClient;
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  /** Si se omite, no se crea ninguna fila en `searches` (mismo comportamiento que un booking sin `searchId` en la Action real). */
  withSearchRecord?: boolean;
}

export interface RunBookingFlowResult {
  searchId: string | undefined;
  bookingId: string;
  bookingResult: BookingResult;
  propertyRowId: string;
  providerPropertyId: string;
}

/**
 * Reproduce el flujo real completo de `app/search/actions.ts` +
 * `app/booking/actions.ts` (búsqueda -> selección -> reserva ->
 * persistencia -> transición de estado -> analytics -> reward), llamando
 * exactamente a las mismas funciones de `lib/` que esas Server Actions,
 * en el mismo orden. Lanza si cualquier paso falla (a diferencia de la
 * Action real, que devuelve resultados controlados) — para un test de
 * integración, un fallo debe hacer fallar el test, no ocultarse.
 */
export async function runFullBookingFlow({
  userId,
  authedClient,
  destination,
  checkIn,
  checkOut,
  guests,
  rooms,
  withSearchRecord = true,
}: RunBookingFlowInput): Promise<RunBookingFlowResult> {
  const provider = getTravelProvider();

  // F5-02: búsqueda real contra el provider activo.
  const results = await provider.search({ destination, checkIn, checkOut, guests, rooms });
  if (results.length === 0) {
    throw new Error(`la búsqueda de "${destination}" no devolvió ningún resultado`);
  }
  const [property] = results;

  // F5-06: persistencia de la búsqueda (mismo INSERT exacto que
  // lib/searches/create-search-record.ts, que no es invocable aquí por
  // depender de next/headers) — vía el cliente de sesión REAL del propio
  // usuario, bajo RLS real (Patrón A), nunca service_role.
  let searchId: string | undefined;
  if (withSearchRecord) {
    const { data: searchRow, error: searchError } = await authedClient
      .from("searches")
      .insert({
        user_id: userId,
        destination,
        check_in: checkIn,
        check_out: checkOut,
        guests,
        rooms,
        results_count: results.length,
      })
      .select("id")
      .single();
    if (searchError || !searchRow) {
      throw new Error(`no se pudo crear la búsqueda real: ${searchError?.message}`);
    }
    searchId = searchRow.id as string;
  }

  // F6-01/F6-02: selección de la propiedad + confirmación de existencia (getDetails), igual que resolveBookingContext.
  const fullProperty = await provider.getDetails(property.providerPropertyId);

  // F6-02: reserva real contra el provider.
  if (!provider.book) {
    throw new Error("el provider activo no soporta book()");
  }
  const bookingResult = await provider.book({
    providerPropertyId: fullProperty.providerPropertyId,
    checkIn,
    checkOut,
    guests,
    rooms,
  });

  // F6-02: persistencia real (misma secuencia exacta que app/booking/actions.ts).
  const propertyRowId = await upsertPropertyCache(fullProperty);
  const bookingId = await createBookingRecord({
    userId,
    propertyRowId,
    searchId,
    checkIn,
    checkOut,
    guests,
    providerBookingReference: bookingResult.providerBookingReference,
    bookingValue: bookingResult.amount,
    currency: bookingResult.currency,
  });

  // F6-03: transición de estado real.
  await updateBookingStatus({ bookingId, userId, status: bookingResult.status });

  // F6-04/F7-04: analytics + reward, SOLO si quedó confirmed (mismo guard exacto que la Action real).
  if (bookingResult.status === "confirmed") {
    await logAnalyticsEvent(
      "booking_completed",
      { bookingId, providerPropertyId: fullProperty.providerPropertyId, ...(searchId ? { searchId } : {}), status: bookingResult.status },
      userId,
    );

    const rewardPoints =
      bookingResult.amount !== undefined
        ? calculateHotelBookingRewardPoints(bookingResult.amount)
        : 0;
    const rewardResult =
      rewardPoints > 0
        ? await createRewardTransaction({
            userId,
            amount: rewardPoints,
            reason: "booking",
            referenceType: "booking",
            referenceId: bookingId,
          })
        : undefined;
    if (rewardResult?.created) {
      await logAnalyticsEvent(
        "reward_earned",
        { bookingId, reason: "booking", amount: rewardPoints },
        userId,
      );
    }
  }

  return {
    searchId,
    bookingId,
    bookingResult,
    propertyRowId,
    providerPropertyId: fullProperty.providerPropertyId,
  };
}

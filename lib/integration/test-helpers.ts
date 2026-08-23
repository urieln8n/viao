import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createServiceRoleClient } from "../supabase/service";
import { getTravelProvider } from "../travel-provider";
import { upsertPropertyCache } from "../properties/upsert-property-cache";
import { createBookingRecord } from "../bookings/create-booking-record";
import { updateBookingStatus } from "../bookings/update-booking-status";
import { createBookingIntent } from "../bookings/create-booking-intent";
import {
  markBookingIntentCompleted,
  markBookingIntentFailed,
  markBookingIntentProviderConfirmedOrphaned,
} from "../bookings/update-booking-intent-status";
import { createRewardTransaction } from "../rewards/create-reward-transaction";
import { logAnalyticsEvent } from "../analytics/log-event";
import { calculateHotelBookingRewardPoints } from "../rewards/rules";
import { ProviderAmbiguousError } from "../travel-provider/errors";
import type { BookingRequest, BookingResult } from "../../types/travel";

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
  intentId: string;
  bookingId: string;
  bookingResult: BookingResult;
  propertyRowId: string;
  providerPropertyId: string;
}

/**
 * Reproduce el flujo real completo de `app/search/actions.ts` +
 * `app/booking/actions.ts` (búsqueda -> selección -> booking intent ->
 * reserva -> persistencia -> transición de estado -> intent completed ->
 * analytics -> reward), llamando exactamente a las mismas funciones de
 * `lib/` que esas Server Actions, en el mismo orden. Lanza si cualquier
 * paso falla (a diferencia de la Action real, que devuelve resultados
 * controlados) — para un test de integración, un fallo debe hacer fallar
 * el test, no ocultarse.
 *
 * FPR-04.10 — antes de este bloque, este helper NO pasaba por
 * `booking_intents` (a diferencia de la Action real desde FPR-04.9),
 * pudiendo validar accidentalmente un flujo distinto del productivo.
 * Adaptado aquí sin cambiar su forma exterior (mismos parámetros de
 * entrada, mismo criterio de "lanzar si algo falla"): un
 * `duplicate_booking_intent` se lanza como un `Error` normal (mismo
 * criterio que cualquier otro fallo de este helper) — los tests de
 * concurrencia lo distinguen por su mensaje, ver
 * lib/integration/search-to-booking.test.ts.
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

  // FPR-04.9/FPR-04.10: ancla de idempotencia, creada ANTES de tocar el
  // provider — mismo orden exacto que app/booking/actions.ts.
  const intentResult = await createBookingIntent({
    userId,
    providerName: fullProperty.providerName,
    providerPropertyId: fullProperty.providerPropertyId,
    checkIn,
    checkOut,
    guests,
    rooms,
  });
  if (intentResult.outcome === "duplicate_booking_intent") {
    throw new Error("duplicate_booking_intent");
  }
  if (intentResult.outcome === "persistence_error") {
    throw new Error(`no se pudo crear el booking intent: ${intentResult.message}`);
  }
  const intent = intentResult.intent;

  // F6-02/FPR-04.9: reserva real contra el provider, con el
  // clientReference YA resuelto por el intent (nunca regenerado aquí).
  if (!provider.book) {
    throw new Error("el provider activo no soporta book()");
  }
  let bookingResult: BookingResult;
  try {
    bookingResult = await provider.book(
      {
        providerPropertyId: fullProperty.providerPropertyId,
        checkIn,
        checkOut,
        guests,
        rooms,
      },
      intent.clientReference,
    );
  } catch (error) {
    // Mismo criterio exacto que app/booking/actions.ts: una ambigüedad
    // (ProviderAmbiguousError) nunca marca el intent como failed; cualquier
    // otro fallo sí lo libera para un reintento futuro. Se relanza en
    // ambos casos — este helper siempre "lanza si algo falla".
    if (!(error instanceof ProviderAmbiguousError)) {
      await markBookingIntentFailed(intent.id);
    }
    throw error;
  }

  // F6-02: persistencia real (misma secuencia exacta que app/booking/actions.ts).
  const propertyRowId = await upsertPropertyCache(fullProperty);
  const bookingId = await createBookingRecord({
    userId,
    propertyRowId,
    searchId,
    checkIn,
    checkOut,
    guests,
    rooms,
    providerBookingReference: bookingResult.providerBookingReference,
    providerCancellationReference: bookingResult.providerCancellationReference,
    bookingValue: bookingResult.amount,
    providerCost: bookingResult.providerCost,
    currency: bookingResult.currency,
  });

  // FPR-04.9: el provider confirmó Y la persistencia tuvo éxito -> intent completed.
  await markBookingIntentCompleted(intent.id, bookingId);

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
    intentId: intent.id,
    bookingId,
    bookingResult,
    propertyRowId,
    providerPropertyId: fullProperty.providerPropertyId,
  };
}

// FPR-04.9 — Helper para probar el flujo NUEVO (booking intent como ancla
// de idempotencia) contra Supabase local real. Mismo motivo que
// `runFullBookingFlow`: `app/booking/actions.ts` depende de `next/headers`
// y no es invocable directamente en un test — este helper reproduce,
// llamando exactamente a las mismas funciones de `lib/` en el MISMO orden
// que esa Server Action (createBookingIntent -> book() -> createBookingRecord
// -> transiciones de intent/status), el flujo real completo.
//
// A diferencia de `runFullBookingFlow` (que usa el provider activo real,
// típicamente Mock), `book` aquí es una función CONTROLABLE inyectada por
// el test — necesario para poder simular determinísticamente los 11
// escenarios de FPR-04.9 (CONFIRMED/PRECONFIRMED/rechazo claro/ambiguo)
// sin depender de qué provider esté activo ni de red real.
export interface RunIntentAwareBookingFlowInput {
  userId: string;
  providerName: string;
  providerPropertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
  book: (request: BookingRequest, clientReference?: string) => Promise<BookingResult>;
  /** Simula un fallo de persistencia DESPUÉS de que el provider ya confirmó la reserva (escenario "provider confirmó, Supabase falló"). */
  simulatePersistenceFailure?: boolean;
}

export type RunIntentAwareBookingFlowResult =
  | { outcome: "duplicate_booking_intent" }
  | { outcome: "pending_confirmation"; intentId: string; message: string }
  | { outcome: "failed"; intentId: string; message: string }
  | { outcome: "persistence_error"; intentId: string; message: string }
  | { outcome: "success"; intentId: string; bookingId: string; bookingResult: BookingResult };

export async function runIntentAwareBookingFlow(
  input: RunIntentAwareBookingFlowInput,
): Promise<RunIntentAwareBookingFlowResult> {
  // Mismo primer paso que la Action real: el intent se crea ANTES de
  // tocar el provider — un duplicado nunca llega a llamar a `book`.
  const intentResult = await createBookingIntent({
    userId: input.userId,
    providerName: input.providerName,
    providerPropertyId: input.providerPropertyId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    rooms: input.rooms,
  });
  if (intentResult.outcome === "duplicate_booking_intent") {
    return { outcome: "duplicate_booking_intent" };
  }
  if (intentResult.outcome === "persistence_error") {
    throw new Error(`no se pudo crear el booking intent de prueba: ${intentResult.message}`);
  }
  const intent = intentResult.intent;

  const bookingRequest: BookingRequest = {
    providerPropertyId: input.providerPropertyId,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    guests: input.guests,
    rooms: input.rooms,
  };

  let bookingResult: BookingResult;
  try {
    bookingResult = await input.book(bookingRequest, intent.clientReference);
  } catch (error) {
    if (error instanceof ProviderAmbiguousError) {
      // Regla crítica FPR-04.9: nunca failed, nunca reintentar — el
      // intent queda in_progress tal cual.
      return { outcome: "pending_confirmation", intentId: intent.id, message: error.message };
    }
    await markBookingIntentFailed(intent.id);
    return {
      outcome: "failed",
      intentId: intent.id,
      message: error instanceof Error ? error.message : "fallo desconocido del provider",
    };
  }

  try {
    if (input.simulatePersistenceFailure) {
      throw new Error("fallo de persistencia simulado (test FPR-04.9)");
    }
    const propertyRowId = await upsertPropertyCache({
      providerName: input.providerName,
      providerPropertyId: input.providerPropertyId,
      name: "FPR-04.9 Integration Test Hotel",
    });
    const bookingId = await createBookingRecord({
      userId: input.userId,
      propertyRowId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      guests: input.guests,
      providerBookingReference: bookingResult.providerBookingReference,
      bookingValue: bookingResult.amount,
      currency: bookingResult.currency,
    });
    await markBookingIntentCompleted(intent.id, bookingId);
    await updateBookingStatus({ bookingId, userId: input.userId, status: bookingResult.status });
    return { outcome: "success", intentId: intent.id, bookingId, bookingResult };
  } catch (error) {
    // Provider YA confirmó pero Supabase falló: nunca "failed" (liberar el
    // intent duplicaría la reserva en el provider real) — orphaned.
    await markBookingIntentProviderConfirmedOrphaned(intent.id);
    return {
      outcome: "persistence_error",
      intentId: intent.id,
      message: error instanceof Error ? error.message : "fallo de persistencia desconocido",
    };
  }
}

import { createServiceRoleClient } from "../supabase/service";
import type { BookingStatus } from "../../types/travel";

// F6-03 (VIAO_ROADMAP.md) — Transición de estado de una reserva ya
// existente (`pending` -> `confirmed`/`cancelled`), según la respuesta
// real del provider.
//
// Contrato real de `TravelProvider.book()` (auditado en F4-06/
// `lib/travel-provider/mock-provider.ts` antes de escribir este archivo):
// - Éxito: devuelve `BookingResult` con `status: "confirmed"` (el mock
//   nunca devuelve otro valor en el camino de éxito).
// - Rechazo (sin disponibilidad): lanza `ProviderUnavailableError` — NO
//   devuelve un `BookingResult`.
// - Error técnico/validación: lanza `ProviderError` — tampoco devuelve
//   un `BookingResult`.
//
// `app/booking/actions.ts` (F6-02) ya llama a `provider.book()` ANTES de
// crear ninguna fila en `bookings`: si el provider rechaza o falla, la
// función retorna sin persistir nada (documentado explícitamente en ese
// archivo: "La tabla nunca contiene una reserva 'pending' que el provider
// ya rechazó"). Consecuencia directa, verificada en esta auditoría: NO
// existe ningún camino en el que `createBookingRecord` se ejecute con un
// resultado de rechazo/error — por tanto no existe una fila `pending` que
// deba transicionar a `cancelled` por una respuesta negativa de `book()`.
// Esto no es una contradicción del roadmap: es la consecuencia esperada
// del orden que el propio F6-02 documentó como requisito ("evitar crear
// una reserva persistida que diga 'pending' si el provider ya rechazó la
// operación"). Ver el reporte de la fase para el detalle completo.
//
// Esta función, por tanto, se invoca únicamente tras una creación
// exitosa (provider ya aceptó, fila ya insertada como `pending`) para
// dejar la fila en el estado que el provider realmente devolvió
// (`bookingResult.status`, "confirmed" en el mock). No decide el estado
// por intuición: se limita a trasladar el que ya vino de
// `TravelProvider.book()`.
//
// Solo se actualiza `status` (+ `updated_at`, sin trigger automático en
// la tabla — verificado en la migración de creación de `bookings`: no
// existe ningún `CREATE TRIGGER` sobre esta tabla). El resto de columnas
// económicas (`booking_value`, `currency`, `provider_booking_reference`)
// ya quedaron correctamente escritas en la propia inserción de F6-02, con
// el mismo `bookingResult` — no hay ningún dato nuevo del provider que
// llegue después, así que no se reescriben aquí (evita duplicar lógica
// entre `create-booking-record.ts` y este archivo).
//
// RLS/GRANT: `bookings` (Patrón B) no concede UPDATE a `authenticated` ni
// a `anon` bajo ninguna circunstancia (VIAO_DATABASE.md sección 6:
// "nadie desde el cliente"). `service_role` bypassa RLS pero necesitaba un
// GRANT explícito de UPDATE que no existía hasta esta fase — ver
// supabase/migrations/20260818090000_grant_service_role_bookings_update.sql.
// Como `service_role` no está sujeto a la policy `bookings_select_own`
// (esa RLS es solo para `authenticated`), el ownership se aplica aquí
// explícitamente en la propia consulta (`.eq("user_id", userId)`), no de
// forma implícita: sin esa condición, `service_role` podría actualizar la
// fila de cualquier usuario. `bookingId` + `userId` deben coincidir con
// una fila real, o la operación se considera fallida (0 filas afectadas).
export interface UpdateBookingStatusInput {
  bookingId: string;
  userId: string;
  status: BookingStatus;
}

export async function updateBookingStatus({
  bookingId,
  userId,
  status,
}: UpdateBookingStatusInput): Promise<void> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingId)
    .eq("user_id", userId)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `No se pudo actualizar el estado de la reserva "${bookingId}": ${
        error?.message ?? "no se encontró una fila para ese id perteneciente a ese usuario"
      }`,
    );
  }
}

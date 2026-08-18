"use client";

import { useId, useState, useTransition, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";

import type { BookingPrefill } from "./resolve";
import { createBookingAction } from "../actions";
import type { BookingActionResult } from "../actions";

interface BookingFormValues {
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

interface BookingFormErrors {
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  rooms?: string;
}

// F6-01/F6-02 — Mismas 4 reglas ya establecidas por `types/travel.ts`
// `BookingRequest`/`SearchParams` y por las CHECK constraints de
// `bookings`/`searches` (VIAO_DATABASE.md): checkIn/checkOut obligatorios,
// check_out > check_in, guests > 0, rooms > 0. Sin "destino" (la propiedad
// ya está elegida) y sin ningún dato de huésped (nombre/email/teléfono):
// `BookingRequest` y la tabla `bookings` no modelan ninguno todavía — no
// se inventan. Validación client-side idéntica a la que
// `createBookingAction` (F6-02) repite server-side — el cliente no es de
// confianza en ese límite, esta es solo feedback inmediato.
function validate(values: BookingFormValues): BookingFormErrors {
  const errors: BookingFormErrors = {};

  if (!values.checkIn) {
    errors.checkIn = t("booking.validationCheckInRequired");
  }
  if (!values.checkOut) {
    errors.checkOut = t("booking.validationCheckOutRequired");
  }
  if (values.checkIn && values.checkOut && !(values.checkOut > values.checkIn)) {
    errors.checkOut = t("booking.validationDateRange");
  }
  if (values.guests < 1) {
    errors.guests = t("booking.validationGuestsMin");
  }
  if (values.rooms < 1) {
    errors.rooms = t("booking.validationRoomsMin");
  }

  return errors;
}

// F6-02 (VIAO_ROADMAP.md) — mapea los resultados de error de
// `createBookingAction` que no llevan ya un `message` propio (`unavailable`/
// `provider_error`/`persistence_error` sí lo traen del provider/backend,
// se muestran tal cual) a un texto fijo. Sin categorías nuevas: son
// exactamente los estados que la propia Action distingue.
function errorMessageFor(result: BookingActionResult): string | undefined {
  switch (result.status) {
    case "unauthenticated":
      return t("booking.errorUnauthenticatedMessage");
    case "not_found":
      return t("booking.errorNotFoundMessage");
    case "unavailable":
    case "provider_error":
    case "persistence_error":
      return result.message;
    default:
      return undefined;
  }
}

export function BookingForm({
  propertyId,
  searchId,
  prefill,
}: {
  propertyId: string;
  searchId?: string;
  prefill?: BookingPrefill;
}) {
  const checkInId = useId();
  const checkOutId = useId();
  const guestsId = useId();
  const roomsId = useId();

  const [checkIn, setCheckIn] = useState(prefill?.checkIn ?? "");
  const [checkOut, setCheckOut] = useState(prefill?.checkOut ?? "");
  const [guests, setGuests] = useState(prefill?.guests ?? 1);
  const [rooms, setRooms] = useState(prefill?.rooms ?? 1);
  const [errors, setErrors] = useState<BookingFormErrors>({});
  const [result, setResult] = useState<BookingActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function clearResult() {
    if (result) {
      setResult(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate({ checkIn, checkOut, guests, rooms });
    setErrors(nextErrors);

    const hasErrors = Boolean(
      nextErrors.checkIn ||
        nextErrors.checkOut ||
        nextErrors.guests ||
        nextErrors.rooms,
    );

    if (hasErrors) {
      setResult(null);
      return;
    }

    startTransition(async () => {
      const actionResult = await createBookingAction({
        propertyId,
        checkIn,
        checkOut,
        guests,
        rooms,
        searchId,
      });
      setResult(actionResult);
      if (actionResult.status === "invalid_input") {
        setErrors({
          checkIn: actionResult.fieldErrors.checkIn,
          checkOut: actionResult.fieldErrors.checkOut,
          guests: actionResult.fieldErrors.guests,
          rooms: actionResult.fieldErrors.rooms,
        });
      }
    });
  }

  const message = result ? errorMessageFor(result) : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={checkInId} className="text-sm font-medium">
          {t("booking.checkInLabel")}
        </label>
        <Input
          id={checkInId}
          name="checkIn"
          type="date"
          value={checkIn}
          onChange={(event) => {
            setCheckIn(event.target.value);
            clearResult();
          }}
          aria-invalid={errors.checkIn ? true : undefined}
          aria-describedby={errors.checkIn ? `${checkInId}-error` : undefined}
        />
        {errors.checkIn && (
          <p id={`${checkInId}-error`} className="text-sm text-destructive">
            {errors.checkIn}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={checkOutId} className="text-sm font-medium">
          {t("booking.checkOutLabel")}
        </label>
        <Input
          id={checkOutId}
          name="checkOut"
          type="date"
          value={checkOut}
          onChange={(event) => {
            setCheckOut(event.target.value);
            clearResult();
          }}
          aria-invalid={errors.checkOut ? true : undefined}
          aria-describedby={errors.checkOut ? `${checkOutId}-error` : undefined}
        />
        {errors.checkOut && (
          <p id={`${checkOutId}-error`} className="text-sm text-destructive">
            {errors.checkOut}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={guestsId} className="text-sm font-medium">
          {t("booking.guestsLabel")}
        </label>
        <Input
          id={guestsId}
          name="guests"
          type="number"
          min={1}
          step={1}
          value={guests}
          onChange={(event) => {
            setGuests(event.target.value === "" ? 0 : Number(event.target.value));
            clearResult();
          }}
          aria-invalid={errors.guests ? true : undefined}
          aria-describedby={errors.guests ? `${guestsId}-error` : undefined}
        />
        {errors.guests && (
          <p id={`${guestsId}-error`} className="text-sm text-destructive">
            {errors.guests}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={roomsId} className="text-sm font-medium">
          {t("booking.roomsLabel")}
        </label>
        <Input
          id={roomsId}
          name="rooms"
          type="number"
          min={1}
          step={1}
          value={rooms}
          onChange={(event) => {
            setRooms(event.target.value === "" ? 0 : Number(event.target.value));
            clearResult();
          }}
          aria-invalid={errors.rooms ? true : undefined}
          aria-describedby={errors.rooms ? `${roomsId}-error` : undefined}
        />
        {errors.rooms && (
          <p id={`${roomsId}-error`} className="text-sm text-destructive">
            {errors.rooms}
          </p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? t("booking.submitButtonLoading") : t("booking.submitButton")}
      </Button>

      {result?.status === "success" && (
        <p role="status" className="text-sm">
          {t("booking.successMessage")}
        </p>
      )}
      {message && <ErrorState message={message} />}
    </form>
  );
}

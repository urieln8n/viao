"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { t } from "@/lib/i18n";

interface HomeSearchFormValues {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

interface HomeSearchFormErrors {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  rooms?: string;
}

// Bloque 4 (VIAO Design System) — buscador protagonista de Home (Estado
// A, "sin viaje"). Mismas 4 reglas de validación que ya usan
// `app/search/page.tsx` (F5-01) y `app/booking/[propertyId]/booking-form.tsx`
// (F6-02): destino obligatorio, check_out > check_in, guests > 0,
// rooms > 0 — impuestas por `types/travel.ts SearchParams` y las CHECK
// constraints de `searches` (VIAO_DATABASE.md), no inventadas aquí. Mismo
// destino final que `/search`: navega a `/search/results` con los mismos
// query params (`destination`/`checkIn`/`checkOut`/`guests`/`rooms`) —
// la validación real y vinculante sigue viviendo en `searchAction`
// (`app/search/actions.ts`), sin tocarla.
//
// No se extrajo un componente compartido con `app/search/page.tsx`
// porque ese archivo pertenece a un bloque de diseño distinto (Search),
// fuera del alcance autorizado de este bloque — modificarlo para
// reutilizar literalmente su JSX habría excedido "Home". Este formulario
// reutiliza en su lugar las mismas claves `search.*` de `lib/i18n` (mismo
// copy exacto) y el mismo contrato de navegación; solo las ~15 líneas de
// validación client-side (ya documentadas en ambos sitios como no
// vinculantes, puro feedback inmediato) existen en dos archivos.
function validate(values: HomeSearchFormValues): HomeSearchFormErrors {
  const errors: HomeSearchFormErrors = {};

  if (!values.destination.trim()) {
    errors.destination = t("search.validationDestinationRequired");
  }
  if (!values.checkIn) {
    errors.checkIn = t("search.validationCheckInRequired");
  }
  if (!values.checkOut) {
    errors.checkOut = t("search.validationCheckOutRequired");
  }
  if (values.checkIn && values.checkOut && !(values.checkOut > values.checkIn)) {
    errors.checkOut = t("search.validationDateRange");
  }
  if (values.guests < 1) {
    errors.guests = t("search.validationGuestsMin");
  }
  if (values.rooms < 1) {
    errors.rooms = t("search.validationRoomsMin");
  }

  return errors;
}

export function HomeSearchForm() {
  const router = useRouter();

  const destinationId = useId();
  const checkInId = useId();
  const checkOutId = useId();
  const guestsId = useId();
  const roomsId = useId();

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [errors, setErrors] = useState<HomeSearchFormErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors = validate({ destination, checkIn, checkOut, guests, rooms });
    setErrors(nextErrors);

    const hasErrors = Boolean(
      nextErrors.destination ||
        nextErrors.checkIn ||
        nextErrors.checkOut ||
        nextErrors.guests ||
        nextErrors.rooms,
    );

    if (hasErrors) {
      return;
    }

    const query = new URLSearchParams({
      destination: destination.trim(),
      checkIn,
      checkOut,
      guests: String(guests),
      rooms: String(rooms),
    });
    router.push(`/search/results?${query.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={destinationId} className="text-sm font-medium">
          {t("search.destinationLabel")}
        </label>
        <Input
          id={destinationId}
          name="destination"
          type="text"
          autoComplete="off"
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          aria-invalid={errors.destination ? true : undefined}
          aria-describedby={errors.destination ? `${destinationId}-error` : undefined}
        />
        {errors.destination && (
          <p id={`${destinationId}-error`} className="text-sm text-destructive">
            {errors.destination}
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={checkInId} className="text-sm font-medium">
            {t("search.checkInLabel")}
          </label>
          <Input
            id={checkInId}
            name="checkIn"
            type="date"
            value={checkIn}
            onChange={(event) => setCheckIn(event.target.value)}
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
            {t("search.checkOutLabel")}
          </label>
          <Input
            id={checkOutId}
            name="checkOut"
            type="date"
            value={checkOut}
            onChange={(event) => setCheckOut(event.target.value)}
            aria-invalid={errors.checkOut ? true : undefined}
            aria-describedby={errors.checkOut ? `${checkOutId}-error` : undefined}
          />
          {errors.checkOut && (
            <p id={`${checkOutId}-error`} className="text-sm text-destructive">
              {errors.checkOut}
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={guestsId} className="text-sm font-medium">
            {t("search.guestsLabel")}
          </label>
          <Input
            id={guestsId}
            name="guests"
            type="number"
            min={1}
            step={1}
            value={guests}
            onChange={(event) =>
              setGuests(event.target.value === "" ? 0 : Number(event.target.value))
            }
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
            {t("search.roomsLabel")}
          </label>
          <Input
            id={roomsId}
            name="rooms"
            type="number"
            min={1}
            step={1}
            value={rooms}
            onChange={(event) =>
              setRooms(event.target.value === "" ? 0 : Number(event.target.value))
            }
            aria-invalid={errors.rooms ? true : undefined}
            aria-describedby={errors.rooms ? `${roomsId}-error` : undefined}
          />
          {errors.rooms && (
            <p id={`${roomsId}-error`} className="text-sm text-destructive">
              {errors.rooms}
            </p>
          )}
        </div>
      </div>

      <Button type="submit">{t("search.submitButton")}</Button>
    </form>
  );
}

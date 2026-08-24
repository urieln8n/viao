"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DestinationInput, type DestinationCatalogEntry } from "@/components/search/destination-input";
import { t } from "@/lib/i18n";

interface SearchFormValues {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms: number;
}

interface SearchFormErrors {
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: string;
  rooms?: string;
}

// Únicas reglas ya definidas por el dominio (types/travel.ts `SearchParams`)
// y por las CHECK constraints de `searches` (VIAO_DATABASE.md): destino
// obligatorio, check_out > check_in, guests > 0, rooms > 0. Ninguna regla
// adicional (estancia mínima, máximo de huéspedes, fechas pasadas, etc.)
// está documentada, así que no se añade aquí.
function validate(values: SearchFormValues): SearchFormErrors {
  const errors: SearchFormErrors = {};

  if (!values.destination.trim()) {
    errors.destination = t("search.validationDestinationRequired");
  }
  if (!values.checkIn) {
    errors.checkIn = t("search.validationCheckInRequired");
  }
  if (!values.checkOut) {
    errors.checkOut = t("search.validationCheckOutRequired");
  }
  // Comparación lexicográfica válida: ambos campos son "YYYY-MM-DD".
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

export interface SearchFormProps {
  /** Catálogo real de destinos (FPR-HOTELS-02) — cargado server-side en page.tsx, única fuente de verdad para el autocomplete (nunca MockHotelProvider.listKnownDestinations()). */
  destinations: DestinationCatalogEntry[];
}

export function SearchForm({ destinations }: SearchFormProps) {
  const router = useRouter();

  const destinationId = useId();
  const checkInId = useId();
  const checkOutId = useId();
  const guestsId = useId();
  const roomsId = useId();

  const [destination, setDestination] = useState("");
  // FPR-HOTELS-02: código de destino YA resuelto en el momento de la
  // selección (nunca se vuelve a resolver por nombre si ya se conoce) —
  // se limpia en cuanto el usuario vuelve a escribir texto libre, para no
  // enviar un código que ya no corresponde a lo escrito.
  const [destinationCode, setDestinationCode] = useState<string | undefined>(undefined);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [rooms, setRooms] = useState(1);
  const [errors, setErrors] = useState<SearchFormErrors>({});
  // Bloque Claridad de producto V1 — mismo patrón `isSubmitting` ya usado
  // en el resto de formularios del proyecto (Register, Login, GoalForm,
  // BookingForm...): este era el único formulario interactivo sin
  // protección contra doble envío. No hay ninguna llamada async aquí
  // (`router.push` es una navegación, no una Server Action), así que
  // basta con fijar el estado de forma síncrona antes de navegar —el
  // componente se desmonta con el cambio de ruta, sin necesidad de
  // resetearlo después.
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsSubmitting(true);

    // F5-03: validado client-side (feedback inmediato, igual que F5-01),
    // navega al listado de resultados con la búsqueda como query params.
    // La validación real y vinculante sigue siendo la de `searchAction`
    // (F5-02), server-side, en `app/search/results/page.tsx`.
    const query = new URLSearchParams({
      destination: destination.trim(),
      checkIn,
      checkOut,
      guests: String(guests),
      rooms: String(rooms),
    });
    // FPR-HOTELS-02: solo se añade si de verdad se seleccionó del
    // catálogo (nunca un código inventado a partir de texto libre).
    if (destinationCode) {
      query.set("destinationCode", destinationCode);
    }
    router.push(`/search/results?${query.toString()}`);
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6">
      <div className="flex w-full max-w-sm flex-col gap-2 text-center">
        <h1 className="text-2xl font-semibold">{t("search.title")}</h1>
      </div>

      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col gap-4 py-2">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor={destinationId} className="text-sm font-medium">
                {t("search.destinationLabel")}
              </label>
              <DestinationInput
                id={destinationId}
                name="destination"
                value={destination}
                onChange={(value) => {
                  setDestination(value);
                  setDestinationCode(undefined);
                }}
                onDestinationCodeChange={setDestinationCode}
                destinations={destinations}
                ariaInvalid={errors.destination ? true : undefined}
                ariaDescribedBy={
                  errors.destination ? `${destinationId}-error` : undefined
                }
              />
              {errors.destination && (
                <p
                  id={`${destinationId}-error`}
                  className="text-sm text-destructive"
                >
                  {errors.destination}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                {t("search.datesGroupLabel")}
              </span>
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
                    aria-describedby={
                      errors.checkIn ? `${checkInId}-error` : undefined
                    }
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
                    aria-describedby={
                      errors.checkOut ? `${checkOutId}-error` : undefined
                    }
                  />
                  {errors.checkOut && (
                    <p id={`${checkOutId}-error`} className="text-sm text-destructive">
                      {errors.checkOut}
                    </p>
                  )}
                </div>
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
                    setGuests(
                      event.target.value === "" ? 0 : Number(event.target.value),
                    )
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
                    setRooms(
                      event.target.value === "" ? 0 : Number(event.target.value),
                    )
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

            <Button type="submit" disabled={isSubmitting}>
              {t("search.submitButton")}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

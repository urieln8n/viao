"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";

import { createTripAction, type CreateTripActionResult } from "./actions";

// F11-01 (VIAO_ROADMAP.md) — Único punto de la app que invoca
// createTripAction. Mismo patrón que BookingForm/AiRecommendationView:
// Client Component delgado, validación duplicada solo como feedback
// inmediato (el servidor no confía en ella).
function errorMessageFor(result: CreateTripActionResult): string | undefined {
  if (result.status === "unauthenticated") {
    return t("trips.errorUnauthenticated");
  }
  return undefined;
}

export function CreateTripForm() {
  const destinationId = useId();
  const startDateId = useId();
  const endDateId = useId();
  const router = useRouter();

  const [destination, setDestination] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [errors, setErrors] = useState<{ destination?: string; endDate?: string }>({});
  const [result, setResult] = useState<CreateTripActionResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);

    startTransition(async () => {
      const actionResult = await createTripAction({
        destination,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setResult(actionResult);

      if (actionResult.status === "invalid_input") {
        setErrors(actionResult.fieldErrors);
        return;
      }
      setErrors({});

      if (actionResult.status === "success") {
        router.push(`/trips/${actionResult.tripId}`);
      }
    });
  }

  const message = result ? errorMessageFor(result) : undefined;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor={destinationId} className="text-sm font-medium">
          {t("trips.destinationLabel")}
        </label>
        <Input
          id={destinationId}
          value={destination}
          onChange={(event) => setDestination(event.target.value)}
          aria-invalid={errors.destination ? true : undefined}
        />
        {errors.destination && (
          <p className="text-sm text-destructive">{errors.destination}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={startDateId} className="text-sm font-medium">
          {t("trips.startDateLabel")}
        </label>
        <Input
          id={startDateId}
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={endDateId} className="text-sm font-medium">
          {t("trips.endDateLabel")}
        </label>
        <Input
          id={endDateId}
          type="date"
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          aria-invalid={errors.endDate ? true : undefined}
        />
        {errors.endDate && (
          <p className="text-sm text-destructive">{errors.endDate}</p>
        )}
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? t("trips.createButtonLoading") : t("trips.createButton")}
      </Button>

      {message && <ErrorState message={message} />}
    </form>
  );
}

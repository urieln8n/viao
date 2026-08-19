"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { associateBookingAction } from "./actions";
import type { AssociableBooking } from "../../../lib/trips/get-associable-bookings";

// F11-02 (VIAO_ROADMAP.md) — Único punto de la app que invoca
// associateBookingAction. El cliente solo puede elegir de la lista de
// SUS PROPIAS reservas (ya cargada server-side por
// app/trips/[id]/page.tsx vía getAssociableBookings, RLS
// bookings_select_own) — nunca escribe un bookingId arbitrario.
export function AssociateBookingForm({
  tripId,
  bookings,
}: {
  tripId: string;
  bookings: AssociableBooking[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleAssociate(bookingId: string) {
    startTransition(async () => {
      await associateBookingAction(tripId, bookingId);
      router.refresh();
    });
  }

  if (bookings.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("trips.associateBookingEmpty")}
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {bookings.map((booking) => {
        const alreadyAssociated = booking.tripId === tripId;
        return (
          <li
            key={booking.id}
            className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium">
                {booking.propertyName ?? booking.propertyId}
              </span>
              <span className="text-xs text-muted-foreground">
                {booking.checkIn} — {booking.checkOut} ({booking.status})
              </span>
            </div>
            {alreadyAssociated ? (
              <span className="text-xs text-muted-foreground">
                {t("trips.associatedLabel")}
              </span>
            ) : (
              <Button
                variant="outline"
                disabled={isPending}
                onClick={() => handleAssociate(booking.id)}
              >
                {t("trips.associateButton")}
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";

import { getTripDetail } from "../../../lib/trips/get-trip-detail";
import { getAssociableBookings } from "../../../lib/trips/get-associable-bookings";
import { isValidUuid } from "../../properties/[id]/resolve";
import { AssociateBookingForm } from "./associate-booking-form";

// F11-04 (VIAO_ROADMAP.md) — Resumen del viaje. Server Component, datos
// exclusivamente vía lib/trips/ (getTripDetail agrega reservas/fotos/
// escaneos/rewards en un único punto, F11-04) — mismo patrón que
// app/booking/[propertyId]/status/page.tsx. `id` inválido/inexistente/
// ajeno son indistinguibles (mismo criterio de todo el proyecto: RLS
// filtra, `getTripById` devuelve `undefined`, aquí se muestra
// "no encontrado" sin filtrar cuál de los tres casos era).
interface TripDetailPageProps {
  params: Promise<{ id: string }>;
}

function BackToTripsLink() {
  return (
    <Link href="/trips" className={buttonVariants({ variant: "outline" })}>
      {t("trips.backToTrips")}
    </Link>
  );
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <ErrorState
          title={t("trips.notFoundTitle")}
          message={t("trips.notFoundMessage")}
          action={<BackToTripsLink />}
        />
      </main>
    );
  }

  const detail = await getTripDetail(id);

  if (!detail) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <ErrorState
          title={t("trips.notFoundTitle")}
          message={t("trips.notFoundMessage")}
          action={<BackToTripsLink />}
        />
      </main>
    );
  }

  const associableBookings = await getAssociableBookings();
  const { trip, bookings, photos, scans, rewards } = detail;
  const totalPoints = rewards.reduce((sum, reward) => sum + reward.amount, 0);

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">{trip.destination}</h1>
        <p className="text-sm text-muted-foreground">
          {trip.startDate && trip.endDate
            ? `${trip.startDate} — ${trip.endDate}`
            : t("trips.datesUnset")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("trips.bookingsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("trips.bookingsEmpty")}</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {bookings.map((booking) => (
                <li key={booking.id} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium">{booking.propertyId}</span>
                  <span className="text-xs text-muted-foreground">
                    {booking.checkIn} — {booking.checkOut} ({booking.status})
                    {booking.bookingValue != null &&
                      ` · ${booking.bookingValue} ${booking.currency}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trips.associateBookingTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <AssociateBookingForm tripId={trip.id} bookings={associableBookings} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trips.photosTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {photos.length === 0 ? (
            <EmptyState message={t("trips.photosEmpty")} />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {photos.map((photo) => (
                <li key={photo.id} className="py-2 text-sm first:pt-0 last:pb-0">
                  {photo.caption ?? photo.storagePath}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trips.scansTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {scans.length === 0 ? (
            <EmptyState message={t("trips.scansEmpty")} />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {scans.map((scan) => (
                <li key={scan.id} className="flex flex-col gap-0.5 py-2 text-sm first:pt-0 last:pb-0">
                  <span>{scan.translatedText || scan.explanation}</span>
                  <span className="text-xs text-muted-foreground">
                    {scan.sourceLanguage ?? "?"} → {scan.targetLanguage}
                    {scan.imageRetained && ` · ${t("trips.associatedLabel")}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("trips.rewardsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {rewards.length === 0 ? (
            <EmptyState message={t("trips.rewardsEmpty")} />
          ) : (
            <p className="text-lg font-semibold">
              {totalPoints} <span className="text-sm font-normal text-muted-foreground">{t("trips.pointsUnit")}</span>
            </p>
          )}
        </CardContent>
      </Card>

      <BackToTripsLink />
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CircleCheck, CircleX, Clock, ImageOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { resolveBookingStatus } from "./resolve";
import { formatLocation, formatPrice, formatRating } from "../../../search/results/format";
import type { BookingStatus } from "../../../../types/travel";

// F6-05 (VIAO_ROADMAP.md) — Pantalla de estado de una reserva existente.
//
// Server Component, mismo patrón que app/properties/[id]/page.tsx (F5-04)
// y app/booking/[propertyId]/page.tsx (F6-01): obtiene los datos
// exclusivamente vía `resolveBookingStatus()` (este mismo directorio), sin
// lógica de sesión/Supabase aquí. Sin `loading.tsx`: F6-01 descubrió que
// añadir uno en una ruta dinámica de este tipo hace que Next.js confirme
// un HTTP 200 antes de que `notFound()` resuelva dentro del boundary de
// Suspense, rompiendo el 404 real — se verifica explícitamente en el
// reporte de esta fase que `/booking/<uuid-inexistente>/status` sigue
// devolviendo 404 real sin ese archivo.
//
// Ubicación real (anomalía documentada en el reporte de esta fase): el
// roadmap especifica literalmente `app/booking/[id]/status/`, pero esa
// carpeta como HERMANA de `app/booking/[propertyId]/` (F6-01, ya
// implementada) hace que Next.js rechace el árbol de rutas en el arranque
// ("You cannot use different slug names for the same dynamic path ('id'
// !== 'propertyId')") — un único segmento dinámico por nivel debe usar
// siempre el mismo nombre de parámetro. Sin poder ni deber renombrar
// `[propertyId]` (modificaría F6-01, fuera de alcance y prohibido por esta
// misma fase), la única solución puramente técnica —sin decisión de
// producto— es anidar `status/` DENTRO del segmento ya existente. La URL
// resultante es exactamente la pedida (`/booking/<uuid>/status`); solo
// cambia el nombre interno del parámetro de Next.js, que aquí NO es un
// `providerPropertyId` (a pesar del nombre de la carpeta que lo contiene)
// sino el UUID interno de `bookings.id` — de ahí el `propertyId: bookingId`
// del destructuring de abajo, para no arrastrar el nombre confuso al resto
// del archivo. Reutiliza `isValidUuid` (app/properties/[id]/resolve.ts)
// dentro de `resolveBookingStatus` para tratar cualquier valor sin forma
// de UUID como inexistente, igual que el resto de rutas de la Fase 5/6.
interface BookingStatusPageProps {
  params: Promise<{ propertyId: string }>;
}

function BackToPropertyLink({
  providerPropertyId,
}: {
  providerPropertyId: string;
}) {
  return (
    <Link
      href={`/properties/${providerPropertyId}`}
      className={buttonVariants({ variant: "outline" })}
    >
      {t("bookingStatus.backToProperty")}
    </Link>
  );
}

function BackToSearchLink() {
  return (
    <Link href="/search" className={buttonVariants({ variant: "outline" })}>
      {t("bookingStatus.backToSearch")}
    </Link>
  );
}

// Solo los 3 estados reales de `bookings.status` (VIAO_DATABASE.md sección
// 6) — ninguno inventado. Colores/iconos tomados de los tokens ya
// existentes del proyecto (`text-primary`/`text-muted-foreground`/
// `text-destructive`): no se introduce una paleta "success/warning" nueva.
const STATUS_ICON: Record<BookingStatus, LucideIcon> = {
  pending: Clock,
  confirmed: CircleCheck,
  cancelled: CircleX,
};

const STATUS_ICON_CLASS: Record<BookingStatus, string> = {
  pending: "text-muted-foreground",
  confirmed: "text-primary",
  cancelled: "text-destructive",
};

const STATUS_TITLE_KEY: Record<BookingStatus, TranslationKey> = {
  pending: "bookingStatus.pendingTitle",
  confirmed: "bookingStatus.confirmedTitle",
  cancelled: "bookingStatus.cancelledTitle",
};

const STATUS_DESCRIPTION_KEY: Record<BookingStatus, TranslationKey> = {
  pending: "bookingStatus.pendingDescription",
  confirmed: "bookingStatus.confirmedDescription",
  cancelled: "bookingStatus.cancelledDescription",
};

export default async function BookingStatusPage({
  params,
}: BookingStatusPageProps) {
  const { propertyId: bookingId } = await params;
  const result = await resolveBookingStatus(bookingId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "unauthenticated") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <ErrorState
          title={t("bookingStatus.unauthenticatedTitle")}
          message={t("bookingStatus.unauthenticatedMessage")}
          action={
            <Link
              href="/login"
              className={buttonVariants({ variant: "default" })}
            >
              {t("bookingStatus.loginCta")}
            </Link>
          }
        />
      </main>
    );
  }

  if (result.status === "error") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <ErrorState
          title={t("bookingStatus.errorTitle")}
          message={result.message}
          action={<BackToSearchLink />}
        />
      </main>
    );
  }

  const { booking } = result;
  const StatusIcon = STATUS_ICON[booking.status];
  const location = formatLocation(booking.property);
  const rating = formatRating(booking.property.rating);
  const price =
    booking.bookingValue !== undefined
      ? formatPrice({ amount: booking.bookingValue, currency: booking.currency })
      : undefined;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <BackToPropertyLink
        providerPropertyId={booking.property.providerPropertyId}
      />

      <h1 className="text-xl font-semibold">{t("bookingStatus.pageTitle")}</h1>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <StatusIcon
            className={`size-6 shrink-0 ${STATUS_ICON_CLASS[booking.status]}`}
            aria-hidden="true"
          />
          <CardTitle>{t(STATUS_TITLE_KEY[booking.status])}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t(STATUS_DESCRIPTION_KEY[booking.status])}
          </p>
        </CardContent>
      </Card>

      <Card>
        <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
          {booking.property.mainPhotoUrl ? (
            <Image
              src={booking.property.mainPhotoUrl}
              alt={booking.property.name}
              fill
              unoptimized
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <ImageOff
                className="size-6 text-muted-foreground"
                aria-hidden="true"
              />
            </div>
          )}
        </div>
        <CardHeader>
          <CardTitle className="break-words">{booking.property.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          {rating && <p className="text-sm text-muted-foreground">★ {rating}</p>}
          {location && (
            <p className="text-sm text-muted-foreground break-words">
              {location}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-muted-foreground">
              {t("bookingStatus.checkInLabel")}
            </dt>
            <dd>{booking.checkIn}</dd>
            <dt className="text-muted-foreground">
              {t("bookingStatus.checkOutLabel")}
            </dt>
            <dd>{booking.checkOut}</dd>
            <dt className="text-muted-foreground">
              {t("bookingStatus.guestsLabel")}
            </dt>
            <dd>{booking.guests}</dd>
            {booking.providerBookingReference && (
              <>
                <dt className="text-muted-foreground">
                  {t("bookingStatus.referenceLabel")}
                </dt>
                <dd className="break-all">
                  {booking.providerBookingReference}
                </dd>
              </>
            )}
            {price && (
              <>
                <dt className="text-muted-foreground">
                  {t("bookingStatus.priceLabel")}
                </dt>
                <dd>{price}</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </main>
  );
}

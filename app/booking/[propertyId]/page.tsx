import Link from "next/link";
import { notFound } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { PropertyImage } from "@/components/property/property-image";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";

import { resolveBookingContext } from "./resolve";
import { BookingForm } from "./booking-form";
import { formatLocation, formatPrice, formatRating } from "../../search/results/format";

// F6-01 (VIAO_ROADMAP.md) — Pantalla de confirmación/inicio de reserva.
//
// Flujo: /properties/[id] (F5-04) → CTA "Reservar" (nuevo en esta fase) →
// /booking/[propertyId] (aquí), conservando `search_id` (F5-07) cuando
// existe. Server Component: obtiene el contexto exclusivamente vía
// `resolveBookingContext()` (este mismo directorio), que a su vez solo
// conoce `getTravelProvider()` — nunca `MockHotelProvider` directamente.
//
// Extensión F6-02 (documentada): el formulario (`./booking-form.tsx`)
// valida client-side y, si es válido, llama a `createBookingAction`
// (`../actions.ts`) — la Server Action real de reserva. Esta página solo
// pasa `propertyId`/`searchId` al formulario; toda la lógica de reserva
// (validación server-side, `getTravelProvider().book()`, persistencia en
// `bookings`) vive en `app/booking/actions.ts`, no aquí.
//
// Datos mostrados: únicamente los que expone `Property`/`getDetails()`
// (foto, nombre, valoración, ubicación — mismo criterio que F5-04, mismos
// campos inexistentes en el modelo omitidos) más, si `search_id` trae una
// búsqueda propia real, un precio de referencia (`getPrice()`).
//
// Datos solicitados: exactamente los 4 campos que `BookingRequest`
// (F4-02) necesita más allá del alojamiento ya elegido — `checkIn`,
// `checkOut`, `guests`, `rooms` — precargados desde la búsqueda de origen
// cuando está disponible. Ningún dato de huésped (nombre/email/teléfono):
// ni `BookingRequest` ni la tabla `bookings` los modelan todavía en
// ningún documento existente, así que no se inventan.

interface RawBookingQuery {
  search_id?: string | string[];
}

interface BookingPageProps {
  params: Promise<{ propertyId: string }>;
  searchParams: Promise<RawBookingQuery>;
}

function BackToPropertyLink({
  propertyId,
  searchId,
}: {
  propertyId: string;
  searchId?: string;
}) {
  const href = searchId
    ? `/properties/${propertyId}?search_id=${encodeURIComponent(searchId)}`
    : `/properties/${propertyId}`;

  return (
    <Link href={href} className={buttonVariants({ variant: "outline" })}>
      {t("booking.backToProperty")}
    </Link>
  );
}

export default async function BookingPage({
  params,
  searchParams,
}: BookingPageProps) {
  const { propertyId } = await params;
  const rawQuery = await searchParams;
  const rawSearchId =
    typeof rawQuery.search_id === "string" ? rawQuery.search_id : undefined;
  const result = await resolveBookingContext(propertyId, rawSearchId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "provider_error") {
    return (
      <main className="flex flex-1 flex-col">
        <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
          <ErrorState
            title={t("booking.errorTitle")}
            message={result.message}
            action={<BackToPropertyLink propertyId={propertyId} />}
          />
        </PageContainer>
      </main>
    );
  }

  const { property, searchId, prefill, price } = result.context;
  const location = formatLocation(property);
  const rating = formatRating(property.rating);
  const referencePrice = formatPrice(price);

  return (
    <main className="flex flex-1 flex-col" data-search-id={searchId}>
      <PageContainer variant="default" className="flex flex-1 flex-col gap-6 p-6">
        <BackToPropertyLink propertyId={propertyId} searchId={searchId} />

        <h1 className="text-2xl font-semibold">{t("booking.title")}</h1>

        <Card className="overflow-hidden">
          <PropertyImage
            src={property.mainPhotoUrl}
            alt={property.name}
            className="rounded-t-xl"
          />
          <CardHeader>
            <CardTitle className="break-words">{property.name}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {rating && <span>★ {rating}</span>}
              {location && <span className="break-words">{location}</span>}
            </div>
            {referencePrice && (
              <p className="text-lg font-semibold">
                {referencePrice}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  ({t("booking.priceFromSearchNote")})
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("booking.formTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <BookingForm
              propertyId={propertyId}
              searchId={searchId}
              prefill={prefill}
            />
          </CardContent>
        </Card>
      </PageContainer>
    </main>
  );
}

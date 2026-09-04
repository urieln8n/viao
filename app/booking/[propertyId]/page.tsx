import Link from "next/link";
import { notFound } from "next/navigation";
import { Gift } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/state/error-state";
import { PropertyImage } from "@/components/property/property-image";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";

import { resolveBookingContext } from "./resolve";
import { BookingForm } from "./booking-form";
import { formatLocation, formatPrice, formatRating } from "../../search/results/format";
import { calculateHotelBookingRewardPoints, pointsToEuroValue } from "../../../lib/rewards/rules";

// FPR-HOTELS-COMMERCIAL-01/02 — Hotelbeds exige (proceso de
// certificación, developer.hotelbeds.com) que el cliente tolere hasta 60
// segundos de espera en la confirmación de POST /bookings antes de darla
// por fallida. `createBookingAction` (../actions.ts) es una Server
// Action invocada desde `BookingForm` en esta misma página — Next.js
// solo permite configurar `maxDuration` de una Server Action a nivel de
// página, nunca en el propio archivo "use server" (confirmado en la
// documentación oficial de Next.js). 60s cabe sin problema dentro del
// límite de cualquier plan de Vercel (Hobby/Pro/Enterprise: 300s por
// defecto con Fluid Compute) — declarado explícitamente aquí para no
// depender de un valor por defecto de la plataforma que podría cambiar.
export const maxDuration = 60;

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
// Preview de Points (Economía VIAO Rewards V1, `lib/rewards/rules.ts`): el
// usuario debe saber CUÁNTO gana ANTES de confirmar, no solo después —
// calculado con la MISMA función y a partir del MISMO precio de referencia
// que otorgará realmente `app/booking/actions.ts` tras confirmar, así que
// nunca puede desincronizarse de lo que se otorga de verdad. Solo visible
// cuando hay precio de referencia (idéntica condición que `referencePrice`
// ya usaba antes de este bloque) — sin precio no hay nada que calcular, y
// no se inventa un valor de respaldo.
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
  const previewPoints = price ? calculateHotelBookingRewardPoints(price.amount) : undefined;

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

        {previewPoints !== undefined && previewPoints > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gift className="size-4 shrink-0 text-success" aria-hidden="true" />
                {t("booking.pointsPreviewTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1">
              <p className="text-2xl font-semibold text-success">
                +{previewPoints} {t("rewards.pointsUnit")}
              </p>
              <p className="text-sm text-muted-foreground">
                ≈ {pointsToEuroValue(previewPoints).toFixed(2)} € {t("rewards.valueSuffix")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("booking.pointsPreviewDisclaimer")}
              </p>
            </CardContent>
          </Card>
        )}

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

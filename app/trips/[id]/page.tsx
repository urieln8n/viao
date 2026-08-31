import Link from "next/link";
import { Hotel, Camera, Heart, Eye, Lightbulb, MapPin, TrainFront, Plane, Gift } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { PropertyImage } from "@/components/property/property-image";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";

import { getTripDetail } from "../../../lib/trips/get-trip-detail";
import { getAssociableBookings } from "../../../lib/trips/get-associable-bookings";
import { isValidUuid } from "../../../lib/utils/is-valid-uuid";
import { AssociateBookingForm } from "./associate-booking-form";
import { AddPhotoForm } from "./add-photo-form";
import { pointsToEuroValue } from "../../../lib/rewards/rules";
import {
  calculateDistanceKm,
  findNearestAirport,
  findNearestTrainStation,
} from "../../../lib/travel-provider/nearby-hubs";

// F11-04 (VIAO_ROADMAP.md) — Resumen del viaje. Server Component, datos
// exclusivamente vía lib/trips/ (getTripDetail agrega reservas/fotos/
// escaneos/rewards en un único punto, F11-04) — mismo patrón que
// app/booking/[propertyId]/status/page.tsx. `id` inválido/inexistente/
// ajeno son indistinguibles (mismo criterio de todo el proyecto: RLS
// filtra, `getTripById` devuelve `undefined`, aquí se muestra
// "no encontrado" sin filtrar cuál de los tres casos era).
//
// Bloque 16 ("Mi viaje como HUB") — la agregación de getTripDetail no
// cambia: esto es exclusivamente una reorganización de presentación
// (cabecera-resumen + iconos consistentes en cada Card) para reforzar que
// es UN viaje, no cuatro secciones sueltas. Google Maps: enlace público
// (sin API key) construido a partir de `booking.latitude/longitude`, ya
// presentes en la reserva (Bloque 16). Fotos: `photo.signedUrl` (Bloque
// 16, generado en getTripDetail vía Storage.createSignedUrl) permite
// mostrar la imagen real; si no se pudo generar, cae de vuelta al texto
// (caption/storagePath), nunca se inventa una URL.
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

/** Enlace público de Google Maps (sin API key, sin SDK) — formato documentado de "Maps URLs". */
function buildGoogleMapsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}

/**
 * Deep link universal de Uber (Bloque 22) — sin API key, sin SDK, sin
 * backend. `dropoff[formatted_address]` va junto a lat/lng porque la
 * documentación oficial de Uber (developer.uber.com/docs/riders/
 * ride-requests/tutorials/deep-links) exige uno de los dos (nickname o
 * formatted_address) para que el destino aparezca ya precargado en la
 * app nativa — no basta con las coordenadas solas. Si el usuario no
 * tiene Uber instalado, Uber mismo redirige a la tienda correspondiente
 * (comportamiento ya documentado por Uber, VIAO no necesita gestionar
 * ningún fallback propio). VIAO nunca reserva ni cobra: el usuario
 * termina el proceso dentro de Uber.
 */
function buildUberDeepLink(latitude: number, longitude: number, name: string): string {
  const params = new URLSearchParams({
    action: "setPickup",
    "dropoff[latitude]": String(latitude),
    "dropoff[longitude]": String(longitude),
    "dropoff[formatted_address]": name,
  });
  return `https://m.uber.com/ul/?${params.toString()}`;
}

export default async function TripDetailPage({ params }: TripDetailPageProps) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    return (
      <main className="flex flex-1 flex-col">
        <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
          <ErrorState
            title={t("trips.notFoundTitle")}
            message={t("trips.notFoundMessage")}
            action={<BackToTripsLink />}
          />
        </PageContainer>
      </main>
    );
  }

  const detail = await getTripDetail(id);

  if (!detail) {
    return (
      <main className="flex flex-1 flex-col">
        <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
          <ErrorState
            title={t("trips.notFoundTitle")}
            message={t("trips.notFoundMessage")}
            action={<BackToTripsLink />}
          />
        </PageContainer>
      </main>
    );
  }

  const associableBookings = await getAssociableBookings();
  const { trip, bookings, photos, scans, rewards } = detail;
  const totalPoints = rewards.reduce((sum, reward) => sum + reward.amount, 0);

  // Portada (Bloque 19): primera foto real guardada por el usuario ->
  // foto del alojamiento reservado -> fallback elegante (PropertyImage ya
  // resuelve esto solo: sin `src`, muestra su icono ImageOff sobre fondo
  // neutro — mismo componente y mismo criterio ya usados en Property/
  // Booking, no se inventa un fallback nuevo). Ningún álbum ni slideshow:
  // una sola imagen, puramente visual.
  const coverPhotoUrl = photos.find((photo) => photo.signedUrl)?.signedUrl;
  const coverPropertyPhotoUrl = bookings.find((booking) => booking.mainPhotoUrl)?.mainPhotoUrl;
  const coverImageUrl = coverPhotoUrl ?? coverPropertyPhotoUrl ?? undefined;

  // Recomendaciones (Bloque 22) — cada línea solo se calcula/muestra si el
  // dato real existe; nunca se inventa. Distancia a estación/aeropuerto:
  // se mide desde la PRIMERA reserva con coordenadas reales del viaje
  // (mismo criterio que la portada usa "la primera foto/reserva
  // disponible", sin inventar un punto de referencia). `trip.destination`
  // es la misma ciudad que ya usa `findOrCreateTripForBooking` (Bloque
  // 11) — coincide con las 4 ciudades de `nearby-hubs.ts` para cualquier
  // viaje creado desde una reserva real; si no coincide (p. ej. un viaje
  // creado a mano con destino libre), `findNearest*` devuelve `undefined`
  // y esas recomendaciones simplemente no se muestran, sin error.
  const referenceBooking = bookings.find(
    (booking) => booking.latitude !== null && booking.longitude !== null,
  );
  const nearestStation = findNearestTrainStation(trip.destination);
  const nearestAirport = findNearestAirport(trip.destination);
  const stationDistanceKm =
    referenceBooking?.latitude != null && referenceBooking.longitude != null && nearestStation
      ? calculateDistanceKm(
          referenceBooking.latitude,
          referenceBooking.longitude,
          nearestStation.latitude,
          nearestStation.longitude,
        )
      : undefined;
  const airportDistanceKm =
    referenceBooking?.latitude != null && referenceBooking.longitude != null && nearestAirport
      ? calculateDistanceKm(
          referenceBooking.latitude,
          referenceBooking.longitude,
          nearestAirport.latitude,
          nearestAirport.longitude,
        )
      : undefined;
  const hasAnyRecommendation =
    bookings.length > 0 || stationDistanceKm !== undefined || airportDistanceKm !== undefined || totalPoints > 0;

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex flex-col gap-3">
          <PropertyImage
            src={coverImageUrl}
            alt={trip.destination}
            aspect="video"
            className="rounded-xl"
          />

          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold">{trip.destination}</h1>
            <p className="text-sm text-muted-foreground">
              {trip.startDate && trip.endDate
                ? `${trip.startDate} — ${trip.endDate}`
                : t("trips.datesUnset")}
            </p>
          </div>

          {/* Cabecera-resumen (Bloque 16): un vistazo al viaje completo antes
              de entrar en el detalle de cada sección — la sensación de "todo
              mi viaje está aquí" en vez de cuatro Cards sin relación entre
              sí. Bloque 19: iconos con el acento de color de su módulo
              (Reservas=naranja VIAO, Rewards=verde ya existente) para
              reforzar la misma jerarquía de color que el resto de la app —
              Fotos se mantiene neutro a propósito (no es "un módulo", es
              contenido del usuario). */}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Hotel className="size-4 text-viao-orange" aria-hidden="true" />
              {bookings.length}{" "}
              {bookings.length === 1
                ? t("trips.summaryBookingSingular")
                : t("trips.summaryBookingPlural")}
            </span>
            <span className="inline-flex items-center gap-1">
              <Camera className="size-4" aria-hidden="true" />
              {photos.length}{" "}
              {photos.length === 1
                ? t("trips.summaryMemorySingular")
                : t("trips.summaryMemoryPlural")}
            </span>
            <span className="inline-flex items-center gap-1 font-medium text-success">
              <Heart className="size-4" aria-hidden="true" />
              {totalPoints} {t("trips.pointsUnit")}
            </span>
          </div>
        </div>

        {hasAnyRecommendation && (
          <Card className="border-viao-orange/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4 text-viao-orange" aria-hidden="true" />
                {t("trips.recommendationsTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              {bookings.length > 0 && (
                <p className="flex items-center gap-1.5">
                  <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  {t("trips.recommendationAccommodation")} {trip.destination}.
                </p>
              )}
              {stationDistanceKm !== undefined && nearestStation && (
                <p className="flex flex-wrap items-center gap-x-1.5">
                  <TrainFront className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>
                    {nearestStation.name} {t("trips.recommendationDistanceLabel")}{" "}
                    {stationDistanceKm.toFixed(1)} km.
                  </span>
                  <a
                    href={buildGoogleMapsUrl(nearestStation.latitude, nearestStation.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-viao-orange underline-offset-4 hover:underline"
                  >
                    {t("trips.viewOnMapsCta")}
                  </a>
                </p>
              )}
              {airportDistanceKm !== undefined && nearestAirport && (
                <p className="flex flex-wrap items-center gap-x-1.5">
                  <Plane className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span>
                    {nearestAirport.name} {t("trips.recommendationDistanceLabel")}{" "}
                    {airportDistanceKm.toFixed(1)} km.
                  </span>
                  <a
                    href={buildGoogleMapsUrl(nearestAirport.latitude, nearestAirport.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-viao-orange underline-offset-4 hover:underline"
                  >
                    {t("trips.viewOnMapsCta")}
                  </a>
                </p>
              )}
              {totalPoints > 0 && (
                <p className="flex items-center gap-1.5">
                  <Gift className="size-4 shrink-0 text-success" aria-hidden="true" />
                  {t("trips.recommendationPointsPrefix")} {totalPoints}{" "}
                  {t("trips.recommendationPointsSuffix")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Hotel className="size-4 text-viao-orange" aria-hidden="true" />
              {t("trips.bookingsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("trips.bookingsEmpty")}</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {bookings.map((booking) => (
                  <li key={booking.id} className="flex flex-col gap-1 py-2 first:pt-0 last:pb-0">
                    <span className="text-sm font-medium">
                      {booking.propertyName ?? booking.propertyId}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {booking.checkIn} — {booking.checkOut} ({booking.status})
                      {booking.bookingValue != null &&
                        ` · ${booking.bookingValue} ${booking.currency}`}
                    </span>
                    {booking.latitude !== null && booking.longitude !== null && (
                      <span className="flex flex-wrap gap-x-3 gap-y-1">
                        <a
                          href={buildGoogleMapsUrl(booking.latitude, booking.longitude)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit text-xs text-primary underline-offset-4 hover:underline"
                        >
                          {t("trips.locationCta")}
                        </a>
                        <a
                          href={buildUberDeepLink(
                            booking.latitude,
                            booking.longitude,
                            booking.propertyName ?? booking.propertyId,
                          )}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-fit text-xs text-viao-orange underline-offset-4 hover:underline"
                        >
                          {t("trips.uberCta")}
                        </a>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-2 border-t border-border pt-3">
              <span className="text-sm font-medium">{t("trips.associateBookingTitle")}</span>
              <AssociateBookingForm tripId={trip.id} bookings={associableBookings} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="size-4 text-muted-foreground" aria-hidden="true" />
              {t("trips.photosTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {photos.length === 0 ? (
              <EmptyState
                title={t("trips.photosEmptyTitle")}
                message={t("trips.photosEmptyMessage")}
              />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo) =>
                  photo.signedUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- bucket privado con URL firmada temporal (Bloque 16): un <Image> de next/image exigiría configurar un remotePattern para un host que cambia de token en cada petición, sin beneficio real para una galería pequeña.
                    <img
                      key={photo.id}
                      src={photo.signedUrl}
                      alt={photo.caption ?? ""}
                      className="aspect-square w-full rounded-lg object-cover"
                    />
                  ) : (
                    <div
                      key={photo.id}
                      className="flex aspect-square w-full items-center justify-center rounded-lg bg-accent p-2 text-center text-xs text-muted-foreground"
                    >
                      {photo.caption ?? photo.storagePath}
                    </div>
                  ),
                )}
              </div>
            )}

            <div className="border-t border-border pt-3">
              <AddPhotoForm tripId={trip.id} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-info/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="size-4 text-info" aria-hidden="true" />
              {t("trips.scansTitle")}
            </CardTitle>
            <CardDescription>{t("trips.visionSectionTagline")}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
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
            {/* Bloque 19, sección 8 ("Vision dentro de Mi viaje") — mismo
                enlace y variant="outline" de siempre (semánticamente sigue
                siendo una acción secundaria de esta pantalla, no la acción
                principal), reforzado con el acento azul de Vision solo en
                el color de texto (`text-info`): el variant `outline` no fija
                ningún `text-*` en reposo, así que no compite con
                `border-border`/`hover:bg-muted` ya declarados — evita
                exactamente el problema de especificidad de clases ya
                documentado y corregido en Bloque 13 (tailwind-merge no
                reconoce los tokens de color propios del tema). Tamaño por
                defecto (sin `size="sm"`) para que sea más visible que antes. */}
            <Link
              href="/vision"
              className={buttonVariants({ variant: "outline", className: "w-fit text-info" })}
            >
              {t("home.visionTeaserCta")}
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="size-4 text-success" aria-hidden="true" />
              {t("trips.rewardsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {rewards.length === 0 ? (
              <EmptyState message={t("trips.rewardsEmpty")} />
            ) : (
              <div className="flex flex-col gap-0.5">
                <p className="text-lg font-semibold">
                  {totalPoints} <span className="text-sm font-normal text-muted-foreground">{t("trips.pointsUnit")}</span>
                </p>
                <p className="text-sm text-muted-foreground">
                  ≈ {pointsToEuroValue(totalPoints).toFixed(2)} € {t("rewards.valueSuffix")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <BackToTripsLink />
      </PageContainer>
    </main>
  );
}

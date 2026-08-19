import Link from "next/link";
import { Search, ScanEye, Eye, Heart } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { getUserTrips } from "../lib/trips/get-user-trips";
import { getTripDetail, type TripDetail } from "../lib/trips/get-trip-detail";
import { getWalletBalance } from "../lib/rewards/get-wallet-balance";
import { pointsToEuroValue } from "../lib/rewards/rules";
import { HomeSearchForm } from "./home-search-form";

// F11-04 (VIAO_ROADMAP.md) ya expone `getTripDetail()` — no existe hoy
// ninguna otra fuente de "¿el viaje tiene reserva?" salvo llamarla, así
// que Home la invoca una vez por viaje devuelto por `getUserTrips()`
// (habitualmente pocos) para poder clasificar cada uno. Es composición de
// funciones ya existentes, no una consulta nueva.
type FeaturedTripKind = "upcoming" | "preparing" | "returned";

interface FeaturedTrip {
  kind: FeaturedTripKind;
  detail: TripDetail;
}

const RECENT_RETURN_WINDOW_DAYS = 30;

function daysSince(dateIso: string): number {
  return (Date.now() - new Date(dateIso).getTime()) / 86_400_000;
}

// Bloque 4 (VIAO Design System) — función PURA de presentación: no
// accede a Supabase, no hace queries, no modifica datos. Recibe los
// `TripDetail` ya obtenidos (mismo orden que `getUserTrips()`:
// `created_at` descendente) y decide cuál protagoniza la Home.
//
// Prioridad 1: viaje próximo (con reserva) cuya fecha de inicio más
// cercana sea la más próxima. Prioridad 2: si no hay próximo, el viaje
// terminado recientemente (dentro de `RECENT_RETURN_WINDOW_DAYS`) más
// reciente — ventana de presentación, no una regla de negocio ni un valor
// ya existente en el código; documentada aquí explícitamente. Prioridad
// 3: el primer viaje sin reservas ("preparando"). Si existen viajes pero
// ninguno encaja limpiamente en las tres categorías anteriores (p. ej.
// una reserva con fechas ni futuras ni recientes), se usa el tratamiento
// "preparando" sobre el viaje más reciente como respaldo neutro — nunca
// se inventa un estado nuevo.
function selectFeaturedTrip(details: TripDetail[]): FeaturedTrip | undefined {
  if (details.length === 0) {
    return undefined;
  }

  const today = new Date().toISOString().slice(0, 10);

  const upcoming = details
    .filter((d) => d.bookings.length > 0 && d.trip.startDate !== null && d.trip.startDate >= today)
    .sort((a, b) => a.trip.startDate!.localeCompare(b.trip.startDate!));
  if (upcoming.length > 0) {
    return { kind: "upcoming", detail: upcoming[0] };
  }

  const returned = details
    .filter(
      (d) =>
        d.trip.endDate !== null &&
        d.trip.endDate < today &&
        daysSince(d.trip.endDate) <= RECENT_RETURN_WINDOW_DAYS,
    )
    .sort((a, b) => b.trip.endDate!.localeCompare(a.trip.endDate!));
  if (returned.length > 0) {
    return { kind: "returned", detail: returned[0] };
  }

  const preparing = details.filter((d) => d.bookings.length === 0);
  if (preparing.length > 0) {
    return { kind: "preparing", detail: preparing[0] };
  }

  return { kind: "preparing", detail: details[0] };
}

const EYEBROW_KEY: Record<FeaturedTripKind, TranslationKey> = {
  upcoming: "home.heroUpcomingEyebrow",
  preparing: "home.heroPreparingEyebrow",
  returned: "home.heroReturnedEyebrow",
};

function TripHero({ kind, detail }: { kind: FeaturedTripKind; detail: TripDetail }) {
  const { trip, photos, scans, rewards } = detail;
  const totalPoints = rewards.reduce((sum, reward) => sum + reward.amount, 0);
  const ctaLabel = kind === "preparing" ? t("trips.associateBookingTitle") : t("trips.viewTrip");

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-accent p-6 lg:gap-6 lg:p-8">
      <span className="text-xs font-medium text-primary">{t(EYEBROW_KEY[kind])}</span>

      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold break-words md:text-4xl">{trip.destination}</h1>
        <p className="text-sm text-muted-foreground">
          {trip.startDate && trip.endDate
            ? `${trip.startDate} — ${trip.endDate}`
            : t("trips.datesUnset")}
        </p>
      </div>

      {kind === "returned" && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
          <span>
            {t("home.recapPhotosLabel")}: {photos.length}
          </span>
          <span>
            {t("home.recapScansLabel")}: {scans.length}
          </span>
          <span className="font-medium text-success">
            {t("trips.pointsUnit")}: {totalPoints}
          </span>
        </div>
      )}

      <Link href={`/trips/${trip.id}`} className={buttonVariants({ variant: "default" })}>
        {ctaLabel}
      </Link>
    </div>
  );
}

export default async function Home() {
  const trips = await getUserTrips();

  const details =
    trips.length > 0
      ? (await Promise.all(trips.map((trip) => getTripDetail(trip.id)))).filter(
          (detail): detail is TripDetail => detail !== undefined,
        )
      : [];

  const featured = selectFeaturedTrip(details);
  const balance = await getWalletBalance();

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer
        variant="wide"
        className="flex flex-1 flex-col gap-8 px-4 py-8 lg:gap-12 lg:px-8"
      >
        {featured ? (
          <TripHero kind={featured.kind} detail={featured.detail} />
        ) : (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-semibold md:text-4xl">{t("home.greetingTitle")}</h1>
              <p className="text-sm text-muted-foreground">{t("home.greetingSubtitle")}</p>
            </div>
            <HomeSearchForm />

            {/* Bloque 13 ("Pulido final antes del piloto") — CTA
                secundario de registro, solo para visitantes sin sesión
                real. Reutiliza la misma señal ya establecida en esta
                página para distinguir "sin sesión" de "con sesión, sin
                viajes" (balance === undefined, igual que
                home.pointsTeaserSignedOut más abajo) — no se añade
                ninguna comprobación de autenticación nueva. */}
            {balance === undefined && (
              <Link
                href="/register"
                className={buttonVariants({ variant: "outline" })}
              >
                {t("home.createAccountCta")}
              </Link>
            )}

            {/* Bloque "Landing + VIAO Rewards V1" — introducción breve de
                qué es VIAO y por qué es diferente, y comunicación de la
                Economía VIAO Rewards V1 (`lib/rewards/rules.ts`). Solo en
                esta rama (sin viaje destacado): un usuario que ya tiene un
                viaje en curso no necesita volver a ver la explicación del
                producto cada vez que abre Home. No sustituye el buscador
                (arriba, sin tocar) ni crea ningún sistema nuevo de fotos/
                recuerdos: "Después" enlaza directamente a Mi viaje, que ya
                los gestiona. */}
            {/* Bloque 19 ("Identidad visual") — mismo copy exacto de
                Bloque 15, solo se añade un icono + el acento de color de
                la pieza dominante de cada fase (Antes=naranja VIAO,
                decidir/reservar; Durante=azul, Vision; Después=verde,
                Rewards) para que la progresión se lea de un vistazo, no
                solo leyendo el texto. */}
            <section className="flex flex-col gap-8 border-t border-border pt-8">
              <div className="grid gap-6 sm:grid-cols-3">
                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-viao-orange">
                    <Search className="size-3.5" aria-hidden="true" />
                    {t("home.introBeforeEyebrow")}
                  </span>
                  <p className="text-sm font-semibold">{t("home.introBeforeTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("home.introBeforeItem1")}</p>
                  <p className="text-sm text-muted-foreground">{t("home.introBeforeItem2")}</p>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-info">
                    <Eye className="size-3.5" aria-hidden="true" />
                    {t("home.introDuringEyebrow")}
                  </span>
                  <p className="text-sm font-semibold">{t("home.introDuringTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("home.introDuringItem1")}</p>
                  <p className="text-sm text-muted-foreground">{t("home.introDuringItem2")}</p>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
                    <Heart className="size-3.5" aria-hidden="true" />
                    {t("home.introAfterEyebrow")}
                  </span>
                  <p className="text-sm font-semibold">{t("home.introAfterTitle")}</p>
                  <p className="text-sm text-muted-foreground">{t("home.introAfterItem")}</p>
                  <Link
                    href="/trips"
                    className="w-fit text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {t("home.introAfterCta")}
                  </Link>
                </div>
              </div>

              <div className="flex flex-col gap-2 rounded-xl bg-accent p-6">
                <p className="text-sm font-semibold">{t("home.rewardsIntroTitle")}</p>
                <p className="flex items-center gap-1.5 text-lg font-semibold text-success">
                  <Heart className="size-4" aria-hidden="true" />
                  {t("home.rewardsExample")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("home.rewardsDisclaimer")}
                </p>
              </div>

              <div className="flex flex-col items-center gap-3 text-center">
                <p className="text-sm font-medium">{t("home.closingTagline")}</p>
                <Link href="/search" className={buttonVariants({ variant: "default" })}>
                  {t("home.startTripCta")}
                </Link>
              </div>
            </section>
          </section>
        )}

        <div className={`grid gap-4 ${featured ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
          {featured && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="size-4 text-muted-foreground" aria-hidden="true" />
                  {t("search.title")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link href="/search" className={buttonVariants({ variant: "outline" })}>
                  {t("search.submitButton")}
                </Link>
              </CardContent>
            </Card>
          )}

          <StatCard
            label={t("home.pointsTeaserTitle")}
            value={balance !== undefined ? balance : "—"}
            caption={
              balance !== undefined
                ? `≈ ${pointsToEuroValue(balance).toFixed(2)} € ${t("rewards.valueSuffix")}`
                : t("home.pointsTeaserSignedOut")
            }
            tone={balance !== undefined ? "positive" : "default"}
            action={
              <Link
                href="/rewards"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                {t("home.pointsTeaserCta")}
              </Link>
            }
          />

          <Card className="border-info/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanEye className="size-4 text-info" aria-hidden="true" />
                {t("vision.title")}
              </CardTitle>
              <CardDescription>{t("vision.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/vision"
                className={buttonVariants({ variant: "outline", className: "text-info" })}
              >
                {t("home.visionTeaserCta")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </main>
  );
}

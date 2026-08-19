import Link from "next/link";
import { Search, ScanEye } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { getUserTrips } from "../lib/trips/get-user-trips";
import { getTripDetail, type TripDetail } from "../lib/trips/get-trip-detail";
import { getWalletBalance } from "../lib/rewards/get-wallet-balance";
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
            caption={balance !== undefined ? t("rewards.pointsUnit") : t("home.pointsTeaserSignedOut")}
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanEye className="size-4 text-muted-foreground" aria-hidden="true" />
                {t("vision.title")}
              </CardTitle>
              <CardDescription>{t("vision.description")}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/vision" className={buttonVariants({ variant: "outline" })}>
                {t("home.visionTeaserCta")}
              </Link>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    </main>
  );
}

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { getUserTrips } from "../lib/trips/get-user-trips";
import { getTripDetail, type TripDetail } from "../lib/trips/get-trip-detail";
import { getWalletBalance } from "../lib/rewards/get-wallet-balance";
import { getCachedDestinations } from "../lib/destinations/get-cached-destinations";
import { getActiveGoal } from "../lib/goals/get-goal";
import { getMissionsStatus } from "../lib/missions/get-missions-status";
import { GoalCard } from "./goal-card";
import { MissionsSummary } from "./missions-summary";

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
  // Bloque Claridad de producto V1 — `getUserTrips()` ahora distingue
  // "sin sesión" (`undefined`) de "con sesión, sin viajes" (`[]`) para
  // que `app/trips/page.tsx` pueda mostrar un estado de "inicia sesión"
  // real. Home ya resuelve su propio estado anónimo por separado (`balance
  // === undefined`, más abajo) — no necesita esta distinción, así que
  // `undefined` se trata igual que `[]`, sin cambiar el comportamiento ya
  // existente de esta página.
  const trips = (await getUserTrips()) ?? [];

  const details =
    trips.length > 0
      ? (await Promise.all(trips.map((trip) => getTripDetail(trip.id)))).filter(
          (detail): detail is TripDetail => detail !== undefined,
        )
      : [];

  const featured = selectFeaturedTrip(details);
  const balance = await getWalletBalance();
  // Bloque 1 (VIAO_V1_LOOP_DECISION.md) — solo tiene sentido resolverlo
  // con sesión real (mismo criterio que `balance`); sin sesión,
  // `getActiveGoal()` ya devuelve `undefined` de forma segura, pero se
  // evita la consulta innecesaria cuando ya se sabe que no hay sesión.
  const activeGoal = balance !== undefined ? await getActiveGoal() : undefined;
  // Bloque Missions (Prompt Maestro 24/08/2026) — mismo criterio que
  // `activeGoal`: sin sesión, `getMissionsStatus()` ya devuelve las 4
  // Missions como no completadas de forma segura, pero se evita la
  // consulta innecesaria cuando ya se sabe que no hay sesión.
  const missions = balance !== undefined ? await getMissionsStatus() : undefined;
  // FPR-HOTELS-02 — mismo catálogo real que app/search/page.tsx, nunca
  // MockHotelProvider.listKnownDestinations(). `getCachedDestinations`
  // nunca lanza ni es costosa (una única consulta ya indexada).
  // Micro-bloque 2 (Home Beta) — ya no alimenta un `HomeSearchForm`
  // embebido en el Hero (retirado de Home, ver más abajo): ahora solo
  // alimenta los chips de la sección "Cuando estés listo para viajar".
  const destinations = await getCachedDestinations("hotelbeds");

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer
        variant="wide"
        className="flex flex-1 flex-col gap-10 px-4 py-8 lg:gap-14 lg:px-8"
      >
        {/* Micro-bloque 2 (Home Beta) — Hero consciente del contexto: con
            viaje destacado, `TripHero` (sin cambios de lógica ni diseño)
            sigue siendo la única pieza protagonista. Sin viaje, el Hero
            deja de contener `HomeSearchForm` (retirado de aquí, el
            componente sigue existiendo sin uso — limpieza/eliminación
            queda para otro bloque) y pasa a afirmar la tesis de producto
            ("tu actividad cotidiana te acerca a tu próximo viaje") con un
            único CTA que depende del estado real del usuario, reutilizando
            las mismas señales que ya existían (`balance`/`activeGoal`),
            sin lógica de negocio nueva. Los CTA autenticados enlazan por
            ancla (`#goal`, ver la sección Goal más abajo) a la misma
            página — nunca a una ruta nueva. */}
        {featured ? (
          <TripHero kind={featured.kind} detail={featured.detail} />
        ) : (
          <section className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
                {t("home.greetingTitle")}
              </h1>
              <p className="text-sm text-muted-foreground md:text-base">
                {t("home.greetingSubtitle")}
              </p>
            </div>

            {balance === undefined ? (
              <Link
                href="/register"
                className={buttonVariants({ variant: "default", className: "w-fit" })}
              >
                {t("home.createAccountCta")}
              </Link>
            ) : (
              <Link
                href="#goal"
                className={buttonVariants({ variant: "default", className: "w-fit" })}
              >
                {activeGoal ? t("home.heroViewGoalCta") : t("home.heroCreateGoalCta")}
              </Link>
            )}
          </section>
        )}

        {/* Micro-bloque 2 — Goal ya no comparte fila con Missions (Fase C
            los emparejaba en `grid md:grid-cols-2`): ahora es su propia
            sección a ancho completo, inmediatamente después del Hero —
            "esto es lo que estoy construyendo". `id="goal"` es el destino
            de los CTA del Hero de arriba. Ningún cambio de lógica: mismo
            `GoalCard`, mismo `activeGoal`/`balance`. */}
        {balance !== undefined && (
          <div id="goal">
            <GoalCard goal={activeGoal} walletBalance={balance} />
          </div>
        )}

        {/* Micro-bloque 2 — Missions pasa a vivir debajo de Goal (antes a
            su lado), con menor peso visual (`Card size="sm"`, ver
            app/missions-summary.tsx) — refuerza "Goal es el centro,
            Missions es cómo avanzar hacia él". Vision sigue sin aparecer
            en Home (decisión ya tomada, sin cambios). */}
        {missions !== undefined && <MissionsSummary missions={missions} />}

        {/* Micro-bloque 2 — Rewards/Points sigue siendo una línea (sin
            Card grande), sin equivalencia en euros. Se añade una frase de
            conexión narrativa con Goal — mismo `balance`, ningún cálculo
            nuevo. */}
        <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-muted-foreground">{t("home.pointsTeaserTitle")}</span>
            <span
              className={
                balance !== undefined
                  ? "text-2xl font-semibold text-success"
                  : "text-sm text-muted-foreground"
              }
            >
              {balance !== undefined ? `${balance} ${t("rewards.pointsUnit")}` : t("home.pointsTeaserSignedOut")}
            </span>
            {balance !== undefined && (
              <span className="text-xs text-muted-foreground">{t("home.pointsGoalConnection")}</span>
            )}
          </div>
          <Link
            href="/rewards"
            className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1" })}
          >
            {t("home.pointsTeaserCta")}
            <ArrowRight className="size-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Micro-bloque 2 — Search y Discovery se funden visualmente en
            una única sección secundaria ("Cuando estés listo para
            viajar"): mismos chips de destinos reales, más un único botón
            "Buscar" hacia /search (ya no un formulario duplicado dentro
            de Home). El botón se muestra siempre (Search debe seguir
            siendo plenamente funcional incluso si el catálogo de
            destinos está vacío); los chips solo cuando hay datos reales,
            igual que antes. `/search`, su formulario y su lógica no se
            tocan.
            Micro-bloque 3B (Sidebar Beta) — `id="travel"` es únicamente
            un ancla para la entrada "Explorar" del Sidebar
            (`components/nav/sidebar.tsx`, `/#travel`). Ningún cambio de
            contenido/layout/lógica de esta sección. */}
        <section id="travel" className="flex flex-col gap-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            {t("home.discoveryTitle")}
          </h2>
          {destinations.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {destinations.slice(0, 12).map((destination) => (
                <Link
                  key={destination.code}
                  href="/search"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {destination.name}
                </Link>
              ))}
            </div>
          )}
          <Link
            href="/search"
            className={buttonVariants({ variant: "default", className: "w-fit" })}
          >
            {t("search.submitButton")}
          </Link>
        </section>

        {/* Fase C — Trips solo aporta contenido nuevo cuando NO hay ya un
            viaje protagonizando el Hero (evita duplicar el mismo viaje
            dos veces en la misma pantalla); con viaje destacado, esta
            sección se omite por completo. */}
        {!featured && (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-accent p-6 text-center">
            <p className="text-sm font-medium">{t("home.tripsClosingTitle")}</p>
            <Link href="/search" className={buttonVariants({ variant: "default" })}>
              {t("home.startTripCta")}
            </Link>
          </div>
        )}
      </PageContainer>
    </main>
  );
}

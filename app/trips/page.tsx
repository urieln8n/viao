import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";

import { getUserTrips } from "../../lib/trips/get-user-trips";
import { CreateTripForm } from "./create-trip-form";

// F11-01 (VIAO_ROADMAP.md) — Lista de viajes propios + formulario de
// creación. Mismo patrón que app/rewards/page.tsx (F7-03): Server
// Component, datos exclusivamente vía lib/trips/, sin lógica de Supabase
// aquí.
//
// Bloque Claridad de producto V1 — `getUserTrips()` ahora distingue
// explícitamente "sin sesión" (`undefined`) de "con sesión, sin viajes
// todavía" (`[]`), mismo criterio que `getWalletBalance()` en
// `app/rewards/page.tsx`: antes, un usuario anónimo y uno real sin
// viajes veían exactamente el mismo "no tienes viajes todavía", lo que
// no dejaba claro que hacía falta iniciar sesión.
export default async function TripsPage() {
  const trips = await getUserTrips();

  if (trips === undefined) {
    return (
      <main className="flex flex-1 flex-col">
        <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
          <ErrorState
            title={t("trips.unauthenticatedTitle")}
            message={t("trips.unauthenticatedMessage")}
            action={
              <Link href="/login" className={buttonVariants({ variant: "default" })}>
                {t("trips.loginCta")}
              </Link>
            }
          />
        </PageContainer>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
        <h1 className="text-xl font-semibold">{t("trips.title")}</h1>

        <Card>
          <CardHeader>
            <CardTitle>{t("trips.createTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateTripForm />
          </CardContent>
        </Card>

        {trips.length === 0 ? (
          <EmptyState
            title={t("trips.emptyTitle")}
            message={t("trips.emptyMessage")}
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {trips.map((trip) => (
              <li key={trip.id}>
                <Link
                  href={`/trips/${trip.id}`}
                  className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardHeader>
                      <CardTitle>{trip.destination}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {trip.startDate && trip.endDate
                          ? `${trip.startDate} — ${trip.endDate}`
                          : t("trips.datesUnset")}
                      </p>
                      <span className="mt-1 inline-block text-sm text-primary">
                        {t("trips.viewTrip")}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </PageContainer>
    </main>
  );
}

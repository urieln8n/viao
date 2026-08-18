import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/state/empty-state";
import { t } from "@/lib/i18n";

import { getUserTrips } from "../../lib/trips/get-user-trips";
import { CreateTripForm } from "./create-trip-form";

// F11-01 (VIAO_ROADMAP.md) — Lista de viajes propios + formulario de
// creación. Mismo patrón que app/rewards/page.tsx (F7-03): Server
// Component, datos exclusivamente vía lib/trips/, sin lógica de Supabase
// aquí. `getUserTrips()` usa el cliente de sesión — sin sesión real,
// devuelve lista vacía (mismo criterio best-effort que el resto del
// proyecto); un usuario anónimo que intente crear un viaje recibe
// `unauthenticated` desde `createTripAction` en el propio formulario.
export default async function TripsPage() {
  const trips = await getUserTrips();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
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
    </main>
  );
}

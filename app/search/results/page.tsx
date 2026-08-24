import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PropertyImage } from "@/components/property/property-image";
import { PageContainer } from "@/components/layout/page-container";
import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";
import type { SearchParams } from "@/types/travel";

import { searchAction } from "../actions";
import type { PropertyResult } from "../actions";
import { buildPropertyHref, formatLocation, formatPrice, formatRating } from "./format";
import { isAiRecommendationsEnabled } from "../../../lib/openai/config";

// F5-03 (VIAO_ROADMAP.md) — Listado de resultados.
//
// Flujo: formulario F5-01 → navega aquí con la búsqueda como query params →
// esta página (Server Component) llama directamente a `searchAction`
// (F5-02, una Server Action es simplemente una función async invocable
// server-side) → `getTravelProvider()` → `MockHotelProvider` → resultados.
// Cada resultado enlaza a `/properties/[id]` (F5-04, ya implementada). Los
// eventos `search_started`/`search_completed` (F5-05) se registran dentro
// de `searchAction` (`../actions.ts`), no en esta página.
//
// Extensión F5-07 (documentada): cada tarjeta enlaza al detalle con el
// `searchId` que devolvió `searchAction` (F5-06) como query param
// (`buildPropertyHref`, `./format.ts`), para que un clic sea trazable
// hasta la fila de `searches`. `searchId` puede ser `undefined` (usuario
// anónimo, F5-06) — en ese caso el enlace queda igual que antes de F5-07.

interface RawSearchQuery {
  destination?: string | string[];
  destinationCode?: string | string[];
  checkIn?: string | string[];
  checkOut?: string | string[];
  guests?: string | string[];
  rooms?: string | string[];
}

interface SearchResultsPageProps {
  searchParams: Promise<RawSearchQuery>;
}

// Los query params llegan siempre como texto (o ausentes/duplicados): se
// convierten aquí a la forma de `SearchParams` sin validar nada — toda la
// validación real ya la hace `searchAction` (F5-02) server-side. Un valor
// ausente o corrupto se convierte en `""`/`NaN`, que `searchAction` ya
// trata como inválido, así que una URL manipulada a mano se rechaza igual
// que cualquier otro input server-side no confiable.
function parseSearchQuery(raw: RawSearchQuery): SearchParams {
  return {
    destination: typeof raw.destination === "string" ? raw.destination : "",
    // FPR-HOTELS-02: aditivo, opcional — una URL antigua sin
    // `destinationCode` sigue funcionando igual (cae al resolver por
    // nombre dentro de HotelbedsProvider).
    ...(typeof raw.destinationCode === "string" && raw.destinationCode
      ? { destinationCode: raw.destinationCode }
      : {}),
    checkIn: typeof raw.checkIn === "string" ? raw.checkIn : "",
    checkOut: typeof raw.checkOut === "string" ? raw.checkOut : "",
    guests: Number(raw.guests),
    rooms: Number(raw.rooms),
  };
}

function BackToSearchLink() {
  return (
    <Link href="/search" className={buttonVariants({ variant: "outline" })}>
      {t("results.backToSearch")}
    </Link>
  );
}

function PropertyCard({
  property,
  searchId,
}: {
  property: PropertyResult;
  searchId: string | undefined;
}) {
  const price = formatPrice(property.price);
  const location = formatLocation(property);
  const rating = formatRating(property.rating);

  return (
    <Link
      href={buildPropertyHref(property.providerPropertyId, searchId)}
      className="block rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card className="overflow-hidden transition-colors hover:bg-muted/30">
        <PropertyImage
          src={property.mainPhotoUrl}
          alt={property.name}
          className="rounded-t-xl"
        />
        <CardHeader>
          <CardTitle>{property.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {location && (
            <p className="text-sm text-muted-foreground">{location}</p>
          )}
          <div className="flex items-center justify-between gap-2">
            <p className="text-lg font-semibold">
              {price ?? t("results.priceUnavailable")}
            </p>
            {rating && (
              <p className="text-sm text-muted-foreground">★ {rating}</p>
            )}
          </div>
          <span className="text-sm text-primary">
            {t("results.viewProperty")}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function SearchResultsPage({
  searchParams,
}: SearchResultsPageProps) {
  const rawQuery = await searchParams;
  const result = await searchAction(parseSearchQuery(rawQuery));

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="wide" className="flex flex-1 flex-col gap-4 px-4 py-6 lg:px-8">
        <h1 className="text-xl font-semibold">{t("results.title")}</h1>

        {result.status === "invalid_input" && (
          <ErrorState
            title={t("results.invalidInputTitle")}
            message={Object.values(result.fieldErrors).join(" ")}
            action={<BackToSearchLink />}
          />
        )}

        {result.status === "provider_error" && (
          <ErrorState
            title={t("results.errorTitle")}
            message={result.message}
            action={<BackToSearchLink />}
          />
        )}

        {result.status === "success" && result.results.length === 0 && (
          <EmptyState
            title={t("results.emptyTitle")}
            message={t("results.emptyMessage")}
            action={<BackToSearchLink />}
          />
        )}

        {result.status === "success" && result.results.length > 0 && (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.results.map((property) => (
                <li key={property.providerPropertyId}>
                  <PropertyCard property={property} searchId={result.searchId} />
                </li>
              ))}
            </ul>

            {/* Bloque 11 ("Conexión del MVP para piloto") — punto de
                entrada visible hacia VIAO AI (F9-02), hasta ahora
                inalcanzable desde la UI real (hallazgo de la auditoría de
                retención). Solo aparece cuando la IA está habilitada
                (isAiRecommendationsEnabled(), mismo interruptor F9-05 que
                ya usa requestAiRecommendationAction) y cuando existe un
                search_id real (F5-06/F5-07) — un usuario anónimo sin
                search_id no ve un enlace roto. No dispara ninguna llamada:
                es solo navegación; la Server Action solo se invoca al
                pulsar el botón dentro de AiRecommendationView. */}
            {isAiRecommendationsEnabled() && result.searchId && (
              <Link
                href={`/search/ai-recommendation?searchId=${encodeURIComponent(result.searchId)}`}
                className={buttonVariants({ variant: "outline" })}
              >
                {t("results.aiRecommendationCta")}
              </Link>
            )}
          </>
        )}
      </PageContainer>
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/state/empty-state";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";
import type { SearchParams } from "@/types/travel";

import { searchAction } from "../actions";
import type { PropertyResult } from "../actions";
import { buildPropertyHref, formatLocation, formatPrice, formatRating } from "./format";

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
      <Card className="transition-colors hover:bg-muted/50">
        <div className="relative aspect-video w-full overflow-hidden rounded-t-xl bg-muted">
          {property.mainPhotoUrl ? (
            <Image
              src={property.mainPhotoUrl}
              alt={property.name}
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
          <CardTitle>{property.name}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-1">
          <p className="text-sm font-medium">
            {price ?? t("results.priceUnavailable")}
          </p>
          {rating && (
            <p className="text-sm text-muted-foreground">★ {rating}</p>
          )}
          {location && (
            <p className="text-sm text-muted-foreground">{location}</p>
          )}
          <span className="mt-1 text-sm text-primary">
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
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
        <ul className="flex flex-col gap-4">
          {result.results.map((property) => (
            <li key={property.providerPropertyId}>
              <PropertyCard property={property} searchId={result.searchId} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageOff } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";

import { resolvePropertyDetail } from "./resolve";
import { formatLocation, formatRating } from "../../search/results/format";

// F5-04 (VIAO_ROADMAP.md) — Página de detalle de un alojamiento.
//
// Flujo: /search → /search/results (F5-03) → click en un resultado →
// /properties/[id] (aquí). `[id]` es el `providerPropertyId` del contrato
// de `HotelProvider` (F4-01), el mismo id que ya usan `search()`/
// `getDetails()`.
//
// Server Component (sin necesidad objetiva de lo contrario: no hay
// interacción de usuario más allá de navegación por enlaces). Obtiene los
// datos exclusivamente vía `resolvePropertyDetail()` (este mismo
// directorio), que a su vez solo conoce `getTravelProvider()` — nunca
// `MockHotelProvider` directamente.
//
// Campos mostrados: únicamente los que expone `Property`/`getDetails()`
// (foto, nombre, ubicación, valoración). El roadmap de F5-04 también prevé
// "descripción", "tipo de propiedad" y "habitaciones/capacidad", pero
// ninguno de los tres existe hoy en `Property` (F4-02) ni en lo que
// devuelve `getDetails()` — no se inventan, se omiten (comportamiento
// explícitamente autorizado: "si un campo opcional no existe, ocultarlo
// elegantemente"). No se llama a `getConditions()`: requiere
// `checkIn`/`checkOut`, que esta ruta no recibe (el enlace de F5-03 es
// `/properties/[id]` sin query params) — añadirlos sería inventar un
// mecanismo de trazabilidad de búsqueda que pertenece a F5-07, no a esta
// fase.
//
// Sin botón de reserva: pertenece a Fase 6 (roadmap: "Base para iniciar
// reserva (Fase 6)").
//
// Extensión F5-07 (documentada): lee `search_id` de la query string (lo
// puso ahí el enlace de F5-03/`buildPropertyHref`, con el `searches.id`
// que devolvió F5-06) y lo pasa, sin validar aquí (`resolvePropertyDetail`
// es quien valida formato UUID — mismo reparto de responsabilidades que
// `app/search/results/page.tsx`: la página solo desempaqueta la query
// string, la validación real vive en la capa "backend"). Una visita
// directa a `/properties/[id]` sin `search_id` sigue funcionando
// exactamente igual (`rawSearchId` queda `undefined`).

interface RawPropertyDetailQuery {
  search_id?: string | string[];
}

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<RawPropertyDetailQuery>;
}

function BackToSearchLink() {
  return (
    <Link href="/search" className={buttonVariants({ variant: "outline" })}>
      {t("propertyDetail.backToSearch")}
    </Link>
  );
}

export default async function PropertyDetailPage({
  params,
  searchParams,
}: PropertyDetailPageProps) {
  const { id } = await params;
  const rawQuery = await searchParams;
  const rawSearchId =
    typeof rawQuery.search_id === "string" ? rawQuery.search_id : undefined;
  const result = await resolvePropertyDetail(id, rawSearchId);

  if (result.status === "not_found") {
    notFound();
  }

  if (result.status === "provider_error") {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
        <ErrorState
          title={t("propertyDetail.errorTitle")}
          message={result.message}
          action={<BackToSearchLink />}
        />
      </main>
    );
  }

  const { property, searchId } = result;
  const location = formatLocation(property);
  const rating = formatRating(property.rating);

  return (
    <main
      className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6"
      data-search-id={searchId}
    >
      <BackToSearchLink />

      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-muted">
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
              className="size-8 text-muted-foreground"
              aria-hidden="true"
            />
          </div>
        )}
      </div>

      <h1 className="text-xl font-semibold break-words">{property.name}</h1>

      <div className="flex flex-col gap-1">
        {rating && <p className="text-sm text-muted-foreground">★ {rating}</p>}
        {location && (
          <p className="text-sm text-muted-foreground break-words">
            {location}
          </p>
        )}
      </div>
    </main>
  );
}

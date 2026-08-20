import { createServiceRoleClient } from "../supabase/service";
import type { Property } from "../../types/travel";

// F6-02 (VIAO_ROADMAP.md) — Caché de alojamientos en `properties`
// (VIAO_DATABASE.md sección 4): "copia local necesaria [...] para que
// `bookings` tenga a qué referenciarse" — ya documentada desde Fase 1,
// nunca implementada hasta ahora porque ninguna fase anterior necesitaba
// escribir en `bookings` (cuyo `property_id` es FK NOT NULL a
// `properties.id`, un uuid interno de VIAO — no el id de texto del
// proveedor, `providerPropertyId`, que es lo único que existía hasta
// F6-02). No es una tabla ni una decisión nuevas: es completar el único
// uso ya documentado de una tabla que ya existía desde Fase 1.
//
// RLS/GRANT (VIAO_DATABASE.md sección 4): "Insertar/Modificar/Eliminar:
// solo el backend (rol de servicio), tras llamar a HotelProvider — nunca
// el cliente". Verificado empíricamente que `service_role` no tenía
// ningún GRANT sobre esta tabla (mismo vacío que F5-05 encontró en
// `analytics_events`) — corregido en
// supabase/migrations/20260818070000_grant_service_role_bookings_properties.sql
// con el mínimo necesario (INSERT + UPDATE, sin SELECT ni DELETE).
//
// Upsert real (`ON CONFLICT (provider_name, provider_property_id) DO
// UPDATE`), aprovechando el UNIQUE ya definido en el esquema desde Fase 1:
// si el alojamiento ya está cacheado, se refresca con los datos actuales
// del provider en vez de duplicarlo — coherente con "caché", no un log de
// solo-inserción.
//
// `raw_data`: hallazgo del bloque "FASE 1 — Sync Content API" — esta
// función nunca había escrito esta columna (se quedaba en su default
// `'{}'::jsonb` de la migración de creación de la tabla), pese a que
// `Property.raw` (types/travel.ts) existe desde F4-02 precisamente para
// esto. No afecta a ningún llamador existente que no informe `raw`
// (booking/actions.ts, tests): `property.raw ?? {}` reproduce
// exactamente el mismo `{}` que ya se guardaba antes por omisión.
export async function upsertPropertyCache(property: Property): Promise<string> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("properties")
    .upsert(
      {
        provider_name: property.providerName,
        provider_property_id: property.providerPropertyId,
        name: property.name,
        city: property.city ?? null,
        country: property.country ?? null,
        latitude: property.latitude ?? null,
        longitude: property.longitude ?? null,
        main_photo_url: property.mainPhotoUrl ?? null,
        rating: property.rating ?? null,
        raw_data: property.raw ?? {},
      },
      { onConflict: "provider_name,provider_property_id" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `No se pudo cachear la propiedad en "properties": ${error?.message ?? "sin datos"}`,
    );
  }

  return data.id as string;
}

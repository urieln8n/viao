import { createServiceRoleClient } from "../supabase/service";
import type { HotelbedsDestination } from "../hotelbeds/destinations-mappers";

// FPR-HOTELS-02 — Upsert real (`ON CONFLICT (provider_name, code) DO
// UPDATE`) hacia `destinations`, mismo patrón exacto que
// `upsert-property-cache.ts`: si el destino ya está cacheado, se refresca
// con los datos actuales de Hotelbeds en vez de duplicarlo.
//
// `synced_at` se fija explícitamente aquí (a diferencia de
// `upsert-property-cache.ts`, que no toca `updated_at`): es el único dato
// "cuándo se sincronizó de verdad" — sin fijarlo explícitamente en cada
// upsert, quedaría congelado en el valor del INSERT original (mismo
// hallazgo ya documentado para `updated_at` en toda la base: sin trigger
// automático, un UPDATE que no lo incluya en el payload no lo cambia).
export async function upsertDestinationCache(
  providerName: string,
  destination: HotelbedsDestination,
): Promise<string> {
  const service = createServiceRoleClient();

  const { data, error } = await service
    .from("destinations")
    .upsert(
      {
        provider_name: providerName,
        code: destination.code,
        name: destination.name,
        country_code: destination.countryCode,
        raw_data: destination.raw,
        synced_at: new Date().toISOString(),
      },
      { onConflict: "provider_name,code" },
    )
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      `No se pudo cachear el destino "${destination.code}" en "destinations": ${error?.message ?? "sin datos"}`,
    );
  }

  return data.id as string;
}

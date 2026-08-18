"use server";

import { createClient as createSessionClient } from "../../lib/supabase/server";
import { t } from "../../lib/i18n";

// F11-01 (VIAO_ROADMAP.md) — Server Action de creación de viaje.
//
// Auditoría previa (Paso 0 de F11): `trips` es Patrón A
// (VIAO_DATABASE.md sección 3) — el propio cliente autenticado puede
// insertar bajo RLS (`trips_insert_own`, `WITH CHECK user_id =
// auth.uid()`), mismo mecanismo ya usado por `searches` (F5-06) y
// `vision_consents` (F10-00). Se envuelve en una Server Action (en vez de
// una llamada directa desde el componente) por el mismo motivo que
// F10-00: que el registro pase por código de servidor auditable con el
// mecanismo de identidad ya establecido (F3-06), no porque RLS lo exija.
//
// Único campo realmente obligatorio según el esquema real:
// `destination` (`text NOT NULL`, sin default). `start_date`/`end_date`
// son NULLable — se valida el rango solo si ambos llegan, reflejando
// exactamente el CHECK real de la tabla
// (`end_date IS NULL OR start_date IS NULL OR end_date >= start_date`),
// sin inventar una regla más estricta que la que la BD ya impone.
export interface CreateTripInput {
  destination: string;
  startDate?: string;
  endDate?: string;
}

export type TripFieldErrors = Partial<
  Record<"destination" | "endDate", string>
>;

export type CreateTripActionResult =
  | { status: "success"; tripId: string }
  | { status: "invalid_input"; fieldErrors: TripFieldErrors }
  | { status: "unauthenticated" };

function validateTripInput(input: CreateTripInput): TripFieldErrors {
  const errors: TripFieldErrors = {};

  const destination =
    typeof input?.destination === "string" ? input.destination.trim() : "";
  if (!destination) {
    errors.destination = t("trips.validationDestinationRequired");
  }

  const startDate = typeof input?.startDate === "string" ? input.startDate : "";
  const endDate = typeof input?.endDate === "string" ? input.endDate : "";
  if (startDate && endDate && !(endDate >= startDate)) {
    errors.endDate = t("trips.validationDateRange");
  }

  return errors;
}

export async function createTripAction(
  input: CreateTripInput,
): Promise<CreateTripActionResult> {
  const fieldErrors = validateTripInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    return { status: "invalid_input", fieldErrors };
  }

  let userId: string | undefined;
  try {
    const sessionClient = await createSessionClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();
    userId = user?.id;
    if (!userId) {
      return { status: "unauthenticated" };
    }

    const { data, error } = await sessionClient
      .from("trips")
      .insert({
        user_id: userId,
        destination: input.destination.trim(),
        start_date: input.startDate || null,
        end_date: input.endDate || null,
      })
      .select("id")
      .single();

    if (error || !data) {
      throw new Error(
        `No se pudo crear el viaje: ${error?.message ?? "sin datos"}`,
      );
    }

    return { status: "success", tripId: data.id as string };
  } catch (error) {
    if (!userId) {
      return { status: "unauthenticated" };
    }
    throw error;
  }
}

import { t } from "@/lib/i18n";

import { hasActiveVisionConsent } from "../../lib/vision/check-vision-consent";
import { getUserTrips } from "../../lib/trips/get-user-trips";
import { VisionView } from "./vision-view";

// F10 (VIAO_ROADMAP.md) — Punto de entrada de VIAO Vision. El estado de
// consentimiento se lee server-side (F10-00, misma fuente de verdad que
// `scanVisionAction`) y se pasa como prop inicial — el cliente nunca
// decide por su cuenta si hay consentimiento, solo refleja el resultado
// real ya conocido por el servidor.
//
// Bloque 11 ("Conexión del MVP para piloto") — `getUserTrips()` (F11-01,
// ya usada por `app/trips/page.tsx`) se reutiliza sin cambios para dar a
// `VisionView` la lista real de viajes del usuario, reemplazando el campo
// de texto libre donde antes había que teclear un UUID a mano. Sin sesión
// real, `getUserTrips()` ya devuelve `[]` (best-effort, mismo criterio que
// `hasActiveVisionConsent`) — VisionView cae al estado vacío, sin ningún
// caso especial nuevo aquí.
export default async function VisionPage() {
  const initialHasConsent = await hasActiveVisionConsent();
  const trips = await getUserTrips();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{t("vision.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("vision.description")}</p>
      <VisionView initialHasConsent={initialHasConsent} trips={trips} />
    </main>
  );
}

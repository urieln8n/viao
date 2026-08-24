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
// real, `VisionView` cae al estado vacío, sin ningún caso especial nuevo
// aquí (Bloque Claridad de producto V1: `getUserTrips()` ahora devuelve
// `undefined` sin sesión en vez de `[]`, para que `app/trips/page.tsx`
// pueda distinguirlo — Vision no necesita esa distinción, así que se
// normaliza aquí mismo a `[]`, sin cambiar el comportamiento ya existente
// de esta página).
//
// Bloque 19 ("Identidad visual") — título/descripción ya no viven sueltos
// aquí: se movieron dentro de la Card de cabecera de `VisionView` (mismo
// criterio que VIAO AI) para que Vision se perciba como una herramienta
// propia. Ningún dato ni lógica nueva.
export default async function VisionPage() {
  const initialHasConsent = await hasActiveVisionConsent();
  const trips = (await getUserTrips()) ?? [];

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <VisionView initialHasConsent={initialHasConsent} trips={trips} />
    </main>
  );
}

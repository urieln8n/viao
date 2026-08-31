import { PageContainer } from "@/components/layout/page-container";

import { hasActiveVisionConsent } from "../../lib/vision/check-vision-consent";
import { VisionView } from "./vision-view";

// F10 (VIAO_ROADMAP.md) — Punto de entrada de VIAO Vision. El estado de
// consentimiento se lee server-side (F10-00, misma fuente de verdad que
// `scanVisionAction`) y se pasa como prop inicial — el cliente nunca
// decide por su cuenta si hay consentimiento, solo refleja el resultado
// real ya conocido por el servidor.
//
// Bloque 19 ("Identidad visual") — título/descripción ya no viven sueltos
// aquí: se movieron dentro de la Card de cabecera de `VisionView` (mismo
// criterio que VIAO AI) para que Vision se perciba como una herramienta
// propia. Ningún dato ni lógica nueva.
//
// FASE J-B6 (Vision Decouple, 2026-08-27) — se retira `getUserTrips()` y
// el prop `trips`: Vision ya no necesita conocer los viajes del usuario
// para abrirse ni para funcionar (imagen -> consentimiento -> validación
// -> OCR/traducción -> resultado, sin ninguna dependencia de Trips). El
// único punto de entrada visible a esta página sigue siendo, por ahora,
// el enlace dentro de `app/trips/[id]/page.tsx` — dónde debería vivir una
// nueva entrada es una decisión de producto explícitamente fuera de
// alcance de este bloque (ver el informe de la fase).
export default async function VisionPage() {
  const initialHasConsent = await hasActiveVisionConsent();

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
        <VisionView initialHasConsent={initialHasConsent} />
      </PageContainer>
    </main>
  );
}

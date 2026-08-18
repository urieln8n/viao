import { t } from "@/lib/i18n";

import { hasActiveVisionConsent } from "../../lib/vision/check-vision-consent";
import { VisionView } from "./vision-view";

// F10 (VIAO_ROADMAP.md) — Punto de entrada de VIAO Vision. El estado de
// consentimiento se lee server-side (F10-00, misma fuente de verdad que
// `scanVisionAction`) y se pasa como prop inicial — el cliente nunca
// decide por su cuenta si hay consentimiento, solo refleja el resultado
// real ya conocido por el servidor.
export default async function VisionPage() {
  const initialHasConsent = await hasActiveVisionConsent();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{t("vision.title")}</h1>
      <p className="text-sm text-muted-foreground">{t("vision.description")}</p>
      <VisionView initialHasConsent={initialHasConsent} />
    </main>
  );
}

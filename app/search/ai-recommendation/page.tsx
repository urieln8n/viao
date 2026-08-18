import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";

import { isValidUuid } from "../../properties/[id]/resolve";
import { AiRecommendationView } from "./ai-recommendation-view";

// F9-02 (VIAO_ROADMAP.md) — Punto de entrada mínimo para invocar
// `requestAiRecommendationAction` desde un navegador real (necesario para
// el E2E obligatorio de la fase: sin ninguna página, la Server Action no
// sería alcanzable con una sesión real). No añade ninguna funcionalidad
// fuera de F9-01→F9-05: solo el `searchId` de la query string se propaga
// al cliente (mismo formato ya usado por F5-07/F6-01 en
// app/booking/[propertyId]/page.tsx), validado aquí con el mismo
// `isValidUuid` — un valor ausente o con formato inválido nunca llega a
// `AiRecommendationView`.
interface AiRecommendationPageProps {
  searchParams: Promise<{ searchId?: string | string[] }>;
}

function BackToResultsLink() {
  return (
    <Link href="/search" className={buttonVariants({ variant: "outline" })}>
      {t("aiRecommendation.backToResults")}
    </Link>
  );
}

export default async function AiRecommendationPage({
  searchParams,
}: AiRecommendationPageProps) {
  const rawQuery = await searchParams;
  const searchId =
    typeof rawQuery.searchId === "string" ? rawQuery.searchId : "";

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-4 p-6">
      <h1 className="text-xl font-semibold">{t("aiRecommendation.title")}</h1>
      <p className="text-sm text-muted-foreground">
        {t("aiRecommendation.description")}
      </p>

      {!isValidUuid(searchId) ? (
        <ErrorState
          message={t("aiRecommendation.errorInvalidSearchId")}
          action={<BackToResultsLink />}
        />
      ) : (
        <AiRecommendationView searchId={searchId} />
      )}
    </main>
  );
}

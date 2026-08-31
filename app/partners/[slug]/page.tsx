import Link from "next/link";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/state/empty-state";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { getPartnerBySlug } from "../../../lib/partners/get-partner-by-slug";
import { getMissionDefinition } from "../../../lib/missions/rules";
import { logAnalyticsEvent } from "../../../lib/analytics/log-event";
import { CATEGORY_LABEL_KEY } from "../category-label";
import { PartnerImage } from "../partner-image";
import type { PartnerCategory } from "../../../lib/partners/request-partner-registration";

// UX-10 (Partners Visible + Discovery + Registration) — §8: Partner
// Profile pública. Deliberadamente informativa, sin ninguna acción de
// registrar Actividad aquí (eso sigue viviendo exclusivamente en
// `/partners/ops/[accessToken]`, un enlace que el propio Partner
// entrega — nunca expuesto desde Discovery/Profile). "¿Qué puedes hacer
// aquí?" reutiliza las 4 Missions ya existentes (lib/missions/rules.ts)
// tal cual — sin inventar Missions específicas por Partner.
export default async function PartnerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = await getPartnerBySlug(slug);

  if (!partner) {
    return (
      <main className="flex flex-1 flex-col">
        <PageContainer variant="default" className="flex flex-1 flex-col gap-4 p-6">
          <EmptyState
            title={t("partnerProfile.notFoundTitle")}
            message={t("partnerProfile.notFoundMessage")}
            action={
              <Link href="/partners" className={buttonVariants({ variant: "outline" })}>
                {t("partnerProfile.backToDiscoveryCta")}
              </Link>
            }
          />
        </PageContainer>
      </main>
    );
  }

  // UX-12 (Partner Self-Service + Measurement) — §7 de la autorización:
  // solo se emite para un Partner válido resuelto (nunca para el caso
  // "no encontrado" de arriba), sin deduplicar en escritura (mismo
  // criterio que el resto de la taxonomía, ver lib/analytics/taxonomy.test.ts)
  // — "perfiles vistos" como KPI se agrega en la lectura, no aquí.
  await logAnalyticsEvent("partner_profile_viewed", { partnerId: partner.id, slug: partner.slug });

  const categoryKey: TranslationKey | undefined = CATEGORY_LABEL_KEY[partner.category as PartnerCategory];
  const relevantMission = getMissionDefinition("partner_activity_registered");

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer variant="default" className="flex flex-1 flex-col gap-6 p-6">
        <PartnerImage
          src={partner.imageUrl}
          imageClassName="h-40 w-full rounded-xl object-cover"
          placeholderClassName="flex h-40 w-full items-center justify-center rounded-xl bg-muted"
          iconClassName="size-10 text-muted-foreground"
        />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight">{partner.name}</h1>
            <Badge variant="secondary">{categoryKey ? t(categoryKey) : partner.category}</Badge>
          </div>
          {partner.description && (
            <p className="text-sm text-muted-foreground">{partner.description}</p>
          )}
          {partner.address && (
            <p className="text-sm text-muted-foreground">{partner.address}</p>
          )}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm font-semibold">{t("partnerProfile.whatCanYouDoTitle")}</p>
            {relevantMission && (
              <div className="flex items-center justify-between gap-3 text-sm">
                <span>{relevantMission.name}</span>
                <span className="font-mono text-xs tabular-nums text-success">
                  +{relevantMission.points} {t("rewards.pointsUnit")}
                </span>
              </div>
            )}
            <p className="text-xs font-medium text-success">{t("partnerProfile.pointsHintCta")}</p>
          </CardContent>
        </Card>

        <Link href="/partners" className={buttonVariants({ variant: "outline", className: "self-start" })}>
          {t("partnerProfile.backToDiscoveryCta")}
        </Link>
      </PageContainer>
    </main>
  );
}

import Link from "next/link";
import { Store } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import type { ActivePartnerSummary } from "../../lib/partners/get-active-partners";
import { CATEGORY_LABEL_KEY } from "./category-label";
import type { PartnerCategory } from "../../lib/partners/request-partner-registration";

// UX-10 (Partners Visible + Discovery + Registration) — §7: responde en
// una tarjeta "¿Quién es? / ¿Qué es? / ¿Por qué me interesa?", sin CTA
// engañoso ("Visitar"/"Reservar"/"Comprar") — VIAO todavía no verifica
// esas acciones, solo la Actividad declarada en `/ops/[accessToken]`.
export function PartnerCard({ partner }: { partner: ActivePartnerSummary }) {
  const categoryKey: TranslationKey | undefined = CATEGORY_LABEL_KEY[partner.category as PartnerCategory];

  return (
    <Card>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          {partner.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- URL de texto libre (sin bucket de Storage), no cabe en next/image sin configurar dominios remotos arbitrarios.
            <img
              src={partner.imageUrl}
              alt=""
              className="size-14 shrink-0 rounded-lg object-cover"
            />
          ) : (
            <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Store className="size-6 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
          <div className="flex flex-col gap-1">
            <span className="text-base font-semibold">{partner.name}</span>
            <Badge variant="secondary">{categoryKey ? t(categoryKey) : partner.category}</Badge>
          </div>
        </div>

        {partner.description && (
          <p className="text-sm text-muted-foreground">{partner.description}</p>
        )}

        {partner.address && (
          <p className="text-xs text-muted-foreground">{partner.address}</p>
        )}

        <p className="text-xs font-medium text-success">{t("partners.card.pointsHint")}</p>

        <Link
          href={`/partners/${partner.slug}`}
          className={buttonVariants({ variant: "outline", size: "sm", className: "self-start" })}
        >
          {t("partners.card.viewCta")}
        </Link>
      </CardContent>
    </Card>
  );
}

import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import type { PartnerAccessContext } from "../../../../lib/partners/resolve-partner-access";
import type { PartnerDashboardData } from "../../../../lib/partners/get-partner-dashboard";

// Bloque Partners PB6 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — Server
// Component puro (sin "use client"): el Dashboard es estrictamente de
// solo lectura, sin ninguna interacción que requiera estado en el
// navegador — mismo criterio de "preferir lectura server-side" pedido en
// la autorización de PB6. `dashboard` ya llega calculado desde
// `getPartnerDashboard()` (page.tsx); este componente solo renderiza.
//
// `access_token` nunca se muestra aquí como dato — solo se usa para
// construir el enlace de vuelta a /partners/ops/[accessToken] (PB5).

const EUR_FORMATTER = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR" });

function formatEur(value: number): string {
  return EUR_FORMATTER.format(value);
}

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}

interface PartnerDashboardViewProps {
  partner: PartnerAccessContext;
  accessToken: string;
  dashboard: PartnerDashboardData;
}

export function PartnerDashboardView({ partner, accessToken, dashboard }: PartnerDashboardViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{partner.name}</CardTitle>
          <CardDescription>{t("partnerDashboard.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <Badge variant={dashboard.partnerActivo ? "success" : "outline"}>
            {dashboard.partnerActivo ? t("partnerDashboard.statusActive") : t("partnerDashboard.statusInactive")}
          </Badge>
          <Link href={`/partners/ops/${accessToken}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("partnerDashboard.backToOpsCta")}
          </Link>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={t("partnerDashboard.newCustomersLabel")} value={dashboard.clientesNuevos} />
        <StatCard label={t("partnerDashboard.returningCustomersLabel")} value={dashboard.clientesRecurrentes} />
        <StatCard
          label={t("partnerDashboard.declaredSalesLabel")}
          value={formatEur(dashboard.ventasDeclaradasEur)}
          tone="positive"
        />
        <StatCard
          label={t("partnerDashboard.confirmedSalesLabel")}
          value={formatEur(dashboard.ventasConfirmadasReservaEur)}
          tone="positive"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("partnerDashboard.recentActivityTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboard.actividadReciente.length === 0 ? (
            <EmptyState
              title={t("partnerDashboard.emptyActivityTitle")}
              message={t("partnerDashboard.emptyActivityMessage")}
            />
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {dashboard.actividadReciente.map((activity, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {activity.attributionMechanism === "qr"
                        ? t("partnerDashboard.qrActivityLabel")
                        : t("partnerDashboard.reservationActivityLabel")}
                    </span>
                    <span className="text-xs text-muted-foreground">{formatDateTime(activity.createdAt)}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-sm font-medium">{formatEur(activity.declaredAmountEur)}</span>
                    <span className="text-xs text-muted-foreground">
                      {activity.pointsAwarded > 0
                        ? `+${activity.pointsAwarded} ${t("rewards.pointsUnit")}`
                        : t("partnerDashboard.noPointsLabel")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

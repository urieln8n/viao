import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/state/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import type { PartnerAccessContext } from "../../../../lib/partners/resolve-partner-access";
import type { PartnerDashboardData } from "../../../../lib/partners/get-partner-dashboard";
import type { PartnerEditableProfile } from "../../../../lib/partners/get-partner-for-editing";
import { MyBusinessForm } from "./my-business-form";
import { LinkAccountWidget } from "./link-account-widget";

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
  editableProfile: PartnerEditableProfile;
  ownerLinked: boolean;
}

export function PartnerDashboardView({
  partner,
  accessToken,
  dashboard,
  editableProfile,
  ownerLinked,
}: PartnerDashboardViewProps) {
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{partner.name}</CardTitle>
          <CardDescription>{t("partnerDashboard.subtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-3">
          <Badge variant={dashboard.partnerActivo ? "info" : "outline"}>
            {dashboard.partnerActivo ? t("partnerDashboard.statusActive") : t("partnerDashboard.statusInactive")}
          </Badge>
          <Link href={`/partners/ops/${accessToken}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            {t("partnerDashboard.backToOpsCta")}
          </Link>
        </CardContent>
      </Card>

      {/* UX-16.3 (Commerce Identity) — mismo hueco estructural que el
          resto de secciones del Dashboard: "vincula" mientras `owner_id`
          es NULL, "ya vinculado" en cuanto exista. El access_token de la
          URL sigue funcionando igual en ambos casos. */}
      {ownerLinked ? (
        <Badge variant="info" className="w-fit">
          {t("partnerDashboard.accountLinkedLabel")}
        </Badge>
      ) : (
        <LinkAccountWidget accessToken={accessToken} />
      )}

      {/* UX-3 (World-Class Core Screen Design) — hallazgo de la
          auditoría: 4 StatCards en un único grid 2x2 mezclaban dos
          categorías distintas (clientes vs. ventas) sin ninguna señal
          visual de que son grupos diferentes — "información secundaria
          compitiendo con primaria" (brief §8). Ningún dato ni cálculo
          cambia, solo se agrupan bajo un eyebrow — el mismo tratamiento
          `text-xs uppercase tracking-wide` que ya usaban las labels de
          Missions/Goal, formalizado aquí como encabezado de grupo. */}
      {/* UX-12 (Partner Self-Service + Measurement) — §9: grupo nuevo,
          antes de Clientes/Ventas a propósito (orden de embudo:
          Visibilidad -> Clientes -> Ventas). Una sola StatCard: el único
          dato real disponible hoy es el total de vistas
          (`partner_profile_viewed`) — visitantes únicos queda fuera de
          alcance de este bloque por instrucción explícita. */}
      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("partnerDashboard.visibilityGroupLabel")}
        </span>
        <StatCard label={t("partnerDashboard.profileViewsLabel")} value={dashboard.profileViews} />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("partnerDashboard.customersGroupLabel")}
        </span>
        <div className="grid grid-cols-2 gap-3">
          <StatCard label={t("partnerDashboard.newCustomersLabel")} value={dashboard.clientesNuevos} />
          <StatCard label={t("partnerDashboard.returningCustomersLabel")} value={dashboard.clientesRecurrentes} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {t("partnerDashboard.salesGroupLabel")}
        </span>
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label={t("partnerDashboard.declaredSalesLabel")}
            value={formatEur(dashboard.ventasDeclaradasEur)}
            tone="info"
          />
          <StatCard
            label={t("partnerDashboard.confirmedSalesLabel")}
            value={formatEur(dashboard.ventasConfirmadasReservaEur)}
            tone="info"
          />
        </div>
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

      {/* UX-12 (Partner Self-Service C1) — §7: sección "Mi comercio",
          al final del Dashboard (solo lectura arriba, edición al final) —
          mismo criterio de jerarquía ya usado en Wallet (saldo/canje
          antes que historial). */}
      <MyBusinessForm accessToken={accessToken} profile={editableProfile} />
    </div>
  );
}

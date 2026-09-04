"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/state/empty-state";
import { t } from "@/lib/i18n";

import { setPartnerStatusAction, resendPartnerAccessAction } from "../../partners/admin-actions";
import { CATEGORY_LABEL_KEY } from "../../partners/category-label";
import type { PartnerCategory } from "../../../lib/partners/request-partner-registration";
import type { PartnerStatus } from "../../../lib/partners/set-partner-status";
import type { AdminPartnerSummary } from "../../../lib/partners/get-partners-for-admin";

// P10 (Admin Partners V1) — Client Component: SOLO decide qué botón
// mostrar según `status` (mismo criterio que set-partner-status.ts) y
// llama a setPartnerStatusAction() ya existente, sin reimplementar ni un
// ápice de la máquina de estados (esa validación vive íntegramente en
// public.set_partner_status(), ver §8 de la auditoría de este bloque).
// Sin optimistic update, a propósito (preferencia explícita del
// propietario): cada botón espera la respuesta real del servidor antes
// de reflejar cualquier cambio — router.refresh() vuelve a ejecutar el
// Server Component (page.tsx), que trae el estado real desde
// getPartnersForAdmin(), nunca una copia local mutada a mano.
type ActionKind = "activate" | "reject" | "deactivate";

interface PartnerAction {
  kind: ActionKind;
  target: PartnerStatus;
  needsConfirm: boolean;
}

const ACTION_LABEL_KEY: Record<ActionKind, "adminPartners.activateCta" | "adminPartners.rejectCta" | "adminPartners.deactivateCta"> = {
  activate: "adminPartners.activateCta",
  reject: "adminPartners.rejectCta",
  deactivate: "adminPartners.deactivateCta",
};

const ACTION_LOADING_LABEL_KEY: Record<
  ActionKind,
  "adminPartners.activating" | "adminPartners.rejecting" | "adminPartners.deactivating"
> = {
  activate: "adminPartners.activating",
  reject: "adminPartners.rejecting",
  deactivate: "adminPartners.deactivating",
};

const STATUS_LABEL_KEY: Record<string, "adminPartners.statusPending" | "adminPartners.statusActive" | "adminPartners.statusInactive"> = {
  pending: "adminPartners.statusPending",
  active: "adminPartners.statusActive",
  inactive: "adminPartners.statusInactive",
};

/** Refleja la matriz real de public.set_partner_status() — solo para decidir qué botón mostrar, nunca para validar nada. */
function getAvailableActions(status: string): PartnerAction[] {
  if (status === "pending") {
    return [
      { kind: "activate", target: "active", needsConfirm: false },
      { kind: "reject", target: "inactive", needsConfirm: false },
    ];
  }
  if (status === "active") {
    return [{ kind: "deactivate", target: "inactive", needsConfirm: true }];
  }
  if (status === "inactive") {
    return [{ kind: "activate", target: "active", needsConfirm: false }];
  }
  return [];
}

function formatCreatedAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat("es-ES", { dateStyle: "medium" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

type RowState = { phase: "idle" } | { phase: "loading"; kind: ActionKind } | { phase: "error"; kind: ActionKind };

// P14.1.1 (Partner Onboarding + Access Recovery) — estado independiente
// del de arriba (aprobar/rechazar/desactivar): "Reenviar acceso" no
// cambia `status`, así que nunca debe compartir rowStates ni disparar
// router.refresh() (nada que releer del servidor tras un envío de email).
type ResendState = { phase: "idle" } | { phase: "loading" } | { phase: "success" } | { phase: "error" };

interface AdminPartnersViewProps {
  partners: AdminPartnerSummary[];
}

export function AdminPartnersView({ partners }: AdminPartnersViewProps) {
  const router = useRouter();
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  const [resendStates, setResendStates] = useState<Record<string, ResendState>>({});
  const [confirming, setConfirming] = useState<{ partnerId: string; partnerName: string; action: PartnerAction } | null>(null);

  async function runAction(partnerId: string, action: PartnerAction) {
    setRowStates((prev) => ({ ...prev, [partnerId]: { phase: "loading", kind: action.kind } }));

    const result = await setPartnerStatusAction(partnerId, action.target);

    if (result.outcome === "updated") {
      setRowStates((prev) => ({ ...prev, [partnerId]: { phase: "idle" } }));
      router.refresh();
      return;
    }

    setRowStates((prev) => ({ ...prev, [partnerId]: { phase: "error", kind: action.kind } }));
  }

  // P14.1.1 — sin router.refresh(): reenviar el email no cambia ningún
  // dato que getPartnersForAdmin() vuelva a leer, así que no hay nada
  // que releer del servidor. El resultado real (sent/not_sent) nunca
  // llega a la UI más allá de éxito/error genérico — ver
  // resendPartnerAccess() para el porqué (anti-enumeración, mismo
  // criterio que el resto del dominio Partners).
  async function runResend(partnerId: string) {
    setResendStates((prev) => ({ ...prev, [partnerId]: { phase: "loading" } }));
    const result = await resendPartnerAccessAction(partnerId);
    setResendStates((prev) => ({
      ...prev,
      [partnerId]: { phase: result.outcome === "sent" ? "success" : "error" },
    }));
  }

  function handleActionClick(partner: AdminPartnerSummary, action: PartnerAction) {
    if (action.needsConfirm) {
      setConfirming({ partnerId: partner.id, partnerName: partner.name, action });
      return;
    }
    void runAction(partner.id, action);
  }

  function handleConfirmDeactivate() {
    if (!confirming) return;
    const { partnerId, action } = confirming;
    setConfirming(null);
    void runAction(partnerId, action);
  }

  if (partners.length === 0) {
    return <EmptyState title={t("adminPartners.emptyTitle")} />;
  }

  return (
    <div className="flex flex-col gap-3">
      {partners.map((partner) => {
        const rowState = rowStates[partner.id] ?? { phase: "idle" as const };
        const isLoading = rowState.phase === "loading";
        const actions = getAvailableActions(partner.status);
        const statusLabelKey = STATUS_LABEL_KEY[partner.status];
        const statusVariant = partner.status === "active" ? "info" : partner.status === "inactive" ? "outline" : "secondary";

        return (
          <Card key={partner.id}>
            <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
              <div className="flex flex-col gap-1">
                <CardTitle>{partner.name}</CardTitle>
                <CardDescription>
                  {(() => {
                    const key = CATEGORY_LABEL_KEY[partner.category as PartnerCategory];
                    return key ? t(key) : partner.category;
                  })()}
                </CardDescription>
              </div>
              <Badge variant={statusVariant}>{statusLabelKey ? t(statusLabelKey) : partner.status}</Badge>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-col gap-1 text-sm text-muted-foreground sm:flex-row sm:justify-between">
                <span>{partner.contactEmail ?? t("adminPartners.contactUnavailable")}</span>
                <span>
                  {t("adminPartners.createdAtLabel")} {formatCreatedAt(partner.createdAt)}
                </span>
              </div>

              {rowState.phase === "error" && <p className="text-sm text-destructive">{t("adminPartners.errorGeneric")}</p>}

              <div className="flex flex-wrap gap-2">
                {actions.map((action) => (
                  <Button
                    key={action.kind}
                    type="button"
                    variant={action.kind === "deactivate" ? "destructive" : action.kind === "reject" ? "outline" : "default"}
                    disabled={isLoading}
                    onClick={() => handleActionClick(partner, action)}
                  >
                    {isLoading && rowState.kind === action.kind
                      ? t(ACTION_LOADING_LABEL_KEY[action.kind])
                      : t(ACTION_LABEL_KEY[action.kind])}
                  </Button>
                ))}
              </div>

              {/* P14.1.1 (Partner Onboarding + Access Recovery) — fallback
                  manual al webhook de aprobación (Email V2). Solo tiene
                  sentido para un Partner `active`: uno `pending`/`inactive`
                  produciría un enlace que hoy resuelve en notFound(), el
                  propio resendPartnerAccess() ya lo rechaza server-side,
                  esto solo evita ofrecer una acción que sabemos que
                  fallará. El access_token NUNCA llega aquí — ni como prop,
                  ni en ninguna respuesta: la Card solo conoce partner.id. */}
              {partner.status === "active" &&
                (partner.contactEmail ? (
                  <div className="flex flex-wrap items-center gap-2 border-t pt-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={resendStates[partner.id]?.phase === "loading"}
                      onClick={() => void runResend(partner.id)}
                    >
                      {resendStates[partner.id]?.phase === "loading"
                        ? t("adminPartners.resendAccessLoading")
                        : t("adminPartners.resendAccessCta")}
                    </Button>
                    {resendStates[partner.id]?.phase === "success" && (
                      <span className="text-sm text-muted-foreground">{t("adminPartners.resendAccessSuccess")}</span>
                    )}
                    {resendStates[partner.id]?.phase === "error" && (
                      <span className="text-sm text-destructive">{t("adminPartners.resendAccessError")}</span>
                    )}
                  </div>
                ) : (
                  <p className="border-t pt-3 text-sm text-muted-foreground">{t("adminPartners.resendAccessUnavailable")}</p>
                ))}
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={confirming !== null} onOpenChange={(open) => !open && setConfirming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("adminPartners.deactivateDialogTitle")}</DialogTitle>
            <DialogDescription>
              {confirming?.partnerName} — {t("adminPartners.deactivateDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConfirming(null)}>
              {t("adminPartners.cancelCta")}
            </Button>
            <Button type="button" variant="destructive" onClick={handleConfirmDeactivate}>
              {t("adminPartners.confirmDeactivateCta")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

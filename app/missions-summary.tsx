import { Check } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { t } from "@/lib/i18n";

import type { MissionStatus } from "../lib/missions/get-missions-status";

// Bloque Missions (Prompt Maestro 24/08/2026) — sección mínima de Home.
// Solo lectura: las Missions se completan como efecto lateral de
// acciones reales ya existentes (buscar, volver, ver un alojamiento,
// crear un Goal) — esta sección nunca dispara nada, solo muestra el
// estado ya calculado por `getMissionsStatus()`. Sin animaciones nuevas,
// sin interacción — la jerarquía de Home se revisará en la Fase C.
//
// Bloque Claridad de producto V1 — `CardDescription` (mismo patrón ya
// usado en la card de Vision de Home) explica en una línea qué son las
// Missions.
//
// Bloque Premium Design System V1 (Fase B) — los `<span>` hand-rolled de
// estado/periodicidad pasan a `Badge` (`components/ui/badge.tsx`), con 3
// tratamientos visuales distintos a propósito, sin usar ningún color
// nuevo: `success` (única badge con color, refuerza "esto se completó"
// sin depender solo del color — el nombre ya usaba `line-through` desde
// antes, se conserva) para completada, `outline` (neutro, sin relleno)
// para pendiente, `secondary` (neutro, con relleno) para la periodicidad
// — así los 3 tipos de información no se confunden visualmente entre sí.
// Ningún cambio de nombres, Points, periodicidad, ni lógica de
// completion/eventos/RPC/ledger/anti-farming.
export function MissionsSummary({ missions }: { missions: MissionStatus[] }) {
  return (
    // Micro-bloque 2 (Home Beta) — ya no comparte fila con Goal (ver
    // app/page.tsx): `size="sm"` (prop ya existente de `Card`, sin
    // ningún token/componente nuevo) reduce el padding interno para que
    // Missions tenga menos peso visual que Goal, ahora que ambos ocupan
    // su propia fila completa.
    <Card size="sm">
      <CardHeader>
        <CardTitle>{t("missions.sectionTitle")}</CardTitle>
        <CardDescription>{t("missions.sectionDescription")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {missions.map((mission) => (
          <div key={mission.key} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex flex-col gap-1">
              <span className={mission.completed ? "text-muted-foreground line-through" : "font-medium"}>
                {mission.name}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>
                  +{mission.points} {t("rewards.pointsUnit")}
                </span>
                <Badge variant="secondary">
                  {mission.periodicity === "weekly" ? t("missions.weeklyBadge") : t("missions.lifetimeBadge")}
                </Badge>
              </div>
            </div>
            <Badge variant={mission.completed ? "success" : "outline"}>
              {mission.completed && <Check aria-hidden="true" />}
              {mission.completed ? t("missions.completedLabel") : t("missions.pendingLabel")}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

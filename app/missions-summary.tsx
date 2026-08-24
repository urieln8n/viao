import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";

import type { MissionStatus } from "../lib/missions/get-missions-status";

// Bloque Missions (Prompt Maestro 24/08/2026) — sección mínima de Home.
// Solo lectura: las Missions se completan como efecto lateral de
// acciones reales ya existentes (buscar, volver, ver un alojamiento,
// crear un Goal) — esta sección nunca dispara nada, solo muestra el
// estado ya calculado por `getMissionsStatus()`. Sin animaciones, sin
// interacción, sin rediseño — la UX general se revisará más adelante.
export function MissionsSummary({ missions }: { missions: MissionStatus[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("missions.sectionTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {missions.map((mission) => (
          <div key={mission.key} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex flex-col gap-0.5">
              <span className={mission.completed ? "text-muted-foreground line-through" : "font-medium"}>
                {mission.name}
              </span>
              <span className="text-xs text-muted-foreground">
                +{mission.points} {t("rewards.pointsUnit")} ·{" "}
                {mission.periodicity === "weekly" ? t("missions.weeklyBadge") : t("missions.lifetimeBadge")}
              </span>
            </div>
            <span
              className={
                mission.completed
                  ? "text-xs font-medium text-success"
                  : "text-xs text-muted-foreground"
              }
            >
              {mission.completed ? t("missions.completedLabel") : t("missions.pendingLabel")}
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

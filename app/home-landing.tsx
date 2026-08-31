import { ArrowDown, ArrowRight } from "lucide-react";

import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { t } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n/types";

import { getActivePartners } from "../lib/partners/get-active-partners";
import { PartnerCard } from "./partners/partner-card";
import { LandingFirstExperience } from "./landing-first-experience";

// UX-14 (Landing educativa + First Experience) — contenido exclusivo del
// usuario deslogueado en Home (`app/page.tsx`, rama `balance === undefined`).
// Solo lectura: `getActivePartners()` (mismo helper que ya usa Discovery,
// service_role, nunca lanza, excluye fixtures `is_test`) — ninguna escritura,
// ningún RPC, ningún dato nuevo.
//
// UX-14.1 (P0) — "¿Qué son los Points?" usa `home.landingPointsBody`
// (Partners + Missions únicamente), NO `rewards.pointsExplainer` (esa
// clave menciona referidos, fuera de alcance de esta primera versión).
export async function HomeLanding() {
  const partners = await getActivePartners();
  const evidencePartners = partners.slice(0, 2);

  return (
    <div className="flex flex-col gap-8">
      <section id="landing-points" className="flex flex-col gap-2 scroll-mt-6">
        <h2 className="text-xl font-semibold tracking-tight">{t("home.landingPointsTitle")}</h2>
        <p className="text-sm text-muted-foreground">{t("home.landingPointsBody")}</p>
        <p className="text-sm font-medium">{t("rewards.provisionalNote")}</p>
      </section>

      {/* UX-14.1 (P1 §8) — hallazgo de la auditoría: 5 cards con igual
          peso, sin conectores, se leían como un glosario, no como una
          secuencia. Ahora "Partner"/"Mission" se agrupan como un único
          primer escalón (son alternativas paralelas, no un paso tras
          otro) y 3 flechas conectan los 4 escalones reales del ciclo:
          {Partner/Mission} -> Points -> Goal -> Reward, tal como pide la
          autorización. Vertical en mobile (ArrowDown), horizontal en
          desktop (ArrowRight) — mismo contenido, sin diagrama técnico. */}
      <section className="flex flex-col gap-4">
        <h2 className="text-xl font-semibold tracking-tight">{t("home.landingCycleTitle")}</h2>
        <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
          {/* min-w explícito: sin él, este grupo (flex-en-flex, sin
              flex-basis propio) colapsaba a un ancho casi nulo en
              desktop, porque `Card` tiene `overflow-hidden` (min-width
              automático 0 en flex) y nada más lo sostenía — bug
              encontrado y corregido durante la propia verificación E2E
              de este bloque, no parte del hallazgo original de UX-14.1. */}
          <div className="grid grid-cols-2 gap-2 lg:flex lg:min-w-[280px] lg:shrink-0 lg:gap-2">
            <CycleStep
              className="lg:flex-1"
              labelKey="home.landingCyclePartnerLabel"
              descKey="home.landingCyclePartnerDesc"
            />
            <CycleStep
              className="lg:flex-1"
              labelKey="home.landingCycleMissionLabel"
              descKey="home.landingCycleMissionDesc"
            />
          </div>
          <CycleArrow />
          <CycleStep
            className="lg:flex-1"
            labelKey="home.landingCyclePointsLabel"
            descKey="home.landingCyclePointsDesc"
          />
          <CycleArrow />
          <CycleStep
            className="lg:flex-1"
            labelKey="home.landingCycleGoalLabel"
            descKey="home.landingCycleGoalDesc"
          />
          <CycleArrow />
          <CycleStep
            className="lg:flex-1"
            labelKey="home.landingCycleRewardLabel"
            descKey="home.landingCycleRewardDesc"
          />
        </div>
      </section>

      <LandingFirstExperience />

      {/* Autorización UX-14 §3 — omitida por completo si no hay Partners
          activos reales (nunca fixtures: `getActivePartners()` ya excluye
          `is_test`), nunca datos inventados. */}
      {evidencePartners.length > 0 && (
        <section className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-xl font-semibold tracking-tight">{t("home.landingPartnersTitle")}</h2>
            <p className="text-sm text-muted-foreground">{t("home.landingPartnersSubtitle")}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {evidencePartners.map((partner) => (
              <PartnerCard key={partner.id} partner={partner} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CycleStep({
  labelKey,
  descKey,
  className,
}: {
  labelKey: TranslationKey;
  descKey: TranslationKey;
  className?: string;
}) {
  return (
    <Card size="sm" className={className}>
      <CardHeader>
        <CardTitle>{t(labelKey)}</CardTitle>
        <CardDescription>{t(descKey)}</CardDescription>
      </CardHeader>
    </Card>
  );
}

// UX-14.1 (P1 §8) — conector puramente decorativo (aria-hidden): flecha
// hacia abajo en mobile/tablet, hacia la derecha en desktop. Mismo
// componente en los 3 puntos del ciclo, sin lógica propia.
function CycleArrow() {
  return (
    <div className="flex shrink-0 items-center justify-center text-muted-foreground" aria-hidden="true">
      <ArrowDown className="size-4 lg:hidden" />
      <ArrowRight className="hidden size-4 lg:block" />
    </div>
  );
}

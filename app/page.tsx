import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { PageContainer } from "@/components/layout/page-container";
import { t } from "@/lib/i18n";

import { getWalletBalance } from "../lib/rewards/get-wallet-balance";
import { getActiveGoal } from "../lib/goals/get-goal";
import { getMissionsStatus } from "../lib/missions/get-missions-status";
import { GoalCard } from "./goal-card";
import { MissionsSummary } from "./missions-summary";
import { HomeLanding } from "./home-landing";

// Corrección estratégica permanente (VIAO no es una app de viajes) — Home
// deja de leer/renderizar nada relacionado con Travel (viajes destacados,
// destinos, búsqueda de alojamiento). La jerarquía visible pasa a girar
// exclusivamente alrededor de Goal -> Missions -> Points/Rewards.
//
// Se retiran de este archivo: `getUserTrips`/`getTripDetail`/`TripDetail`,
// `getCachedDestinations`, `selectFeaturedTrip`/`TripHero`/`EYEBROW_KEY` y
// toda la sección "Cuando estés listo para viajar" (`id="travel"`) y el
// cierre condicional "Trips closing". Ninguno de esos módulos
// (lib/trips/*, lib/destinations/*) se elimina ni se modifica — siguen
// existiendo y siguen siendo código válido, simplemente Home deja de
// invocarlos. `app/trips/`, `app/search/`, `app/properties/`,
// `app/booking/`, `app/vision/` no se tocan.
export default async function Home() {
  const balance = await getWalletBalance();
  // Bloque 1 (VIAO_V1_LOOP_DECISION.md) — solo tiene sentido resolverlo
  // con sesión real (mismo criterio que `balance`); sin sesión,
  // `getActiveGoal()` ya devuelve `undefined` de forma segura, pero se
  // evita la consulta innecesaria cuando ya se sabe que no hay sesión.
  const activeGoal = balance !== undefined ? await getActiveGoal() : undefined;
  // Bloque Missions (Prompt Maestro 24/08/2026) — mismo criterio que
  // `activeGoal`: sin sesión, `getMissionsStatus()` ya devuelve las 4
  // Missions como no completadas de forma segura, pero se evita la
  // consulta innecesaria cuando ya se sabe que no hay sesión.
  const missions = balance !== undefined ? await getMissionsStatus() : undefined;

  return (
    <main className="flex flex-1 flex-col">
      <PageContainer
        variant="wide"
        className="flex flex-1 flex-col gap-10 px-4 py-8 lg:gap-14 lg:px-8"
      >
        {/* Hero único, siempre el mismo tratamiento (antes condicional a
            si había un viaje destacado): afirma la tesis de producto
            ("tu actividad cotidiana te acerca a tu Goal") con un único CTA
            que depende del estado real del usuario (`balance`/
            `activeGoal`), sin lógica de negocio nueva. Los CTA
            autenticados enlazan por ancla (`#goal`, ver la sección Goal
            más abajo) a la misma página — nunca a una ruta nueva. */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight md:text-5xl">
              {t("home.greetingTitle")}
            </h1>
            <p className="text-sm text-muted-foreground md:text-base">
              {t("home.greetingSubtitle")}
            </p>
          </div>

          {/* UX-3 (World-Class Core Screen Design) — hallazgo de la
              auditoría: el único indicador de "qué he conseguido" de toda
              Home vivía al final de la página (línea de Points bajo
              Missions), obligando a pasar por dos cards enteras (Goal +
              Missions) antes de verlo — contradice el propio criterio de
              "responder en ~3 segundos" que pide este bloque. No se
              duplica la card de Points (eso sí sería llenar Home de
              cajas) — solo una línea compacta, mismo tratamiento
              mono/tabular ya establecido en UX-2, deliberadamente sin
              repetir la frase completa que ya usa el teaser inferior. */}
          {balance !== undefined && (
            <p className="text-sm font-medium">
              <span className="font-mono text-lg tabular-nums text-success">{balance}</span>{" "}
              <span className="text-muted-foreground">{t("rewards.pointsUnit")}</span>
            </p>
          )}

          {balance === undefined ? (
            // UX-14 (Landing educativa + First Experience) — el Hero deja
            // de enlazar directo a /register: el CTA de registro se mueve
            // al final de la First Experience (HomeLanding, más abajo).
            // Este CTA secundario solo hace scroll a la explicación.
            <a
              href="#landing-points"
              className={buttonVariants({ variant: "outline", className: "w-fit" })}
            >
              {t("home.landingSecondaryCta")}
            </a>
          ) : (
            <Link
              href="#goal"
              className={buttonVariants({ variant: "default", className: "w-fit" })}
            >
              {activeGoal ? t("home.heroViewGoalCta") : t("home.heroCreateGoalCta")}
            </Link>
          )}
        </section>

        {/* Micro-bloque 2 — Goal ya no comparte fila con Missions (Fase C
            los emparejaba en `grid md:grid-cols-2`): ahora es su propia
            sección a ancho completo, inmediatamente después del Hero —
            "esto es lo que estoy construyendo". `id="goal"` es el destino
            de los CTA del Hero de arriba. Ningún cambio de lógica: mismo
            `GoalCard`, mismo `activeGoal`/`balance`. */}
        {balance !== undefined && (
          <div id="goal">
            <GoalCard goal={activeGoal} walletBalance={balance} />
          </div>
        )}

        {/* Micro-bloque 2 — Missions pasa a vivir debajo de Goal (antes a
            su lado), con menor peso visual (`Card size="sm"`, ver
            app/missions-summary.tsx) — refuerza "Goal es el centro,
            Missions es cómo avanzar hacia él". Vision sigue sin aparecer
            en Home (decisión ya tomada, sin cambios).
            FASE J-B1 — `id="missions"` es el destino del ítem "Missions"
            del Sidebar/MainNav (`/#missions`), mismo patrón que
            `id="goal"` arriba. Ningún cambio de contenido/lógica. */}
        {missions !== undefined && (
          <div id="missions">
            <MissionsSummary missions={missions} />
          </div>
        )}

        {/* UX-14 (Landing educativa + First Experience) — para el usuario
            deslogueado, las dos filas teaser de abajo (Partners/Points)
            quedan reemplazadas por HomeLanding: explicarían lo mismo dos
            veces (Partners ya aparece en el ciclo + evidencia; Points ya
            se explica en su propia sección), y HomeLanding es ahora la
            experiencia principal para quien todavía no tiene cuenta. La
            experiencia del usuario logueado no cambia en absoluto. */}
        {balance === undefined && <HomeLanding />}

        {/* UX-10 (Partners Visible + Discovery + Registration) — §19: fila
            compacta, mismo tratamiento visual que la fila de Points de
            abajo (nunca una Card nueva) — respeta "no convertir Home en
            un dashboard de 10 cards". Orden Hero -> Goal -> Mission ->
            Partners -> Points/Reward, tal como pide la auditoría.
            UX-14 — antes se mostraba siempre (con o sin sesión); ahora solo
            con sesión, porque el usuario deslogueado ya ve la evidencia de
            Partners dentro de HomeLanding (arriba). */}
        {balance !== undefined && (
          <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t("home.partnersTeaserTitle")}</span>
              <span className="text-sm text-muted-foreground">{t("home.partnersTeaserSubtitle")}</span>
            </div>
            <Link
              href="/partners"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1" })}
            >
              {t("home.partnersTeaserCta")}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}

        {/* Micro-bloque 2 — Rewards/Points sigue siendo una línea (sin
            Card grande), sin equivalencia en euros. Se añade una frase de
            conexión narrativa con Goal — mismo `balance`, ningún cálculo
            nuevo. Última sección de Home: cierra la jerarquía
            Goal -> Missions -> Points/Rewards sin ningún contenido de
            Travel después.
            UX-14 — antes se mostraba también deslogueado (con
            `home.pointsTeaserSignedOut`); ahora solo con sesión, ya que
            "¿Qué son los Points?" (HomeLanding) explica el concepto mejor
            para quien todavía no tiene saldo que mostrar. */}
        {balance !== undefined && (
          <div className="flex items-center justify-between gap-4 border-t border-border pt-6">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-muted-foreground">{t("home.pointsTeaserTitle")}</span>
              <span className="text-2xl font-semibold text-success">
                {/* UX-2 (World-Class Product Design) — Fase B: el número en
                    sí (nunca la unidad "Points") en Geist Mono + tabular
                    numerals, mismo criterio que StatCard/GoalCard/Rewards —
                    dígitos de ancho fijo, sin el jitter visual de Geist Sans
                    al actualizarse el saldo. */}
                <span className="font-mono tabular-nums">{balance}</span> {t("rewards.pointsUnit")}
              </span>
              <span className="text-xs text-muted-foreground">{t("home.pointsGoalConnection")}</span>
            </div>
            <Link
              href="/rewards"
              className={buttonVariants({ variant: "ghost", size: "sm", className: "gap-1" })}
            >
              {t("home.pointsTeaserCta")}
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        )}
      </PageContainer>
    </main>
  );
}

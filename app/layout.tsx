import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import { PointsToastHost } from "@/components/state/points-toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// FASE J-B2.5 (Travel Legacy Purge) — la descripción anterior ("compañero
// de viaje inteligente") era la referencia Travel más visible de todo el
// producto (meta description: pestaña del navegador, buscadores, previews
// sociales). Alineada con el nuevo core: Goals -> Points -> Missions ->
// Rewards, sin mención de viajes/hoteles.
export const metadata: Metadata = {
  title: "VIAO",
  description: "VIAO — cumple objetivos, gana Points con tu actividad y consigue Rewards en tus comercios favoritos.",
};

// Declaración explícita del viewport mobile-first (F2-01, VIAO_ROADMAP.md).
// Next.js ya lo infiere por defecto, pero se declara aquí para que la
// base de layout deje constancia intencional del principio mobile-first
// (VIAO_ARCHITECTURE.md secciones 1 y 4) en vez de depender de un valor
// implícito del framework.
// UX Pro Max V2 (P1.2) — `viewportFit: "cover"` es el requisito real para
// que `env(safe-area-inset-*)` (usado en components/nav/main-nav.tsx y
// components/layout/commerce-chrome.tsx) deje de resolver siempre a 0:
// sin esta línea, WebKit nunca reserva el hueco del home indicator/notch
// y el padding-bottom añadido ahí sería un no-op silencioso. Efecto
// colateral esperado (no un bug): el fondo pasa a extenderse edge-to-edge
// bajo el notch/status bar en iOS — es precisamente por eso que este
// mismo bloque añade padding-top con el mismo mecanismo a CommerceChrome
// (el único header sticky-top de la app), para que ningún contenido
// quede oculto detrás del notch.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <PostHogProvider>
          <AppShell>{children}</AppShell>
          {/* P14.4-F (F3) — un único host global para el toast de "+N
              Points"; cualquier Client Component lo dispara con
              `announcePointsEarned()` sin necesitar montar nada propio. */}
          <PointsToastHost />
        </PostHogProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/layout/app-shell";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
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
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <PostHogProvider>
          <AppShell>{children}</AppShell>
        </PostHogProvider>
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { MainNav } from "@/components/nav/main-nav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VIAO",
  description: "VIAO — compañero de viaje inteligente.",
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
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        {children}
        <MainNav />
      </body>
    </html>
  );
}

"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

import { getPostHogClientConfig } from "@/lib/analytics/posthog";

// F12-01 (VIAO_ROADMAP.md) — Inicialización cliente de PostHog para
// "comportamiento general de UI" (VIAO_ARCHITECTURE.md sección 18),
// montado una única vez en app/layout.tsx. `posthog-js` solo se importa
// aquí — el resto del código nunca lo toca directamente
// (lib/analytics/posthog.ts es la única puerta de entrada, F12-01).
//
// Sin `NEXT_PUBLIC_POSTHOG_KEY` configurada: no-op — no se llama a
// `posthog.init()`, `children` se renderiza igual. VIAO no depende de
// PostHog para funcionar.
let initialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (initialized) {
      return;
    }
    const config = getPostHogClientConfig();
    if (!config) {
      return;
    }
    posthog.init(config.key, {
      api_host: config.host,
      capture_pageview: true,
      person_profiles: "identified_only",
    });
    initialized = true;
  }, []);

  return children;
}

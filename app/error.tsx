"use client";

import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/state/error-state";
import { t } from "@/lib/i18n";

// FASE UX-1.1 (Core UX Quick-Fix Pass) — Error Boundary global de Next.js
// App Router (convención nativa `app/error.tsx`, Client Component
// obligatorio). Único punto de captura para cualquier error no
// controlado que llegue a escapar de un Server/Client Component en
// cualquier ruta — hasta ahora, sin este archivo, esos errores caían en
// la pantalla de error genérica de Next.js en vez de en el estilo propio
// de VIAO. Reutiliza `ErrorState` (mismo componente ya usado en el resto
// de la app), sin lógica de negocio propia ni analytics nuevos.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center p-6">
      <ErrorState
        title={t("error.title")}
        message={t("error.message")}
        action={
          <Button variant="outline" onClick={reset}>
            {t("error.retryCta")}
          </Button>
        }
      />
    </main>
  );
}

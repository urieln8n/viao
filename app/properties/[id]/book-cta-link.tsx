"use client";

import { useRef } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { t } from "@/lib/i18n";

import { logBookingClickedAction } from "./log-booking-clicked-action";

// F6-04 (VIAO_ROADMAP.md) — único fragmento de `/properties/[id]` que
// necesita ser Client Component: capturar el clic real del CTA para
// registrar `booking_clicked` (ver `log-booking-clicked-action.ts`) sin
// convertir toda la página (F5-04/F6-01, Server Component) — el resto de
// `page.tsx` no tiene ninguna necesidad de interactividad.
//
// Sigue siendo un `<Link>` real (navegación nativa, prefetch, "abrir en
// pestaña nueva", igual que antes de F6-04) — el registro del evento no
// bloquea ni retrasa la navegación: se dispara sin esperar su resultado
// (`void`), y `logAnalyticsEvent()` ya es best-effort (nunca lanza), así
// que un fallo de analytics nunca puede impedir que el usuario llegue a
// `/booking/[propertyId]`.
//
// `loggedRef` evita un doble registro por doble clic real sobre el mismo
// enlace montado (la navegación por `<Link>` no re-monta este componente
// antes de que ocurra, así que un `useRef` simple basta) — no sustituye
// nunca un render por un clic: solo se llama dentro de `onClick`.
export function BookCtaLink({
  propertyId,
  searchId,
}: {
  propertyId: string;
  searchId?: string;
}) {
  const loggedRef = useRef(false);

  const href = searchId
    ? `/booking/${propertyId}?search_id=${encodeURIComponent(searchId)}`
    : `/booking/${propertyId}`;

  function handleClick() {
    if (loggedRef.current) {
      return;
    }
    loggedRef.current = true;
    void logBookingClickedAction({ providerPropertyId: propertyId, searchId });
  }

  return (
    <Link
      href={href}
      className={buttonVariants({ variant: "default" })}
      onClick={handleClick}
    >
      {t("propertyDetail.bookCta")}
    </Link>
  );
}

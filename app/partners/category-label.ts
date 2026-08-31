import type { TranslationKey } from "@/lib/i18n/types";
import type { PartnerCategory } from "../../lib/partners/request-partner-registration";

// UX-10 (Partners Visible + Discovery + Registration) — mismo patrón ya
// usado en app/rewards/page.tsx (REASON_LABEL_KEY) y
// app/partners/ops/[accessToken]/partner-ops-view.tsx (ERROR_MESSAGE_KEY):
// tabla de traducción por valor real de la base de datos, compartida por
// Discovery, Partner Profile y el formulario de Partner Registration en
// vez de triplicar el mapeo.
export const CATEGORY_LABEL_KEY: Record<PartnerCategory, TranslationKey> = {
  restaurant: "partners.category.restaurant",
  experience: "partners.category.experience",
  barbershop: "partners.category.barbershop",
  gym: "partners.category.gym",
  shop: "partners.category.shop",
  service: "partners.category.service",
};

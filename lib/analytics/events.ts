// F3-07 (VIAO_ROADMAP.md) — taxonomía cerrada de `analytics_events`, igual
// al CHECK constraint real (VIAO_DATABASE.md sección 12,
// supabase/migrations/20260817140010_create_analytics_events.sql). El
// evento `registered` no se emite desde este módulo: se registra
// server-side, en la misma transacción que crea `profiles`, mediante el
// trigger de F3-02 extendido en
// supabase/migrations/20260817190000_add_registered_event_to_profiles_trigger.sql.
// Este tipo solo da seguridad de tipos a futuras fases que necesiten
// insertar otros eventos de la taxonomía desde código TypeScript — no
// implementa ninguno de esos eventos todavía.
export type AnalyticsEventName =
  | "registered"
  | "search_started"
  | "search_completed"
  | "hotel_viewed"
  | "recommendation_requested"
  | "booking_clicked"
  | "booking_completed"
  | "vision_used"
  | "reward_earned"
  | "reward_redeemed"
  | "referral_created"
  | "return_visit"
  // UX-12 (Partner Self-Service + Measurement) — amplía la taxonomía
  // cerrada, ver 20260831090000_add_partner_profile_viewed_event.sql.
  | "partner_profile_viewed";

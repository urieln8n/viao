-- UX-12 (Partner Self-Service + Measurement) — amplía la taxonomía cerrada
-- de `analytics_events` con `partner_profile_viewed`: mismo patrón
-- DROP+ADD CONSTRAINT ya usado en
-- 20260830150000_extend_partners_schema_foundation.sql para los CHECK de
-- `partners` — aditivo, no destructivo: solo se AÑADE un valor permitido,
-- ninguna fila existente puede violar la nueva lista.
--
-- Cierra el hueco de medición identificado en la auditoría UX-11/UX-12:
-- `partner_activities` ya mide la Actividad con precisión, pero nada
-- medía cuánta gente abre `/partners/[slug]` antes de generar esa
-- Actividad — sin esto, es imposible demostrarle al Partner el tramo
-- Visibilidad -> Actividad de su Profile.

alter table public.analytics_events
  drop constraint analytics_events_event_name_check;

alter table public.analytics_events
  add constraint analytics_events_event_name_check
  check (
    event_name in (
      'registered',
      'search_started',
      'search_completed',
      'hotel_viewed',
      'recommendation_requested',
      'booking_clicked',
      'booking_completed',
      'vision_used',
      'reward_earned',
      'reward_redeemed',
      'referral_created',
      'return_visit',
      'partner_profile_viewed'
    )
  );

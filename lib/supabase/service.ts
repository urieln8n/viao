import { createClient } from "@supabase/supabase-js";

// F5-05 (VIAO_ROADMAP.md) — Cliente con la clave de servicio (`service_role`)
// de Supabase. Opera fuera de RLS (VIAO_ARCHITECTURE.md sección 6: "se usa
// solo en el backend, nunca se expone al cliente"; sección 20: "ninguna API
// key... se expone al frontend"). `SUPABASE_SERVICE_ROLE_KEY` ya estaba
// prevista en `.env.example` desde Fase 1 — este archivo es el primer
// código que la usa.
//
// Uso exclusivo: código server-side (Server Actions, Route Handlers) sobre
// las tablas de Patrón B (VIAO_DATABASE.md sección 14) sin ninguna vía de
// escritura para el cliente: `bookings`, `rewards_transactions`,
// `referrals`, `vision_scans`, `analytics_events`. Nunca importar este
// módulo desde un Client Component ni desde código que se ejecute en el
// navegador.
//
// Sin cookies/sesión (a diferencia de `lib/supabase/server.ts`): es un
// cliente stateless, privilegiado, no atado a ningún usuario concreto.
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para crear el cliente de servicio de Supabase.",
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

import { createServiceRoleClient } from "../supabase/service";

// F12-03 (VIAO_ROADMAP.md) — Cálculo de Activación/Conversión/Retención
// (VIAO_MVP_v0.1.md sección 19) a partir de datos REALES de
// `analytics_events`. Ninguna definición aquí es nueva: cada campo mapea
// directamente a un punto ya escrito en la sección 19 — ver el comentario
// de cada función para la cita exacta.
//
// Lectura vía `service_role`: `analytics_events` no concede NINGÚN SELECT
// al cliente, ni siquiera a `authenticated` para sus propios eventos
// (VIAO_DATABASE.md sección 12, "Leer: nadie desde el cliente") — el único
// rol capaz de leer esta tabla es el backend/reporting interno, que es
// exactamente lo que este módulo es.
//
// "Usuarios registrados" se cuenta como usuarios DISTINTOS con un evento
// `registered` — no se consulta `profiles` directamente: al auditar los
// GRANTs reales antes de escribir este archivo (Paso 0 de F12),
// `service_role` no tenía NINGÚN privilegio sobre `profiles` (mismo vacío
// recurrente BYPASSRLS≠GRANT de F5-F11). Es exactamente equivalente a
// contar filas de `profiles`: el trigger `handle_new_user()` inserta
// `profiles` y el evento `registered` en la MISMA transacción atómica
// (F3-02/F3-07), así que ambos conteos coinciden siempre — evita añadir
// una migración nueva solo para esta lectura.
//
// Paginación (hallazgo real durante la verificación de F12-03 con datos
// reales, no ficticios de laboratorio): PostgREST limita cada SELECT a
// `max_rows` filas (1000 por defecto, supabase/config.toml) — con la base
// local ya en 1373 filas de `analytics_events` tras las fases anteriores,
// una consulta sin paginar devolvía solo 1000 filas y las métricas
// infracontaban en silencio. `fetchAllRows()` pagina con `.range()` hasta
// agotar la tabla, para que el resultado sea correcto a cualquier volumen,
// no solo mientras la tabla es pequeña.
//
// F3.5 (Analytics Stability, hallazgo real durante la verificación de
// UX-12): `.range()` por sí solo NO garantiza un orden estable entre
// llamadas SELECT sucesivas sin una cláusula ORDER BY determinista — a
// partir de cierto volumen (233.198 filas reales en esta sesión), el
// plan de ejecución de Postgres puede variar entre páginas, perdiendo o
// duplicando filas. Cada llamador de `fetchAllRows()` DEBE encadenar
// `.order("id", { ascending: true })` justo antes de `.range(from, to)`
// — `id` es la PK (`uuid`, ya indexada), única y estable por fila,
// nunca repetida entre inserts en el mismo lote (a diferencia de
// `created_at`, que SÍ puede repetirse entre filas del mismo INSERT
// masivo).
export const METRICS_PAGE_SIZE = 1000;
const PAGE_SIZE = METRICS_PAGE_SIZE;

// Exportada para poder probar la lógica de paginación de forma aislada y
// rápida (lib/analytics/metrics.test.ts) sin depender de que la base local
// tenga miles de filas reales — ningún otro archivo debe usarla fuera de
// este módulo.
export async function fetchAllRows<T>(
  queryPage: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await queryPage(from, from + PAGE_SIZE - 1);
    if (error) {
      throw new Error(`No se pudo leer analytics_events: ${error.message}`);
    }
    const rows = data ?? [];
    allRows.push(...rows);
    if (rows.length < PAGE_SIZE) {
      break;
    }
    from += PAGE_SIZE;
  }
  return allRows;
}

// Escala: se leen las filas y se agregan en memoria (sin RPC/vista SQL
// dedicada) — proporcional al volumen real del MVP/piloto (100 testers,
// VIAO_MVP_v0.1.md sección 19), no una arquitectura de reporting a escala
// de producción que el proyecto no necesita todavía (sección 14, "sin
// sobreingeniería"); la paginación evita el bug de truncamiento sin
// necesitar esa arquitectura.
//
// `reward_earned`/`reward_redeemed` quedan FUERA deliberadamente: la
// recompensa de REGISTRO (F12-02) dispara `reward_earned` para TODO
// usuario nuevo, sin ninguna acción adicional de su parte — incluirlo
// aquí habría hecho que "activación" fuera trivialmente el 100% de los
// registrados, vaciando de sentido la métrica (detectado empíricamente al
// probar F12-03 con datos reales). Los casos de `reward_earned` que SÍ
// representan una acción real (reserva confirmada, referido) ya quedan
// capturados por `booking_completed`, sin necesidad de contar
// `reward_earned` aparte.
const USEFUL_ACTION_EVENTS = [
  "search_started",
  "search_completed",
  "hotel_viewed",
  "recommendation_requested",
  "booking_clicked",
  "booking_completed",
  "vision_used",
  "referral_created",
] as const;

async function countRegisteredUsers(): Promise<number> {
  const service = createServiceRoleClient();
  const rows = await fetchAllRows<{ user_id: string }>((from, to) =>
    service
      .from("analytics_events")
      .select("user_id")
      .eq("event_name", "registered")
      .not("user_id", "is", null)
      .order("id", { ascending: true })
      .range(from, to),
  );
  return new Set(rows.map((row) => row.user_id)).size;
}

// Activación (VIAO_MVP_v0.1.md sección 19, punto 1): "usuarios
// registrados; usuarios que completan una acción útil; porcentaje de
// usuarios activados". El documento no enumera qué evento concreto cuenta
// como "acción útil" — se usa, sin inventar una regla de negocio nueva,
// cualquier evento de la taxonomía (sección 13) que represente una acción
// REAL del usuario más allá de registrarse: se excluye `registered` (es la
// propia activación, no una acción posterior), `return_visit` (señal de
// RETENCIÓN, sección 19 punto 3, no de activación) y `reward_earned`/
// `reward_redeemed` (ver USEFUL_ACTION_EVENTS más abajo — `reward_earned`
// se dispara automáticamente en el registro, sin acción del usuario). Es
// una lectura directa de la taxonomía ya cerrada, no una definición
// numérica nueva — documentado explícitamente para que se pueda ajustar
// si el negocio define un evento específico más adelante.
export interface ActivationMetrics {
  registeredUsers: number;
  activatedUsers: number;
  activationRate: number;
}

export async function calculateActivationMetrics(): Promise<ActivationMetrics> {
  const service = createServiceRoleClient();
  const registeredUsers = await countRegisteredUsers();

  const rows = await fetchAllRows<{ user_id: string }>((from, to) =>
    service
      .from("analytics_events")
      .select("user_id")
      .in("event_name", USEFUL_ACTION_EVENTS)
      .not("user_id", "is", null)
      .order("id", { ascending: true })
      .range(from, to),
  );

  const activatedUsers = new Set(rows.map((row) => row.user_id)).size;

  return {
    registeredUsers,
    activatedUsers,
    activationRate: registeredUsers > 0 ? activatedUsers / registeredUsers : 0,
  };
}

// Conversión (VIAO_MVP_v0.1.md sección 19, punto 2): el propio documento
// enumera el embudo como una lista ordenada de eventos ya existentes en la
// taxonomía — "búsquedas realizadas; hoteles consultados; recomendaciones
// de IA solicitadas; clics hacia reserva; reservas iniciadas; reservas
// completadas". La taxonomía (sección 13) no tiene un evento
// `booking_started` separado — "reservas iniciadas" es `booking_clicked`
// (el clic que inicia el flujo de reserva), "reservas completadas" es
// `booking_completed`; no se inventa un evento nuevo para diferenciarlos.
export interface ConversionMetrics {
  searchesStarted: number;
  searchesCompleted: number;
  hotelsViewed: number;
  recommendationsRequested: number;
  bookingsClicked: number;
  bookingsCompleted: number;
}

export async function calculateConversionMetrics(): Promise<ConversionMetrics> {
  const service = createServiceRoleClient();
  const rows = await fetchAllRows<{ event_name: string }>((from, to) =>
    service.from("analytics_events").select("event_name").order("id", { ascending: true }).range(from, to),
  );

  const counts = new Map<string, number>();
  for (const row of rows) {
    counts.set(row.event_name, (counts.get(row.event_name) ?? 0) + 1);
  }

  return {
    searchesStarted: counts.get("search_started") ?? 0,
    searchesCompleted: counts.get("search_completed") ?? 0,
    hotelsViewed: counts.get("hotel_viewed") ?? 0,
    recommendationsRequested: counts.get("recommendation_requested") ?? 0,
    bookingsClicked: counts.get("booking_clicked") ?? 0,
    bookingsCompleted: counts.get("booking_completed") ?? 0,
  };
}

// Retención (VIAO_MVP_v0.1.md sección 19, punto 3): "usuarios que
// regresan" y "frecuencia de uso" se calculan directamente de
// `return_visit` (F12-05) — la señal norte del MVP ("la métrica más
// importante del MVP es la retención", sección 13). Los dos sub-puntos
// restantes de la sección 19 ("usuarios que vuelven DESPUÉS DEL VIAJE",
// "usuarios que vuelven PARA PREPARAR OTRO VIAJE") requerirían una
// definición operativa que el MVP no fija todavía (p. ej. qué separa "el
// viaje" de "otro viaje" — no hay una fecha de "fin de viaje" en ningún
// evento ni tabla) — NO se inventa aquí; ver el reporte de F12 para el
// detalle de esta limitación explícita.
export interface RetentionMetrics {
  registeredUsers: number;
  returningUsers: number;
  retentionRate: number;
  averageReturnVisitsPerReturningUser: number;
}

export async function calculateRetentionMetrics(): Promise<RetentionMetrics> {
  const service = createServiceRoleClient();
  const registeredUsers = await countRegisteredUsers();

  const rows = await fetchAllRows<{ user_id: string }>((from, to) =>
    service
      .from("analytics_events")
      .select("user_id")
      .eq("event_name", "return_visit")
      .not("user_id", "is", null)
      .order("id", { ascending: true })
      .range(from, to),
  );

  const returningUsers = new Set(rows.map((row) => row.user_id)).size;

  return {
    registeredUsers,
    returningUsers,
    retentionRate: registeredUsers > 0 ? returningUsers / registeredUsers : 0,
    averageReturnVisitsPerReturningUser: returningUsers > 0 ? rows.length / returningUsers : 0,
  };
}

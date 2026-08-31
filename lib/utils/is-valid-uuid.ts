// J-B7.2/J-B7.3 (VIAO_V1_MASTER_ROADMAP.md) — movida desde
// app/properties/[id]/resolve.ts (F5-07), sin cambiar su comportamiento.
// Utilidad genérica sin dependencias: no debe volver a vivir dentro de un
// dominio (Properties/Travel) del que otros dominios no relacionados
// (Vision, Booking, Trips, Search) dependan estructuralmente.

/** Formato UUID estándar (8-4-4-4-12 hex), cualquier versión — igual que el tipo `uuid` de Postgres, sin fijar una versión concreta. */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    value,
  );
}

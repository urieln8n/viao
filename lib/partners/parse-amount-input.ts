// Bloque Partners PB5 (VIAO_PARTNERS_IMPLEMENTATION_STATUS.md) — validación
// del importe introducido por el Partner en la UI, ANTES de invocar la
// Server Action (mismo criterio de "validar input antes de tocar
// next/headers" ya usado en app/trips/actions.ts vía validateTripInput()).
// No calcula Points ni aplica ninguna tasa económica — el RPC (PB2) sigue
// siendo la única autoridad para eso; esto solo decide si el texto
// introducido es, como mínimo, un importe positivo bien formado.
//
// Acepta coma decimal (convención española, "10,50") además del punto,
// ya que es la UI de un Partner local, no un formulario internacional.
export function parsePartnerAmountInput(raw: string): number | undefined {
  const normalized = raw.trim().replace(",", ".");
  if (!normalized) {
    return undefined;
  }
  if (!/^\d+(\.\d+)?$/.test(normalized)) {
    return undefined;
  }
  const value = Number(normalized);
  if (!Number.isFinite(value) || value <= 0) {
    return undefined;
  }
  return value;
}

// P14 (Partner Login) — lógica pura de resolución de destino post-login,
// extraída de app/(auth)/login/page.tsx para poder compartirla con
// app/partner/login/page.tsx sin duplicarla (ambas rutas usan el mismo
// componente `LoginForm`, components/auth/login-form.tsx). Sin cambio de
// comportamiento respecto al código original: misma prioridad exacta
// (intent=partner+accessToken > returnTo saneado > defaultRedirect propio
// de cada variante), mismo saneado de `returnTo`.
//
// UX-AUTH-1 (Decision Lock, §3), sin modificar — `sanitizeReturnTo()` es
// la única barrera contra open redirect: exige un único "/" inicial
// (rechaza "//evil.com", protocol-relative), rechaza cualquier "://"
// embebido (bloquea "https://evil.com" y variantes) y cualquier
// backslash (algunos navegadores normalizan "/\evil.com" como
// protocol-relative). Cualquier valor que no pase esta comprobación cae
// al fallback de quien llama, nunca se usa parcialmente.
export function sanitizeReturnTo(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  if (value.includes("://") || value.includes("\\")) return null;
  return value;
}

// `partnerAccessToken` llega TAL CUAL de la URL (nunca validado como UUID
// aquí): construir la ruta de destino no es una decisión de autorización
// — la validación real ocurre server-side en resolvePartnerAccess()
// cuando esa página carga. Un token con formato inválido simplemente
// termina en notFound() en el destino, igual que antes de este bloque.
export interface LoginRedirectParams {
  partnerAccessToken: string | null;
  returnTo: string | null;
  /** Destino cuando no hay accessToken ni returnTo — "/" para el login de Usuario, "/partners/dashboard" para el de Partner. Debe ser siempre una ruta interna fija, nunca derivada de la petición. */
  defaultRedirect: string;
}

export function resolveLoginRedirectTarget({ partnerAccessToken, returnTo, defaultRedirect }: LoginRedirectParams): string {
  if (partnerAccessToken) {
    return `/partners/dashboard/${partnerAccessToken}`;
  }
  return returnTo ?? defaultRedirect;
}

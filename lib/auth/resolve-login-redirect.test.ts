// P14 (Partner Login) — tests de las funciones puras compartidas por
// /login y /partner/login. `sanitizeReturnTo()` no tenía test dedicado
// antes de este bloque (vivía inline en app/(auth)/login/page.tsx); ahora
// que la comparte una segunda ruta, una regresión aquí afecta a las dos
// puertas de entrada — justifica cubrirla directamente, no solo de forma
// indirecta a través del comportamiento del formulario.

import { test } from "node:test";
import assert from "node:assert/strict";

import { sanitizeReturnTo, resolveLoginRedirectTarget } from "./resolve-login-redirect";

// ── sanitizeReturnTo — protección anti open-redirect (UX-AUTH-1 §3) ──

test("sanitizeReturnTo: acepta una ruta interna simple", () => {
  assert.equal(sanitizeReturnTo("/profile"), "/profile");
  assert.equal(sanitizeReturnTo("/partners/dashboard"), "/partners/dashboard");
});

test("sanitizeReturnTo: null/vacío -> null", () => {
  assert.equal(sanitizeReturnTo(null), null);
  assert.equal(sanitizeReturnTo(""), null);
});

test("sanitizeReturnTo: rechaza protocol-relative (//evil.com)", () => {
  assert.equal(sanitizeReturnTo("//evil.com"), null);
});

test("sanitizeReturnTo: rechaza URLs absolutas embebidas (://)", () => {
  assert.equal(sanitizeReturnTo("https://evil.com"), null);
  assert.equal(sanitizeReturnTo("/redirect?to=https://evil.com"), null);
});

test("sanitizeReturnTo: rechaza backslash (normalización de navegador a protocol-relative)", () => {
  assert.equal(sanitizeReturnTo("/\\evil.com"), null);
});

test("sanitizeReturnTo: rechaza cualquier valor que no empiece por '/'", () => {
  assert.equal(sanitizeReturnTo("evil.com"), null);
  assert.equal(sanitizeReturnTo("javascript:alert(1)"), null);
});

// ── resolveLoginRedirectTarget — prioridad de destino ──

test("resolveLoginRedirectTarget: intent=partner+accessToken siempre gana, incluso con returnTo presente", () => {
  const target = resolveLoginRedirectTarget({
    partnerAccessToken: "11111111-2222-3333-4444-555555555555",
    returnTo: "/profile",
    defaultRedirect: "/",
  });
  assert.equal(target, "/partners/dashboard/11111111-2222-3333-4444-555555555555");
});

test("resolveLoginRedirectTarget: sin accessToken, returnTo saneado gana sobre defaultRedirect", () => {
  const target = resolveLoginRedirectTarget({
    partnerAccessToken: null,
    returnTo: "/profile",
    defaultRedirect: "/",
  });
  assert.equal(target, "/profile");
});

test("resolveLoginRedirectTarget: sin accessToken ni returnTo -> defaultRedirect de la variante (Usuario)", () => {
  const target = resolveLoginRedirectTarget({ partnerAccessToken: null, returnTo: null, defaultRedirect: "/" });
  assert.equal(target, "/");
});

test("resolveLoginRedirectTarget: sin accessToken ni returnTo -> defaultRedirect de la variante (Partner)", () => {
  const target = resolveLoginRedirectTarget({
    partnerAccessToken: null,
    returnTo: null,
    defaultRedirect: "/partners/dashboard",
  });
  assert.equal(target, "/partners/dashboard");
});

test("resolveLoginRedirectTarget: un usuario normal (sin accessToken) que entra por /partner/login sigue aterrizando en /partners/dashboard, nunca obtiene privilegio — el destino no es autorización, solo navegación", () => {
  // La propia página /partners/dashboard (Camino B) es quien decide, ya
  // autenticado, si el usuario tiene algún Partner vinculado — este test
  // documenta que resolveLoginRedirectTarget() nunca intenta decidir eso.
  const target = resolveLoginRedirectTarget({
    partnerAccessToken: null,
    returnTo: null,
    defaultRedirect: "/partners/dashboard",
  });
  assert.equal(target, "/partners/dashboard");
});

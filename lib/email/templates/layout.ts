// Aproximación segura para email de la paleta real de VIAO
// (app/globals.css, tokens OKLCH: --foreground/--background/--success) —
// los clientes de email no soportan oklch() de forma fiable, así que aquí
// se usan hex equivalentes: fondo blanco, primario casi negro (mismo tono
// neutro que --primary en modo claro), acento verde (mismo matiz que
// --success). Sin CSS externo ni <style> (los clientes de email lo
// eliminan o lo ignoran de forma inconsistente) — todo inline, tablas para
// el layout, mismo patrón que cualquier email transaccional real.
const COLORS = {
  background: "#ffffff",
  foreground: "#171717",
  muted: "#6b7280",
  border: "#e5e7eb",
} as const;

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface EmailLayoutParams {
  previewText: string;
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
}

export function renderEmailLayout(params: EmailLayoutParams): string {
  const { previewText, title, bodyHtml, ctaLabel, ctaUrl } = params;

  const cta =
    ctaLabel && ctaUrl
      ? `<tr><td style="padding-top:24px;">
           <a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background-color:${COLORS.foreground};color:${COLORS.background};text-decoration:none;font-weight:600;font-size:14px;padding:12px 20px;border-radius:8px;">${escapeHtml(ctaLabel)}</a>
         </td></tr>`
      : "";

  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLORS.background};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
    <span style="display:none;font-size:1px;color:${COLORS.background};line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(previewText)}</span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${COLORS.background};">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" style="max-width:480px;">
            <tr>
              <td style="padding-bottom:24px;">
                <span style="font-size:20px;font-weight:700;color:${COLORS.foreground};letter-spacing:-0.02em;">VIAO</span>
              </td>
            </tr>
            <tr>
              <td style="background-color:${COLORS.background};border:1px solid ${COLORS.border};border-radius:12px;padding:32px;">
                <table role="presentation" width="100%">
                  <tr><td style="font-size:20px;font-weight:600;color:${COLORS.foreground};padding-bottom:12px;">${escapeHtml(title)}</td></tr>
                  <tr><td style="font-size:15px;line-height:1.6;color:${COLORS.foreground};">${bodyHtml}</td></tr>
                  ${cta}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding-top:24px;">
                <p style="margin:0;font-size:12px;color:${COLORS.muted};">VIAO</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

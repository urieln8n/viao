import { Resend } from "resend";

// Mismo patrón que lib/openai/client.ts (F9-01): único punto del proyecto
// que construye un cliente Resend, singleton perezoso — RESEND_API_KEY no
// se lee hasta el primer envío real, así build/tsc/tests que nunca llaman
// a sendEmail() no requieren la variable configurada. Lanza con un mensaje
// claro si falta la clave (igual que getOpenAiClient()); es sendEmail()
// quien decide qué hacer con ese fallo, nunca este módulo.
let cachedClient: Resend | undefined;

export function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no está configurada — VIAO no puede enviar emails sin ella.",
    );
  }
  if (!cachedClient) {
    cachedClient = new Resend(apiKey);
  }
  return cachedClient;
}

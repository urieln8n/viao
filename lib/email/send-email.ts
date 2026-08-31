import { getResendClient } from "./resend-client";

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  sent: boolean;
}

// Forma mínima que este módulo necesita de un cliente Resend — permite
// inyectar un doble de prueba en los tests (sin librería de mocking, ver
// send-email.test.ts) sin acoplar la firma al SDK real.
export interface ResendLikeClient {
  emails: {
    send(params: {
      from: string;
      to: string;
      subject: string;
      html: string;
    }): Promise<{ data: unknown; error: { message: string } | null }>;
  };
}

function getFromAddress(): string {
  // onboarding@resend.dev es el remitente de pruebas propio de Resend
  // (funciona sin dominio verificado) — fallback solo para no bloquear
  // desarrollo/tests; producción debe configurar RESEND_FROM_EMAIL con el
  // dominio verificado de VIAO (ver .env.example).
  return process.env.RESEND_FROM_EMAIL || "VIAO <onboarding@resend.dev>";
}

// A diferencia de generateSearchRecommendation() (lib/openai/index.ts),
// donde un fallo de OpenAI SÍ debe llegar al usuario (es la función
// principal de esa feature), un email aquí es siempre un efecto
// secundario best-effort de otra operación ya completada (alta de
// Usuario, solicitud de Partner, aprobación) — ni la falta de
// RESEND_API_KEY ni un fallo de Resend deben romper esa operación. Por
// eso, a diferencia de getOpenAiClient(), este wrapper nunca lanza.
export async function sendEmail(
  input: SendEmailInput,
  client?: ResendLikeClient,
): Promise<SendEmailResult> {
  try {
    const resend = client ?? getResendClient();
    const { error } = await resend.emails.send({
      from: getFromAddress(),
      to: input.to,
      subject: input.subject,
      html: input.html,
    });

    if (error) {
      return { sent: false };
    }
    return { sent: true };
  } catch {
    return { sent: false };
  }
}

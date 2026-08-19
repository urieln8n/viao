// Hotelbeds — lectura centralizada de variables de entorno. Mismo
// criterio que lib/openai/client.ts (getOpenAiClient): cualquier
// variable ausente lanza un error claro que nombra la variable, nunca su
// valor — así build/tsc/tests que nunca llaman a Hotelbeds no requieren
// estas variables configuradas, y ningún log/mensaje de error puede
// terminar exponiendo un secreto.
//
// `HOTELBEDS_BASE_URL` no tiene valor por defecto ni fallback
// hardcodeado a propósito: exigir que siempre venga del entorno hace
// imposible que este módulo apunte a LIVE por accidente si alguien
// olvida configurarla — falla de forma clara en vez de asumir sandbox o
// producción.
import { readFileSync } from "node:fs";

export interface HotelbedsCredentials {
  apiKey: string;
  secret: string;
  baseUrl: string;
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(
      `${name} no está configurada — VIAO no puede llamar a Hotelbeds sin ella.`,
    );
  }
  return value;
}

export function getHotelbedsCredentials(): HotelbedsCredentials {
  return {
    apiKey: readRequiredEnv("HOTELBEDS_API_KEY"),
    secret: readRequiredEnv("HOTELBEDS_SECRET"),
    baseUrl: readRequiredEnv("HOTELBEDS_BASE_URL"),
  };
}

// Certificado cliente (mTLS) — Hotelbeds lo exige para al menos algunas
// operaciones del Booking API (disponibilidad, checkrates, confirmación,
// cancelación, según su documentación de "Mutual Authentication"). Mismo
// criterio que las credenciales: las RUTAS a los archivos vienen del
// entorno (nunca hardcodeadas, nunca commiteadas), y el contenido no se
// lee hasta la primera llamada real. `readFileSync` se hace aquí, no en
// cada llamada HTTP, para que el error de "archivo no encontrado" sea
// tan claro como el de "variable no configurada".
export interface HotelbedsClientCertificate {
  cert: Buffer;
  key: Buffer;
}

function readRequiredCertificateFile(envVarName: string): Buffer {
  const path = readRequiredEnv(envVarName);
  try {
    return readFileSync(path);
  } catch (error) {
    throw new Error(
      `${envVarName} apunta a un archivo que no se pudo leer ("${path}").`,
      { cause: error },
    );
  }
}

export function getHotelbedsClientCertificate(): HotelbedsClientCertificate {
  return {
    cert: readRequiredCertificateFile("HOTELBEDS_CLIENT_CERT_PATH"),
    key: readRequiredCertificateFile("HOTELBEDS_CLIENT_KEY_PATH"),
  };
}

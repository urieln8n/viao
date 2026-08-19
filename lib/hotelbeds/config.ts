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
// cancelación, según su documentación de "Mutual Authentication").
//
// Dos formas de configurarlo, nunca mezcladas dentro del mismo par
// cert/key (evita un cert de una fuente con una key de otra):
// - Por VALOR (`HOTELBEDS_CLIENT_CERT`/`HOTELBEDS_CLIENT_KEY`): el
//   contenido PEM completo como valor de la variable — la única forma
//   viable en Vercel (u otro entorno serverless), que no tiene acceso al
//   sistema de archivos local donde vive el certificado. Tiene
//   prioridad: si `HOTELBEDS_CLIENT_CERT` está presente, se usa esta vía
//   y `HOTELBEDS_CLIENT_KEY` pasa a ser obligatoria.
// - Por RUTA (`HOTELBEDS_CLIENT_CERT_PATH`/`HOTELBEDS_CLIENT_KEY_PATH`,
//   comportamiento ya existente): fallback para desarrollo local, donde
//   sí hay sistema de archivos y tiene sentido apuntar a los archivos
//   descargados de Hotelbeds sin pegar su contenido en `.env.local`.
//   `readFileSync` se hace aquí, no en cada llamada HTTP, para que el
//   error de "archivo no encontrado" sea tan claro como el de "variable
//   no configurada".
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
  const certValue = process.env.HOTELBEDS_CLIENT_CERT?.trim();
  if (certValue) {
    const keyValue = readRequiredEnv("HOTELBEDS_CLIENT_KEY");
    return {
      cert: Buffer.from(certValue, "utf8"),
      key: Buffer.from(keyValue, "utf8"),
    };
  }

  return {
    cert: readRequiredCertificateFile("HOTELBEDS_CLIENT_CERT_PATH"),
    key: readRequiredCertificateFile("HOTELBEDS_CLIENT_KEY_PATH"),
  };
}

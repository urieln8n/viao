// Hotelbeds — tests de lectura de variables de entorno. Solo valores
// FALSOS de prueba, nunca las credenciales reales de .env.local — mismo
// patrón withEnv ya usado en lib/openai/config.test.ts, restaurando el
// valor original de cada variable al terminar cada test.

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { getHotelbedsClientCertificate, getHotelbedsCredentials } from "./config";

function withEnv(name: string, value: string | undefined, run: () => void) {
  const original = process.env[name];
  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }
  try {
    run();
  } finally {
    if (original === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = original;
    }
  }
}

function withoutHotelbedsEnv(run: () => void) {
  withEnv("HOTELBEDS_API_KEY", undefined, () => {
    withEnv("HOTELBEDS_SECRET", undefined, () => {
      withEnv("HOTELBEDS_BASE_URL", undefined, run);
    });
  });
}

test("getHotelbedsCredentials: sin HOTELBEDS_API_KEY, lanza un error que nombra la variable (nunca su valor)", () => {
  withoutHotelbedsEnv(() => {
    withEnv("HOTELBEDS_SECRET", "fake-secret", () => {
      withEnv("HOTELBEDS_BASE_URL", "https://api.test.hotelbeds.com", () => {
        assert.throws(() => getHotelbedsCredentials(), /HOTELBEDS_API_KEY/);
      });
    });
  });
});

test("getHotelbedsCredentials: sin HOTELBEDS_SECRET, lanza un error que nombra la variable", () => {
  withoutHotelbedsEnv(() => {
    withEnv("HOTELBEDS_API_KEY", "fake-key", () => {
      withEnv("HOTELBEDS_BASE_URL", "https://api.test.hotelbeds.com", () => {
        assert.throws(() => getHotelbedsCredentials(), /HOTELBEDS_SECRET/);
      });
    });
  });
});

test("getHotelbedsCredentials: sin HOTELBEDS_BASE_URL, lanza un error que nombra la variable (nunca asume sandbox ni producción por defecto)", () => {
  withoutHotelbedsEnv(() => {
    withEnv("HOTELBEDS_API_KEY", "fake-key", () => {
      withEnv("HOTELBEDS_SECRET", "fake-secret", () => {
        assert.throws(() => getHotelbedsCredentials(), /HOTELBEDS_BASE_URL/);
      });
    });
  });
});

test("getHotelbedsCredentials: con las 3 variables definidas (valores de prueba), las devuelve sin lanzar", () => {
  withEnv("HOTELBEDS_API_KEY", "fake-key", () => {
    withEnv("HOTELBEDS_SECRET", "fake-secret", () => {
      withEnv("HOTELBEDS_BASE_URL", "https://api.test.hotelbeds.com", () => {
        const credentials = getHotelbedsCredentials();
        assert.deepEqual(credentials, {
          apiKey: "fake-key",
          secret: "fake-secret",
          baseUrl: "https://api.test.hotelbeds.com",
        });
      });
    });
  });
});

// ── getHotelbedsClientCertificate (mTLS) — vía RUTA (fallback local) ──
//
// `HOTELBEDS_CLIENT_CERT` se fuerza explícitamente a undefined en los 4
// tests de esta sección: es la variable que decide el modo (por valor
// vs. por ruta), así que si quedara puesta por accidente desde otro test
// o desde el entorno ambiente, estos tests dejarían de probar lo que
// dicen probar.

test("getHotelbedsClientCertificate: sin HOTELBEDS_CLIENT_CERT_PATH, lanza un error que nombra la variable", () => {
  withEnv("HOTELBEDS_CLIENT_CERT", undefined, () => {
    withEnv("HOTELBEDS_CLIENT_CERT_PATH", undefined, () => {
      withEnv("HOTELBEDS_CLIENT_KEY_PATH", "./whatever.key", () => {
        assert.throws(() => getHotelbedsClientCertificate(), /HOTELBEDS_CLIENT_CERT_PATH/);
      });
    });
  });
});

test("getHotelbedsClientCertificate: sin HOTELBEDS_CLIENT_KEY_PATH, lanza un error que nombra la variable", () => {
  // CERT_PATH debe apuntar a un archivo que SÍ existe — si no, el error
  // sería sobre CERT_PATH (se lee primero) y no probaría este caso.
  const dir = mkdtempSync(path.join(tmpdir(), "hotelbeds-cert-test-"));
  const certPath = path.join(dir, "dummy-cert.pem");
  writeFileSync(certPath, "-----BEGIN CERTIFICATE-----\ncontenido-de-prueba\n-----END CERTIFICATE-----\n");
  try {
    withEnv("HOTELBEDS_CLIENT_CERT", undefined, () => {
      withEnv("HOTELBEDS_CLIENT_KEY_PATH", undefined, () => {
        withEnv("HOTELBEDS_CLIENT_CERT_PATH", certPath, () => {
          assert.throws(() => getHotelbedsClientCertificate(), /HOTELBEDS_CLIENT_KEY_PATH/);
        });
      });
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("getHotelbedsClientCertificate: variable definida pero apuntando a un archivo inexistente, lanza (nunca asume contenido)", () => {
  withEnv("HOTELBEDS_CLIENT_CERT", undefined, () => {
    withEnv("HOTELBEDS_CLIENT_CERT_PATH", "./este-archivo-no-existe.pem", () => {
      withEnv("HOTELBEDS_CLIENT_KEY_PATH", "./este-archivo-tampoco-existe.key", () => {
        assert.throws(() => getHotelbedsClientCertificate(), /HOTELBEDS_CLIENT_CERT_PATH/);
      });
    });
  });
});

test("getHotelbedsClientCertificate: con ambos archivos presentes, lee su contenido (bytes de prueba, no un certificado real)", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hotelbeds-cert-test-"));
  const certPath = path.join(dir, "dummy-cert.pem");
  const keyPath = path.join(dir, "dummy-key.pem");
  writeFileSync(certPath, "-----BEGIN CERTIFICATE-----\ncontenido-de-prueba\n-----END CERTIFICATE-----\n");
  writeFileSync(keyPath, "-----BEGIN PRIVATE KEY-----\ncontenido-de-prueba\n-----END PRIVATE KEY-----\n");
  try {
    withEnv("HOTELBEDS_CLIENT_CERT", undefined, () => {
      withEnv("HOTELBEDS_CLIENT_CERT_PATH", certPath, () => {
        withEnv("HOTELBEDS_CLIENT_KEY_PATH", keyPath, () => {
          const certificate = getHotelbedsClientCertificate();
          assert.ok(certificate.cert.includes("CERTIFICATE"));
          assert.ok(certificate.key.includes("PRIVATE KEY"));
        });
      });
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// ── getHotelbedsClientCertificate (mTLS) — vía VALOR (Vercel/serverless) ──

test("getHotelbedsClientCertificate: con HOTELBEDS_CLIENT_CERT + HOTELBEDS_CLIENT_KEY, usa su contenido directamente (sin tocar rutas de archivo)", () => {
  // El valor esperado va SIN el \n final: igual que el resto de
  // variables de este módulo (readRequiredEnv), el valor se recorta con
  // trim() — comportamiento intencional (una variable de entorno pegada
  // en un panel a menudo trae un salto de línea sobrante al final).
  withEnv("HOTELBEDS_CLIENT_CERT", "-----BEGIN CERTIFICATE-----\nvalor-de-prueba\n-----END CERTIFICATE-----\n", () => {
    withEnv("HOTELBEDS_CLIENT_KEY", "-----BEGIN PRIVATE KEY-----\nvalor-de-prueba\n-----END PRIVATE KEY-----\n", () => {
      // Rutas apuntando a archivos inexistentes A PROPÓSITO: si el
      // código intentara leerlas, este test fallaría por ENOENT en vez
      // de por una aserción — confirma que la vía por valor tiene
      // prioridad y ni siquiera se acerca a las rutas.
      withEnv("HOTELBEDS_CLIENT_CERT_PATH", "./no-se-debe-leer.pem", () => {
        withEnv("HOTELBEDS_CLIENT_KEY_PATH", "./no-se-debe-leer.key", () => {
          const certificate = getHotelbedsClientCertificate();
          assert.equal(certificate.cert.toString("utf8"), "-----BEGIN CERTIFICATE-----\nvalor-de-prueba\n-----END CERTIFICATE-----");
          assert.equal(certificate.key.toString("utf8"), "-----BEGIN PRIVATE KEY-----\nvalor-de-prueba\n-----END PRIVATE KEY-----");
        });
      });
    });
  });
});

test("getHotelbedsClientCertificate: HOTELBEDS_CLIENT_CERT presente pero sin HOTELBEDS_CLIENT_KEY, lanza un error que nombra la variable", () => {
  withEnv("HOTELBEDS_CLIENT_CERT", "-----BEGIN CERTIFICATE-----\nvalor-de-prueba\n-----END CERTIFICATE-----\n", () => {
    withEnv("HOTELBEDS_CLIENT_KEY", undefined, () => {
      assert.throws(() => getHotelbedsClientCertificate(), /HOTELBEDS_CLIENT_KEY\b/);
    });
  });
});

test("getHotelbedsClientCertificate: HOTELBEDS_CLIENT_CERT vacío se trata como ausente — cae al modo por ruta", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "hotelbeds-cert-test-"));
  const certPath = path.join(dir, "dummy-cert.pem");
  const keyPath = path.join(dir, "dummy-key.pem");
  writeFileSync(certPath, "-----BEGIN CERTIFICATE-----\ncontenido-de-prueba\n-----END CERTIFICATE-----\n");
  writeFileSync(keyPath, "-----BEGIN PRIVATE KEY-----\ncontenido-de-prueba\n-----END PRIVATE KEY-----\n");
  try {
    withEnv("HOTELBEDS_CLIENT_CERT", "", () => {
      withEnv("HOTELBEDS_CLIENT_CERT_PATH", certPath, () => {
        withEnv("HOTELBEDS_CLIENT_KEY_PATH", keyPath, () => {
          const certificate = getHotelbedsClientCertificate();
          assert.ok(certificate.cert.includes("CERTIFICATE"));
        });
      });
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

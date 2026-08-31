// Tests del Route Handler del webhook — sin RESEND_API_KEY configurada
// (nunca en npm test), así que ningún email se envía de verdad; lo que se
// prueba aquí es la validación del secreto/payload y la lógica de
// transición de estado (qué la dispara y qué no), no el contenido del
// email en sí (ya cubierto en lib/email/templates/partner-emails.test.ts).

import { test } from "node:test";
import assert from "node:assert/strict";

import { POST } from "./route";

const SECRET = "test-webhook-secret";

function makeRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3000/api/webhooks/partner-status", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function withSecretEnv<T>(fn: () => Promise<T>): Promise<T> {
  const original = process.env.PARTNER_STATUS_WEBHOOK_SECRET;
  process.env.PARTNER_STATUS_WEBHOOK_SECRET = SECRET;
  return fn().finally(() => {
    if (original === undefined) delete process.env.PARTNER_STATUS_WEBHOOK_SECRET;
    else process.env.PARTNER_STATUS_WEBHOOK_SECRET = original;
  });
}

const validPartnerRow = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Café Núñez",
  access_token: "22222222-2222-2222-2222-222222222222",
  contact_email: "cafe@example.com",
};

test("sin PARTNER_STATUS_WEBHOOK_SECRET configurada en el servidor -> 401, sin importar el header", async () => {
  const original = process.env.PARTNER_STATUS_WEBHOOK_SECRET;
  delete process.env.PARTNER_STATUS_WEBHOOK_SECRET;
  try {
    const res = await POST(makeRequest({}, { "x-viao-webhook-secret": "cualquier-cosa" }));
    assert.equal(res.status, 401);
  } finally {
    if (original === undefined) delete process.env.PARTNER_STATUS_WEBHOOK_SECRET;
    else process.env.PARTNER_STATUS_WEBHOOK_SECRET = original;
  }
});

test("secreto ausente -> 401", async () => {
  await withSecretEnv(async () => {
    const res = await POST(makeRequest({}));
    assert.equal(res.status, 401);
  });
});

test("secreto incorrecto -> 401", async () => {
  await withSecretEnv(async () => {
    const res = await POST(makeRequest({}, { "x-viao-webhook-secret": "secreto-incorrecto" }));
    assert.equal(res.status, 401);
  });
});

test("payload que no es JSON -> 400", async () => {
  await withSecretEnv(async () => {
    const req = new Request("http://localhost:3000/api/webhooks/partner-status", {
      method: "POST",
      headers: { "content-type": "application/json", "x-viao-webhook-secret": SECRET },
      body: "esto no es json",
    });
    const res = await POST(req);
    assert.equal(res.status, 400);
  });
});

test("payload sin record/old_record válidos -> 400", async () => {
  await withSecretEnv(async () => {
    const res = await POST(
      makeRequest(
        { type: "UPDATE", table: "partners", record: { id: "x" }, old_record: {} },
        { "x-viao-webhook-secret": SECRET },
      ),
    );
    assert.equal(res.status, 400);
  });
});

test("table distinta de 'partners' -> 400", async () => {
  await withSecretEnv(async () => {
    const res = await POST(
      makeRequest(
        {
          type: "UPDATE",
          table: "otra_tabla",
          record: { ...validPartnerRow, status: "active" },
          old_record: { ...validPartnerRow, status: "pending" },
        },
        { "x-viao-webhook-secret": SECRET },
      ),
    );
    assert.equal(res.status, 400);
  });
});

test("pending -> active: se maneja como 'approved'", async () => {
  await withSecretEnv(async () => {
    const res = await POST(
      makeRequest(
        {
          type: "UPDATE",
          table: "partners",
          record: { ...validPartnerRow, status: "active" },
          old_record: { ...validPartnerRow, status: "pending" },
        },
        { "x-viao-webhook-secret": SECRET },
      ),
    );
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.handled, "approved");
  });
});

test("pending -> inactive: se maneja como 'rejected'", async () => {
  await withSecretEnv(async () => {
    const res = await POST(
      makeRequest(
        {
          type: "UPDATE",
          table: "partners",
          record: { ...validPartnerRow, status: "inactive" },
          old_record: { ...validPartnerRow, status: "pending" },
        },
        { "x-viao-webhook-secret": SECRET },
      ),
    );
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.handled, "rejected");
  });
});

test("active -> inactive (baja de un Partner ya activo): NUNCA se trata como rechazo", async () => {
  await withSecretEnv(async () => {
    const res = await POST(
      makeRequest(
        {
          type: "UPDATE",
          table: "partners",
          record: { ...validPartnerRow, status: "inactive" },
          old_record: { ...validPartnerRow, status: "active" },
        },
        { "x-viao-webhook-secret": SECRET },
      ),
    );
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.handled, "ignored");
  });
});

test("inactive -> active (reactivación): ignorado, no dispara el email de aprobación", async () => {
  await withSecretEnv(async () => {
    const res = await POST(
      makeRequest(
        {
          type: "UPDATE",
          table: "partners",
          record: { ...validPartnerRow, status: "active" },
          old_record: { ...validPartnerRow, status: "inactive" },
        },
        { "x-viao-webhook-secret": SECRET },
      ),
    );
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.handled, "ignored");
  });
});

test("pending -> active sin contact_email: 200 'approved' sin intentar enviar nada (no lanza)", async () => {
  await withSecretEnv(async () => {
    const res = await POST(
      makeRequest(
        {
          type: "UPDATE",
          table: "partners",
          record: { ...validPartnerRow, status: "active", contact_email: null },
          old_record: { ...validPartnerRow, status: "pending", contact_email: null },
        },
        { "x-viao-webhook-secret": SECRET },
      ),
    );
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.handled, "approved");
  });
});

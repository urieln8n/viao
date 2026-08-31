// J-B7.2/J-B7.3 (VIAO_V1_MASTER_ROADMAP.md) — tests movidos desde
// app/properties/[id]/resolve.test.ts (F5-07), sin cambiar su cobertura.

import { test } from "node:test";
import assert from "node:assert/strict";

import { isValidUuid } from "./is-valid-uuid";

const VALID_UUID = "11111111-2222-3333-4444-555555555555";

test("isValidUuid: acepta el formato estándar 8-4-4-4-12 hex, en mayúsculas o minúsculas", () => {
  assert.equal(isValidUuid(VALID_UUID), true);
  assert.equal(isValidUuid(VALID_UUID.toUpperCase()), true);
});

test("isValidUuid: rechaza 'basura' y otros valores mal formados, sin lanzar", () => {
  assert.equal(isValidUuid("basura"), false);
  assert.equal(isValidUuid(""), false);
  assert.equal(isValidUuid("11111111-2222-3333-4444-55555555555"), false); // un carácter de menos
  assert.equal(isValidUuid("mock-001"), false);
});

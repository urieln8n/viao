import { test } from "node:test";
import assert from "node:assert/strict";

import { parsePartnerAmountInput } from "./parse-amount-input";

test("parsePartnerAmountInput: importe válido con punto decimal", () => {
  assert.equal(parsePartnerAmountInput("10.50"), 10.5);
  assert.equal(parsePartnerAmountInput("3"), 3);
});

test("parsePartnerAmountInput: importe válido con coma decimal (convención española)", () => {
  assert.equal(parsePartnerAmountInput("10,50"), 10.5);
});

test("parsePartnerAmountInput: espacios alrededor se ignoran", () => {
  assert.equal(parsePartnerAmountInput("  15  "), 15);
});

test("parsePartnerAmountInput: vacío -> undefined", () => {
  assert.equal(parsePartnerAmountInput(""), undefined);
  assert.equal(parsePartnerAmountInput("   "), undefined);
});

test("parsePartnerAmountInput: cero -> undefined (no es un importe positivo)", () => {
  assert.equal(parsePartnerAmountInput("0"), undefined);
  assert.equal(parsePartnerAmountInput("0.00"), undefined);
});

test("parsePartnerAmountInput: negativo -> undefined", () => {
  assert.equal(parsePartnerAmountInput("-5"), undefined);
});

test("parsePartnerAmountInput: formato inválido -> undefined, sin lanzar", () => {
  assert.equal(parsePartnerAmountInput("abc"), undefined);
  assert.equal(parsePartnerAmountInput("10€"), undefined);
  assert.equal(parsePartnerAmountInput("1.2.3"), undefined);
  assert.equal(parsePartnerAmountInput("--10"), undefined);
  assert.equal(parsePartnerAmountInput("Infinity"), undefined);
  assert.equal(parsePartnerAmountInput("NaN"), undefined);
});

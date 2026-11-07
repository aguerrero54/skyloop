import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_NOTES, DEFAULT_TERMS, invoiceConditions, invoiceTextDefaults } from "./invoices";

test("al cambiar a proveedor se limpian notas y términos predeterminados", () => {
  assert.deepEqual(invoiceTextDefaults("vendor"), { notes: "", terms: "" });
  assert.equal(invoiceConditions("vendor", DEFAULT_TERMS), null);
});
test("al cambiar a cliente se restauran sus valores predeterminados", () => {
  assert.deepEqual(invoiceTextDefaults("client"), { notes: DEFAULT_NOTES, terms: DEFAULT_TERMS });
  assert.equal(invoiceConditions("client", DEFAULT_TERMS), DEFAULT_TERMS);
});
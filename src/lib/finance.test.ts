import { test } from "node:test";
import assert from "node:assert/strict";
import { money } from "./finance";
import { computeTotals, itemAmount } from "./invoices";

test("la tarifa con centavos se conserva en el importe y total", () => {
  const items = [{ key: "test", description: "Diseño", quantity: "1", rate: "51298.25", tax: "0" }];
  assert.equal(itemAmount("1", "51298.25"), 51298.25);
  const totals = computeTotals({ items, discount: 0, discountType: "amount", shipping: 0, adjustment: 0 });
  assert.equal(totals.total, 51298.25);
  assert.equal(money(totals.total, "DOP", 2), "RD$51,298.25");
  assert.equal(money(totals.total, "USD", 2), "US$51,298.25");
});

test("los importes enteros siguen sin decimales y el resto de vistas conserva su formato", () => {
  assert.equal(money(6000, "DOP", 2), "RD$6,000");
  assert.equal(money(51298.25), "RD$51,298");
});
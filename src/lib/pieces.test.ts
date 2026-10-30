import { test } from "node:test";
import assert from "node:assert/strict";
import { breakdownTotals, parseBreakdown } from "./pieces";

test("el costo asignado suma cantidad × precio de posts, stories y carruseles", () => {
  const b = parseBreakdown({ posts: { qty: 10, price: 500 }, stories: { qty: 15, price: 150 }, carousels: { qty: 4, price: 700 } });
  assert.deepEqual(breakdownTotals(b), { qty: 29, cost: 10050 });
});

test("sin stories ni carruseles solo cuentan los posts", () => {
  assert.deepEqual(breakdownTotals(parseBreakdown({ posts: { qty: 20, price: 300 } })), { qty: 20, cost: 6000 });
});

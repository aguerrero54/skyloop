import { test } from "node:test";
import assert from "node:assert/strict";
import { breakdownTotals, parseBreakdown, initialAssignmentBreakdown } from "./pieces";

test("el costo asignado suma cantidad × precio de posts, stories y carruseles", () => {
  const b = parseBreakdown({ posts: { qty: 10, price: 500 }, stories: { qty: 15, price: 150 }, carousels: { qty: 4, price: 700 } });
  assert.deepEqual(breakdownTotals(b), { qty: 29, cost: 10050 });
});

test("sin stories ni carruseles solo cuentan los posts", () => {
  assert.deepEqual(breakdownTotals(parseBreakdown({ posts: { qty: 20, price: 300 } })), { qty: 20, cost: 6000 });
});

test("editar 20 posts antiguos por 6000 conserva cantidad, tarifa y costo", () => {
  const initial = initialAssignmentBreakdown(null, 20, 6000);
  assert.deepEqual(initial, { posts: { qty: 20, price: 300 } });
  assert.deepEqual(breakdownTotals(initial), { qty: 20, cost: 6000 });
});

test("el desglose existente no se reemplaza por el total antiguo", () => {
  const initial = { posts: { qty: 13, price: 300 }, stories: { qty: 2, price: 100 } };
  assert.deepEqual(initialAssignmentBreakdown(initial, 15, 4100), initial);
});

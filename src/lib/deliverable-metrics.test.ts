import { test } from "node:test";
import assert from "node:assert/strict";
import { deliveredCount, deliveryCountWrites, serviceSpend } from "./deliverable-metrics";

const base = { client_service_id: "design", month: "2026-11" };
const records = [{ ...base, piece_type: "", delivered_count: 2 }, { ...base, piece_type: "posts", delivered_count: 1 }, { ...base, piece_type: "stories", delivered_count: 1 }];
test("los posts suman entregas antiguas y nuevas sin duplicarlas en stories", () => {
  assert.equal(deliveredCount(records, "design", "2026-11", "posts"), 3);
  assert.equal(deliveredCount(records, "design", "2026-11", "stories"), 1);
});
test("gastos antiguos cuentan como posts, con conversión y exclusión al editar", () => {
  const tasks = [
    { ...base, id: "old", piece_type: null, amount: 10, currency: "USD" },
    { ...base, id: "new", piece_type: "posts", amount: 300, currency: "DOP" },
    { ...base, id: "story", piece_type: "stories", amount: 100, currency: "DOP" },
  ];
  assert.equal(serviceSpend(tasks, "design", "2026-11", 59, undefined, "posts"), 890);
  assert.equal(serviceSpend(tasks, "design", "2026-11", 59, "old", "posts"), 300);
  assert.equal(serviceSpend(tasks, "design", "2026-11", 59, undefined, "stories"), 100);
  assert.equal(serviceSpend(tasks, "design", "2026-11", 59), 990);
});
test("marcar y desmarcar casillas conserva el total y el bucket de tareas antiguas", () => {
  for (const count of [0, 1, 2, 3, 4]) {
    const writes = deliveryCountWrites(records, "design", "2026-11", "posts", count);
    assert.equal(writes.reduce((sum, r) => sum + r.delivered_count, 0), count);
    assert.equal(writes.find((r) => r.piece_type === "")?.delivered_count, Math.min(count, 2));
  }
});
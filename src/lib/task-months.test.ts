import { describe, test } from "node:test";
import { deepStrictEqual } from "node:assert";
import { taskMonths } from "./task-months";

describe("task month history", () => {
  const now = new Date(2026, 9, 15);
  test("includes every past month since tasks began, even months without tasks", () => {
    deepStrictEqual(taskMonths([{ month: "2026-10", created_at: "2026-07-15T12:00:00Z" }], now),
      ["2026-11", "2026-10", "2026-09", "2026-08", "2026-07"]);
  });
  test("includes exactly one month ahead, including year rollover", () => {
    deepStrictEqual(taskMonths([], new Date(2026, 11, 15)), ["2027-01", "2026-12"]);
  });
  test("keeps past assigned months when tasks were recorded later", () => {
    deepStrictEqual(taskMonths([{ month: "2026-08", created_at: "2026-10-15T12:00:00Z" }], now),
      ["2026-11", "2026-10", "2026-09", "2026-08"]);
  });
});
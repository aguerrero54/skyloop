import { toDop } from "./finance";
import { accountingPiece } from "./pieces";

type BudgetTask = { id: string; client_service_id: string | null; month: string; amount: number; currency: string; piece_type?: string | null };
type Delivery = { client_service_id: string; month: string; piece_type?: string | null; delivered_count: number };

export function serviceSpend(tasks: BudgetTask[], assignmentId: string, month: string, usdRate: number, excludeTaskId?: string, piece?: string) {
  return tasks.filter((t) => t.client_service_id === assignmentId && t.month === month && t.id !== excludeTaskId &&
    (piece === undefined || (piece ? accountingPiece(t.piece_type) === piece : !t.piece_type)))
    .reduce((sum, t) => sum + toDop(t.amount, t.currency, usdRate), 0);
}

export function deliveredCount(records: Delivery[], assignmentId: string, month: string, piece: string): number {
  return records.filter((d) => d.client_service_id === assignmentId && d.month === month &&
    (piece ? accountingPiece(d.piece_type) === piece : !d.piece_type))
    .reduce((sum, d) => sum + d.delivered_count, 0);
}

/** Keep the legacy bucket writable by old tasks, without counting it twice. */
export function deliveryCountWrites(records: Delivery[], assignmentId: string, month: string, piece: string, count: number) {
  const legacy = piece === "posts" ? records.find((d) => d.client_service_id === assignmentId && d.month === month && !d.piece_type) : undefined;
  const legacyCount = legacy ? Math.min(count, legacy.delivered_count) : 0;
  return [
    ...(legacy ? [{ piece_type: "", delivered_count: legacyCount }] : []),
    { piece_type: piece, delivered_count: count - legacyCount },
  ];
}
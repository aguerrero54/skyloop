import { clientActiveInMonth, estimatedMetrics, fixedCostsForMonth, num, toDop } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { PIECES, parseBreakdown } from "@/lib/pieces";

export function useAgencyNet() {
  const { data, month, monthClientServices, usdRate } = useSkyloop();
  const clientProfit = data.clients
    .filter((c) => clientActiveInMonth(c, month))
    .reduce((t, c) => t + estimatedMetrics(c, monthClientServices, usdRate).estimatedProfit, 0);
  const fixed = fixedCostsForMonth(data.fixedCosts, data.fixedCostMonths, month, usdRate);
  return { clientProfit, fixed, net: clientProfit - fixed.total };
}

type BudgetTask = { id: string; client_service_id: string | null; month: string; amount: number; currency: string; piece_type?: string | null };

/** Presupuesto del servicio (costo asignado) vs. suma de precios de sus tareas en el mes, en pesos. */
export function serviceSpend(
  tasks: BudgetTask[],
  assignmentId: string,
  month: string,
  usdRate: number,
  excludeTaskId?: string,
  piece?: string,
) {
  return tasks
    .filter(
      (t) =>
        t.client_service_id === assignmentId &&
        t.month === month &&
        t.id !== excludeTaskId &&
        (piece === undefined || (t.piece_type ?? "") === piece),
    )
    .reduce((s, t) => s + toDop(t.amount, t.currency, usdRate), 0);
}

export function useDeliverables(clientId?: string) {
  const { data, month, monthClientServices, usdRate } = useSkyloop();
  const rows = monthClientServices
    .filter((a) => a.active && num(a.monthly_quantity) > 0 && (!clientId || a.client_id === clientId))
    .flatMap((a) => {
      const breakdown = parseBreakdown(a.breakdown);
      const parts = breakdown
        ? PIECES.filter((p) => (breakdown[p.key]?.qty ?? 0) > 0).map((p) => ({
            piece: p.key as string,
            qty: breakdown[p.key]!.qty,
            budget: breakdown[p.key]!.qty * breakdown[p.key]!.price,
          }))
        : [{ piece: "", qty: Math.max(1, Math.round(num(a.monthly_quantity))), budget: num(a.cost) }];
      return parts.map(({ piece, qty, budget }) => {
        const record = data.deliverables.find(
          (d) => d.client_service_id === a.id && d.month === month && (d.piece_type ?? "") === piece,
        );
        const spent = serviceSpend(data.designerTasks, a.id, month, usdRate, undefined, breakdown ? piece : undefined);
        return { assignment: a, piece, qty, done: Math.min(record?.delivered_count ?? 0, qty), budget, spent };
      });
    });
  const total = rows.reduce((t, r) => t + r.qty, 0);
  const done = rows.reduce((t, r) => t + r.done, 0);
  return { rows, total, done, percent: total ? (done / total) * 100 : 0 };
}


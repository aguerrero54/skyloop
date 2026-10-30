import { clientActiveInMonth, estimatedMetrics, fixedCostsForMonth, num, toDop } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";

export function useAgencyNet() {
  const { data, month, monthClientServices, usdRate } = useSkyloop();
  const clientProfit = data.clients
    .filter((c) => clientActiveInMonth(c, month))
    .reduce((t, c) => t + estimatedMetrics(c, monthClientServices, usdRate).estimatedProfit, 0);
  const fixed = fixedCostsForMonth(data.fixedCosts, data.fixedCostMonths, month, usdRate);
  return { clientProfit, fixed, net: clientProfit - fixed.total };
}

type BudgetTask = { id: string; client_service_id: string | null; month: string; amount: number; currency: string };

/** Presupuesto del servicio (costo asignado) vs. suma de precios de sus tareas en el mes, en pesos. */
export function serviceSpend(
  tasks: BudgetTask[],
  assignmentId: string,
  month: string,
  usdRate: number,
  excludeTaskId?: string,
) {
  return tasks
    .filter((t) => t.client_service_id === assignmentId && t.month === month && t.id !== excludeTaskId)
    .reduce((s, t) => s + toDop(t.amount, t.currency, usdRate), 0);
}

export function useDeliverables(clientId?: string) {
  const { data, month, monthClientServices, usdRate } = useSkyloop();
  const rows = monthClientServices
    .filter((a) => a.active && num(a.monthly_quantity) > 0 && (!clientId || a.client_id === clientId))
    .map((a) => {
      const qty = Math.max(1, Math.round(num(a.monthly_quantity)));
      const record = data.deliverables.find((d) => d.client_service_id === a.id && d.month === month);
      const budget = num(a.cost);
      const spent = serviceSpend(data.designerTasks, a.id, month, usdRate);
      return { assignment: a, qty, done: Math.min(record?.delivered_count ?? 0, qty), budget, spent };
    });
  const total = rows.reduce((t, r) => t + r.qty, 0);
  const done = rows.reduce((t, r) => t + r.done, 0);
  return { rows, total, done, percent: total ? (done / total) * 100 : 0 };
}


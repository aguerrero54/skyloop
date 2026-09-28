import { clientActiveInMonth, estimatedMetrics, fixedCostsForMonth, num } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";

export function useAgencyNet() {
  const { data, month, monthClientServices, usdRate } = useSkyloop();
  const clientProfit = data.clients
    .filter((c) => clientActiveInMonth(c, month))
    .reduce((t, c) => t + estimatedMetrics(c, monthClientServices, usdRate).estimatedProfit, 0);
  const fixed = fixedCostsForMonth(data.fixedCosts, data.fixedCostMonths, month, usdRate);
  return { clientProfit, fixed, net: clientProfit - fixed.total };
}

export function useDeliverables(clientId?: string) {
  const { data, month, monthClientServices } = useSkyloop();
  const rows = monthClientServices
    .filter((a) => a.active && num(a.monthly_quantity) > 0 && (!clientId || a.client_id === clientId))
    .map((a) => {
      const qty = Math.max(1, Math.round(num(a.monthly_quantity)));
      const record = data.deliverables.find((d) => d.client_service_id === a.id && d.month === month);
      return { assignment: a, qty, done: Math.min(record?.delivered_count ?? 0, qty) };
    });
  const total = rows.reduce((t, r) => t + r.qty, 0);
  const done = rows.reduce((t, r) => t + r.done, 0);
  return { rows, total, done, percent: total ? (done / total) * 100 : 0 };
}


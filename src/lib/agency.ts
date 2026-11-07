import { clientActiveInMonth, estimatedMetrics, fixedCostsForMonth, num, toDop } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { PIECES, parseBreakdown } from "@/lib/pieces";
import { deliveredCount, serviceSpend } from "@/lib/deliverable-metrics";
export { serviceSpend } from "@/lib/deliverable-metrics";

export function useAgencyNet() {
  const { data, month, monthClientServices, usdRate } = useSkyloop();
  const clientProfit = data.clients
    .filter((c) => clientActiveInMonth(c, month))
    .reduce((t, c) => t + estimatedMetrics(c, monthClientServices, usdRate).estimatedProfit, 0);
  const fixed = fixedCostsForMonth(data.fixedCosts, data.fixedCostMonths, month, usdRate);
  return { clientProfit, fixed, net: clientProfit - fixed.total };
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
             qty: breakdown[p.key]?.qty ?? 0,
             budget: (breakdown[p.key]?.qty ?? 0) * (breakdown[p.key]?.price ?? 0),
          }))
        : [{ piece: "", qty: Math.max(1, Math.round(num(a.monthly_quantity))), budget: num(a.cost) }];
      return parts.map(({ piece, qty, budget }) => {
        const count = deliveredCount(data.deliverables, a.id, month, piece);
        const spent = serviceSpend(data.designerTasks, a.id, month, usdRate, undefined, breakdown ? piece : undefined);
        return { assignment: a, piece, qty, done: Math.min(count, qty), budget, spent };
      });
    });
  const total = rows.reduce((t, r) => t + r.qty, 0);
  const done = rows.reduce((t, r) => t + r.done, 0);
  return { rows, total, done, percent: total ? (done / total) * 100 : 0 };
}


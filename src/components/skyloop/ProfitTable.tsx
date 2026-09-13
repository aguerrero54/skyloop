import { Link } from "@tanstack/react-router";

import { clientMetrics, estimatedMetrics, marginTone, money } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { EmptyRow, MarginBadge, TableShell } from "@/components/skyloop/ui";

export function ProfitTable({ limit }: { limit?: number }) {
  const { data, monthIncomes, monthExpenses, usdRate } = useSkyloop();

  let rows = data.clients
    .map((client) => ({
      client,
      ...clientMetrics(client.id, monthIncomes, monthExpenses, usdRate),
      estimated: estimatedMetrics(client, data.clientServices, usdRate),
    }))
    .filter((row) => row.revenue || row.costs || row.estimated.payment)
    .sort(
      (a, b) =>
        b.profit - a.profit ||
        b.estimated.estimatedProfit - a.estimated.estimatedProfit,
    );

  if (limit) rows = rows.slice(0, limit);

  return (
    <TableShell
      head={
        <tr>
          <th className="px-4 py-3 font-semibold">Cliente</th>
          <th className="px-4 py-3 text-right font-semibold">Pago mensual</th>
          <th className="px-4 py-3 text-right font-semibold">Servicios</th>
          <th className="px-4 py-3 text-right font-semibold">Ganancia est.</th>
          <th className="px-4 py-3 text-right font-semibold">Facturación</th>
          <th className="px-4 py-3 text-right font-semibold">Costos</th>
          <th className="px-4 py-3 text-right font-semibold">Ganancia</th>
          <th className="px-4 py-3 text-right font-semibold">Margen</th>
        </tr>
      }
      footer={
        rows.length > 0 ? (
          <tr className="border-t-2 border-primary/40 bg-surface-raised font-bold">
            <td className="px-4 py-3 text-sm uppercase tracking-wider text-muted-foreground">
              Total ({rows.length})
            </td>
            <td className="px-4 py-3 text-right text-foreground">
              {money(
                rows.reduce((total, row) => total + row.estimated.payment, 0),
              )}
            </td>
            <td className="px-4 py-3 text-right text-foreground">
              {money(rows.reduce((total, row) => total + row.estimated.serviceCost, 0))}
            </td>
            <td className="px-4 py-3 text-right text-foreground">
              {money(rows.reduce((total, row) => total + row.estimated.estimatedProfit, 0))}
            </td>
            <td className="px-4 py-3 text-right text-foreground">
              {money(rows.reduce((total, row) => total + row.revenue, 0))}
            </td>
            <td className="px-4 py-3 text-right text-foreground">
              {money(rows.reduce((total, row) => total + row.costs, 0))}
            </td>
            <td className="px-4 py-3 text-right text-foreground">
              {money(rows.reduce((total, row) => total + row.profit, 0))}
            </td>
            <td className="px-4 py-3 text-right">
              <MarginBadge
                margin={
                  totalRevenue ? (totalProfit / totalRevenue) * 100 : 0
                }
                tone={marginTone(totalRevenue ? (totalProfit / totalRevenue) * 100 : 0)}
              />
            </td>
          </tr>
        ) : null
      }
    >
              {money(row.profit)}
            </td>
            <td className="px-4 py-3 text-right">
              <MarginBadge margin={row.margin} tone={marginTone(row.margin)} />
            </td>
          </tr>
        ))
      )}
    </TableShell>
  );
}

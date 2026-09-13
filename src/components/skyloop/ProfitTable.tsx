import { Link } from "@tanstack/react-router";

import { clientMetrics, marginTone, money } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { EmptyRow, MarginBadge, TableShell } from "@/components/skyloop/ui";

export function ProfitTable({ limit }: { limit?: number }) {
  const { data, monthIncomes, monthExpenses, usdRate } = useSkyloop();

  let rows = data.clients
    .map((client) => ({
      client,
      ...clientMetrics(client.id, monthIncomes, monthExpenses, usdRate),
    }))
    .filter((row) => row.revenue || row.costs)
    .sort((a, b) => b.profit - a.profit);

  if (limit) rows = rows.slice(0, limit);

  return (
    <TableShell
      head={
        <tr>
          <th className="px-4 py-3 font-semibold">Cliente</th>
          <th className="px-4 py-3 text-right font-semibold">Facturación</th>
          <th className="px-4 py-3 text-right font-semibold">Costos</th>
          <th className="px-4 py-3 text-right font-semibold">Ganancia</th>
          <th className="px-4 py-3 text-right font-semibold">Margen</th>
        </tr>
      }
    >
      {rows.length === 0 ? (
        <EmptyRow colSpan={5} label="Sin información en este mes" />
      ) : (
        rows.map((row) => (
          <tr key={row.client.id} className="border-t border-border">
            <td className="px-4 py-3">
              <Link
                to="/clientes/$clientId"
                params={{ clientId: row.client.id }}
                className="font-bold text-foreground hover:text-primary-soft"
              >
                {row.client.name}
              </Link>
            </td>
            <td className="px-4 py-3 text-right">{money(row.revenue)}</td>
            <td className="px-4 py-3 text-right">{money(row.costs)}</td>
            <td
              className={`px-4 py-3 text-right font-bold ${row.profit >= 0 ? "text-success" : "text-destructive"}`}
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

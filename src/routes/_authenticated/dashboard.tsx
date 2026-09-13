import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
} from "recharts";

import {
  clientMetrics,
  monthLabel,
  monthMetrics,
  monthOf,
  money,
  num,
  sumDop,
} from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { KpiCard, Panel, ProgressBar } from "@/components/skyloop/ui";
import { ProfitTable } from "@/components/skyloop/ProfitTable";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard financiero — Skyloop Control" },
      {
        name: "description",
        content:
          "Resumen del mes: facturación, cobrado, gastos, ganancia y clientes más rentables de la agencia.",
      },
      { property: "og:title", content: "Dashboard financiero — Skyloop Control" },
      {
        property: "og:description",
        content: "Facturación, cobros, gastos y rentabilidad de Skyloop mes a mes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const { data, month, monthIncomes, monthExpenses, usdRate } = useSkyloop();
  const metrics = monthMetrics(monthIncomes, monthExpenses, usdRate);

  const chartRows = data.history.map((row) => {
    const isCurrent = row.month === month;
    const live = isCurrent ? metrics : null;
    return {
      month: monthLabel(row.month).split(" ")[0],
      Ingresos: live ? live.billed : num(row.income),
      Gastos: live ? live.registered : num(row.expenses),
    };
  });

  const ranking = data.clients
    .map((client) => ({
      client,
      ...clientMetrics(client.id, monthIncomes, monthExpenses, usdRate),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  const topRevenue = ranking[0]?.revenue || 1;

  const directCosts = sumDop(
    monthExpenses.filter((row) => row.direct_cost),
    usdRate,
  );
  const activeClients = data.clients.filter((client) => client.status === "Activo").length;

  const attention = [
    { label: "Cuentas por cobrar", value: money(metrics.receivable), percent: (metrics.receivable / 120000) * 100, to: "/por-cobrar" as const },
    { label: "Cuentas por pagar", value: money(metrics.payable), percent: (metrics.payable / 120000) * 100, to: "/por-pagar" as const },
    { label: "Costos directos", value: money(directCosts), percent: (directCosts / 120000) * 100, to: "/gastos" as const },
    { label: "Clientes activos", value: String(activeClients), percent: activeClients * 15, to: "/clientes" as const },
  ];

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Facturación"
          value={money(metrics.billed)}
          footnote="Ingresos registrados"
          icon="↗"
        />
        <KpiCard
          label="Cobrado"
          value={money(metrics.collected)}
          footnote={metrics.receivable ? `${money(metrics.receivable)} pendiente` : "Todo al día"}
          icon="✓"
        />
        <KpiCard
          label="Gastos registrados"
          value={money(metrics.registered)}
          footnote={`${money(metrics.payable)} por pagar`}
          icon="↘"
        />
        <KpiCard
          label="Ganancia contable"
          value={money(metrics.accrualProfit)}
          footnote={
            metrics.billed
              ? `${((metrics.accrualProfit / metrics.billed) * 100).toFixed(1)}% margen`
              : "Sin ingresos"
          }
          icon="△"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Ingresos vs. gastos" subtitle="Histórico del año con los registros del sistema">
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartRows}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="month"
                  stroke="var(--muted-foreground)"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--surface-raised)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    color: "var(--foreground)",
                    fontSize: 12,
                  }}
                  formatter={(value) => money(value as number)}
                />
                <Line
                  type="monotone"
                  dataKey="Ingresos"
                  stroke="var(--primary)"
                  strokeWidth={4}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="Gastos"
                  stroke="var(--success)"
                  strokeWidth={3}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-primary" />
              Ingresos
            </span>
            <span className="flex items-center gap-2">
              <i className="size-2 rounded-full bg-success" />
              Gastos
            </span>
          </div>
        </Panel>

        <Panel title="Clientes por facturación" subtitle={monthLabel(month)}>
          <div className="grid gap-4">
            {ranking.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Sin ingresos</p>
            ) : (
              ranking.map((row, index) => (
                <div key={row.client.id} className="flex items-center gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 truncate text-sm text-foreground">
                      {index + 1}. {row.client.name}
                    </div>
                    <ProgressBar percent={Math.max(3, (row.revenue / topRevenue) * 100)} />
                  </div>
                  <div className="text-sm font-bold text-foreground">{money(row.revenue)}</div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Rentabilidad por cliente"
          subtitle="Facturación menos costos directos"
          action={
            <Link
              to="/rentabilidad"
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
            >
              Ver todo
            </Link>
          }
        >
          <ProfitTable limit={4} />
        </Panel>

        <Panel title="Control inmediato" subtitle="Lo que requiere tu atención">
          <div className="grid gap-4">
            {attention.map((row) => (
              <div key={row.label} className="flex items-center gap-4">
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 text-sm text-foreground">{row.label}</div>
                  <ProgressBar percent={Math.max(8, row.percent)} />
                </div>
                <Link
                  to={row.to}
                  className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
                >
                  {row.value}
                </Link>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <p className="text-xs text-muted-foreground">
        Período mostrado: {monthLabel(month)} · movimientos con fecha dentro de{" "}
        {monthOf(`${month}-01`)}
      </p>
    </div>
  );
}

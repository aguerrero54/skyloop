import type { ReactNode } from "react";
import { clientActiveInMonth } from "@/lib/finance";
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
import { invoiceLedger } from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { useDashboardPrefs, type DashboardBlockId } from "@/lib/dashboard-prefs";
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

const kpiIds: DashboardBlockId[] = ["kpi-billed", "kpi-collected", "kpi-expenses", "kpi-profit"];
const fullWidthIds: DashboardBlockId[] = ["invoices", "period"];

function DashboardPage() {
  const { data, month, monthIncomes, monthExpenses, usdRate } = useSkyloop();
  const { layout } = useDashboardPrefs();
  const metrics = monthMetrics(monthIncomes, monthExpenses, usdRate);
  const ledger = invoiceLedger(data.invoices, usdRate);

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
    .filter((client) => clientActiveInMonth(client, month))
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
  const activeClients = data.clients.filter((client) => client.status === "Activo" && clientActiveInMonth(client, month)).length;

  const attention = [
    { label: "Cuentas por cobrar", value: money(metrics.receivable), percent: (metrics.receivable / 120000) * 100, to: "/por-cobrar" as const },
    { label: "Cuentas por pagar", value: money(metrics.payable), percent: (metrics.payable / 120000) * 100, to: "/por-pagar" as const },
    { label: "Costos directos", value: money(directCosts), percent: (directCosts / 120000) * 100, to: "/gastos" as const },
    { label: "Clientes activos", value: String(activeClients), percent: activeClients * 15, to: "/clientes" as const },
  ];

  const blocks: Record<DashboardBlockId, ReactNode> = {
    "kpi-billed": (
      <KpiCard
        label="Facturación"
        value={money(metrics.billed)}
        footnote="Ingresos registrados"
        icon="↗"
      />
    ),
    "kpi-collected": (
      <KpiCard
        label="Cobrado"
        value={money(metrics.collected)}
        footnote={metrics.receivable ? `${money(metrics.receivable)} pendiente` : "Todo al día"}
        icon="✓"
      />
    ),
    "kpi-expenses": (
      <KpiCard
        label="Gastos registrados"
        value={money(metrics.registered)}
        footnote={`${money(metrics.payable)} por pagar`}
        icon="↘"
      />
    ),
    "kpi-profit": (
      <KpiCard
        label="Margen de Ganancias"
        value={money(metrics.accrualProfit)}
        footnote={
          metrics.billed
            ? `${((metrics.accrualProfit / metrics.billed) * 100).toFixed(1)}% margen`
            : "Sin ingresos"
        }
        icon="△"
      />
    ),
    invoices: (
      <Panel
        title="Facturación del módulo de Facturas"
        subtitle="Ingresos de clientes y gastos de proveedores, sin mezclar lo facturado con lo cobrado o pagado"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <KpiCard
            label="Ingresos facturados"
            value={money(ledger.incomeBilled)}
            footnote="Facturas de clientes"
            icon="↗"
          />
          <KpiCard
            label="Gastos facturados"
            value={money(ledger.expenseBilled)}
            footnote="Documentos de proveedores"
            icon="↘"
          />
          <KpiCard
            label="Cuentas por cobrar"
            value={money(ledger.receivable)}
            footnote={`Cobrado ${money(ledger.incomePaid)}`}
            icon="◷"
          />
          <KpiCard
            label="Cuentas por pagar"
            value={money(ledger.payable)}
            footnote={`Pagado ${money(ledger.expensePaid)}`}
            icon="◴"
          />
          <KpiCard
            label="Flujo neto"
            value={money(ledger.netFlow)}
            footnote="Cobros recibidos − pagos realizados"
            icon="△"
          />
        </div>
      </Panel>
    ),
    chart: (
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
    ),
    "top-clients": (
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
    ),
    profit: (
      <Panel
        title="Rentabilidad por cliente"
        subtitle="Facturación menos costos directos"
        action={
          <Link
            to="/reportes"
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
          >
            Ver todo
          </Link>
        }
      >
        <ProfitTable limit={4} showPayment={false} />
      </Panel>
    ),
    attention: (
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
    ),
    period: (
      <p className="text-xs text-muted-foreground">
        Período mostrado: {monthLabel(month)} · movimientos con fecha dentro de{" "}
        {monthOf(`${month}-01`)}
      </p>
    ),
  };

  const visible = layout.filter((block) => block.visible).map((block) => block.id);

  const rows: ReactNode[] = [];
  let index = 0;
  while (index < visible.length) {
    const id = visible[index]!;

    if (kpiIds.includes(id)) {
      const run: DashboardBlockId[] = [];
      while (index < visible.length && kpiIds.includes(visible[index]!)) {
        run.push(visible[index]!);
        index += 1;
      }
      rows.push(
        <div key={`kpis-${run.join("-")}`} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {run.map((blockId) => (
            <div key={blockId}>{blocks[blockId]}</div>
          ))}
        </div>,
      );
      continue;
    }

    if (fullWidthIds.includes(id)) {
      rows.push(<div key={id}>{blocks[id]}</div>);
      index += 1;
      continue;
    }

    const pair: DashboardBlockId[] = [id];
    const next = visible[index + 1];
    if (next && !kpiIds.includes(next) && !fullWidthIds.includes(next)) pair.push(next);
    index += pair.length;
    rows.push(
      <div key={`pair-${pair.join("-")}`} className="grid gap-4 xl:grid-cols-2">
        {pair.map((blockId) => (
          <div key={blockId}>{blocks[blockId]}</div>
        ))}
      </div>,
    );
  }

  if (rows.length === 0) {
    return (
      <p className="py-20 text-center text-sm text-muted-foreground">
        No hay bloques visibles. Usa "Personalizar" para elegir qué mostrar.
      </p>
    );
  }

  return <div className="grid gap-4">{rows}</div>;
}

import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { downloadFile, monthMetrics, money, toCSV } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { KpiCard, Panel, SectionTitle } from "@/components/skyloop/ui";
import { ProfitTable } from "@/components/skyloop/ProfitTable";
import { useAgencyNet } from "@/lib/agency";

export const Route = createFileRoute("/_authenticated/reportes")({
  head: () => ({
    meta: [
      { title: "Reportes y rentabilidad — Skyloop Control" },
      {
        name: "description",
        content:
          "Resumen del período, rentabilidad por cliente y exportación de ingresos, gastos y respaldo completo.",
      },
      { property: "og:title", content: "Reportes y rentabilidad — Skyloop Control" },
      {
        property: "og:description",
        content:
          "Margen real de cada marca y descarga de ingresos, gastos y respaldo de la agencia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const { data, monthIncomes, monthExpenses, usdRate } = useSkyloop();
  const metrics = monthMetrics(monthIncomes, monthExpenses, usdRate);
  const agency = useAgencyNet();

  function exportCSV(kind: "incomes" | "expenses") {
    const rows = kind === "incomes" ? data.incomes : data.expenses;
    if (!rows.length) {
      toast.error("No hay información para exportar");
      return;
    }
    downloadFile(`${kind === "incomes" ? "ingresos" : "gastos"}.csv`, toCSV(rows), "text/csv");
  }

  function exportBackup() {
    downloadFile(
      "skyloop-control-respaldo.json",
      JSON.stringify(data, null, 2),
      "application/json",
    );
  }

  const buttonClass =
    "rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary";

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Facturación" value={money(metrics.billed)} footnote="Total del período" icon="↗" />
        <KpiCard label="Gastos" value={money(metrics.registered)} footnote="Total del período" icon="↘" />
        <KpiCard
          label="Beneficio"
          value={money(metrics.accrualProfit)}
          footnote="Antes de distribuir gastos generales"
          icon="△"
        />
        <KpiCard
          label="Flujo de caja real"
          value={money(metrics.cashProfit)}
          footnote="Cobrado − pagado"
          icon="≈"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Ganancia de clientes" value={money(agency.clientProfit)} footnote="Pagos mensuales − servicios" icon="↗" />
        <KpiCard label="Gastos fijos" value={money(agency.fixed.total)} footnote="Plataformas, oficina, etc." icon="▦" />
        <KpiCard label="Ganancia neta de la agencia" value={money(agency.net)} footnote="Después de gastos fijos" icon="△" />
      </div>

      <div>
        <SectionTitle
          title="¿Qué clientes realmente te dejan dinero?"
          description="Facturación menos los gastos directos asociados a cada marca."
        />
        <ProfitTable />
      </div>



      <Panel
        title="Exportar información"
        subtitle="Descarga tus datos para respaldo o análisis externo."
      >
        <div className="flex flex-wrap gap-2">
          <button type="button" className={buttonClass} onClick={() => exportCSV("incomes")}>
            Exportar ingresos CSV
          </button>
          <button type="button" className={buttonClass} onClick={() => exportCSV("expenses")}>
            Exportar gastos CSV
          </button>
          <button type="button" className={buttonClass} onClick={exportBackup}>
            Respaldo completo JSON
          </button>
        </div>
      </Panel>
    </div>
  );
}

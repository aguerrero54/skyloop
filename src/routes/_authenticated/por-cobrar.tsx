import { createFileRoute } from "@tanstack/react-router";

import { incomeToMovement, money, sumDop } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { KpiCard, MovementTable } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/por-cobrar")({
  head: () => ({
    meta: [
      { title: "Cuentas por cobrar — Skyloop Control" },
      {
        name: "description",
        content: "Todo lo pendiente de cobro a clientes, ordenado por fecha de vencimiento.",
      },
      { property: "og:title", content: "Cuentas por cobrar — Skyloop Control" },
      {
        property: "og:description",
        content: "Facturas pendientes de cobro de la agencia por fecha de vencimiento.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReceivablesPage,
});

function ReceivablesPage() {
  const { data, usdRate, clientName } = useSkyloop();
  const pending = data.incomes
    .filter((row) => row.status !== "Cobrado")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:max-w-sm">
        <KpiCard
          label="Pendiente por cobrar"
          value={money(sumDop(pending, usdRate))}
          footnote={`${pending.length} registros abiertos`}
          icon="◷"
        />
      </div>
      <MovementTable rows={pending.map(incomeToMovement)} clientName={clientName} />
    </div>
  );
}

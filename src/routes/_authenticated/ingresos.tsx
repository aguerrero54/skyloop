import { createFileRoute } from "@tanstack/react-router";

import { incomeToMovement, monthLabel } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { MovementTable } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/ingresos")({
  head: () => ({
    meta: [
      { title: "Ingresos — Skyloop Control" },
      {
        name: "description",
        content: "Facturación y cobros del mes: concepto, cliente, estado y monto de cada ingreso.",
      },
      { property: "og:title", content: "Ingresos — Skyloop Control" },
      {
        property: "og:description",
        content: "Registro de facturación y cobros de la agencia mes a mes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: IncomesPage,
});

function IncomesPage() {
  const { monthIncomes, month, clientName, openForm } = useSkyloop();
  const rows = monthIncomes.map(incomeToMovement);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {rows.length} movimientos · {monthLabel(month)}
        </span>
        <button
          type="button"
          onClick={() => openForm("income")}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          + Nuevo ingreso
        </button>
      </div>
      <MovementTable rows={rows} clientName={clientName} />
    </div>
  );
}

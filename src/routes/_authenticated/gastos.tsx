import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { expenseToMovement, monthLabel } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { MovementTable } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/gastos")({
  head: () => ({
    meta: [
      { title: "Gastos — Skyloop Control" },
      {
        name: "description",
        content:
          "Costos de la agencia por mes: concepto, categoría, proveedor, estado y monto de cada gasto.",
      },
      { property: "og:title", content: "Gastos — Skyloop Control" },
      {
        property: "og:description",
        content: "Control de costos y pagos a proveedores de la agencia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { monthExpenses, month, clientName, openForm, refresh } = useSkyloop();
  const rows = monthExpenses.map(expenseToMovement);

  async function changeStatus(id: string, status: string) {
    const { error } = await supabase.from("expenses").update({ status }).eq("id", id);
    if (error) {
      toast.error("No se pudo actualizar el estado");
      return;
    }
    toast.success(`Estado actualizado a ${status}`);
    await refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-muted-foreground">
          {rows.length} movimientos · {monthLabel(month)}
        </span>
        <button
          type="button"
          onClick={() => openForm("expense")}
          className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          + Nuevo gasto
        </button>
      </div>
      <MovementTable
        rows={rows}
        clientName={clientName}
        onStatusChange={(row, status) => changeStatus(row.id, status)}
      />
    </div>
  );
}

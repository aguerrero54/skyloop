import { useState, type FormEvent } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  clientMetrics,
  estimatedMetrics,
  expenseToMovement,
  incomeToMovement,
  monthLabel,
  money,
  num,
} from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { EmptyRow, MovementTable, Panel, ProgressBar, TableShell } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/clientes/$clientId")({
  head: () => ({
    meta: [
      { title: "Ficha de cliente — Skyloop Control" },
      {
        name: "description",
        content:
          "Rentabilidad de la marca: servicios asignados, equipo, ingresos, costos y movimientos del mes.",
      },
      { property: "og:title", content: "Ficha de cliente — Skyloop Control" },
      {
        property: "og:description",
        content: "Servicios asignados, equipo, ingresos, costos y margen de la marca.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientDetailPage,
});

function ClientDetailPage() {
  const { clientId } = useParams({ from: "/_authenticated/clientes/$clientId" });
  const {
    data,
    month,
    monthIncomes,
    monthExpenses,
    usdRate,
    openForm,
    clientName,
    providerName,
    serviceName,
    refresh,
  } = useSkyloop();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editingPayment, setEditingPayment] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const client = data.clients.find((row) => row.id === clientId);

  if (!client) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Este cliente ya no existe.</p>
        <Link
          to="/clientes"
          className="mt-4 inline-block rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground"
        >
          Volver a clientes
        </Link>
      </div>
    );
  }

  const metrics = clientMetrics(client.id, monthIncomes, monthExpenses, usdRate);
  const est = estimatedMetrics(client, data.clientServices);
  const committedPct =
    est.payment > 0 ? Math.min(100, (est.serviceCost / est.payment) * 100) : 0;
  const assignments = data.clientServices.filter(
    (row) => row.client_id === client.id && row.active,
  );
  const movements = [
    ...monthIncomes.filter((row) => row.client_id === client.id).map(incomeToMovement),
    ...monthExpenses.filter((row) => row.client_id === client.id).map(expenseToMovement),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const selectedAssignment = assignments.find((row) => row.id === selectedId) ?? null;

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedId(null);
  }

  async function deleteAssignment() {
    if (!selectedAssignment) return;
    const confirmed = window.confirm(
      `¿Eliminar la asignación de "${serviceName(selectedAssignment.service_id)}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase
      .from("client_services")
      .delete()
      .eq("id", selectedAssignment.id);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar", { description: error.message });
      return;
    }
    toast.success("Asignación eliminada");
    setSelectedId(null);
    await refresh();
  }

  return (
    <div className="grid gap-4">
      <Link
        to="/clientes"
        className="w-fit rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
      >
        ← Volver a clientes
      </Link>

      <div className="grid gap-5 rounded-2xl border border-border bg-card p-6 shadow-panel xl:grid-cols-[1fr_auto]">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
            {client.status.toUpperCase()}
          </p>
          <h3 className="mt-1 text-xl font-bold text-foreground">{client.name}</h3>
          <p className="mt-2 max-w-xl text-sm text-muted-foreground">
            {client.notes || "Sin notas internas."}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div>
            <small className="text-[10px] tracking-wider text-muted-foreground">FACTURACIÓN</small>
            <b className="block text-base text-foreground">{money(metrics.revenue)}</b>
          </div>
          <div>
            <small className="text-[10px] tracking-wider text-muted-foreground">COSTOS</small>
            <b className="block text-base text-foreground">{money(metrics.costs)}</b>
          </div>
          <div>
            <small className="text-[10px] tracking-wider text-muted-foreground">GANANCIA</small>
            <b
              className={`block text-base ${metrics.profit >= 0 ? "text-success" : "text-destructive"}`}
            >
              {money(metrics.profit)}
            </b>
          </div>
          <div>
            <small className="text-[10px] tracking-wider text-muted-foreground">MARGEN</small>
            <b className="block text-base text-foreground">{metrics.margin.toFixed(1)}%</b>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel
          title="Servicios y equipo asignado"
          subtitle="Costos recurrentes / de producción"
          action={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={toggleSelectMode}
                className={
                  selectMode
                    ? "rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    : "rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
                }
              >
                {selectMode ? "Cancelar" : "Seleccionar"}
              </button>
              <button
                type="button"
                onClick={() => openForm("assignment", client.id)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
              >
                + Asignar
              </button>
            </div>
          }
        >
          {selectMode && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-xs text-muted-foreground">
              {selectedAssignment ? (
                <>
                  <span className="font-semibold text-foreground">
                    {serviceName(selectedAssignment.service_id)}
                  </span>
                  <span>seleccionado</span>
                  <button
                    type="button"
                    onClick={() => openForm("assignment", client.id, selectedAssignment)}
                    className="ml-auto rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={deleteAssignment}
                    disabled={deleting}
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                  >
                    {deleting ? "Eliminando…" : "Eliminar"}
                  </button>
                </>
              ) : (
                <span>Toca un servicio de la tabla para editarlo o eliminarlo.</span>
              )}
            </div>
          )}
          <TableShell
            head={
              <tr>
                <th className="px-4 py-3 font-semibold">Servicio</th>
                <th className="px-4 py-3 text-right font-semibold">Cantidad / mes</th>
                <th className="px-4 py-3 font-semibold">Proveedor</th>
                <th className="px-4 py-3 text-right font-semibold">Costo base</th>
              </tr>
            }
          >
            {assignments.length === 0 ? (
              <EmptyRow colSpan={4} label="Sin asignaciones" />
            ) : (
              assignments.map((row) => (
                <tr
                  key={row.id}
                  onClick={
                    selectMode
                      ? () => setSelectedId((prev) => (prev === row.id ? null : row.id))
                      : undefined
                  }
                  className={
                    selectMode
                      ? row.id === selectedId
                        ? "cursor-pointer border-t border-border bg-primary/10"
                        : "cursor-pointer border-t border-border transition-colors hover:bg-secondary"
                      : "border-t border-border"
                  }
                >
                  <td className="px-4 py-3 text-foreground">{serviceName(row.service_id)}</td>
                  <td className="px-4 py-3 text-right text-foreground">
                    {num(row.monthly_quantity) || "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {providerName(row.provider_id)}
                  </td>
                  <td className="px-4 py-3 text-right">{money(row.cost)}</td>
                </tr>
              ))
            )}
          </TableShell>
        </Panel>

        <Panel title="Resumen financiero" subtitle={monthLabel(month)}>
          <div
            className={`text-3xl font-extrabold ${metrics.profit >= 0 ? "text-success" : "text-destructive"}`}
          >
            {money(metrics.profit)}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Ganancia bruta después de los costos asociados a esta marca.
          </p>
          <p className="mt-4 rounded-xl border border-border bg-surface-raised p-4 text-xs text-muted-foreground">
            Un gasto registrado con este cliente se descuenta automáticamente de su rentabilidad.
            No tienes que duplicarlo en otra tabla.
          </p>
        </Panel>
      </div>

      <Panel
        title="Movimientos del cliente"
        subtitle="Ingresos y gastos relacionados"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openForm("expense", client.id)}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
            >
              + Gasto
            </button>
            <button
              type="button"
              onClick={() => openForm("income", client.id)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              + Ingreso
            </button>
          </div>
        }
      >
        <MovementTable rows={movements} clientName={clientName} />
      </Panel>
    </div>
  );
}

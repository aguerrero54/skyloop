import { useState } from "react";
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
import { invoiceToClientMovement, invoiceTouchesClient } from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { EmptyRow, MovementTable, Panel, TableShell } from "@/components/skyloop/ui";

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
    monthClientServices,
    usdRate,
    openForm,
    clientName,
    providerName,
    serviceName,
    refresh,
  } = useSkyloop();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

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
  const est = estimatedMetrics(client, monthClientServices, usdRate);

  const assignments = monthClientServices.filter(
    (row) => row.client_id === client.id && row.active,
  );
  const invoiceItemsOf = (invoiceId: string) =>
    data.invoiceItems.filter((item) => item.invoice_id === invoiceId);
  const clientInvoices = data.invoices.filter(
    (row) =>
      row.status !== "Borrador" &&
      row.status !== "Cancelada" &&
      (row.issue_date ?? "").startsWith(month) &&
      invoiceTouchesClient(row, invoiceItemsOf(row.id), client.id),
  );
  const movements = [
    ...monthIncomes.filter((row) => row.client_id === client.id).map(incomeToMovement),
    ...monthExpenses.filter((row) => row.client_id === client.id).map(expenseToMovement),
    ...clientInvoices.map((invoice) =>
      invoiceToClientMovement(invoice, invoiceItemsOf(invoice.id), client.id),
    ),
  ].sort((a, b) => b.date.localeCompare(a.date));

  const selectedAssignment =
    selectedIds.length === 1
      ? assignments.find((row) => row.id === selectedIds[0]) ?? null
      : null;

  function toggleSelectMode() {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  async function deleteAssignment() {
    if (selectedIds.length === 0) return;
    const plural = selectedIds.length > 1;
    const confirmed = window.confirm(
      `¿Quitar ${plural ? `las ${selectedIds.length} asignaciones seleccionadas` : "la asignación seleccionada"} desde ${monthLabel(month)} en adelante? Los meses anteriores no cambian.`,
    );
    if (!confirmed) return;
    const removeAll = window.confirm(
      "¿Prefieres borrarla de TODOS los meses (también los pasados)?\n\nAceptar = borrar de todos los meses\nCancelar = solo desde este mes",
    );
    setDeleting(true);
    let error;
    if (removeAll) {
      await supabase.from("client_service_months").delete().in("client_service_id", selectedIds);
      ({ error } = await supabase.from("client_services").delete().in("id", selectedIds));
    } else {
      const [y, m] = month.split("-").map(Number);
      const prev = new Date(y ?? 2026, (m ?? 1) - 2, 1);
      const prevMonth = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}`;
      ({ error } = await supabase
        .from("client_services")
        .update({ end_month: prevMonth })
        .in("id", selectedIds));
    }
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar", { description: error.message });
      return;
    }
    toast.success(selectedIds.length === 1 ? "Asignación eliminada" : "Asignaciones eliminadas");
    setSelectedIds([]);
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
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
                {client.status.toUpperCase()}
              </p>
              <h3 className="mt-1 text-xl font-bold text-foreground">{client.name}</h3>
            </div>
            <button
              type="button"
              onClick={() => openForm("client", { client })}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
            >
              Editar
            </button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Ingreso: {client.start_date ?? "—"} · Finalización: {client.end_date ?? "Activo"}
          </p>
          {client.notes ? (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">{client.notes}</p>
          ) : null}
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
          <div>
            <small className="text-[10px] tracking-wider text-muted-foreground">
              PAGO MENSUAL
            </small>
            <b className="block text-base text-foreground">
              {est.payment > 0 ? money(est.paymentOriginal, est.paymentCurrency) : "—"}
            </b>
            {est.payment > 0 && est.paymentCurrency === "USD" && (
              <small className="block text-[11px] text-muted-foreground">
                ≈ {money(est.payment)} a RD${num(usdRate)}
              </small>
            )}
          </div>
          <div>
            <small className="text-[10px] tracking-wider text-muted-foreground">
              SERVICIOS OFRECIDOS
            </small>
            <b className="block text-base text-foreground">
              {est.payment > 0 ? money(est.serviceCost) : "—"}
            </b>
          </div>
          <div>
            <small className="text-[10px] tracking-wider text-muted-foreground">
              GANANCIA ESTIMADA
            </small>
            <b
              className={`block text-base ${est.payment > 0 && est.estimatedProfit < 0 ? "text-destructive" : est.payment > 0 ? "text-success" : "text-foreground"}`}
            >
              {est.payment > 0 ? money(est.estimatedProfit) : "—"}
            </b>
          </div>
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
                onClick={() => openForm("assignment", { clientId: client.id })}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
              >
                + Asignar
              </button>
            </div>
          }
        >
          {selectMode && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-xs text-muted-foreground">
              {selectedIds.length > 0 ? (
                <>
                  <span className="font-semibold text-foreground">{selectedIds.length}</span>
                  <span>{selectedIds.length === 1 ? "seleccionado" : "seleccionados"}</span>
                  <button
                    type="button"
                    onClick={() =>
                      selectedAssignment &&
                      openForm("assignment", { clientId: client.id, assignment: selectedAssignment })
                    }
                    disabled={!selectedAssignment}
                    className="ml-auto rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={deleteAssignment}
                    disabled={deleting}
                    className="rounded-lg border border-destructive/40 px-3 py-1.5 font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                  >
                    {deleting ? "Eliminando…" : `Eliminar${selectedIds.length > 1 ? ` (${selectedIds.length})` : ""}`}
                  </button>
                </>
              ) : (
                <span>Marca uno para editarlo o varios para eliminarlos.</span>
              )}
            </div>
          )}
          <TableShell
            head={
              <tr>
                {selectMode && <th className="w-12 px-4 py-3" aria-label="Selección" />}
                <th className="px-4 py-3 font-semibold">Servicio</th>
                <th className="px-4 py-3 text-right font-semibold">Cantidad / mes</th>
                <th className="px-4 py-3 font-semibold">Proveedor</th>
                <th className="px-4 py-3 text-right font-semibold">Costo base</th>
              </tr>
            }
          >
            {assignments.length === 0 ? (
              <EmptyRow colSpan={selectMode ? 5 : 4} label="Sin asignaciones" />
            ) : (
              assignments.map((row) => (
                <tr
                  key={row.id}
                  onClick={
                    selectMode
                      ? () => toggleSelected(row.id)
                      : undefined
                  }
                  className={
                    selectMode
                      ? selectedIds.includes(row.id)
                        ? "cursor-pointer border-t border-border bg-primary/10"
                        : "cursor-pointer border-t border-border transition-colors hover:bg-secondary"
                      : "border-t border-border"
                  }
                >
                  {selectMode && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleSelected(row.id)}
                        onClick={(event) => event.stopPropagation()}
                        aria-label={`Seleccionar ${serviceName(row.service_id)}`}
                        className="size-5 cursor-pointer accent-primary"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-foreground">
                    {serviceName(row.service_id)}
                    {row.monthAdjusted && (
                      <span
                        className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-soft"
                        title="Este mes tiene valores distintos al habitual"
                      >
                        ajustado
                      </span>
                    )}
                  </td>
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

      </div>

      <Panel
        title="Movimientos del cliente"
        subtitle="Ingresos y gastos relacionados"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => openForm("expense", { clientId: client.id })}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
            >
              + Gasto
            </button>
            <button
              type="button"
              onClick={() => openForm("income", { clientId: client.id })}
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

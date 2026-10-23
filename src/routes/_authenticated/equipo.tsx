import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { assignmentProviders, money, monthOf, num, providerShare, toDop } from "@/lib/finance";
import { effectiveStatus, invoiceBalance, invoiceKind, obligationBalance } from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { supabase } from "@/integrations/supabase/client";
import { EmptyRow, Panel, SectionTitle, StatusBadge, TableShell } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/equipo")({
  head: () => ({
    meta: [
      { title: "Equipo y proveedores — Skyloop Control" },
      {
        name: "description",
        content:
          "Directorio de colaboradores de Skyloop con lo generado, lo pagado y lo pendiente en el mes.",
      },
      { property: "og:title", content: "Equipo y proveedores — Skyloop Control" },
      {
        property: "og:description",
        content: "Cuánto has generado y cuánto queda pendiente con cada colaborador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { data, month, monthClientServices, usdRate, openForm, providerName, refresh } =
    useSkyloop();
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const obligations = [...data.providerObligations].sort((a, b) =>
    a.status === b.status ? a.description.localeCompare(b.description) : a.status.localeCompare(b.status),
  );

  const selected =
    selectedIds.length === 1
      ? data.providers.find((provider) => provider.id === selectedIds[0]) ?? null
      : null;

  function toggleSelecting() {
    setSelecting((current) => !current);
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  async function handleDelete() {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      selectedIds.length === 1
        ? "¿Eliminar el proveedor seleccionado? Esta acción no se puede deshacer."
        : `¿Eliminar los ${selectedIds.length} proveedores seleccionados? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase.from("providers").delete().in("id", selectedIds);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar", { description: error.message });
      return;
    }
    toast.success(selectedIds.length === 1 ? "Proveedor eliminado" : "Proveedores eliminados");
    setSelectedIds([]);
    setSelecting(false);
    await refresh();
  }

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="Directorio de proveedores"
        description="Consulta cuánto has generado y cuánto está pendiente con cada colaborador."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelecting}
              className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              {selecting ? "Cancelar" : "Seleccionar"}
            </button>
            <button
              type="button"
              onClick={() => openForm("provider")}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              + Nuevo proveedor
            </button>
          </div>
        }
      />

      {selecting && (
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-panel">
          {selectedIds.length > 0 ? (
            <>
              <p className="text-sm text-foreground">
                <b>{selectedIds.length}</b> {selectedIds.length === 1 ? "seleccionado" : "seleccionados"}
              </p>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selected && openForm("provider", { provider: selected })}
                  disabled={!selected}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  {deleting ? "Eliminando…" : `Eliminar${selectedIds.length > 1 ? ` (${selectedIds.length})` : ""}`}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Marca uno para editarlo o varios para eliminarlos.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.providers.map((provider) => {
          const total = monthClientServices
            .filter((row) => assignmentProviders(row).includes(provider.id) && row.active)
            .reduce((sum, row) => sum + providerShare(row, provider.id), 0);
          const vendorInvoices = data.invoices.filter(
            (invoice) =>
              invoiceKind(invoice) === "vendor" &&
              invoice.vendor_id === provider.id &&
              monthOf(invoice.issue_date) === month &&
              effectiveStatus(invoice) !== "Cancelada",
          );
          const paid = vendorInvoices.reduce(
            (sum, invoice) => sum + toDop(invoice.amount_paid, invoice.currency, usdRate),
            0,
          );
          let pending = vendorInvoices.reduce(
            (sum, invoice) => sum + toDop(invoiceBalance(invoice), invoice.currency, usdRate),
            0,
          );
          if (vendorInvoices.length === 0) {
            const clientsPaidInMonth = new Set(
              data.invoices
                .filter(
                  (invoice) =>
                    invoiceKind(invoice) === "client" &&
                    effectiveStatus(invoice) !== "Cancelada" &&
                    num(invoice.amount_paid) > 0 &&
                    monthOf(invoice.issue_date) === month,
                )
                .map((invoice) => invoice.client_id),
            );
            pending += monthClientServices
              .filter(
                (row) =>
                  assignmentProviders(row).includes(provider.id) &&
                  row.active &&
                  row.client_id !== null &&
                  clientsPaidInMonth.has(row.client_id),
              )
              .reduce((sum, row) => sum + providerShare(row, provider.id), 0);
          }
          const isSelected = selecting && selectedIds.includes(provider.id);
          return (
            <article
              key={provider.id}
              onClick={selecting ? () => toggleSelected(provider.id) : undefined}
              className={`rounded-2xl border bg-card p-5 shadow-panel transition-colors ${
                selecting ? "cursor-pointer" : ""
              } ${isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
            >
              <div className="flex items-center gap-3">
                {selecting && (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(provider.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Seleccionar ${provider.name}`}
                    className="size-5 shrink-0 cursor-pointer accent-primary"
                  />
                )}
                <h3 className="min-w-0 flex-1 truncate text-base font-bold text-foreground">
                  {provider.name}
                </h3>
                <StatusBadge status={provider.status} />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{provider.specialty}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <small className="block text-muted-foreground">Generado</small>
                  <b className="text-foreground">{money(total)}</b>
                </div>
                <div>
                  <small className="block text-muted-foreground">Pagado</small>
                  <b className="text-foreground">{money(paid)}</b>
                </div>
                <div>
                  <small className="block text-muted-foreground">Pendiente</small>
                  <b className="text-warning">{money(pending)}</b>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Panel
        title="Servicios y obligaciones de proveedores"
        subtitle="Los servicios pendientes aparecen al crear un documento de gasto de proveedor"
        action={
          <button
            type="button"
            onClick={() => openForm("obligation")}
            className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            + Servicio pendiente
          </button>
        }
      >
        <TableShell
          head={
            <tr>
              <th className="px-4 py-3 font-semibold">Proveedor</th>
              <th className="px-4 py-3 font-semibold">Servicio</th>
              <th className="px-4 py-3 text-right font-semibold">Monto</th>
              <th className="px-4 py-3 text-right font-semibold">Pagado</th>
              <th className="px-4 py-3 text-right font-semibold">Pendiente</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          }
        >
          {obligations.length === 0 ? (
            <EmptyRow colSpan={6} label="Aún no hay servicios de proveedores registrados" />
          ) : (
            obligations.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold text-foreground">
                  {assignmentProviders(row).map(providerName).join(", ") || "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
                <td className="px-4 py-3 text-right text-foreground">
                  {money(row.amount, row.currency)}
                </td>
                <td className="px-4 py-3 text-right text-success">
                  {money(num(row.amount_paid), row.currency)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-warning">
                  {money(obligationBalance(row), row.currency)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>
    </div>
  );
}

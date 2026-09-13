import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { money, num } from "@/lib/finance";
import { effectiveStatus, formatLongDate, INVOICE_STATUSES } from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { KpiCard, EmptyRow, Panel, TableShell } from "@/components/skyloop/ui";
import { InvoiceStatusBadge } from "@/components/skyloop/InvoiceStatusBadge";

export const Route = createFileRoute("/_authenticated/facturas/")({
  head: () => ({
    meta: [
      { title: "Facturas — Skyloop Control" },
      {
        name: "description",
        content:
          "Administra las facturas de la agencia: emisión, cobros, saldos pendientes y facturas vencidas.",
      },
      { property: "og:title", content: "Facturas — Skyloop Control" },
      {
        property: "og:description",
        content: "Facturación de clientes con pagos, saldos y estados en tiempo real.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoicesPage,
});

const inputClass =
  "rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

function InvoicesPage() {
  const { data, clientName, usdRate } = useSkyloop();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todas");
  const [client, setClient] = useState("todos");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [dueBefore, setDueBefore] = useState("");

  const rows = useMemo(() => {
    return data.invoices
      .map((invoice) => ({
        invoice,
        status: effectiveStatus(invoice),
        client: clientName(invoice.client_id),
      }))
      .filter((row) => {
        if (status !== "todas" && row.status !== status) return false;
        if (client !== "todos" && row.invoice.client_id !== client) return false;
        if (from && row.invoice.issue_date < from) return false;
        if (to && row.invoice.issue_date > to) return false;
        if (dueBefore && (!row.invoice.due_date || row.invoice.due_date > dueBefore)) return false;
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return [
          row.invoice.invoice_number,
          row.client,
          row.invoice.subject ?? "",
          row.invoice.order_number ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }, [data.invoices, clientName, status, client, from, to, dueBefore, search]);

  const totals = useMemo(() => {
    const dop = (invoice: (typeof data.invoices)[number], value: unknown) =>
      invoice.currency === "USD" ? num(value) * usdRate : num(value);
    const active = data.invoices.filter(
      (invoice) => invoice.status !== "Borrador" && invoice.status !== "Cancelada",
    );
    const billed = active.reduce((sum, invoice) => sum + dop(invoice, invoice.total), 0);
    const paid = active.reduce((sum, invoice) => sum + dop(invoice, invoice.amount_paid), 0);
    const overdueInvoices = active.filter((invoice) => effectiveStatus(invoice) === "Vencida");
    const overdue = overdueInvoices.reduce(
      (sum, invoice) => sum + dop(invoice, num(invoice.total) - num(invoice.amount_paid)),
      0,
    );
    return {
      billed,
      paid,
      pending: Math.max(billed - paid, 0),
      overdue,
      count: active.length,
      overdueCount: overdueInvoices.length,
      paidCount: active.filter((invoice) => effectiveStatus(invoice) === "Pagada").length,
    };
  }, [data.invoices, usdRate]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-foreground">Facturas</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {rows.length} de {data.invoices.length} facturas
          </p>
        </div>
        <Link
          to="/facturas/nueva"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          + Nueva factura
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total facturado"
          value={money(totals.billed)}
          footnote={`${totals.count} facturas emitidas`}
          icon="◫"
        />
        <KpiCard
          label="Pendiente de cobro"
          value={money(totals.pending)}
          footnote="Saldo por cobrar"
          icon="◷"
        />
        <KpiCard
          label="Pagado"
          value={money(totals.paid)}
          footnote={`${totals.paidCount} facturas pagadas`}
          icon="✓"
        />
        <KpiCard
          label="Facturas vencidas"
          value={money(totals.overdue)}
          footnote={`${totals.overdueCount} vencidas`}
          icon="!"
        />
      </div>

      <Panel title="Filtros">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar factura, cliente o número…"
            className={`${inputClass} xl:col-span-2`}
          />
          <select value={status} onChange={(event) => setStatus(event.target.value)} className={inputClass}>
            <option value="todas">Todos los estados</option>
            {INVOICE_STATUSES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
          <select value={client} onChange={(event) => setClient(event.target.value)} className={inputClass}>
            <option value="todos">Todos los clientes</option>
            {data.clients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className={inputClass}
            aria-label="Desde"
          />
          <input
            type="date"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className={inputClass}
            aria-label="Hasta"
          />
          <input
            type="date"
            value={dueBefore}
            onChange={(event) => setDueBefore(event.target.value)}
            className={inputClass}
            aria-label="Vence antes de"
          />
          <div className="flex flex-wrap gap-2 xl:col-span-5">
            {[
              { label: "Pagadas", value: "Pagada" },
              { label: "Pendientes", value: "Pendiente" },
              { label: "Vencidas", value: "Vencida" },
              { label: "Parciales", value: "Parcialmente pagada" },
              { label: "Todas", value: "todas" },
            ].map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setStatus(chip.value)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-colors ${
                  status === chip.value
                    ? "border-primary bg-primary/15 text-primary-soft"
                    : "border-border text-muted-foreground hover:bg-secondary"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>
      </Panel>

      <TableShell
        head={
          <tr>
            <th className="px-4 py-3 font-semibold">Número</th>
            <th className="px-4 py-3 font-semibold">Cliente</th>
            <th className="px-4 py-3 font-semibold">Fecha</th>
            <th className="px-4 py-3 font-semibold">Vencimiento</th>
            <th className="px-4 py-3 font-semibold">Concepto</th>
            <th className="px-4 py-3 text-right font-semibold">Total</th>
            <th className="px-4 py-3 text-right font-semibold">Pagado</th>
            <th className="px-4 py-3 text-right font-semibold">Saldo</th>
            <th className="px-4 py-3 font-semibold">Estado</th>
            <th className="px-4 py-3 font-semibold">Acciones</th>
          </tr>
        }
      >
        {rows.length === 0 ? (
          <EmptyRow colSpan={10} label="No hay facturas con estos filtros" />
        ) : (
          rows.map(({ invoice, status: rowStatus, client: rowClient }) => (
            <tr key={invoice.id} className="border-t border-border transition-colors hover:bg-secondary/40">
              <td className="px-4 py-3 font-bold text-foreground">
                <Link to="/facturas/$invoiceId" params={{ invoiceId: invoice.id }}>
                  {invoice.invoice_number}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{rowClient}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatLongDate(invoice.issue_date)}</td>
              <td className="px-4 py-3 text-muted-foreground">{formatLongDate(invoice.due_date)}</td>
              <td className="px-4 py-3 text-muted-foreground">{invoice.subject ?? "—"}</td>
              <td className="px-4 py-3 text-right font-bold text-foreground">
                {money(invoice.total, invoice.currency)}
              </td>
              <td className="px-4 py-3 text-right text-success">
                {money(invoice.amount_paid, invoice.currency)}
              </td>
              <td className="px-4 py-3 text-right font-semibold text-foreground">
                {money(Math.max(num(invoice.total) - num(invoice.amount_paid), 0), invoice.currency)}
              </td>
              <td className="px-4 py-3">
                <InvoiceStatusBadge status={rowStatus} />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <Link
                    to="/facturas/$invoiceId"
                    params={{ invoiceId: invoice.id }}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
                  >
                    Ver
                  </Link>
                  <Link
                    to="/facturas/editar/$invoiceId"
                    params={{ invoiceId: invoice.id }}
                    className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-foreground transition-colors hover:bg-secondary"
                  >
                    Editar
                  </Link>
                </div>
              </td>
            </tr>
          ))
        )}
      </TableShell>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { incomeToMovement, money, sumDop } from "@/lib/finance";
import {
  effectiveStatus,
  formatLongDate,
  invoiceBalance,
  invoiceLedger,
} from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { InvoiceStatusBadge } from "@/components/skyloop/InvoiceStatusBadge";
import { EmptyRow, KpiCard, MovementTable, Panel, TableShell } from "@/components/skyloop/ui";

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
  const ledger = invoiceLedger(data.invoices, usdRate);
  const pending = data.incomes
    .filter((row) => row.status !== "Cobrado")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Pendiente por cobrar"
          value={money(sumDop(pending, usdRate))}
          footnote={`${pending.length} registros abiertos`}
          icon="◷"
        />
        <KpiCard
          label="Facturas por cobrar"
          value={money(ledger.receivable)}
          footnote={`${ledger.incomeOpen.length} facturas de clientes con saldo`}
          icon="◫"
        />
        <KpiCard
          label="Cobrado en facturas"
          value={money(ledger.incomePaid)}
          footnote="Pagos recibidos registrados"
          icon="✓"
        />
      </div>
      <MovementTable rows={pending.map(incomeToMovement)} clientName={clientName} />

      <Panel
        title="Facturas de clientes pendientes de cobro"
        subtitle="Saldos por cobrar generados por el módulo de Facturas"
      >
        <TableShell
          head={
            <tr>
              <th className="px-4 py-3 font-semibold">Número</th>
              <th className="px-4 py-3 font-semibold">Cliente</th>
              <th className="px-4 py-3 font-semibold">Vencimiento</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Pagado</th>
              <th className="px-4 py-3 text-right font-semibold">Saldo</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          }
        >
          {ledger.incomeOpen.length === 0 ? (
            <EmptyRow colSpan={7} label="No hay facturas de clientes con saldo pendiente" />
          ) : (
            ledger.incomeOpen.map((invoice) => (
              <tr key={invoice.id} className="border-t border-border">
                <td className="px-4 py-3 font-bold text-foreground">
                  <Link to="/facturas/$invoiceId" params={{ invoiceId: invoice.id }}>
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{clientName(invoice.client_id)}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {formatLongDate(invoice.due_date)}
                </td>
                <td className="px-4 py-3 text-right text-foreground">
                  {money(invoice.total, invoice.currency)}
                </td>
                <td className="px-4 py-3 text-right text-success">
                  {money(invoice.amount_paid, invoice.currency)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-warning">
                  {money(invoiceBalance(invoice), invoice.currency)}
                </td>
                <td className="px-4 py-3">
                  <InvoiceStatusBadge status={effectiveStatus(invoice)} />
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>

    </div>
  );
}

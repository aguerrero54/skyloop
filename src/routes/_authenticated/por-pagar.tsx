import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { expenseToMovement, money, sumDop } from "@/lib/finance";
import {
  effectiveStatus,
  formatLongDate,
  invoiceBalance,
  invoiceLedger,
} from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { InvoiceStatusBadge } from "@/components/skyloop/InvoiceStatusBadge";
import { EmptyRow, KpiCard, MovementTable, Panel, TableShell } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/por-pagar")({
  head: () => ({
    meta: [
      { title: "Cuentas por pagar — Skyloop Control" },
      {
        name: "description",
        content:
          "Compromisos pendientes con proveedores y colaboradores, ordenados por fecha de vencimiento.",
      },
      { property: "og:title", content: "Cuentas por pagar — Skyloop Control" },
      {
        property: "og:description",
        content: "Obligaciones pendientes con el equipo y proveedores de la agencia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PayablesPage,
});

function PayablesPage() {
  const { data, usdRate, clientName, providerName } = useSkyloop();
  const ledger = invoiceLedger(data.invoices, usdRate);
  const pending = data.expenses
    .filter((row) => row.status !== "Pagado")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  const byProvider = data.providers
    .map((provider) => ({
      provider,
      total: sumDop(
        pending.filter((row) => row.provider_id === provider.id),
        usdRate,
      ),
    }))
    .filter((row) => row.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 3);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Pendiente por pagar"
          value={money(sumDop(pending, usdRate))}
          footnote={`${pending.length} compromisos`}
          icon="◴"
        />
        <KpiCard
          label="Facturas por pagar"
          value={money(ledger.payable)}
          footnote={`${ledger.expenseOpen.length} documentos de proveedores con saldo`}
          icon="◨"
        />
        {byProvider.slice(0, 2).map((row) => (
          <KpiCard
            key={row.provider.id}
            label={row.provider.name}
            value={money(row.total)}
            footnote="Pendiente registrado"
            icon="♙"
          />
        ))}
      </div>
      <MovementTable rows={pending.map(expenseToMovement)} clientName={clientName} />

      <Panel
        title="Documentos de proveedores pendientes de pago"
        subtitle="Saldos por pagar generados por el módulo de Facturas"
      >
        <TableShell
          head={
            <tr>
              <th className="px-4 py-3 font-semibold">Número</th>
              <th className="px-4 py-3 font-semibold">Proveedor</th>
              <th className="px-4 py-3 font-semibold">Vencimiento</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-right font-semibold">Pagado</th>
              <th className="px-4 py-3 text-right font-semibold">Saldo</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          }
        >
          {ledger.expenseOpen.length === 0 ? (
            <EmptyRow colSpan={7} label="No hay documentos de proveedores con saldo pendiente" />
          ) : (
            ledger.expenseOpen.map((invoice) => (
              <tr key={invoice.id} className="border-t border-border">
                <td className="px-4 py-3 font-bold text-foreground">
                  <Link to="/facturas/$invoiceId" params={{ invoiceId: invoice.id }}>
                    {invoice.invoice_number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{providerName(invoice.vendor_id)}</td>
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

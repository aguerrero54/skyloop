import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { money, num } from "@/lib/finance";
import { supabase } from "@/integrations/supabase/client";
import { deletePayment, duplicateInvoice, issueInvoice, setInvoiceStatus } from "@/lib/invoice-actions";
import { downloadInvoicePdf } from "@/lib/invoice-pdf";
import { effectiveStatus, formatLongDate, itemAmount } from "@/lib/invoices";
import type { InvoiceAttachment } from "@/lib/invoice-actions";
import { useSkyloop } from "@/lib/skyloop-context";
import { EmptyRow, Panel, TableShell } from "@/components/skyloop/ui";
import { InvoiceStatusBadge } from "@/components/skyloop/InvoiceStatusBadge";
import { InvoicePaymentModal } from "@/components/skyloop/InvoicePaymentModal";

export const Route = createFileRoute("/_authenticated/facturas/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Detalle de factura — Skyloop Control" },
      {
        name: "description",
        content: "Detalle de la factura: montos, impuestos, pagos registrados y saldo pendiente.",
      },
      { property: "og:title", content: "Detalle de factura — Skyloop Control" },
      {
        property: "og:description",
        content: "Consulta pagos, saldo pendiente y descarga el PDF de la factura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InvoiceDetailPage,
});

const actionClass =
  "rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary";

function InvoiceDetailPage() {
  const { invoiceId } = Route.useParams();
  const { data, clientName, providerName, refresh } = useSkyloop();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [busy, setBusy] = useState(false);

  const invoice = data.invoices.find((row) => row.id === invoiceId);

  if (!invoice) {
    return (
      <Panel title="Factura no encontrada">
        <Link to="/facturas" className="text-sm font-bold text-primary-soft">
          Volver a facturas
        </Link>
      </Panel>
    );
  }

  const items = data.invoiceItems
    .filter((item) => item.invoice_id === invoice.id)
    .sort((a, b) => a.position - b.position);
  const payments = data.invoicePayments
    .filter((payment) => payment.invoice_id === invoice.id)
    .sort((a, b) => a.payment_date.localeCompare(b.payment_date));
  const client = data.clients.find((row) => row.id === invoice.client_id) ?? null;
  const status = effectiveStatus(invoice);
  const balance = Math.max(num(invoice.total) - num(invoice.amount_paid), 0);
  const attachments = (invoice.attachments as InvoiceAttachment[] | null) ?? [];

  async function run(label: string, action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      await refresh();
      toast.success(label);
    } catch (error) {
      toast.error("No se pudo completar la acción", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setBusy(false);
    }
  }

  async function openAttachment(file: InvoiceAttachment) {
    const { data: signed, error } = await supabase.storage
      .from("invoice-attachments")
      .createSignedUrl(file.path, 60);
    if (error || !signed) {
      toast.error("No se pudo abrir el archivo");
      return;
    }
    window.open(signed.signedUrl, "_blank", "noopener");
  }

  function sendByEmail() {
    const to = client?.email ?? "";
    const subject = `Factura ${invoice.invoice_number} — Skyloop Agency`;
    const body = [
      `Estimado equipo de ${client?.name ?? "cliente"},`,
      "",
      `Adjuntamos la factura ${invoice.invoice_number} por ${money(invoice.total, invoice.currency)}.`,
      `Fecha de vencimiento: ${formatLongDate(invoice.due_date)}.`,
      `Saldo adeudado: ${money(balance, invoice.currency)}.`,
      "",
      "Gracias por su confianza.",
      "Skyloop Agency",
    ].join("\n");
    window.location.href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link to="/facturas" className="text-xs font-bold text-primary-soft">
            ← Facturas
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h3 className="text-2xl font-extrabold text-foreground">{invoice.invoice_number}</h3>
            <InvoiceStatusBadge status={status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {clientName(invoice.client_id)} · {formatLongDate(invoice.issue_date)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link to="/facturas/editar/$invoiceId" params={{ invoiceId }} className={actionClass}>
            Editar
          </Link>
          <button
            type="button"
            disabled={busy}
            className={actionClass}
            onClick={() =>
              void run("Factura duplicada", async () => {
                const id = await duplicateInvoice(
                  invoice,
                  items.map((item) => ({
                    description: item.description,
                    quantity: num(item.quantity),
                    rate: num(item.rate),
                    tax: num(item.tax),
                  })),
                );
                navigate({ to: "/facturas/editar/$invoiceId", params: { invoiceId: id } });
              })
            }
          >
            Duplicar
          </button>
          {status === "Borrador" && (
            <button
              type="button"
              disabled={busy}
              className={actionClass}
              onClick={() => void run("Factura emitida", () => issueInvoice(invoice))}
            >
              Emitir factura
            </button>
          )}
          <button type="button" className={actionClass} onClick={sendByEmail}>
            Enviar por correo
          </button>
          <button
            type="button"
            className={actionClass}
            onClick={() => downloadInvoicePdf({ invoice, items, client })}
          >
            Descargar PDF
          </button>
          {status !== "Cancelada" && (
            <button
              type="button"
              disabled={busy}
              className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10"
              onClick={() => {
                if (!window.confirm("¿Anular esta factura? El saldo dejará de contar como cobrable."))
                  return;
                void run("Factura cancelada", () => setInvoiceStatus(invoice, "Cancelada"));
              }}
            >
              Cancelar factura
            </button>
          )}
          {status !== "Pagada" && status !== "Cancelada" && (
            <button
              type="button"
              onClick={() => setPaying(true)}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              Registrar pago
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Resumen" className="lg:col-span-2">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Cliente" value={clientName(invoice.client_id)} />
            <Field label="Vendedor" value={invoice.seller_id ? providerName(invoice.seller_id) : "—"} />
            <Field label="Fecha de emisión" value={formatLongDate(invoice.issue_date)} />
            <Field label="Fecha de vencimiento" value={formatLongDate(invoice.due_date)} />
            <Field label="Términos" value={invoice.payment_terms} />
            <Field label="Número de orden" value={invoice.order_number ?? "—"} />
            <Field label="Asunto" value={invoice.subject ?? "—"} />
            <Field label="Moneda" value={invoice.currency} />
          </div>
        </Panel>

        <Panel title="Montos">
          <div className="grid gap-2.5 text-sm">
            <Line label="Subtotal" value={money(invoice.subtotal, invoice.currency)} />
            <Line
              label={`Descuento${invoice.discount_type === "percent" ? ` (${num(invoice.discount)}%)` : ""}`}
              value={money(
                invoice.discount_type === "percent"
                  ? (num(invoice.subtotal) * num(invoice.discount)) / 100
                  : num(invoice.discount),
                invoice.currency,
              )}
            />
            <Line label="Impuestos" value={money(invoice.tax, invoice.currency)} />
            <Line label="Cargos de envío" value={money(invoice.shipping, invoice.currency)} />
            <Line label="Ajuste" value={money(invoice.adjustment, invoice.currency)} />
            <div className="flex justify-between border-t border-border pt-2.5">
              <strong className="text-foreground">Total</strong>
              <strong className="text-lg font-extrabold text-foreground">
                {money(invoice.total, invoice.currency)}
              </strong>
            </div>
            <Line label="Monto pagado" value={money(invoice.amount_paid, invoice.currency)} />
            <div className="flex justify-between rounded-lg bg-surface-raised px-3 py-2">
              <strong className="text-foreground">Saldo pendiente</strong>
              <strong className={balance > 0 ? "text-warning" : "text-success"}>
                {money(balance, invoice.currency)}
              </strong>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Detalle de artículos">
        <TableShell
          head={
            <tr>
              <th className="px-4 py-3 font-semibold">#</th>
              <th className="px-4 py-3 font-semibold">Artículo & Descripción</th>
              <th className="px-4 py-3 text-right font-semibold">Cant.</th>
              <th className="px-4 py-3 text-right font-semibold">Tarifa</th>
              <th className="px-4 py-3 text-right font-semibold">Impuesto</th>
              <th className="px-4 py-3 text-right font-semibold">Importe</th>
            </tr>
          }
        >
          {items.length === 0 ? (
            <EmptyRow colSpan={6} label="Esta factura no tiene artículos" />
          ) : (
            items.map((item, index) => (
              <tr key={item.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3 font-semibold text-foreground">{item.description}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">{num(item.quantity)}</td>
                <td className="px-4 py-3 text-right text-muted-foreground">
                  {money(item.rate, invoice.currency)}
                </td>
                <td className="px-4 py-3 text-right text-muted-foreground">{num(item.tax)}%</td>
                <td className="px-4 py-3 text-right font-bold text-foreground">
                  {money(itemAmount(item.quantity, item.rate), invoice.currency)}
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>

      <Panel title="Historial de pagos" subtitle={`${payments.length} pagos registrados`}>
        <TableShell
          head={
            <tr>
              <th className="px-4 py-3 font-semibold">Fecha</th>
              <th className="px-4 py-3 font-semibold">Método</th>
              <th className="px-4 py-3 font-semibold">Referencia</th>
              <th className="px-4 py-3 font-semibold">Nota</th>
              <th className="px-4 py-3 text-right font-semibold">Monto</th>
              <th className="px-4 py-3" />
            </tr>
          }
        >
          {payments.length === 0 ? (
            <EmptyRow colSpan={6} label="Aún no se registran pagos" />
          ) : (
            payments.map((payment) => (
              <tr key={payment.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">
                  {formatLongDate(payment.payment_date)}
                </td>
                <td className="px-4 py-3 text-foreground">{payment.payment_method}</td>
                <td className="px-4 py-3 text-muted-foreground">{payment.reference ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{payment.notes ?? "—"}</td>
                <td className="px-4 py-3 text-right font-bold text-success">
                  {money(payment.amount, invoice.currency)}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm("¿Eliminar este pago?")) return;
                      void run("Pago eliminado", () => deletePayment(payment.id));
                    }}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                    aria-label="Eliminar pago"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Notas del cliente">
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {invoice.notes ?? "Sin notas"}
          </p>
        </Panel>
        <Panel title="Términos y condiciones">
          <p className="whitespace-pre-line text-sm text-muted-foreground">
            {invoice.terms ?? "Sin términos"}
          </p>
        </Panel>
      </div>

      {attachments.length > 0 && (
        <Panel title="Archivos adjuntos">
          <ul className="grid gap-2">
            {attachments.map((file) => (
              <li key={file.path}>
                <button
                  type="button"
                  onClick={() => void openAttachment(file)}
                  className="text-sm font-bold text-primary-soft"
                >
                  {file.name}
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {paying && <InvoicePaymentModal invoice={invoice} onClose={() => setPaying(false)} />}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-raised px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}

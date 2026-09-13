import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";

import { effectiveStatus } from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { InvoiceForm } from "@/components/skyloop/InvoiceForm";
import { Panel } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/facturas/editar/$invoiceId")({
  head: () => ({
    meta: [
      { title: "Editar factura — Skyloop Control" },
      {
        name: "description",
        content: "Edita los artículos, montos y términos de una factura existente.",
      },
      { property: "og:title", content: "Editar factura — Skyloop Control" },
      {
        property: "og:description",
        content: "Ajusta una factura de la agencia antes o después de emitirla.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EditInvoicePage,
});

function EditInvoicePage() {
  const { invoiceId } = Route.useParams();
  const { data } = useSkyloop();
  const [confirmed, setConfirmed] = useState(false);
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

  const status = effectiveStatus(invoice);
  if (status === "Pagada" && !confirmed) {
    return (
      <Panel
        title="Esta factura ya está pagada"
        subtitle="Editar una factura pagada puede alterar los saldos ya cobrados. Confirma para continuar."
      >
        <div className="flex flex-wrap gap-2">
          <Link
            to="/facturas/$invoiceId"
            params={{ invoiceId }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            Cancelar
          </Link>
          <button
            type="button"
            onClick={() => setConfirmed(true)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Sí, editar de todas formas
          </button>
        </div>
      </Panel>
    );
  }

  return (
    <InvoiceForm
      invoice={invoice}
      existingItems={data.invoiceItems.filter((item) => item.invoice_id === invoice.id)}
    />
  );
}

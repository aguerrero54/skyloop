import { createFileRoute } from "@tanstack/react-router";

import { InvoiceForm } from "@/components/skyloop/InvoiceForm";

export const Route = createFileRoute("/_authenticated/facturas/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva factura — Skyloop Control" },
      {
        name: "description",
        content: "Crea una factura con artículos, impuestos, descuentos y términos de pago.",
      },
      { property: "og:title", content: "Nueva factura — Skyloop Control" },
      {
        property: "og:description",
        content: "Emisión de facturas profesionales para los clientes de la agencia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewInvoicePage,
});

function NewInvoicePage() {
  return <InvoiceForm />;
}

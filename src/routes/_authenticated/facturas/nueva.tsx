import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { InvoiceForm } from "@/components/skyloop/InvoiceForm";
import type { InvoiceKind } from "@/lib/invoices";

export const Route = createFileRoute("/_authenticated/facturas/nueva")({
  head: () => ({
    meta: [
      { title: "Nueva factura — Skyloop Control" },
      {
        name: "description",
        content:
          "Crea una factura de cliente (ingreso) o registra un documento de proveedor (gasto).",
      },
      { property: "og:title", content: "Nueva factura — Skyloop Control" },
      {
        property: "og:description",
        content: "Emisión de facturas de clientes y registro de gastos de proveedores.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewInvoicePage,
});

const OPTIONS: {
  kind: InvoiceKind;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
}[] = [
  {
    kind: "client",
    icon: "👤",
    title: "Cliente",
    subtitle: "Registrar un ingreso",
    description:
      "Crea una factura para un cliente y registra el monto como ingreso para la empresa.",
  },
  {
    kind: "vendor",
    icon: "🏢",
    title: "Proveedor",
    subtitle: "Registrar un gasto",
    description:
      "Registra una factura, servicio o compra de un proveedor y registra el monto como gasto para la empresa.",
  },
];

function NewInvoicePage() {
  const navigate = useNavigate();
  const [kind, setKind] = useState<InvoiceKind | null>(null);
  const [choice, setChoice] = useState<InvoiceKind>("client");

  if (kind) return <InvoiceForm kind={kind} />;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl">
        <h3 className="text-center text-lg font-bold text-foreground">
          ¿Qué tipo de factura deseas crear?
        </h3>


        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {OPTIONS.map((option) => (
            <button
              key={option.kind}
              type="button"
              onClick={() => setChoice(option.kind)}
              onDoubleClick={() => setKind(option.kind)}
              aria-pressed={choice === option.kind}
              className={`rounded-xl border p-4 text-left transition-colors ${
                choice === option.kind
                  ? "border-primary bg-primary/10"
                  : "border-border hover:bg-secondary"
              }`}
            >
              <span className="text-2xl" aria-hidden="true">
                {option.icon}
              </span>
              <p className="mt-2 text-base font-bold text-foreground">{option.title}</p>
              <p className="text-sm font-semibold text-primary-soft">{option.subtitle}</p>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate({ to: "/facturas" })}
            className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => setKind(choice)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}

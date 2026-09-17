import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { clientMetrics, estimatedMetrics, monthLabel, money } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { ProgressBar, SectionTitle, StatusBadge } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — Skyloop Control" },
      {
        name: "description",
        content:
          "Cartera de marcas de Skyloop con ingresos, costos, ganancia y margen de cada cliente en el mes.",
      },
      { property: "og:title", content: "Clientes — Skyloop Control" },
      {
        property: "og:description",
        content: "Rentabilidad por marca: ingresos, costos y margen de cada cliente.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const { data, month, monthIncomes, monthExpenses, monthClientServices, usdRate, openForm } = useSkyloop();
  const [search, setSearch] = useState("");

  const clients = data.clients.filter((client) =>
    client.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <SectionTitle
        title="Cartera de marcas"
        description="Cada tarjeta muestra el desempeño del mes seleccionado."
        action={
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar cliente…"
              className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
            />
            <button
              type="button"
              onClick={() => openForm("client")}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              + Nuevo cliente
            </button>
          </div>
        }
      />

      {clients.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No hay clientes</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {clients.map((client) => {
            const metrics = clientMetrics(client.id, monthIncomes, monthExpenses, usdRate);
            const est = estimatedMetrics(client, monthClientServices, usdRate);
            return (
              <Link
                key={client.id}
                to="/clientes/$clientId"
                params={{ clientId: client.id }}
                className="rounded-2xl border border-border bg-card p-5 shadow-panel transition-colors hover:border-primary/50"
              >
                <div className="flex items-center justify-end">
                  <StatusBadge status={client.status} />
                </div>
                <h3 className="mt-4 text-base font-bold text-foreground">{client.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {client.country || "Sin ubicación"} · {monthLabel(month)}
                </p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <small className="block text-muted-foreground">Ingresos</small>
                    <b className="text-foreground">{money(metrics.revenue)}</b>
                  </div>
                  <div>
                    <small className="block text-muted-foreground">Gastos</small>
                    <b className="text-foreground">{money(metrics.costs)}</b>
                  </div>
                  <div>
                    <small className="block text-muted-foreground">Ganancia</small>
                    <b className={metrics.profit >= 0 ? "text-success" : "text-destructive"}>
                      {money(metrics.profit)}
                    </b>
                  </div>
                </div>
                {est.payment > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-border bg-surface-raised p-3 text-xs">
                    <div>
                      <small className="block text-muted-foreground">Pago mensual</small>
                      <b className="text-foreground">
                        {money(est.paymentOriginal, est.paymentCurrency)}
                      </b>
                    </div>
                    <div>
                      <small className="block text-muted-foreground">
                        {est.paymentCurrency === "USD" ? "Pago mensual en pesos" : "Ganancia estimada"}
                      </small>
                      <b
                        className={
                          est.paymentCurrency === "USD" || est.estimatedProfit >= 0
                            ? "text-success"
                            : "text-destructive"
                        }
                      >
                        {money(
                          est.paymentCurrency === "USD" ? est.payment : est.estimatedProfit,
                        )}
                      </b>
                    </div>
                  </div>
                )}
                <div className="mt-4">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="text-muted-foreground">Margen</span>
                    <b className="text-foreground">{metrics.margin.toFixed(1)}%</b>
                  </div>
                  <ProgressBar percent={metrics.margin} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

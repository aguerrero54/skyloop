import { createFileRoute } from "@tanstack/react-router";

import { money, num } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { SectionTitle, StatusBadge } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/servicios")({
  head: () => ({
    meta: [
      { title: "Servicios — Skyloop Control" },
      {
        name: "description",
        content:
          "Catálogo de servicios de Skyloop con precio sugerido, costo estimado y margen de cada uno.",
      },
      { property: "og:title", content: "Servicios — Skyloop Control" },
      {
        property: "og:description",
        content: "Precio, costo y margen de cada servicio que ofrece la agencia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data, openForm } = useSkyloop();

  return (
    <div>
      <SectionTitle
        title="Catálogo de servicios"
        description="Precio, costo estimado y margen de cada servicio."
        action={
          <button
            type="button"
            onClick={() => openForm("service")}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            + Nuevo servicio
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.services.map((service) => {
          const price = num(service.suggested_price);
          const cost = num(service.estimated_cost);
          const margin = price ? ((price - cost) / price) * 100 : 0;
          return (
            <article
              key={service.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-foreground">
                  ◇
                </span>
                <StatusBadge status={service.status} />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">{service.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{service.category}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <small className="block text-muted-foreground">Precio</small>
                  <b className="text-foreground">{money(price)}</b>
                </div>
                <div>
                  <small className="block text-muted-foreground">Costo</small>
                  <b className="text-foreground">{money(cost)}</b>
                </div>
                <div>
                  <small className="block text-muted-foreground">Margen</small>
                  <b className="text-foreground">{margin.toFixed(0)}%</b>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

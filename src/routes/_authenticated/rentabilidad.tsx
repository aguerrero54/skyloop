import { createFileRoute } from "@tanstack/react-router";

import { SectionTitle } from "@/components/skyloop/ui";
import { ProfitTable } from "@/components/skyloop/ProfitTable";

export const Route = createFileRoute("/_authenticated/rentabilidad")({
  head: () => ({
    meta: [
      { title: "Rentabilidad por cliente — Skyloop Control" },
      {
        name: "description",
        content:
          "Qué clientes dejan dinero: facturación menos costos directos y margen real de cada marca.",
      },
      { property: "og:title", content: "Rentabilidad por cliente — Skyloop Control" },
      {
        property: "og:description",
        content: "Margen real de cada marca después de costos directos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ProfitPage,
});

function ProfitPage() {
  return (
    <div>
      <SectionTitle
        title="¿Qué clientes realmente te dejan dinero?"
        description="Facturación menos los costos directos asociados a cada marca."
      />
      <ProfitTable />
    </div>
  );
}

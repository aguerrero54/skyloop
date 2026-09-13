import { createFileRoute } from "@tanstack/react-router";

import { expenseToMovement, money, sumDop } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { KpiCard, MovementTable } from "@/components/skyloop/ui";

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
  const { data, usdRate, clientName } = useSkyloop();
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
        {byProvider.map((row) => (
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
    </div>
  );
}

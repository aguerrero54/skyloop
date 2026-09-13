import { createFileRoute } from "@tanstack/react-router";

import { money, num, sumDop } from "@/lib/finance";
import { obligationBalance } from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { EmptyRow, Panel, SectionTitle, StatusBadge, TableShell } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/equipo")({
  head: () => ({
    meta: [
      { title: "Equipo y proveedores — Skyloop Control" },
      {
        name: "description",
        content:
          "Directorio de colaboradores de Skyloop con lo generado, lo pagado y lo pendiente en el mes.",
      },
      { property: "og:title", content: "Equipo y proveedores — Skyloop Control" },
      {
        property: "og:description",
        content: "Cuánto has generado y cuánto queda pendiente con cada colaborador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const { data, monthExpenses, usdRate, openForm, providerName } = useSkyloop();
  const obligations = [...data.providerObligations].sort((a, b) =>
    a.status === b.status ? a.description.localeCompare(b.description) : a.status.localeCompare(b.status),
  );

  return (
    <div className="grid gap-6">
      <SectionTitle
        title="Directorio de proveedores"
        description="Consulta cuánto has generado y cuánto está pendiente con cada colaborador."
        action={
          <button
            type="button"
            onClick={() => openForm("provider")}
            className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
          >
            + Nuevo proveedor
          </button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.providers.map((provider) => {
          const rows = monthExpenses.filter((row) => row.provider_id === provider.id);
          const total = sumDop(rows, usdRate);
          const paid = sumDop(
            rows.filter((row) => row.status === "Pagado"),
            usdRate,
          );
          return (
            <article
              key={provider.id}
              className="rounded-2xl border border-border bg-card p-5 shadow-panel"
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-sm font-bold text-foreground">
                  {provider.name.slice(0, 2).toUpperCase()}
                </span>
                <StatusBadge status={provider.status} />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">{provider.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{provider.specialty}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <small className="block text-muted-foreground">Generado</small>
                  <b className="text-foreground">{money(total)}</b>
                </div>
                <div>
                  <small className="block text-muted-foreground">Pagado</small>
                  <b className="text-foreground">{money(paid)}</b>
                </div>
                <div>
                  <small className="block text-muted-foreground">Pendiente</small>
                  <b className="text-warning">{money(total - paid)}</b>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <Panel
        title="Servicios y obligaciones de proveedores"
        subtitle="Los servicios pendientes aparecen al crear un documento de gasto de proveedor"
        action={
          <button
            type="button"
            onClick={() => openForm("obligation")}
            className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            + Servicio pendiente
          </button>
        }
      >
        <TableShell
          head={
            <tr>
              <th className="px-4 py-3 font-semibold">Proveedor</th>
              <th className="px-4 py-3 font-semibold">Servicio</th>
              <th className="px-4 py-3 text-right font-semibold">Monto</th>
              <th className="px-4 py-3 text-right font-semibold">Pagado</th>
              <th className="px-4 py-3 text-right font-semibold">Pendiente</th>
              <th className="px-4 py-3 font-semibold">Estado</th>
            </tr>
          }
        >
          {obligations.length === 0 ? (
            <EmptyRow colSpan={6} label="Aún no hay servicios de proveedores registrados" />
          ) : (
            obligations.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold text-foreground">
                  {providerName(row.provider_id)}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.description}</td>
                <td className="px-4 py-3 text-right text-foreground">
                  {money(row.amount, row.currency)}
                </td>
                <td className="px-4 py-3 text-right text-success">
                  {money(num(row.amount_paid), row.currency)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-warning">
                  {money(obligationBalance(row), row.currency)}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>
    </div>
  );
}

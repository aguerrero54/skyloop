import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { clientActiveInMonth, monthLabel } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { useDeliverables } from "@/lib/agency";
import { Panel, ProgressBar } from "@/components/skyloop/ui";
import { DesignerTasks } from "@/components/skyloop/DesignerTasks";
import { Button } from "@/components/ui/button";
import { taskMonths } from "@/lib/task-months";

export const Route = createFileRoute("/_authenticated/entregables")({
  head: () => ({
    meta: [
      { title: "Entregables — Skyloop Control" },
      {
        name: "description",
        content: "Marca lo entregado a cada cliente según los servicios acordados del mes.",
      },
      { property: "og:title", content: "Entregables — Skyloop Control" },
      {
        property: "og:description",
        content: "Control de entregas por cliente y servicio, mes a mes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DeliverablesPage,
});


function DeliverablesPage() {
  const [tab, setTab] = useState<"entregables" | "tareas">("entregables");
  const { data, month, months, setMonth } = useSkyloop();
  const historyMonths = useMemo(() => taskMonths(data.designerTasks), [data.designerTasks]);
  const availableMonths = tab === "tareas" ? historyMonths : months;
  const selectedMonth = availableMonths.includes(month) ? month : (availableMonths[0] ?? "");

  useEffect(() => {
    if (selectedMonth && selectedMonth !== month) setMonth(selectedMonth);
  }, [month, selectedMonth, setMonth]);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex w-fit gap-1 rounded-xl border border-border bg-card p-1">
        {(["entregables", "tareas"] as const).map((t) => (
          <Button
            key={t}
            variant="ghost"
            aria-pressed={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-bold ${tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            {t === "entregables" ? "Entregables" : "Tareas"}
          </Button>
        ))}
      </div>
      <select
        value={selectedMonth}
        onChange={(event) => setMonth(event.target.value)}
        aria-label="Mes"
        className="ml-auto rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      >
        {availableMonths.map((item) => <option key={item} value={item}>{monthLabel(item)}</option>)}
      </select>
      </div>
      {tab === "entregables" ? <DeliverablesView /> : <DesignerTasks />}
    </div>
  );
}

function DeliverablesView() {
  const { data, month, clientName, serviceName, providerName, refresh } = useSkyloop();
  const [clientFilter, setClientFilter] = useState("");
  const { rows, total, done, percent } = useDeliverables(clientFilter || undefined);

  const clients = data.clients.filter((c) => clientActiveInMonth(c, month));
  const grouped = clients
    .map((c) => ({ client: c, rows: rows.filter((r) => r.assignment.client_id === c.id) }))
    .filter((g) => g.rows.length);

  async function setCount(assignmentId: string, count: number) {
    const { error } = await supabase
      .from("client_deliverables")
      .upsert(
        { client_service_id: assignmentId, month, delivered_count: count, updated_at: new Date().toISOString() },
        { onConflict: "client_service_id,month" },
      );
    if (error) return void toast.error("No se pudo guardar", { description: error.message });
    await refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-panel">
        <div className="min-w-[200px] flex-1">
          <p className="text-xs text-muted-foreground">Progreso de {monthLabel(month)}</p>
          <p className="text-xl font-bold text-foreground">
            {done} / {total} entregados ({percent.toFixed(0)}%)
          </p>
          <div className="mt-2">
            <ProgressBar percent={percent} />
          </div>
        </div>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {grouped.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No hay servicios con cantidad por mes asignados este mes.
        </p>
      ) : (
        grouped.map(({ client, rows: clientRows }) => {
          const cTotal = clientRows.reduce((t, r) => t + r.qty, 0);
          const cDone = clientRows.reduce((t, r) => t + r.done, 0);
          return (
            <Panel key={client.id} title={clientName(client.id)} subtitle={`${cDone} de ${cTotal} entregados`}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2 font-semibold">Servicio</th>
                      <th className="px-4 py-2 font-semibold">Proveedor</th>
                      <th className="px-4 py-2 text-right font-semibold">Acordado</th>
                      <th className="px-4 py-2 font-semibold">Entregado</th>
                      <th className="px-4 py-2 text-right font-semibold">Progreso</th>
                    </tr>
                  </thead>
                  <tbody>
                    {clientRows.map(({ assignment, qty, done: d }) => (
                      <tr key={assignment.id} className="border-t border-border">
                        <td className="px-4 py-3 text-foreground">{serviceName(assignment.service_id)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{providerName(assignment.provider_id)}</td>
                        <td className="px-4 py-3 text-right">{qty}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from({ length: qty }, (_, i) => (
                              <input
                                key={i}
                                type="checkbox"
                                checked={i < d}
                                aria-label={`Entrega ${i + 1}`}
                                onChange={() => setCount(assignment.id, i < d ? i : i + 1)}
                                className="size-5 cursor-pointer accent-primary"
                              />
                            ))}
                          </div>
                        </td>
                        <td className={`px-4 py-3 text-right font-bold ${d >= qty ? "text-success" : "text-foreground"}`}>
                          {d}/{qty}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          );
        })
      )}
    </div>
  );
}

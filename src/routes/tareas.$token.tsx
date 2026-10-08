import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";

import { getPublicTasks, markTaskDelivered } from "@/lib/designer-tasks.functions";
import { money } from "@/lib/finance";

export const Route = createFileRoute("/tareas/$token")({
  head: () => ({
    meta: [
      { title: "Mis tareas — Skyloop" },
      { name: "description", content: "Lista de tareas asignadas por Skyloop para marcar entregas." },
      { property: "og:title", content: "Mis tareas — Skyloop" },
      { property: "og:description", content: "Tareas asignadas y entregas del diseñador." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: ({ params }) => getPublicTasks({ data: { token: params.token } }).catch(() => null),
  errorComponent: () => <Message text="No se pudieron cargar las tareas." />,
  notFoundComponent: () => <Message text="Enlace no encontrado." />,
  component: PublicTasksPage,
});

function Message({ text }: { text: string }) {
  return <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">{text}</div>;
}

function PublicTasksPage() {
  const data = Route.useLoaderData();
  const { token } = Route.useParams();
  const router = useRouter();
  const mark = useServerFn(markTaskDelivered);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  if (!data) return <Message text="Este enlace no es válido o fue desactivado." />;

  async function toggle(id: string, delivered: boolean) {
    setBusy(id);
    try {
      await mark({ data: { token, taskId: id, delivered, note: notes[id] } });
      toast.success(delivered ? "Marcada como entregada" : "Marcada como pendiente");
      await router.invalidate();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const pending = data.tasks.filter((t) => t.status === "Pendiente");
  const done = data.tasks.filter((t) => t.status !== "Pendiente");

  return (
    <div className="min-h-screen bg-background px-5 py-8">
      <div className="mx-auto grid max-w-2xl gap-5">
        <div>
          <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">SKYLOOP · TAREAS</p>
          <h1 className="mt-1 text-2xl font-bold text-foreground">Hola, {data.providerName}</h1>
          <p className="text-sm text-muted-foreground">{pending.length} pendientes · {done.length} entregadas</p>
        </div>

        {data.tasks.length === 0 && <p className="text-sm text-muted-foreground">No tienes tareas asignadas.</p>}

        {[...pending, ...done].map((t) => (
          <div key={t.id} className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-panel">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-foreground">{t.description}</p>
                <p className="text-xs text-muted-foreground">
                  {t.clientName ?? "Sin cliente"} · {t.due_date ? `Entrega: ${t.due_date}` : "Sin fecha límite"}
                </p>
              </div>
              <b className="whitespace-nowrap text-foreground">{money(t.amount, t.currency)}</b>
            </div>
            {t.status === "Pendiente" ? (
              <>
                <input
                  placeholder="Nota o enlace al trabajo (opcional)"
                  value={notes[t.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })}
                  className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
                <button
                  disabled={busy === t.id}
                  onClick={() => toggle(t.id, true)}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60"
                >
                  Marcar como entregada
                </button>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-bold text-success">
                  {t.status}
                  {t.delivery_note ? ` · ${t.delivery_note}` : ""}
                </span>
                {t.status === "Entregada" && (
                  <button disabled={busy === t.id} onClick={() => toggle(t.id, false)} className="text-muted-foreground underline">
                    Deshacer
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

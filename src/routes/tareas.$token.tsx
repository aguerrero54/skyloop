import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, CheckCircle2, ListTodo, Wallet } from "lucide-react";
import { toast } from "sonner";

import { getPublicTasks, markTaskDelivered } from "@/lib/designer-tasks.functions";
import { money, num } from "@/lib/finance";
import { BrandMark } from "@/components/skyloop/AppShell";

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

function formatDue(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("es-DO", { day: "numeric", month: "short", year: "numeric" });
}

function formatMonth(value: string): string {
  const date = new Date(`${value}-01T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  const label = date.toLocaleDateString("es-DO", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

const ALL = "all";

function PublicTasksPage() {
  const data = Route.useLoaderData();
  const { token } = Route.useParams();
  const router = useRouter();
  const mark = useServerFn(markTaskDelivered);
  const [month, setMonth] = useState<string>(ALL);
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  // Esta ruta es pública y no pasa por el ThemeProvider: fuerza el tema oscuro de Skyloop.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add("dark");
    root.dataset["mode"] = "dark";
    root.style.colorScheme = "dark";
    return () => {
      root.classList.remove("dark");
      delete root.dataset["mode"];
      root.style.colorScheme = "";
    };
  }, []);

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

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const nextMonth = (() => {
    const d = new Date();
    d.setUTCMonth(d.getUTCMonth() + 1);
    return d.toISOString().slice(0, 7);
  })();
  const monthOptions = [
    ...new Set([...data.tasks.map((t) => t.month ?? currentMonth), currentMonth, nextMonth]),
  ].sort();
  const list = month === ALL ? [...data.tasks].sort((a, b) => (b.month ?? currentMonth).localeCompare(a.month ?? currentMonth)) : data.tasks.filter((t) => (t.month ?? currentMonth) === month);
  const pending = list.filter((t) => t.status === "Pendiente");
  const done = list.filter((t) => t.status !== "Pendiente");
  const toCollect = list.filter((t) => t.status === "Entregada");
  const dop = toCollect.filter((t) => t.currency !== "USD").reduce((s, t) => s + num(t.amount), 0);
  const usd = toCollect.filter((t) => t.currency === "USD").reduce((s, t) => s + num(t.amount), 0);
  const collectLabel =
    usd > 0 ? (dop > 0 ? `${money(dop)} · US$${usd.toLocaleString("en-US")}` : `US$${usd.toLocaleString("en-US")}`) : money(dop);

  const monthLabel = month === ALL ? "total" : formatMonth(month);
  const shown = tab === "pending" ? pending : done;


  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-background/90 px-5 py-3 backdrop-blur-lg lg:px-10">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <BrandMark />
          <strong className="text-lg text-foreground">Skyloop</strong>
        </div>
      </header>

      <div className="mx-auto grid max-w-5xl gap-6 px-5 py-8 lg:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">SKYLOOP · TAREAS</p>
            <h1 className="mt-1 text-3xl font-bold text-foreground lg:text-4xl">Hola, {data.providerName}</h1>
          </div>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-bold text-foreground"
          >
            <option value={ALL}>Todo</option>
            {monthOptions.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-panel">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <ListTodo className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
              <p className="text-2xl font-bold text-foreground">{pending.length}</p>
              <p className="text-xs text-muted-foreground">Tareas por entregar</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-panel">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-success/15 text-success">
              <CheckCircle2 className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">Entregadas</p>
              <p className="text-2xl font-bold text-foreground">{done.length}</p>
              <p className="text-xs text-muted-foreground">Tareas completadas</p>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 shadow-panel">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
              <Wallet className="size-6" />
            </span>
            <div>
              <p className="text-sm text-muted-foreground">A cobrar en {monthLabel}</p>
              <p className="text-2xl font-bold text-foreground">{collectLabel}</p>
              <p className="text-xs text-muted-foreground">Por trabajos entregados</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 rounded-xl border border-border bg-card p-1.5">
          {(
            [
              { key: "pending", label: "Pendientes", count: pending.length, icon: ListTodo },
              { key: "done", label: "Entregadas", count: done.length, icon: CheckCircle2 },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={
                  active
                    ? "flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                    : "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                }
              >
                <Icon className="size-4" />
                {t.label}
                <span
                  className={
                    active
                      ? "rounded-full bg-primary-foreground/20 px-2 py-0.5 text-xs font-extrabold"
                      : "rounded-full bg-muted px-2 py-0.5 text-xs font-extrabold text-muted-foreground"
                  }
                >
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4">
          {shown.length === 0 && (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {tab === "pending"
                ? month === ALL
                  ? "No tienes tareas pendientes."
                  : "No tienes tareas pendientes en este mes."
                : month === ALL
                  ? "Todavía no has entregado tareas."
                  : "Todavía no has entregado tareas en este mes."}
            </p>
          )}

          {shown.map((t) => {
            const overdue = t.status === "Pendiente" && t.due_date && t.due_date < today;
            const dueToday = t.status === "Pendiente" && t.due_date === today;
            return (
              <div key={t.id} className="grid gap-3 rounded-2xl border border-border bg-card p-5 shadow-panel">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid gap-2">
                    <p className="text-lg font-bold text-foreground">{t.description}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      {t.clientName && (
                        <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">
                          {t.clientName}
                        </span>
                      )}
                      {month === ALL && (
                        <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                          {formatMonth(t.month ?? currentMonth)}
                        </span>
                      )}
                      {dueToday && (
                        <span className="flex items-center gap-1.5 rounded-full bg-destructive/20 px-3 py-1 text-xs font-bold text-destructive">
                          Vence hoy
                        </span>
                      )}
                      {overdue && (
                        <span className="flex items-center gap-1.5 rounded-full bg-destructive/20 px-3 py-1 text-xs font-bold text-destructive">
                          Vencida
                        </span>
                      )}
                    </div>
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="size-3.5" />
                      {t.due_date ? `Entrega: ${formatDue(t.due_date)}` : "Sin fecha límite"}
                    </p>
                  </div>
                  <b className="whitespace-nowrap text-lg text-foreground">{money(t.amount, t.currency)}</b>
                </div>
                {t.status === "Pendiente" ? (
                  <>
                    <input
                      placeholder="Nota o enlace al trabajo (opcional)"
                      value={notes[t.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [t.id]: e.target.value })}
                      className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
                    />
                    <button
                      disabled={busy === t.id}
                      onClick={() => toggle(t.id, true)}
                      className="rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
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
            );
          })}
        </div>
      </div>
    </div>
  );
}

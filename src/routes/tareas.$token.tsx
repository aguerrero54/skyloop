import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, CheckCircle2, ListTodo, MessageSquare, Wallet } from "lucide-react";
import { toast } from "sonner";

import { addTaskComment, getPublicTasks, getTaskComments, markTaskDelivered } from "@/lib/designer-tasks.functions";
import { money, num } from "@/lib/finance";
import { BrandMark } from "@/components/skyloop/AppShell";
import { PublicTaskReferences } from "@/components/skyloop/TaskReferences";

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

function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? (
          <a key={i} href={p} target="_blank" rel="noreferrer" className="break-all text-primary underline">
            {p}
          </a>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </>
  );
}

function formatTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("es-DO", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function InlineThread({ token, taskId, details }: { token: string; taskId: string; details: string | null }) {
  const fetchComments = useServerFn(getTaskComments);
  const sendComment = useServerFn(addTaskComment);
  const [comments, setComments] = useState<{ id: string; author: string; body: string; created_at: string }[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  async function load() {
    const list = await fetchComments({ data: { token, taskId } }).catch(() => null);
    setComments(list ?? []);
  }
  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await sendComment({ data: { token, taskId, body: draft.trim() } });
      setDraft("");
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-3">
      {details && (
        <div className="grid gap-1.5 rounded-lg bg-muted/40 p-3">
          <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">DESCRIPCIÓN DE LA TAREA</p>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            <Linkified text={details} />
          </p>
        </div>
      )}
      <PublicTaskReferences token={token} taskId={taskId} />
      <div className="grid gap-2">
        <p className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
          <MessageSquare className="size-3.5" />
          COMENTARIOS Y ACTIVIDAD
        </p>
        {comments.map((c) => (
          <div key={c.id} className="grid gap-0.5 rounded-lg bg-muted/40 p-2.5">
            <p className="text-xs font-bold text-foreground">
              {c.author} <span className="font-normal text-muted-foreground">· {formatTime(c.created_at)}</span>
            </p>
            <p className="whitespace-pre-wrap text-sm text-foreground">
              <Linkified text={c.body} />
            </p>
          </div>
        ))}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void send()}
            placeholder="Escribe un comentario o pega un enlace…"
            className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
          />
          <button
            disabled={sending || !draft.trim()}
            onClick={send}
            className="rounded-lg border border-border px-3 text-sm font-bold text-foreground hover:bg-muted disabled:opacity-50"
          >
            Comentar
          </button>
        </div>
      </div>
    </div>
  );
}

function PublicTasksPage() {
  const data = Route.useLoaderData();
  const { token } = Route.useParams();
  const router = useRouter();
  const mark = useServerFn(markTaskDelivered);
  const [month, setMonth] = useState<string>(ALL);
  const [tab, setTab] = useState<"pending" | "done">("pending");
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  type TaskItem = NonNullable<typeof data>["tasks"][number];
  type CommentItem = { id: string; author: string; body: string; created_at: string };
  const [selected, setSelected] = useState<TaskItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const fetchComments = useServerFn(getTaskComments);
  const sendComment = useServerFn(addTaskComment);

  async function openTask(t: TaskItem) {
    setSelected(t);
    setDraft("");
    setComments([]);
    const list = await fetchComments({ data: { token, taskId: t.id } }).catch(() => null);
    setComments(list ?? []);
  }

  async function send() {
    if (!selected || !draft.trim()) return;
    setSending(true);
    try {
      await sendComment({ data: { token, taskId: selected.id, body: draft.trim() } });
      setDraft("");
      const list = await fetchComments({ data: { token, taskId: selected.id } }).catch(() => null);
      setComments(list ?? []);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSending(false);
    }
  }

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
                    <button onClick={() => openTask(t)} className="text-left text-lg font-bold text-foreground transition-colors hover:text-primary">
                      {t.description}
                    </button>
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
                    <InlineThread token={token} taskId={t.id} details={t.details ?? null} />
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

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/70 p-4 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="grid max-h-[90vh] w-full max-w-4xl gap-5 overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-2xl md:grid-cols-2"
          >
            <div className="grid content-start gap-4">
              <div className="flex items-start justify-between gap-3">
                <div className="grid gap-2">
                  <h2 className="text-xl font-bold text-foreground">{selected.description}</h2>
                  <div className="flex flex-wrap items-center gap-2">
                    {selected.clientName && (
                      <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">{selected.clientName}</span>
                    )}
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">
                      {formatMonth(selected.month ?? currentMonth)}
                    </span>
                    <span className="rounded-full bg-muted px-3 py-1 text-xs font-bold text-muted-foreground">{selected.status}</span>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted" aria-label="Cerrar">
                  ✕
                </button>
              </div>
              <b className="text-lg text-foreground">{money(selected.amount, selected.currency)}</b>
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="size-3.5" />
                {selected.due_date ? `Entrega: ${formatDue(selected.due_date)}` : "Sin fecha límite"}
              </p>
              <div className="grid gap-2">
                <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">DESCRIPCIÓN DE LA TAREA</p>
                {selected.details ? (
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                    <Linkified text={selected.details} />
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin descripción detallada.</p>
                )}
              </div>
              <PublicTaskReferences token={token} taskId={selected.id} />
            </div>

            <div className="grid content-start gap-3 border-t border-border pt-4 md:border-l md:border-t-0 md:pl-5 md:pt-0">
              <p className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
                <MessageSquare className="size-3.5" />
                COMENTARIOS Y ACTIVIDAD
              </p>
              <div className="grid max-h-72 gap-3 overflow-y-auto pr-1">
                {selected.delivered_at && (
                  <div className="grid gap-0.5 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-bold text-success">Marcada como entregada · {formatTime(selected.delivered_at)}</p>
                    {selected.delivery_note && <p className="text-sm text-foreground">{selected.delivery_note}</p>}
                  </div>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="grid gap-0.5 rounded-lg bg-muted/50 p-3">
                    <p className="text-xs font-bold text-foreground">
                      {c.author} <span className="font-normal text-muted-foreground">· {formatTime(c.created_at)}</span>
                    </p>
                    <p className="whitespace-pre-wrap text-sm text-foreground">
                      <Linkified text={c.body} />
                    </p>
                  </div>
                ))}
                {!selected.delivered_at && comments.length === 0 && (
                  <p className="py-4 text-center text-xs text-muted-foreground">Todavía no hay comentarios ni actividad.</p>
                )}
              </div>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Escribe un comentario o pega un enlace…"
                rows={3}
                className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
              <button
                disabled={sending || !draft.trim()}
                onClick={send}
                className="rounded-lg bg-primary py-2.5 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                Comentar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

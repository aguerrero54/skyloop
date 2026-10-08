import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { money, monthLabel, num, toDop, todayISO } from "@/lib/finance";
import { saveInvoice } from "@/lib/invoice-actions";
import { DEFAULT_NOTES } from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { useDeliverables } from "@/lib/agency";
import { Panel, StatusBadge } from "@/components/skyloop/ui";

const inputClass = "rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";

export function DesignerTasks() {
  const { data, month, clientName, refresh, usdRate, monthClientServices } = useSkyloop();
  const { rows: deliverableRows } = useDeliverables();
  const [saving, setSaving] = useState(false);
  const [providerSel, setProviderSel] = useState("");
  const [clientSel, setClientSel] = useState("");
  const [serviceSel, setServiceSel] = useState("");
  const tasks = data.designerTasks.filter((t) => t.month === month);
  const providers = data.providers.filter((p) => tasks.some((t) => t.provider_id === p.id));
  const serviceOptions = monthClientServices.filter(
    (a) => a.active && providerSel && clientSel && a.provider_id === providerSel && a.client_id === clientSel,
  );
  const serviceName = (id: string | null) => data.services.find((s) => s.id === id)?.name ?? "Servicio";
  const selectedRow = deliverableRows.find((r) => r.assignment.id === serviceSel);

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const f = new FormData(form);
    const provider_id = providerSel;
    const description = String(f.get("description") || "").trim();
    if (!provider_id || !description) return void toast.error("Elige diseñador y escribe la tarea");
    setSaving(true);
    const { error } = await supabase.from("designer_tasks").insert({
      provider_id,
      description,
      client_id: clientSel || null,
      client_service_id: serviceSel || null,
      amount: num(f.get("amount")),
      currency: String(f.get("currency")),
      due_date: String(f.get("due_date") || "") || null,
      month,
    });
    setSaving(false);
    if (error) return void toast.error("No se pudo crear", { description: error.message });
    toast.success("Tarea creada");
    form.reset();
    setServiceSel("");
    await refresh();
  }

  async function copyLink(providerId: string) {
    let link = data.taskLinks.find((l) => l.provider_id === providerId && !l.revoked);
    if (!link) {
      await supabase.from("provider_task_links").delete().eq("provider_id", providerId);
      const res = await supabase.from("provider_task_links").insert({ provider_id: providerId }).select().single();
      if (res.error) return void toast.error("No se pudo crear el enlace");
      link = res.data;
      await refresh();
    }
    await navigator.clipboard.writeText(`${window.location.origin}/tareas/${link.token}`);
    toast.success("Enlace copiado");
  }

  async function regenerate(providerId: string) {
    if (!window.confirm("¿Desactivar el enlace actual y crear uno nuevo?")) return;
    await supabase.from("provider_task_links").delete().eq("provider_id", providerId);
    await refresh();
    await copyLink(providerId);
  }

  async function remove(id: string) {
    if (!window.confirm("¿Eliminar esta tarea?")) return;
    await supabase.from("designer_tasks").delete().eq("id", id);
    await refresh();
  }

  async function generateInvoice(providerId: string) {
    const delivered = tasks.filter((t) => t.provider_id === providerId && t.status === "Entregada");
    if (!delivered.length) return void toast.error("No hay tareas entregadas sin facturar");
    const currency = delivered.every((t) => t.currency === "USD") ? "USD" : "DOP";
    const rate = (t: (typeof delivered)[number]) =>
      currency === "USD" ? num(t.amount) : toDop(t.amount, t.currency, usdRate);
    try {
      const invoiceId = await saveInvoice({
        invoiceType: "vendor",
        invoiceNumber: "",
        clientId: null,
        vendorId: providerId,
        multiClient: true,
        sellerId: null,
        orderNumber: null,
        issueDate: todayISO(),
        dueDate: null,
        paymentTerms: "Pagadera inmediatamente",
        subject: `Tareas entregadas — ${monthLabel(month)}`,
        currency,
        discount: 0,
        discountType: "percent",
        shipping: 0,
        adjustment: 0,
        notes: DEFAULT_NOTES,
        terms: null,
        status: "Borrador",
        attachments: [],
        items: delivered.map((t) => ({
          key: t.id,
          description: t.description,
          quantity: "1",
          rate: String(rate(t)),
          tax: "0",
          clientId: t.client_id,
        })),
      });
      await supabase
        .from("designer_tasks")
        .update({ status: "Facturada", invoice_id: invoiceId })
        .in("id", delivered.map((t) => t.id));
      toast.success("Factura creada en borrador");
      await refresh();
    } catch (e) {
      toast.error("No se pudo generar la factura", { description: (e as Error).message });
    }
  }

  return (
    <div className="grid gap-4">
      <Panel title="Nueva tarea" subtitle={`Se agrega a ${monthLabel(month)}`}>
        <form onSubmit={create} className="grid gap-3">
          <div className="grid gap-2 md:grid-cols-3">
            <select value={providerSel} onChange={(e) => { setProviderSel(e.target.value); setServiceSel(""); }} className={inputClass}>
              <option value="">Diseñador…</option>
              {data.providers.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <select value={clientSel} onChange={(e) => { setClientSel(e.target.value); setServiceSel(""); }} className={inputClass}>
              <option value="">Sin marca / cliente</option>
              {data.clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={serviceSel} onChange={(e) => setServiceSel(e.target.value)} className={inputClass} disabled={!serviceOptions.length}>
              <option value="">{serviceOptions.length ? "Servicio…" : "Sin servicio asignado"}</option>
              {serviceOptions.map((a) => (
                <option key={a.id} value={a.id}>{serviceName(a.service_id)}</option>
              ))}
            </select>
          </div>
          <p className="-mt-1 text-xs text-muted-foreground">Solo aparecen los servicios asignados a este diseñador y marca.</p>
          {serviceSel && (
            <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
              Al entregarla se marcará 1 casilla en Entregables · {clientName(clientSel)} · {serviceName(serviceOptions.find((a) => a.id === serviceSel)?.service_id ?? null)}
              {selectedRow && ` · ${selectedRow.done} de ${selectedRow.qty}`}
            </div>
          )}
          <div className="grid gap-2 md:grid-cols-[2fr_auto_auto_auto_auto]">
            <input name="description" placeholder="Ej. 3 artes para Instagram" className={inputClass} />
            <input name="amount" type="number" step="any" min="0" placeholder="Precio" className={`${inputClass} w-28`} />
            <select name="currency" className={inputClass}>
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
            <input name="due_date" type="date" className={inputClass} />
            <button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
              + Agregar
            </button>
          </div>
        </form>
      </Panel>

      {providers.length === 0 && (
        <p className="py-6 text-center text-sm text-muted-foreground">No hay tareas en este mes.</p>
      )}

      {providers.map((p) => {
        const list = tasks.filter((t) => t.provider_id === p.id);
        const deliveredTotal = list
          .filter((t) => t.status === "Entregada")
          .reduce((s, t) => s + toDop(t.amount, t.currency, usdRate), 0);
        return (
          <Panel
            key={p.id}
            title={p.name}
            subtitle={`Entregado sin facturar: ${money(deliveredTotal)}`}
            action={
              <div className="flex flex-wrap gap-2">
                <button onClick={() => copyLink(p.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary">
                  Copiar enlace
                </button>
                <button onClick={() => regenerate(p.id)} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-secondary">
                  Nuevo enlace
                </button>
                <button onClick={() => generateInvoice(p.id)} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90">
                  Generar factura del mes
                </button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2">Tarea</th>
                    <th className="px-4 py-2">Cliente</th>
                    <th className="px-4 py-2">Entrega</th>
                    <th className="px-4 py-2">Estado</th>
                    <th className="px-4 py-2 text-right">Precio</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id} className="border-t border-border">
                      <td className="px-4 py-3 text-foreground">
                        {t.description}
                        {t.delivery_note && <span className="block text-xs text-muted-foreground">{t.delivery_note}</span>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{clientName(t.client_id)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.due_date ?? "—"}</td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3 text-right">{money(t.amount, t.currency)}</td>
                      <td className="px-4 py-3 text-right">
                        {t.status !== "Facturada" && (
                          <button onClick={() => remove(t.id)} className="text-xs text-destructive">Eliminar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        );
      })}
    </div>
  );
}

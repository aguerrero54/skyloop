import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { money, num, todayISO, type Client } from "@/lib/finance";
import { supabase } from "@/integrations/supabase/client";
import { saveInvoice, type InvoiceAttachment } from "@/lib/invoice-actions";
import {
  DEFAULT_NOTES,
  DEFAULT_TERMS,
  PAYMENT_TERMS,
  computeTotals,
  dueDateFor,
  itemAmount,
  nextInvoiceNumber,
  type DraftItem,
  type Invoice,
  type InvoiceItem,
  type InvoiceStatus,
} from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";
import { Panel } from "@/components/skyloop/ui";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary";
const labelClass = "mb-1.5 block text-xs font-semibold text-muted-foreground";

const MAX_FILES = 3;
const MAX_SIZE = 10 * 1024 * 1024;

let keySeed = 0;
const newKey = () => `row-${++keySeed}`;

function emptyItem(): DraftItem {
  return { key: newKey(), description: "", quantity: "1", rate: "0", tax: "0" };
}

function ClientPicker({
  clients,
  value,
  onChange,
}: {
  clients: Client[];
  value: string;
  onChange: (id: string) => void;
}) {
  const { openForm } = useSkyloop();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const selected = clients.find((client) => client.id === value);
  const matches = clients.filter((client) =>
    client.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div className="relative">
      <input
        type="text"
        value={open ? query : (selected?.name ?? "")}
        placeholder="Seleccionar o buscar un cliente"
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(event) => setQuery(event.target.value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className={inputClass}
      />
      {open && (
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card p-1 shadow-panel">
          {matches.map((client) => (
            <button
              key={client.id}
              type="button"
              onMouseDown={() => {
                onChange(client.id);
                setOpen(false);
              }}
              className="block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-secondary"
            >
              {client.name}
              {client.company ? (
                <span className="ml-2 text-xs text-muted-foreground">{client.company}</span>
              ) : null}
            </button>
          ))}
          {matches.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted-foreground">Sin resultados</p>
          )}
          <button
            type="button"
            onMouseDown={() => {
              setOpen(false);
              openForm("client");
            }}
            className="mt-1 block w-full rounded-md border-t border-border px-3 py-2 text-left text-sm font-bold text-primary-soft"
          >
            + Crear nuevo cliente
          </button>
        </div>
      )}
    </div>
  );
}

export function InvoiceForm({
  invoice,
  existingItems,
}: {
  invoice?: Invoice;
  existingItems?: InvoiceItem[];
}) {
  const { data, refresh } = useSkyloop();
  const navigate = useNavigate();

  const suggestedNumber = useMemo(
    () => invoice?.invoice_number ?? nextInvoiceNumber(data.invoices.map((row) => row.invoice_number)),
    [invoice, data.invoices],
  );

  const [invoiceNumber, setInvoiceNumber] = useState(suggestedNumber);
  const [clientId, setClientId] = useState(invoice?.client_id ?? "");
  
  const [orderNumber, setOrderNumber] = useState(invoice?.order_number ?? "");
  const [issueDate, setIssueDate] = useState(invoice?.issue_date ?? todayISO());
  const [terms, setTerms] = useState(invoice?.payment_terms ?? "Pagadera inmediatamente");
  const [dueDate, setDueDate] = useState(
    invoice?.due_date ?? dueDateFor(invoice?.issue_date ?? todayISO(), "Pagadera inmediatamente"),
  );
  const [subject, setSubject] = useState(invoice?.subject ?? "");
  const [currency, setCurrency] = useState(invoice?.currency ?? "DOP");
  const [discount, setDiscount] = useState(String(num(invoice?.discount) || 0));
  const [discountType, setDiscountType] = useState(invoice?.discount_type ?? "percent");
  const [shipping, setShipping] = useState(String(num(invoice?.shipping) || 0));
  const [adjustment, setAdjustment] = useState(String(num(invoice?.adjustment) || 0));
  const [notes, setNotes] = useState(invoice?.notes ?? DEFAULT_NOTES);
  const [conditions, setConditions] = useState(invoice?.terms ?? DEFAULT_TERMS);
  const [items, setItems] = useState<DraftItem[]>(() =>
    existingItems?.length
      ? [...existingItems]
          .sort((a, b) => a.position - b.position)
          .map((item) => ({
            key: newKey(),
            description: item.description,
            quantity: String(num(item.quantity)),
            rate: String(num(item.rate)),
            tax: String(num(item.tax)),
          }))
      : [emptyItem()],
  );
  const [attachments, setAttachments] = useState<InvoiceAttachment[]>(
    (invoice?.attachments as InvoiceAttachment[] | null) ?? [],
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState<InvoiceStatus | null>(null);

  const totals = computeTotals({ items, discount, discountType, shipping, adjustment });

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  }

  function applyTerms(value: string) {
    setTerms(value);
    const computed = dueDateFor(issueDate, value);
    if (value !== "Personalizada") setDueDate(computed);
  }

  function applyIssueDate(value: string) {
    setIssueDate(value);
    if (terms !== "Personalizada") setDueDate(dueDateFor(value, terms));
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const selected = [...files];
    if (attachments.length + selected.length > MAX_FILES) {
      toast.error(`Máximo ${MAX_FILES} archivos por factura`);
      return;
    }
    const tooBig = selected.find((file) => file.size > MAX_SIZE);
    if (tooBig) {
      toast.error("Cada archivo debe pesar 10 MB o menos", { description: tooBig.name });
      return;
    }
    setUploading(true);
    try {
      const uploaded: InvoiceAttachment[] = [];
      for (const file of selected) {
        const path = `${invoiceNumber}/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("invoice-attachments").upload(path, file);
        if (error) throw new Error(error.message);
        uploaded.push({ path, name: file.name, size: file.size });
      }
      setAttachments((prev) => [...prev, ...uploaded]);
      toast.success("Archivo adjuntado");
    } catch (error) {
      toast.error("No se pudo adjuntar el archivo", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setUploading(false);
    }
  }

  async function submit(status: InvoiceStatus) {
    if (!clientId) {
      toast.error("Selecciona el cliente de la factura");
      return;
    }
    if (!items.some((item) => item.description.trim())) {
      toast.error("Agrega al menos un artículo o servicio");
      return;
    }
    setSaving(status);
    try {
      const id = await saveInvoice({
        ...(invoice ? { id: invoice.id } : {}),
        invoiceNumber,
        clientId,
        sellerId: sellerId || null,
        orderNumber: orderNumber.trim() || null,
        issueDate,
        dueDate: dueDate || null,
        paymentTerms: terms,
        subject: subject.trim() || null,
        currency,
        discount: num(discount),
        discountType,
        shipping: num(shipping),
        adjustment: num(adjustment),
        notes: notes.trim() || null,
        terms: conditions.trim() || null,
        status,
        items,
        attachments,
      });
      await refresh();
      toast.success(invoice ? "Factura actualizada" : "Factura creada");
      navigate({ to: "/facturas/$invoiceId", params: { invoiceId: id } });
    } catch (error) {
      toast.error("No se pudo guardar la factura", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Panel title="Información del cliente">
        <div className="max-w-md">
          <label className={labelClass}>
            Nombre del cliente <span className="text-destructive">*</span>
          </label>
          <ClientPicker clients={data.clients} value={clientId} onChange={setClientId} />
        </div>
      </Panel>

      <Panel title="Información de la factura">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass}>
              N.º de factura <span className="text-destructive">*</span>
            </label>
            <input
              value={invoiceNumber}
              onChange={(event) => setInvoiceNumber(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Número de orden</label>
            <input
              value={orderNumber}
              onChange={(event) => setOrderNumber(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Moneda</label>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className={inputClass}
            >
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>
              Fecha de la factura <span className="text-destructive">*</span>
            </label>
            <input
              type="date"
              value={issueDate}
              onChange={(event) => applyIssueDate(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Términos</label>
            <select
              value={terms}
              onChange={(event) => applyTerms(event.target.value)}
              className={inputClass}
            >
              {PAYMENT_TERMS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.value}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Fecha de vencimiento</label>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => {
                setDueDate(event.target.value);
                setTerms("Personalizada");
              }}
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <label className={labelClass}>Asunto</label>
            <input
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Factura del mes de septiembre"
              className={inputClass}
            />
          </div>
        </div>
      </Panel>

      <Panel
        title="Tabla de artículos"
        action={
          <button
            type="button"
            onClick={() => setItems((prev) => [...prev, emptyItem()])}
            className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
          >
            + Añadir nueva fila
          </button>
        }
      >
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead className="bg-surface-raised text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-3 font-semibold">Artículo / Descripción</th>
                <th className="px-3 py-3 text-right font-semibold">Cantidad</th>
                <th className="px-3 py-3 text-right font-semibold">Tarifa</th>
                <th className="px-3 py-3 text-right font-semibold">Impuesto %</th>
                <th className="px-3 py-3 text-right font-semibold">Importe</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.key} className="border-t border-border">
                  <td className="px-3 py-2">
                    <input
                      list="skyloop-services"
                      value={item.description}
                      onChange={(event) => updateItem(item.key, { description: event.target.value })}
                      placeholder="Escriba o seleccione un servicio"
                      className={inputClass}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.quantity}
                      onChange={(event) => updateItem(item.key, { quantity: event.target.value })}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.rate}
                      onChange={(event) => updateItem(item.key, { rate: event.target.value })}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={item.tax}
                      onChange={(event) => updateItem(item.key, { tax: event.target.value })}
                      className={`${inputClass} text-right`}
                    />
                  </td>
                  <td className="px-3 py-2 text-right font-bold text-foreground">
                    {money(itemAmount(item.quantity, item.rate), currency)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() =>
                        setItems((prev) =>
                          prev.length === 1
                            ? [emptyItem()]
                            : prev.filter((row) => row.key !== item.key),
                        )
                      }
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Eliminar fila"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <datalist id="skyloop-services">
          {data.services.map((service) => (
            <option key={service.id} value={service.name} />
          ))}
        </datalist>

        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-4">
            <div>
              <label className={labelClass}>Notas del cliente</label>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={5}
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-muted-foreground">Aparecerán en la factura.</p>
            </div>
            <div>
              <label className={labelClass}>Términos y condiciones</label>
              <textarea
                value={conditions}
                onChange={(event) => setConditions(event.target.value)}
                rows={4}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid content-start gap-3 rounded-xl border border-border bg-surface-raised p-4">
            <Row label="Subtotal" value={money(totals.subtotal, currency)} />
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Descuento</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={discount}
                  onChange={(event) => setDiscount(event.target.value)}
                  className="w-24 rounded-lg border border-input bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-primary"
                />
                <select
                  value={discountType}
                  onChange={(event) => setDiscountType(event.target.value)}
                  className="rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground outline-none focus:border-primary"
                >
                  <option value="percent">%</option>
                  <option value="amount">{currency}</option>
                </select>
                <span className="w-24 text-right text-sm font-semibold text-foreground">
                  {money(totals.discountAmount, currency)}
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Cargos de envío</span>
              <input
                type="number"
                step="0.01"
                value={shipping}
                onChange={(event) => setShipping(event.target.value)}
                className="w-32 rounded-lg border border-input bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-muted-foreground">Ajuste</span>
              <input
                type="number"
                step="0.01"
                value={adjustment}
                onChange={(event) => setAdjustment(event.target.value)}
                className="w-32 rounded-lg border border-input bg-background px-2 py-1.5 text-right text-sm text-foreground outline-none focus:border-primary"
              />
            </div>
            <Row label="Impuestos" value={money(totals.taxAmount, currency)} />
            <div className="mt-1 flex items-center justify-between border-t border-border pt-3">
              <strong className="text-sm text-foreground">Total ({currency})</strong>
              <strong className="text-xl font-extrabold text-foreground">
                {money(totals.total, currency)}
              </strong>
            </div>
          </div>
        </div>
      </Panel>

      <Panel
        title="Archivos adjuntos"
        subtitle={`Máximo ${MAX_FILES} archivos, cada uno de 10 MB`}
      >
        <div className="grid gap-3">
          <label className="w-fit cursor-pointer rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary">
            {uploading ? "Cargando…" : "Cargar archivo"}
            <input
              type="file"
              multiple
              className="hidden"
              disabled={uploading || attachments.length >= MAX_FILES}
              onChange={(event) => {
                void handleFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>
          {attachments.length > 0 && (
            <ul className="grid gap-2">
              {attachments.map((file) => (
                <li
                  key={file.path}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm"
                >
                  <span className="truncate text-foreground">{file.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setAttachments((prev) => prev.filter((row) => row.path !== file.path))
                      }
                      className="text-muted-foreground transition-colors hover:text-destructive"
                      aria-label="Quitar archivo"
                    >
                      ✕
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 rounded-2xl border border-border bg-card/95 p-4 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate({ to: "/facturas" })}
          className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => void submit("Borrador")}
          className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary disabled:opacity-60"
        >
          {saving === "Borrador" ? "Guardando…" : "Guardar como borrador"}
        </button>
        <button
          type="button"
          disabled={saving !== null}
          onClick={() => void submit("Pendiente")}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          {saving === "Pendiente" ? "Guardando…" : "Guardar y emitir"}
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold text-foreground">{value}</span>
    </div>
  );
}

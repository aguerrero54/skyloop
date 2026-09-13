import { useState } from "react";
import { toast } from "sonner";

import { money, num, todayISO } from "@/lib/finance";
import { registerPayment } from "@/lib/invoice-actions";
import { PAYMENT_METHODS, type Invoice } from "@/lib/invoices";
import { useSkyloop } from "@/lib/skyloop-context";

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

export function InvoicePaymentModal({
  invoice,
  onClose,
}: {
  invoice: Invoice;
  onClose: () => void;
}) {
  const { refresh } = useSkyloop();
  const balance = Math.max(num(invoice.total) - num(invoice.amount_paid), 0);
  const [amount, setAmount] = useState(String(balance || ""));
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const value = num(amount);
    if (value <= 0) {
      toast.error("El monto debe ser mayor que cero");
      return;
    }
    if (value > balance + 0.01) {
      toast.error("El monto excede el saldo pendiente", {
        description: `Saldo pendiente: ${money(balance, invoice.currency)}`,
      });
      return;
    }
    setSaving(true);
    try {
      await registerPayment({
        invoiceId: invoice.id,
        paymentDate: String(form.get("payment_date") ?? todayISO()),
        amount: value,
        method: String(form.get("payment_method") ?? "Transferencia bancaria"),
        reference: String(form.get("reference") ?? "").trim() || null,
        notes: String(form.get("notes") ?? "").trim() || null,
      });
      await refresh();
      toast.success("Pago registrado");
      onClose();
    } catch (error) {
      toast.error("No se pudo registrar el pago", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg animate-in rounded-2xl border border-border bg-card p-6 shadow-panel duration-150 fade-in zoom-in-95">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
              {invoice.invoice_number}
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">Registrar pago</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Saldo pendiente: {money(balance, invoice.currency)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Fecha del pago
            </label>
            <input name="payment_date" type="date" defaultValue={todayISO()} className={inputClass} />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Monto
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Método de pago
            </label>
            <select name="payment_method" className={inputClass}>
              {PAYMENT_METHODS.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Referencia
            </label>
            <input name="reference" type="text" className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Nota</label>
            <textarea name="notes" rows={2} className={inputClass} />
          </div>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Registrar pago"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

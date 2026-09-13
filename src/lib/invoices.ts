import type { Tables } from "@/integrations/supabase/types";
import { num, todayISO } from "@/lib/finance";

export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;
export type InvoicePayment = Tables<"invoice_payments">;

export type InvoiceStatus =
  | "Borrador"
  | "Pendiente"
  | "Parcialmente pagada"
  | "Pagada"
  | "Vencida"
  | "Cancelada";

export const INVOICE_STATUSES: InvoiceStatus[] = [
  "Borrador",
  "Pendiente",
  "Parcialmente pagada",
  "Pagada",
  "Vencida",
  "Cancelada",
];

export const PAYMENT_METHODS = [
  "Transferencia bancaria",
  "Efectivo",
  "Tarjeta",
  "Depósito",
  "Otro",
] as const;

export const PAYMENT_TERMS: { value: string; days: number | null }[] = [
  { value: "Pagadera inmediatamente", days: 0 },
  { value: "7 días", days: 7 },
  { value: "15 días", days: 15 },
  { value: "30 días", days: 30 },
  { value: "45 días", days: 45 },
  { value: "Personalizada", days: null },
];

export const DEFAULT_NOTES =
  "Puede realizar el pago a cualquiera de las Sigs. Cuentas de Banco:\n\nPopular: 821312584\nBHD: 40616550012\nQIK: 1000278908\n\nCuentas de ahorro en PESOS DOMINICANOS.";

export const DEFAULT_TERMS =
  "Nota: Este monto cubre todos los recursos y materiales necesarios, como el equipo y herramientas que se utilizarían.\n(No incluye inversión en pautas publicitarias).";

export const AGENCY = {
  name: "Skyloop Agency",
  country: "Dominican Republic",
  email: "anlet231@gmail.com",
};

export function addDays(date: string, days: number): string {
  const base = new Date(`${date}T00:00:00`);
  base.setDate(base.getDate() + days);
  return base.toISOString().slice(0, 10);
}

export function dueDateFor(issueDate: string, terms: string): string {
  const match = PAYMENT_TERMS.find((item) => item.value === terms);
  if (!match || match.days === null) return issueDate;
  return addDays(issueDate || todayISO(), match.days);
}

export type DraftItem = {
  key: string;
  description: string;
  quantity: string;
  rate: string;
  tax: string;
};

export type TotalsInput = {
  items: { quantity: unknown; rate: unknown; tax: unknown }[];
  discount: unknown;
  discountType: string;
  shipping: unknown;
  adjustment: unknown;
};

export type Totals = {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  shipping: number;
  adjustment: number;
  total: number;
};

export function itemAmount(quantity: unknown, rate: unknown): number {
  return num(quantity) * num(rate);
}

export function computeTotals(input: TotalsInput): Totals {
  const subtotal = input.items.reduce(
    (sum, item) => sum + itemAmount(item.quantity, item.rate),
    0,
  );
  const taxAmount = input.items.reduce(
    (sum, item) => sum + (itemAmount(item.quantity, item.rate) * num(item.tax)) / 100,
    0,
  );
  const discountAmount =
    input.discountType === "amount"
      ? Math.min(num(input.discount), subtotal)
      : (subtotal * num(input.discount)) / 100;
  const shipping = num(input.shipping);
  const adjustment = num(input.adjustment);
  const total = Math.max(subtotal - discountAmount + taxAmount + shipping + adjustment, 0);
  return {
    subtotal: round2(subtotal),
    discountAmount: round2(discountAmount),
    taxAmount: round2(taxAmount),
    shipping: round2(shipping),
    adjustment: round2(adjustment),
    total: round2(total),
  };
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Estado calculado: refleja vencimiento aunque la fila aún diga "Pendiente". */
export function effectiveStatus(invoice: Invoice): InvoiceStatus {
  const status = invoice.status as InvoiceStatus;
  if (status === "Borrador" || status === "Cancelada" || status === "Pagada") return status;
  const paid = num(invoice.amount_paid);
  const total = num(invoice.total);
  if (total > 0 && paid >= total) return "Pagada";
  const overdue = invoice.due_date ? invoice.due_date < todayISO() : false;
  if (overdue) return "Vencida";
  if (paid > 0) return "Parcialmente pagada";
  return "Pendiente";
}

export function statusFromPayments(
  invoice: Pick<Invoice, "status" | "due_date">,
  total: number,
  paid: number,
): InvoiceStatus {
  const current = invoice.status as InvoiceStatus;
  if (current === "Borrador" || current === "Cancelada") return current;
  if (total > 0 && paid >= total) return "Pagada";
  if (paid > 0) return "Parcialmente pagada";
  if (invoice.due_date && invoice.due_date < todayISO()) return "Vencida";
  return "Pendiente";
}

export const invoiceStatusTone: Record<
  InvoiceStatus,
  "success" | "warning" | "danger" | "info" | "muted"
> = {
  Borrador: "muted",
  Pendiente: "warning",
  "Parcialmente pagada": "info",
  Pagada: "success",
  Vencida: "danger",
  Cancelada: "muted",
};

export function nextInvoiceNumber(existing: string[]): string {
  const highest = existing.reduce((max, value) => {
    const digits = /(\d+)\s*$/.exec(value ?? "");
    const parsed = digits ? Number(digits[1]) : 0;
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
  return `INV-${String(highest + 1).padStart(6, "0")}`;
}

export function formatLongDate(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return parsed
    .toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
    .replace(".", "");
}

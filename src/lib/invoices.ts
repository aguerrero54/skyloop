import type { Tables } from "@/integrations/supabase/types";
import { num, todayISO, type Movement } from "@/lib/finance";

export type Invoice = Tables<"invoices">;
export type InvoiceItem = Tables<"invoice_items">;
export type InvoicePayment = Tables<"invoice_payments">;
export type ProviderObligation = Tables<"provider_obligations">;

/** "client" = factura emitida a un cliente (ingreso). "vendor" = documento recibido de un proveedor (gasto). */
export type InvoiceKind = "client" | "vendor";

export function invoiceKind(invoice: Pick<Invoice, "invoice_type">): InvoiceKind {
  return invoice.invoice_type === "vendor" ? "vendor" : "client";
}

export const KIND_COPY: Record<
  InvoiceKind,
  {
    entity: string;
    entityPanel: string;
    entityLabel: string;
    entityPlaceholder: string;
    docTitle: string;
    docTitleShort: string;
    financial: string;
    financialType: "income" | "expense";
    ledger: string;
    balanceLabel: string;
    paymentLabel: string;
    paymentAction: string;
    numberPrefix: string;
    pdfTitle: string;
    pdfEntity: string;
  }
> = {
  client: {
    entity: "cliente",
    entityPanel: "Información del cliente",
    entityLabel: "Nombre del cliente",
    entityPlaceholder: "Seleccionar o buscar un cliente",
    docTitle: "Factura de cliente",
    docTitleShort: "Factura",
    financial: "Ingreso",
    financialType: "income",
    ledger: "Cuenta por cobrar",
    balanceLabel: "Saldo por cobrar",
    paymentLabel: "Pago recibido",
    paymentAction: "Registrar cobro",
    numberPrefix: "INV-",
    pdfTitle: "FACTURA",
    pdfEntity: "Facturar a",
  },
  vendor: {
    entity: "proveedor",
    entityPanel: "Información del proveedor",
    entityLabel: "Nombre del proveedor",
    entityPlaceholder: "Seleccionar o buscar un proveedor",
    docTitle: "Factura de proveedor",
    docTitleShort: "Gasto",
    financial: "Gasto",
    financialType: "expense",
    ledger: "Cuenta por pagar",
    balanceLabel: "Saldo por pagar",
    paymentLabel: "Pago realizado",
    paymentAction: "Registrar pago",
    numberPrefix: "INV-P-",
    pdfTitle: "FACTURA DE PROVEEDOR",
    pdfEntity: "Proveedor",
  },
};

export function obligationBalance(
  obligation: Pick<ProviderObligation, "amount" | "amount_paid">,
): number {
  return round2(Math.max(num(obligation.amount) - num(obligation.amount_paid), 0));
}

/** Obligaciones aún no pagadas por completo; las pagadas dejan de estar disponibles. */
export function pendingObligations(
  obligations: ProviderObligation[],
  providerId: string | null,
): ProviderObligation[] {
  if (!providerId) return [];
  return obligations.filter(
    (row) =>
      row.provider_id === providerId &&
      row.status !== "Pagado" &&
      obligationBalance(row) > 0,
  );
}

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
  email: "info@skyloopint.com",
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
  /** Obligación del proveedor a la que corresponde la fila (solo documentos de proveedor). */
  obligationId?: string | null;
  /** Cliente al que se le imputa la fila cuando la factura reparte el gasto entre varias marcas. */
  clientId?: string | null;
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

/** Iniciales del cliente para la nomenclatura de facturas: "Gran Hotel Europa" → "GHE". */
export function clientInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 3)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

export function nextInvoiceNumber(existing: string[], kind: InvoiceKind = "client"): string {
  const prefix = KIND_COPY[kind].numberPrefix;
  const scoped = existing.filter((value) =>
    kind === "vendor"
      ? (value ?? "").startsWith(prefix)
      : !(value ?? "").startsWith(KIND_COPY.vendor.numberPrefix),
  );
  const highest = scoped.reduce((max, value) => {
    const digits = /(\d+)\s*$/.exec(value ?? "");
    const parsed = digits ? Number(digits[1]) : 0;
    return Number.isFinite(parsed) && parsed > max ? parsed : max;
  }, 0);
  return `${prefix}${String(highest + 1).padStart(6, "0")}`;
}

export function formatLongDate(date: string | null): string {
  if (!date) return "—";
  const parsed = new Date(`${date}T00:00:00`);
  return parsed
    .toLocaleDateString("es-DO", { day: "2-digit", month: "short", year: "numeric" })
    .replace(".", "");
}

export type InvoiceLedger = {
  incomeBilled: number;
  incomePaid: number;
  receivable: number;
  expenseBilled: number;
  expensePaid: number;
  payable: number;
  netFlow: number;
  incomeOpen: Invoice[];
  expenseOpen: Invoice[];
};

/** Convierte una factura en un movimiento para las tablas de ingresos/gastos del cliente. */
export function invoiceToMovement(invoice: Invoice, items: InvoiceItem[] = []): Movement {
  const kind = invoiceKind(invoice);
  const services = [
    ...new Set(
      items
        .map((item) => item.description.trim())
        .filter((description) => description.length > 0),
    ),
  ];
  const detail = services.length > 0 ? services.join(", ") : invoice.subject?.trim() || "";
  return {
    id: `invoice-${invoice.id}`,
    kind: kind === "vendor" ? "Gasto" : "Ingreso",
    date: invoice.issue_date,
    concept: detail ? `${invoice.invoice_number} · ${detail}` : invoice.invoice_number,
    clientId: invoice.client_id,
    status: effectiveStatus(invoice),
    amount: num(invoice.total),
    currency: invoice.currency,
  };
}

export function invoiceBalance(invoice: Invoice): number {
  return Math.max(num(invoice.total) - num(invoice.amount_paid), 0);
}

/**
 * Movimiento de una factura visto desde la ficha de un cliente. Si la factura
 * reparte el gasto entre varias marcas, solo cuenta las filas de ese cliente.
 */
export function invoiceToClientMovement(
  invoice: Invoice,
  items: InvoiceItem[],
  clientId: string,
): Movement {
  if (!invoice.multi_client) return invoiceToMovement(invoice, items);
  const scoped = items.filter((item) => item.client_id === clientId);
  const movement = invoiceToMovement(invoice, scoped);
  return {
    ...movement,
    amount: round2(scoped.reduce((sum, item) => sum + num(item.amount), 0)),
  };
}

/** ¿Esta factura toca a este cliente, ya sea directa o por reparto entre marcas? */
export function invoiceTouchesClient(
  invoice: Invoice,
  items: InvoiceItem[],
  clientId: string,
): boolean {
  if (invoice.multi_client) return items.some((item) => item.client_id === clientId);
  return invoice.client_id === clientId;
}

/** Consolida las facturas activas separando ingresos (clientes) de gastos (proveedores). */
export function invoiceLedger(invoices: Invoice[], usdRate: number): InvoiceLedger {
  const dop = (invoice: Invoice, value: number) =>
    invoice.currency === "USD" ? value * usdRate : value;
  const active = invoices.filter(
    (invoice) => invoice.status !== "Borrador" && invoice.status !== "Cancelada",
  );
  const income = active.filter((invoice) => invoiceKind(invoice) === "client");
  const expense = active.filter((invoice) => invoiceKind(invoice) === "vendor");
  const total = (rows: Invoice[]) =>
    rows.reduce((sum, invoice) => sum + dop(invoice, num(invoice.total)), 0);
  const paidSum = (rows: Invoice[]) =>
    rows.reduce((sum, invoice) => sum + dop(invoice, num(invoice.amount_paid)), 0);
  const open = (rows: Invoice[]) =>
    rows
      .filter((invoice) => invoiceBalance(invoice) > 0)
      .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""));

  const incomeBilled = total(income);
  const incomePaid = paidSum(income);
  const expenseBilled = total(expense);
  const expensePaid = paidSum(expense);

  return {
    incomeBilled,
    incomePaid,
    receivable: Math.max(incomeBilled - incomePaid, 0),
    expenseBilled,
    expensePaid,
    payable: Math.max(expenseBilled - expensePaid, 0),
    netFlow: incomePaid - expensePaid,
    incomeOpen: open(income),
    expenseOpen: open(expense),
  };
}

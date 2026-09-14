import { supabase } from "@/integrations/supabase/client";
import { num, todayISO } from "@/lib/finance";
import {
  KIND_COPY,
  computeTotals,
  invoiceKind,
  itemAmount,
  nextInvoiceNumber,
  round2,
  statusFromPayments,
  type DraftItem,
  type Invoice,
  type InvoiceKind,
  type InvoiceStatus,
} from "@/lib/invoices";

export type InvoiceAttachment = { path: string; name: string; size: number };

export type InvoiceInput = {
  id?: string;
  invoiceType: InvoiceKind;
  invoiceNumber: string;
  clientId: string | null;
  vendorId: string | null;
  sellerId: string | null;
  orderNumber: string | null;
  issueDate: string;
  dueDate: string | null;
  paymentTerms: string;
  subject: string | null;
  currency: string;
  discount: number;
  discountType: string;
  shipping: number;
  adjustment: number;
  notes: string | null;
  terms: string | null;
  status: InvoiceStatus;
  items: DraftItem[];
  attachments: InvoiceAttachment[];
};

function cleanItems(items: DraftItem[]) {
  return items.filter((item) => item.description.trim() || num(item.rate) > 0);
}

async function generateNumber(kind: InvoiceKind): Promise<string> {
  const { data } = await supabase
    .from("invoices")
    .select("invoice_number")
    .order("invoice_number", { ascending: false })
    .limit(200);
  return nextInvoiceNumber(
    (data ?? []).map((row) => row.invoice_number),
    kind,
  );
}

export async function saveInvoice(input: InvoiceInput): Promise<string> {
  const items = cleanItems(input.items);
  if (items.some((item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1)) {
    throw new Error("La cantidad de cada artículo debe ser un número entero mayor que cero");
  }
  const totals = computeTotals({
    items,
    discount: input.discount,
    discountType: input.discountType,
    shipping: input.shipping,
    adjustment: input.adjustment,
  });

  let paid = 0;
  if (input.id) {
    const { data } = await supabase
      .from("invoice_payments")
      .select("amount")
      .eq("invoice_id", input.id);
    paid = round2((data ?? []).reduce((sum, row) => sum + num(row.amount), 0));
  }

  const kind = input.invoiceType;
  const base = {
    invoice_type: kind,
    financial_type: KIND_COPY[kind].financialType,
    // En documentos de proveedor el cliente es opcional: vincula el gasto a la marca.
    client_id: input.clientId,
    vendor_id: kind === "vendor" ? input.vendorId : null,
    seller_id: input.sellerId,
    order_number: input.orderNumber,
    issue_date: input.issueDate,
    due_date: input.dueDate,
    payment_terms: input.paymentTerms,
    subject: input.subject,
    currency: input.currency,
    subtotal: totals.subtotal,
    discount: input.discount,
    discount_type: input.discountType,
    shipping: totals.shipping,
    adjustment: totals.adjustment,
    tax: totals.taxAmount,
    total: totals.total,
    amount_paid: paid,
    balance_due: round2(Math.max(totals.total - paid, 0)),
    notes: input.notes,
    terms: input.terms,
    attachments: input.attachments,
  };

  const status = statusFromPayments(
    { status: input.status, due_date: input.dueDate },
    totals.total,
    paid,
  );

  let invoiceId = input.id ?? "";

  if (input.id) {
    const { error } = await supabase
      .from("invoices")
      .update({ ...base, status })
      .eq("id", input.id);
    if (error) throw new Error(error.message);
    const { error: deleteError } = await supabase
      .from("invoice_items")
      .delete()
      .eq("invoice_id", input.id);
    if (deleteError) throw new Error(deleteError.message);
  } else {
    let attempt = 0;
    let number = input.invoiceNumber || (await generateNumber(kind));
    for (;;) {
      const { data, error } = await supabase
        .from("invoices")
        .insert({ ...base, invoice_number: number, status })
        .select("id")
        .single();
      if (!error && data) {
        invoiceId = data.id;
        break;
      }
      if (error?.code === "23505" && attempt < 5) {
        attempt += 1;
        number = await generateNumber(kind);
        continue;
      }
      throw new Error(error?.message ?? "No se pudo crear la factura");
    }
  }

  if (items.length) {
    const { error } = await supabase.from("invoice_items").insert(
      items.map((item, index) => ({
        invoice_id: invoiceId,
        description: item.description.trim() || "Servicio",
        quantity: num(item.quantity),
        rate: num(item.rate),
        tax: num(item.tax),
        amount: round2(itemAmount(item.quantity, item.rate)),
        position: index,
        obligation_id: kind === "vendor" ? (item.obligationId ?? null) : null,
      })),
    );
    if (error) throw new Error(error.message);
  }

  return invoiceId;
}

export async function registerPayment(input: {
  invoiceId: string;
  paymentDate: string;
  amount: number;
  method: string;
  reference: string | null;
  notes: string | null;
}): Promise<void> {
  const { error } = await supabase.from("invoice_payments").insert({
    invoice_id: input.invoiceId,
    payment_date: input.paymentDate,
    amount: input.amount,
    payment_method: input.method,
    reference: input.reference,
    notes: input.notes,
  });
  if (error) throw new Error(error.message);
}

export async function deletePayment(paymentId: string): Promise<void> {
  const { error } = await supabase.from("invoice_payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);
}

export async function setInvoiceStatus(
  invoice: Invoice,
  status: InvoiceStatus,
): Promise<void> {
  const { error } = await supabase.from("invoices").update({ status }).eq("id", invoice.id);
  if (error) throw new Error(error.message);
}

/** Marca la factura como emitida y recalcula su estado según pagos y vencimiento. */
export async function issueInvoice(invoice: Invoice): Promise<void> {
  const status = statusFromPayments(
    { status: "Pendiente", due_date: invoice.due_date },
    num(invoice.total),
    num(invoice.amount_paid),
  );
  await setInvoiceStatus(invoice, status);
}

export async function duplicateInvoice(
  invoice: Invoice,
  items: { description: string; quantity: number; rate: number; tax: number }[],
): Promise<string> {
  return saveInvoice({
    invoiceType: invoiceKind(invoice),
    invoiceNumber: "",
    clientId: invoice.client_id,
    vendorId: invoice.vendor_id,
    sellerId: invoice.seller_id,
    orderNumber: invoice.order_number,
    issueDate: todayISO(),
    dueDate: invoice.due_date,
    paymentTerms: invoice.payment_terms,
    subject: invoice.subject,
    currency: invoice.currency,
    discount: num(invoice.discount),
    discountType: invoice.discount_type,
    shipping: num(invoice.shipping),
    adjustment: num(invoice.adjustment),
    notes: invoice.notes,
    terms: invoice.terms,
    status: "Borrador",
    attachments: [],
    items: items.map((item, index) => ({
      key: `dup-${index}`,
      description: item.description,
      quantity: String(item.quantity),
      rate: String(item.rate),
      tax: String(item.tax),
    })),
  });
}

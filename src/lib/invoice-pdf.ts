import { jsPDF } from "jspdf";

import { num } from "@/lib/finance";
import {
  AGENCY,
  computeTotals,
  effectiveStatus,
  formatLongDate,
  invoiceKind,
  itemAmount,
  KIND_COPY,
  type Invoice,
  type InvoiceItem,
} from "@/lib/invoices";
import type { Client, Provider } from "@/lib/finance";

const PURPLE: [number, number, number] = [124, 92, 246];
const DARK: [number, number, number] = [38, 38, 42];
const GREY: [number, number, number] = [110, 112, 120];
const LIGHT: [number, number, number] = [235, 236, 240];
const GREEN: [number, number, number] = [76, 175, 118];
const RED: [number, number, number] = [214, 69, 69];

function amount(value: unknown, currency = "DOP"): string {
  return `${currency}${num(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function plain(value: unknown): string {
  return num(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export type InvoicePdfInput = {
  invoice: Invoice;
  items: InvoiceItem[];
  client: Client | null;
  vendor?: Provider | null;
};

export function buildInvoicePdf({ invoice, items, client, vendor }: InvoicePdfInput): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const left = 56;
  const right = pageWidth - 56;
  const currency = invoice.currency || "DOP";
  const status = effectiveStatus(invoice);
  const balance = Math.max(num(invoice.total) - num(invoice.amount_paid), 0);
  const kind = invoiceKind(invoice);
  const copy = KIND_COPY[kind];
  const entityName =
    kind === "vendor" ? (vendor?.name ?? "Proveedor sin asignar") : (client?.name ?? "Cliente sin asignar");
  const entityLines =
    kind === "vendor"
      ? [vendor?.specialty, vendor?.email, vendor?.phone]
      : [
          client?.company,
          client?.address,
          client?.email,
          client?.phone,
          client?.tax_id ? `RNC/ID: ${client.tax_id}` : null,
        ];

  const totals = computeTotals({
    items,
    discount: invoice.discount,
    discountType: invoice.discount_type,
    shipping: invoice.shipping,
    adjustment: invoice.adjustment,
  });

  // Marco del documento
  doc.setDrawColor(...LIGHT);
  doc.setLineWidth(0.8);
  doc.rect(28, 28, pageWidth - 56, doc.internal.pageSize.getHeight() - 56);

  // Cinta de estado
  if (status === "Pagada" || status === "Cancelada") {
    const tone = status === "Pagada" ? GREEN : RED;
    doc.setFillColor(...tone);
    doc.triangle(28, 108, 28, 60, 76, 28, "F");
    doc.triangle(28, 108, 76, 28, 116, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(status === "Pagada" ? "Pagado" : "Anulada", 44, 78, { angle: 45 });
  }

  // Encabezado
  doc.setTextColor(...DARK);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(30);
  doc.text(copy.pdfTitle, right, 96, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`# ${invoice.invoice_number}`, right, 118, { align: "right" });

  doc.setFontSize(8.5);
  doc.setTextColor(...GREY);
  doc.text(copy.balanceLabel, right, 148, { align: "right" });
  doc.setFontSize(15);
  doc.setTextColor(...DARK);
  doc.text(amount(balance, currency), right, 168, { align: "right" });

  // Logo
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...PURPLE);
  doc.text("Skyl", left + 20, 150);
  const skyWidth = doc.getTextWidth("Skyl");
  doc.setTextColor(...DARK);
  doc.text("oo", left + 20 + skyWidth, 150);
  const ooWidth = doc.getTextWidth("oo");
  doc.setTextColor(...PURPLE);
  doc.text("p", left + 20 + skyWidth + ooWidth, 150);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...DARK);
  doc.text(AGENCY.name, left, 196);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(AGENCY.country, left, 210);
  doc.text(AGENCY.email, left, 224);

  // Datos de la factura
  let metaY = 262;
  const metaLabelX = right - 130;
  const metaRows: [string, string][] = [
    ["Fecha de la factura :", formatLongDate(invoice.issue_date)],
    ["Términos :", invoice.payment_terms],
    ["Fecha de vencimiento :", formatLongDate(invoice.due_date)],
  ];
  doc.setFontSize(9);
  metaRows.forEach(([label, value]) => {
    doc.setTextColor(...GREY);
    doc.text(label, metaLabelX, metaY, { align: "right" });
    doc.setTextColor(...DARK);
    doc.text(value, right, metaY, { align: "right" });
    metaY += 18;
  });

  // Facturar a
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(copy.pdfEntity, left, 262);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...PURPLE);
  doc.text(entityName, left, 280);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  let billY = 296;
  entityLines
    .filter((line): line is string => Boolean(line))
    .forEach((line) => {
      doc.text(line, left, billY);
      billY += 13;
    });

  let y = Math.max(metaY, billY) + 22;

  if (invoice.subject) {
    doc.setTextColor(...GREY);
    doc.setFontSize(9);
    doc.text("Asunto :", left, y);
    doc.setTextColor(...DARK);
    doc.setFontSize(10);
    doc.text(invoice.subject, left, y + 16);
    y += 40;
  }

  // Tabla de artículos
  const cols = { num: left + 8, desc: left + 32, qty: right - 210, rate: right - 120, amount: right - 8 };
  doc.setFillColor(...DARK);
  doc.rect(left, y, right - left, 26, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("#", cols.num, y + 17);
  doc.text("Artículo & Descripción", cols.desc, y + 17);
  doc.text("Cant.", cols.qty, y + 17, { align: "right" });
  doc.text("Tarifa", cols.rate, y + 17, { align: "right" });
  doc.text("Cantidad", cols.amount, y + 17, { align: "right" });
  y += 26;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  const sorted = [...items].sort((a, b) => a.position - b.position);
  sorted.forEach((item, index) => {
    const lines = doc.splitTextToSize(item.description, cols.qty - cols.desc - 24) as string[];
    const rowHeight = Math.max(30, lines.length * 13 + 16);
    doc.setTextColor(...GREY);
    doc.text(String(index + 1), cols.num, y + 20);
    doc.setTextColor(...DARK);
    doc.text(lines, cols.desc, y + 20);
    doc.text(plain(item.quantity), cols.qty, y + 20, { align: "right" });
    doc.text(plain(item.rate), cols.rate, y + 20, { align: "right" });
    doc.text(plain(itemAmount(item.quantity, item.rate)), cols.amount, y + 20, { align: "right" });
    y += rowHeight;
    doc.setDrawColor(...LIGHT);
    doc.line(left, y, right, y);
  });

  // Totales
  y += 24;
  const labelX = right - 150;
  const totalRows: [string, string, boolean][] = [
    ["Subtotal", plain(totals.subtotal), false],
  ];
  if (totals.discountAmount) totalRows.push(["Descuento", `(-) ${plain(totals.discountAmount)}`, false]);
  if (totals.taxAmount) totalRows.push(["Impuestos", plain(totals.taxAmount), false]);
  if (totals.shipping) totalRows.push(["Cargos de envío", plain(totals.shipping), false]);
  if (totals.adjustment) totalRows.push(["Ajuste", plain(totals.adjustment), false]);
  totalRows.push(["Total", amount(invoice.total, currency), true]);
  if (num(invoice.amount_paid) > 0)
    totalRows.push(["Pago realizado", `(-) ${plain(invoice.amount_paid)}`, false]);

  doc.setFontSize(9.5);
  totalRows.forEach(([label, value, bold]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setTextColor(...(bold ? DARK : GREY));
    doc.text(label, labelX, y, { align: "right" });
    doc.setTextColor(...DARK);
    doc.text(value, cols.amount, y, { align: "right" });
    y += 20;
  });

  doc.setFillColor(246, 246, 249);
  doc.rect(labelX - 130, y - 4, right - labelX + 138, 30, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...DARK);
  doc.text(copy.balanceLabel, labelX, y + 16, { align: "right" });
  doc.text(amount(balance, currency), cols.amount, y + 16, { align: "right" });
  y += 56;

  // Notas y términos
  const block = (title: string, body: string) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...DARK);
    doc.text(title, left, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(body, right - left) as string[];
    doc.text(lines, left, y);
    y += lines.length * 12 + 20;
  };

  if (invoice.notes) block("Notas", invoice.notes);
  if (invoice.terms) block("Términos y condiciones", invoice.terms);

  return doc;
}

export function downloadInvoicePdf(input: InvoicePdfInput): void {
  buildInvoicePdf(input).save(`${input.invoice.invoice_number}.pdf`);
}

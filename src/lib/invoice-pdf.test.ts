import { test } from "node:test";
import assert from "node:assert/strict";
import { buildInvoicePdf } from "./invoice-pdf";
import type { Invoice, InvoiceItem } from "./invoices";

function fixture(notes: string, description = "Servicio") {
  const invoice = {
    invoice_number: "TEST-001",
    invoice_type: "client",
    currency: "DOP",
    status: "Pendiente",
    total: 6000,
    amount_paid: 0,
    discount: 0,
    discount_type: "amount",
    shipping: 0,
    adjustment: 0,
    issue_date: "2026-11-02",
    due_date: "2026-11-30",
    payment_terms: "30 días",
    notes,
    terms: "Términos finales",
    subject: "",
  } as Invoice;
  const items = [{ description, quantity: 1, rate: 6000, tax: 0, position: 0 }] as InvoiceItem[];
  return buildInvoicePdf({ invoice, items, client: null });
}

test("notas largas y términos se conservan dentro de las páginas", () => {
  const doc = fixture(Array.from({ length: 140 }, (_, i) => `Nota ${i}`).join("\n"));
  assert.ok(doc.getNumberOfPages() >= 3);
  const pdf = doc.output();
  assert.ok(pdf.includes("Nota 139"));
  assert.ok(pdf.includes("finales"));
  for (let page = 1; page <= doc.getNumberOfPages(); page++) {
    const stream = doc.internal.pages[page].join("\n");
    for (const match of stream.matchAll(/([\d.-]+) ([\d.-]+) Td/g)) {
      assert.ok(Number(match[2]) >= 56, `texto fuera del margen en página ${page}`);
    }
  }
});

test("descripción extensa continúa sin perder la última línea", () => {
  const doc = fixture(
    "Nota final",
    Array.from({ length: 120 }, (_, i) => `Artículo ${i}`).join("\n"),
  );
  assert.ok(doc.getNumberOfPages() >= 3);
  assert.ok(doc.output().includes("119"));
  assert.ok(doc.output().includes("Nota final"));
});

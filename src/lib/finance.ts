import type { Tables } from "@/integrations/supabase/types";

export type Client = Tables<"clients">;
export type Service = Tables<"services">;
export type Provider = Tables<"providers">;
export type ClientService = Tables<"client_services">;
export type ClientServiceMonth = Tables<"client_service_months">;
/** Asignación con los valores efectivos de un mes concreto (base + ajuste mensual). */
export type EffectiveClientService = ClientService & { monthAdjusted: boolean };

/**
 * Devuelve las asignaciones con los valores que aplican en `month`:
 * si existe un ajuste mensual, su costo/cantidad/proveedor reemplazan los del valor habitual.
 */
export function effectiveAssignments(
  assignments: ClientService[],
  overrides: ClientServiceMonth[],
  month: string,
): EffectiveClientService[] {
  return assignments
    .filter(
      (row) =>
        (!row.start_month || row.start_month <= month) && (!row.end_month || row.end_month >= month),
    )
    .map((row) => {
    const override = (overrides ?? []).find(
      (item) => item.client_service_id === row.id && item.month === month,
    );
    if (!override) return { ...row, monthAdjusted: false };
    return {
      ...row,
      cost: override.cost,
      monthly_quantity: override.monthly_quantity,
      provider_id: override.provider_id,
      monthAdjusted: true,
    };
  });
}
export type Income = Tables<"incomes">;
export type Expense = Tables<"expenses">;
export type MonthlyHistory = Tables<"monthly_history">;
export type AppSettings = Tables<"app_settings">;

export type Movement = {
  id: string;
  kind: "Ingreso" | "Gasto";
  date: string;
  concept: string;
  clientId: string | null;
  status: string;
  amount: number;
  currency: string;
};

export function num(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function money(value: unknown, currency = "DOP"): string {
  return new Intl.NumberFormat("es-DO", {
    style: "currency",
    currency: currency === "USD" ? "USD" : "DOP",
    maximumFractionDigits: 0,
  }).format(num(value));
}

export function monthOf(date: string | null): string {
  return (date ?? "").slice(0, 7);
}

export function monthLabel(month: string): string {
  const date = new Date(`${month}-02T00:00:00`);
  const label = date.toLocaleDateString("es-DO", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function toDop(amount: unknown, currency: string, usdRate: number): number {
  return currency === "USD" ? num(amount) * num(usdRate) : num(amount);
}

export function sumDop(
  rows: { amount: unknown; currency: string }[],
  usdRate: number,
): number {
  return rows.reduce((total, row) => total + toDop(row.amount, row.currency, usdRate), 0);
}

export type MonthMetrics = {
  billed: number;
  collected: number;
  receivable: number;
  registered: number;
  paid: number;
  payable: number;
  cashProfit: number;
  accrualProfit: number;
};

export function monthMetrics(
  incomes: Income[],
  expenses: Expense[],
  usdRate: number,
): MonthMetrics {
  const billed = sumDop(incomes, usdRate);
  const collected = sumDop(
    incomes.filter((row) => row.status === "Cobrado"),
    usdRate,
  );
  const registered = sumDop(expenses, usdRate);
  const paid = sumDop(
    expenses.filter((row) => row.status === "Pagado"),
    usdRate,
  );
  return {
    billed,
    collected,
    receivable: billed - collected,
    registered,
    paid,
    payable: registered - paid,
    cashProfit: collected - paid,
    accrualProfit: billed - registered,
  };
}

export type ClientMetrics = {
  revenue: number;
  costs: number;
  profit: number;
  margin: number;
  receivable: number;
};

export function clientMetrics(
  clientId: string,
  incomes: Income[],
  expenses: Expense[],
  usdRate: number,
): ClientMetrics {
  const clientIncomes = incomes.filter((row) => row.client_id === clientId);
  const clientExpenses = expenses.filter((row) => row.client_id === clientId);
  const revenue = sumDop(clientIncomes, usdRate);
  const costs = sumDop(clientExpenses, usdRate);
  const profit = revenue - costs;
  return {
    revenue,
    costs,
    profit,
    margin: revenue ? (profit / revenue) * 100 : 0,
    receivable:
      revenue -
      sumDop(
        clientIncomes.filter((row) => row.status === "Cobrado"),
        usdRate,
      ),
  };
}

export function statusTone(status: string): "success" | "danger" | "warning" | "info" {
  if (["Cobrado", "Pagado", "Activo", "Disponible"].includes(status)) return "success";
  if (["Vencido", "Cancelado", "Inactivo", "No disponible"].includes(status)) return "danger";
  if (["Pendiente", "Parcial", "Prospecto", "Pausado"].includes(status)) return "warning";
  return "info";
}

export function marginTone(margin: number): "success" | "warning" | "danger" {
  if (margin >= 40) return "success";
  if (margin >= 20) return "warning";
  return "danger";
}

export type EstimatedMetrics = {
  /** Pago mensual convertido a pesos (moneda de los costos de servicios). */
  payment: number;
  /** Pago mensual tal como se cobra al cliente. */
  paymentOriginal: number;
  paymentCurrency: string;
  serviceCost: number;
  estimatedProfit: number;
  estimatedMargin: number;
};

export function estimatedMetrics(
  client: Client,
  assignments: ClientService[],
  usdRate = 1,
): EstimatedMetrics {
  const paymentOriginal = num(client.monthly_payment);
  const payment = toDop(paymentOriginal, client.currency, usdRate);
  const serviceCost = assignments
    .filter((row) => row.client_id === client.id && row.active)
    .reduce((total, row) => total + num(row.cost), 0);
  const estimatedProfit = payment - serviceCost;
  return {
    payment,
    paymentOriginal,
    paymentCurrency: client.currency,
    serviceCost,
    estimatedProfit,
    estimatedMargin: payment ? (estimatedProfit / payment) * 100 : 0,
  };
}

export function incomeToMovement(row: Income): Movement {
  return {
    id: row.id,
    kind: "Ingreso",
    date: row.invoice_date,
    concept: row.concept,
    clientId: row.client_id,
    status: row.status,
    amount: num(row.amount),
    currency: row.currency,
  };
}

export function expenseToMovement(row: Expense): Movement {
  return {
    id: row.id,
    kind: "Gasto",
    date: row.expense_date,
    concept: row.concept,
    clientId: row.client_id,
    status: row.status,
    amount: num(row.amount),
    currency: row.currency,
  };
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

export function downloadFile(name: string, text: string, type: string): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const columns = Object.keys(rows[0]!);
  const escape = (value: unknown) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(",")),
  ].join("\n");
}

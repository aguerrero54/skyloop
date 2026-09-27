import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  effectiveAssignments,
  monthOf,
  num,
  type AppSettings,
  type Client,
  type ClientService,
  type ClientServiceMonth,
  type EffectiveClientService,
  type Expense,
  type Income,
  type MonthlyHistory,
  type Provider,
  type Service,
} from "@/lib/finance";
import type {
  Invoice,
  InvoiceItem,
  InvoicePayment,
  ProviderObligation,
} from "@/lib/invoices";

export type FormKind =
  | "income"
  | "expense"
  | "client"
  | "provider"
  | "service"
  | "assignment"
  | "obligation";

export type SkyloopData = {
  clients: Client[];
  services: Service[];
  providers: Provider[];
  clientServices: ClientService[];
  clientServiceMonths: ClientServiceMonth[];
  incomes: Income[];
  expenses: Expense[];
  history: MonthlyHistory[];
  settings: AppSettings | null;
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  invoicePayments: InvoicePayment[];
  providerObligations: ProviderObligation[];
};

const emptyData: SkyloopData = {
  clients: [],
  services: [],
  providers: [],
  clientServices: [],
  clientServiceMonths: [],
  incomes: [],
  expenses: [],
  history: [],
  settings: null,
  invoices: [],
  invoiceItems: [],
  invoicePayments: [],
  providerObligations: [],
};

async function fetchAll(): Promise<SkyloopData> {
  const [
    clients,
    services,
    providers,
    clientServices,
    clientServiceMonths,
    incomes,
    expenses,
    history,
    settings,
    invoices,
    invoiceItems,
    invoicePayments,
    providerObligations,
  ] = await Promise.all([
    supabase.from("clients").select("*").order("name"),
    supabase.from("services").select("*").order("name"),
    supabase.from("providers").select("*").order("name"),
    supabase.from("client_services").select("*"),
    supabase.from("client_service_months").select("*"),
    supabase.from("incomes").select("*").order("invoice_date", { ascending: false }),
    supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
    supabase.from("monthly_history").select("*").order("month"),
    supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    supabase.from("invoices").select("*").order("issue_date", { ascending: false }),
    supabase.from("invoice_items").select("*").order("position"),
    supabase.from("invoice_payments").select("*").order("payment_date"),
    supabase.from("provider_obligations").select("*").order("created_at"),
  ]);

  const failed = [
    clients,
    services,
    providers,
    clientServices,
    clientServiceMonths,
    incomes,
    expenses,
    history,
    settings,
    invoices,
    invoiceItems,
    invoicePayments,
    providerObligations,
  ].find((result) => result.error);
  if (failed?.error) throw failed.error;

  return {
    clients: clients.data ?? [],
    services: services.data ?? [],
    providers: providers.data ?? [],
    clientServices: clientServices.data ?? [],
    clientServiceMonths: clientServiceMonths.data ?? [],
    incomes: incomes.data ?? [],
    expenses: expenses.data ?? [],
    history: history.data ?? [],
    settings: settings.data ?? null,
    invoices: invoices.data ?? [],
    invoiceItems: invoiceItems.data ?? [],
    invoicePayments: invoicePayments.data ?? [],
    providerObligations: providerObligations.data ?? [],
  };
}

type SkyloopContextValue = {
  data: SkyloopData;
  isLoading: boolean;
  error: Error | null;
  month: string;
  setMonth: (month: string) => void;
  months: string[];
  usdRate: number;
  monthIncomes: Income[];
  monthExpenses: Expense[];
  /** Asignaciones con los valores efectivos del mes seleccionado. */
  monthClientServices: EffectiveClientService[];
  clientName: (id: string | null) => string;
  providerName: (id: string | null) => string;
  serviceName: (id: string | null) => string;
  refresh: () => Promise<void>;
  formState: FormState | null;
  openForm: (
    kind: FormKind,
    options?: {
      clientId?: string;
      assignment?: ClientService;
      service?: Service;
      provider?: Provider;
      client?: Client;
    },
  ) => void;
  closeForm: () => void;
};

export type FormState = {
  kind: FormKind;
  clientId?: string | undefined;
  assignment?: ClientService | undefined;
  service?: Service | undefined;
  provider?: Provider | undefined;
  client?: Client | undefined;
};

const SkyloopContext = createContext<SkyloopContextValue | null>(null);

export function SkyloopProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["skyloop"], queryFn: fetchAll });
  const data = query.data ?? emptyData;

  const months = useMemo(() => {
    const set = new Set<string>();
    data.history.forEach((row) => set.add(row.month));
    data.incomes.forEach((row) => set.add(monthOf(row.invoice_date)));
    data.expenses.forEach((row) => set.add(monthOf(row.expense_date)));
    const now = new Date();
    set.add(now.toISOString().slice(0, 7));
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    set.add(next.toISOString().slice(0, 7));
    return [...set].filter(Boolean).sort().reverse();
  }, [data.history, data.incomes, data.expenses]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const month = selectedMonth && months.includes(selectedMonth) ? selectedMonth : (months[0] ?? "");

  const [formState, setFormState] = useState<FormState | null>(null);

  const usdRate = num(data.settings?.usd_rate) || 60;

  const value: SkyloopContextValue = {
    data,
    isLoading: query.isLoading,
    error: (query.error as Error | null) ?? null,
    month,
    setMonth: setSelectedMonth,
    months,
    usdRate,
    monthIncomes: data.incomes.filter((row) => monthOf(row.invoice_date) === month),
    monthExpenses: data.expenses.filter((row) => monthOf(row.expense_date) === month),
    monthClientServices: effectiveAssignments(data.clientServices, data.clientServiceMonths, month),
    clientName: (id) => data.clients.find((row) => row.id === id)?.name ?? "—",
    providerName: (id) => data.providers.find((row) => row.id === id)?.name ?? "—",
    serviceName: (id) => data.services.find((row) => row.id === id)?.name ?? "—",
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ["skyloop"] });
    },
    formState,
    openForm: (kind, options = {}) => setFormState({ kind, ...options }),
    closeForm: () => setFormState(null),
  };

  return <SkyloopContext.Provider value={value}>{children}</SkyloopContext.Provider>;
}

export function useSkyloop(): SkyloopContextValue {
  const context = useContext(SkyloopContext);
  if (!context) throw new Error("useSkyloop debe usarse dentro de SkyloopProvider");
  return context;
}

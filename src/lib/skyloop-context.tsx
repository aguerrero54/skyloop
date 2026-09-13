import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";
import {
  monthOf,
  num,
  type AppSettings,
  type Client,
  type ClientService,
  type Expense,
  type Income,
  type MonthlyHistory,
  type Provider,
  type Service,
} from "@/lib/finance";

export type FormKind =
  | "income"
  | "expense"
  | "client"
  | "provider"
  | "service"
  | "assignment";

export type SkyloopData = {
  clients: Client[];
  services: Service[];
  providers: Provider[];
  clientServices: ClientService[];
  incomes: Income[];
  expenses: Expense[];
  history: MonthlyHistory[];
  settings: AppSettings | null;
};

const emptyData: SkyloopData = {
  clients: [],
  services: [],
  providers: [],
  clientServices: [],
  incomes: [],
  expenses: [],
  history: [],
  settings: null,
};

async function fetchAll(): Promise<SkyloopData> {
  const [clients, services, providers, clientServices, incomes, expenses, history, settings] =
    await Promise.all([
      supabase.from("clients").select("*").order("name"),
      supabase.from("services").select("*").order("name"),
      supabase.from("providers").select("*").order("name"),
      supabase.from("client_services").select("*"),
      supabase.from("incomes").select("*").order("invoice_date", { ascending: false }),
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }),
      supabase.from("monthly_history").select("*").order("month"),
      supabase.from("app_settings").select("*").eq("id", 1).maybeSingle(),
    ]);

  const failed = [clients, services, providers, clientServices, incomes, expenses, history, settings].find(
    (result) => result.error,
  );
  if (failed?.error) throw failed.error;

  return {
    clients: clients.data ?? [],
    services: services.data ?? [],
    providers: providers.data ?? [],
    clientServices: clientServices.data ?? [],
    incomes: incomes.data ?? [],
    expenses: expenses.data ?? [],
    history: history.data ?? [],
    settings: settings.data ?? null,
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
  clientName: (id: string | null) => string;
  providerName: (id: string | null) => string;
  serviceName: (id: string | null) => string;
  refresh: () => Promise<void>;
  formState: { kind: FormKind; clientId?: string } | null;
  openForm: (kind: FormKind, clientId?: string) => void;
  closeForm: () => void;
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
    set.add(new Date().toISOString().slice(0, 7));
    return [...set].filter(Boolean).sort().reverse();
  }, [data.history, data.incomes, data.expenses]);

  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const month = selectedMonth && months.includes(selectedMonth) ? selectedMonth : (months[0] ?? "");

  const [formState, setFormState] = useState<{ kind: FormKind; clientId?: string } | null>(null);

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
    clientName: (id) => data.clients.find((row) => row.id === id)?.name ?? "—",
    providerName: (id) => data.providers.find((row) => row.id === id)?.name ?? "—",
    serviceName: (id) => data.services.find((row) => row.id === id)?.name ?? "—",
    refresh: async () => {
      await queryClient.invalidateQueries({ queryKey: ["skyloop"] });
    },
    formState,
    openForm: (kind, clientId) => setFormState({ kind, clientId }),
    closeForm: () => setFormState(null),
  };

  return <SkyloopContext.Provider value={value}>{children}</SkyloopContext.Provider>;
}

export function useSkyloop(): SkyloopContextValue {
  const context = useContext(SkyloopContext);
  if (!context) throw new Error("useSkyloop debe usarse dentro de SkyloopProvider");
  return context;
}

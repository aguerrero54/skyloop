import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";

export type DashboardBlockId =
  | "kpi-billed"
  | "kpi-collected"
  | "kpi-expenses"
  | "kpi-profit"
  | "invoices"
  | "chart"
  | "top-clients"
  | "profit"
  | "attention"
  | "period";

export type DashboardBlock = { id: DashboardBlockId; visible: boolean };

export const dashboardBlockCatalog: { id: DashboardBlockId; label: string; hint: string }[] = [
  { id: "kpi-billed", label: "Facturación", hint: "Tarjeta principal" },
  { id: "kpi-collected", label: "Cobrado", hint: "Tarjeta principal" },
  { id: "kpi-expenses", label: "Gastos registrados", hint: "Tarjeta principal" },
  { id: "kpi-profit", label: "Margen de ganancias", hint: "Tarjeta principal" },
  { id: "invoices", label: "Facturación del módulo de Facturas", hint: "Panel de facturas" },
  { id: "chart", label: "Ingresos vs. gastos", hint: "Gráfico del año" },
  { id: "top-clients", label: "Clientes por facturación", hint: "Ranking del mes" },
  { id: "profit", label: "Rentabilidad por cliente", hint: "Tabla resumida" },
  { id: "attention", label: "Control inmediato", hint: "Cobros, pagos y clientes" },
  { id: "period", label: "Nota del período", hint: "Texto al final" },
];

export const defaultDashboardLayout: DashboardBlock[] = dashboardBlockCatalog.map((block) => ({
  id: block.id,
  visible: true,
}));

const storagePrefix = "skyloop-dashboard:";
const validIds = new Set(dashboardBlockCatalog.map((block) => block.id));

export function normalizeLayout(value: unknown): DashboardBlock[] {
  if (!Array.isArray(value)) return defaultDashboardLayout;
  const seen = new Set<DashboardBlockId>();
  const layout: DashboardBlock[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const id = (entry as { id?: unknown }).id;
    if (typeof id !== "string" || !validIds.has(id as DashboardBlockId)) continue;
    if (seen.has(id as DashboardBlockId)) continue;
    seen.add(id as DashboardBlockId);
    layout.push({
      id: id as DashboardBlockId,
      visible: (entry as { visible?: unknown }).visible !== false,
    });
  }
  for (const block of defaultDashboardLayout) {
    if (!seen.has(block.id)) layout.push(block);
  }
  return layout.length ? layout : defaultDashboardLayout;
}

function readStored(userId: string): DashboardBlock[] | null {
  try {
    const raw = window.localStorage.getItem(`${storagePrefix}${userId}`);
    if (!raw) return null;
    return normalizeLayout(JSON.parse(raw));
  } catch {
    return null;
  }
}

function store(userId: string, layout: DashboardBlock[]) {
  try {
    window.localStorage.setItem(`${storagePrefix}${userId}`, JSON.stringify(layout));
  } catch {
    /* ignore */
  }
}

export function moveBlock(layout: DashboardBlock[], index: number, direction: -1 | 1) {
  const target = index + direction;
  if (target < 0 || target >= layout.length) return layout;
  const next = [...layout];
  const a = next[index];
  const b = next[target];
  if (!a || !b) return layout;
  next[index] = b;
  next[target] = a;
  return next;
}

type DashboardPrefsValue = {
  layout: DashboardBlock[];
  savedLayout: DashboardBlock[];
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  setLayout: (next: DashboardBlock[] | ((current: DashboardBlock[]) => DashboardBlock[])) => void;
  save: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  discard: () => void;
};

const DashboardPrefsContext = createContext<DashboardPrefsValue | null>(null);

export function DashboardPrefsProvider({
  userId,
  children,
}: {
  userId: string;
  children: ReactNode;
}) {
  const cached = typeof window === "undefined" ? null : readStored(userId);
  const [layout, setLayoutState] = useState<DashboardBlock[]>(cached ?? defaultDashboardLayout);
  const [savedLayout, setSavedLayout] = useState<DashboardBlock[]>(cached ?? defaultDashboardLayout);
  const [isSaving, setIsSaving] = useState(false);

  const query = useQuery({
    queryKey: ["dashboard-layout", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("dashboard_layout")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return normalizeLayout(data?.dashboard_layout ?? null);
    },
  });

  useEffect(() => {
    if (!query.data) return;
    setLayoutState(query.data);
    setSavedLayout(query.data);
    store(userId, query.data);
  }, [query.data, userId]);

  const setLayout = useCallback(
    (next: DashboardBlock[] | ((current: DashboardBlock[]) => DashboardBlock[])) => {
      setLayoutState(next);
    },
    [],
  );

  const persist = useCallback(
    async (next: DashboardBlock[]) => {
      setIsSaving(true);
      const { error } = await supabase.from("user_preferences").upsert({
        user_id: userId,
        dashboard_layout: next,
        updated_at: new Date().toISOString(),
      });
      setIsSaving(false);
      if (error) {
        toast.error("No se pudo guardar la personalización", { description: error.message });
        return false;
      }
      setSavedLayout(next);
      setLayoutState(next);
      store(userId, next);
      return true;
    },
    [userId],
  );

  const save = useCallback(() => persist(layout), [persist, layout]);
  const restore = useCallback(() => persist(defaultDashboardLayout), [persist]);
  const discard = useCallback(() => setLayoutState(savedLayout), [savedLayout]);

  const value = useMemo<DashboardPrefsValue>(
    () => ({
      layout,
      savedLayout,
      isLoading: query.isLoading,
      isSaving,
      hasChanges: JSON.stringify(layout) !== JSON.stringify(savedLayout),
      setLayout,
      save,
      restore,
      discard,
    }),
    [layout, savedLayout, query.isLoading, isSaving, setLayout, save, restore, discard],
  );

  return <DashboardPrefsContext.Provider value={value}>{children}</DashboardPrefsContext.Provider>;
}

export function useDashboardPrefs(): DashboardPrefsValue {
  const context = useContext(DashboardPrefsContext);
  if (!context) throw new Error("useDashboardPrefs debe usarse dentro de DashboardPrefsProvider");
  return context;
}

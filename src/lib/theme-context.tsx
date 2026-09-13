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

export type ThemeMode = "light" | "dark" | "system";
export type ThemeColor = "default" | "slate" | "blue" | "purple" | "green" | "rose";
export type ThemePreferences = {
  themeMode: ThemeMode;
  themeColor: ThemeColor;
  backgroundColor: string | null;
};

export const defaultThemePreferences: ThemePreferences = {
  themeMode: "dark",
  themeColor: "default",
  backgroundColor: null,
};

const storagePrefix = "skyloop-theme:";

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "light" || value === "dark" || value === "system";
}

function isThemeColor(value: unknown): value is ThemeColor {
  return ["default", "slate", "blue", "purple", "green", "rose"].includes(String(value));
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const shorthand = /^#([0-9a-f]{3})$/i.exec(trimmed);
  if (shorthand) {
    const digits = shorthand[1];
    if (!digits) return null;
    return `#${digits.split("").map((digit) => digit + digit).join("")}`.toUpperCase();
  }
  return /^#[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toUpperCase() : null;
}

function readStored(userId: string): ThemePreferences | null {
  try {
    const raw = window.localStorage.getItem(`${storagePrefix}${userId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ThemePreferences>;
    if (!isThemeMode(parsed.themeMode) || !isThemeColor(parsed.themeColor)) return null;
    return {
      themeMode: parsed.themeMode,
      themeColor: parsed.themeColor,
      backgroundColor:
        typeof parsed.backgroundColor === "string" ? normalizeHex(parsed.backgroundColor) : null,
    };
  } catch {
    return null;
  }
}

function store(userId: string, preferences: ThemePreferences) {
  window.localStorage.setItem(`${storagePrefix}${userId}`, JSON.stringify(preferences));
}

function resolveMode(mode: ThemeMode): "light" | "dark" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyTheme(preferences: ThemePreferences) {
  const root = document.documentElement;
  const resolved = resolveMode(preferences.themeMode);
  root.dataset.mode = resolved;
  root.dataset.theme = preferences.themeColor;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
  if (preferences.backgroundColor) {
    root.dataset.customBackground = "true";
    root.style.setProperty("--custom-background", preferences.backgroundColor);
  } else {
    delete root.dataset.customBackground;
    root.style.removeProperty("--custom-background");
  }
}

type ThemeContextValue = {
  preferences: ThemePreferences;
  savedPreferences: ThemePreferences;
  isLoading: boolean;
  isSaving: boolean;
  hasChanges: boolean;
  setPreferences: (next: ThemePreferences | ((current: ThemePreferences) => ThemePreferences)) => void;
  save: () => Promise<boolean>;
  restore: () => Promise<boolean>;
  discard: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const cached = typeof window === "undefined" ? null : readStored(userId);
  const [preferences, setPreferencesState] = useState<ThemePreferences>(cached ?? defaultThemePreferences);
  const [savedPreferences, setSavedPreferences] = useState<ThemePreferences>(cached ?? defaultThemePreferences);
  const [isSaving, setIsSaving] = useState(false);

  const query = useQuery({
    queryKey: ["user-preferences", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("theme_mode, theme_color, background_color")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return defaultThemePreferences;
      return {
        themeMode: isThemeMode(data.theme_mode) ? data.theme_mode : "dark",
        themeColor: isThemeColor(data.theme_color) ? data.theme_color : "default",
        backgroundColor: data.background_color ? normalizeHex(data.background_color) : null,
      } satisfies ThemePreferences;
    },
  });

  useEffect(() => {
    if (!query.data) return;
    setPreferencesState(query.data);
    setSavedPreferences(query.data);
    store(userId, query.data);
  }, [query.data, userId]);

  useEffect(() => {
    applyTheme(preferences);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => {
      if (preferences.themeMode === "system") applyTheme(preferences);
    };
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, [preferences]);

  const setPreferences = useCallback(
    (next: ThemePreferences | ((current: ThemePreferences) => ThemePreferences)) => {
      setPreferencesState(next);
    },
    [],
  );

  const persist = useCallback(async (next: ThemePreferences) => {
    setIsSaving(true);
    const { error } = await supabase.from("user_preferences").upsert({
      user_id: userId,
      theme_mode: next.themeMode,
      theme_color: next.themeColor,
      background_color: next.backgroundColor,
      updated_at: new Date().toISOString(),
    });
    setIsSaving(false);
    if (error) {
      toast.error("No se pudo guardar la apariencia", { description: error.message });
      return false;
    }
    setSavedPreferences(next);
    setPreferencesState(next);
    store(userId, next);
    return true;
  }, [userId]);

  const save = useCallback(() => persist(preferences), [persist, preferences]);
  const restore = useCallback(() => persist(defaultThemePreferences), [persist]);
  const discard = useCallback(() => setPreferencesState(savedPreferences), [savedPreferences]);

  const value = useMemo<ThemeContextValue>(() => ({
    preferences,
    savedPreferences,
    isLoading: query.isLoading,
    isSaving,
    hasChanges: JSON.stringify(preferences) !== JSON.stringify(savedPreferences),
    setPreferences,
    save,
    restore,
    discard,
  }), [preferences, savedPreferences, query.isLoading, isSaving, setPreferences, save, restore, discard]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme debe usarse dentro de ThemeProvider");
  return context;
}

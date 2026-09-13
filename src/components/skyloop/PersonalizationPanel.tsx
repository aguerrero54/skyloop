import { useEffect, useState } from "react";
import { Check, Laptop, Moon, RotateCcw, Sun } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  defaultThemePreferences,
  normalizeHex,
  useTheme,
  type ThemeColor,
  type ThemeMode,
} from "@/lib/theme-context";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const modes: Array<{ value: ThemeMode; label: string; description: string; icon: typeof Sun }> = [
  { value: "light", label: "Claro", description: "Fondos claros y texto oscuro.", icon: Sun },
  { value: "dark", label: "Oscuro", description: "Superficies oscuras y menor brillo.", icon: Moon },
  { value: "system", label: "Sistema", description: "Sigue la apariencia del dispositivo.", icon: Laptop },
];

const themes: Array<{ value: ThemeColor; label: string; swatch: string }> = [
  { value: "default", label: "Predeterminado", swatch: "theme-swatch-default" },
  { value: "slate", label: "Slate", swatch: "theme-swatch-slate" },
  { value: "blue", label: "Blue", swatch: "theme-swatch-blue" },
  { value: "purple", label: "Purple", swatch: "theme-swatch-purple" },
  { value: "green", label: "Green", swatch: "theme-swatch-green" },
  { value: "rose", label: "Rose", swatch: "theme-swatch-rose" },
];

export function PersonalizationPanel() {
  const { preferences, isLoading, isSaving, hasChanges, setPreferences, save, restore, discard } = useTheme();
  const [hex, setHex] = useState(preferences.backgroundColor ?? "#111827");
  const [hexError, setHexError] = useState(false);

  useEffect(() => {
    setHex(preferences.backgroundColor ?? (preferences.themeMode === "light" ? "#F8FAFC" : "#111827"));
    setHexError(false);
  }, [preferences.backgroundColor, preferences.themeMode]);

  useEffect(() => () => discard(), [discard]);

  function updateMode(themeMode: ThemeMode) {
    setPreferences((current) => ({ ...current, themeMode }));
  }

  function updateTheme(themeColor: ThemeColor) {
    setPreferences((current) => ({ ...current, themeColor }));
  }

  function updateHex(value: string) {
    setHex(value.toUpperCase());
    const normalized = normalizeHex(value);
    setHexError(!normalized);
    if (normalized) {
      setPreferences((current) => ({ ...current, backgroundColor: normalized }));
    }
  }

  async function handleSave() {
    if (hexError) {
      toast.error("Escribe un color HEX válido");
      return;
    }
    if (await save()) toast.success("Apariencia guardada");
  }

  async function handleRestore() {
    if (await restore()) {
      setHex("#111827");
      setHexError(false);
      toast.success("Apariencia predeterminada restaurada");
    }
  }

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-muted-foreground">Cargando preferencias…</div>;
  }

  return (
    <section className="grid gap-7" aria-labelledby="personalizacion-title">
      <div>
        <h2 id="personalizacion-title" className="text-xl font-bold text-foreground">Personalización</h2>
        <p className="mt-1 text-sm text-muted-foreground">Personaliza cómo se ve tu espacio de trabajo.</p>
      </div>

      <fieldset>
        <legend className="mb-3 text-sm font-bold text-foreground">Apariencia</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const selected = preferences.themeMode === mode.value;
            return (
              <button
                key={mode.value}
                type="button"
                aria-pressed={selected}
                onClick={() => updateMode(mode.value)}
                className={cn(
                  "relative min-h-28 rounded-lg border bg-card p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-primary bg-accent" : "border-border hover:bg-secondary",
                )}
              >
                {selected && <Check className="absolute right-3 top-3 size-4 text-primary" />}
                <Icon className="mb-4 size-5 text-primary" />
                <strong className="block text-sm text-foreground">{mode.label}</strong>
                <span className="mt-1 block text-xs text-muted-foreground">{mode.description}</span>
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 text-sm font-bold text-foreground">Tema de color</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {themes.map((theme) => {
            const selected = preferences.themeColor === theme.value;
            return (
              <button
                key={theme.value}
                type="button"
                aria-pressed={selected}
                onClick={() => updateTheme(theme.value)}
                className={cn(
                  "flex min-h-20 flex-col items-center justify-center gap-2 rounded-lg border bg-card px-3 text-xs font-semibold text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  selected ? "border-primary bg-accent" : "border-border hover:bg-secondary",
                )}
              >
                <span className={cn("size-7 rounded-full border-4 border-background shadow-sm", theme.swatch)} />
                {theme.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(360px,1.2fr)]">
        <fieldset>
          <legend className="mb-3 text-sm font-bold text-foreground">Color de fondo</legend>
          <div className="grid gap-3">
            <label className={cn(
              "flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 transition-colors",
              preferences.backgroundColor === null ? "border-primary bg-accent" : "border-border hover:bg-secondary",
            )}>
              <input
                type="radio"
                name="background-mode"
                checked={preferences.backgroundColor === null}
                onChange={() => setPreferences((current) => ({ ...current, backgroundColor: null }))}
                className="accent-primary"
              />
              <span>
                <strong className="block text-sm text-foreground">Color predeterminado</strong>
                <small className="text-muted-foreground">Usa el fondo equilibrado del tema.</small>
              </span>
            </label>

            <label className={cn(
              "grid cursor-pointer gap-3 rounded-lg border bg-card p-3 transition-colors",
              preferences.backgroundColor !== null ? "border-primary bg-accent" : "border-border hover:bg-secondary",
            )}>
              <span className="flex items-center gap-3">
                <input
                  type="radio"
                  name="background-mode"
                  checked={preferences.backgroundColor !== null}
                  onChange={() => updateHex(hex)}
                  className="accent-primary"
                />
                <span>
                  <strong className="block text-sm text-foreground">Color personalizado</strong>
                  <small className="text-muted-foreground">El contraste se ajusta automáticamente.</small>
                </span>
              </span>
              <span className="grid grid-cols-[52px_1fr] gap-2">
                <input
                  type="color"
                  aria-label="Seleccionar color de fondo"
                  value={normalizeHex(hex) ?? "#111827"}
                  onChange={(event) => updateHex(event.target.value)}
                  className="h-10 w-full cursor-pointer rounded-md border border-input bg-background p-1"
                />
                <input
                  value={hex}
                  onFocus={() => {
                    if (preferences.backgroundColor === null) updateHex(hex);
                  }}
                  onChange={(event) => updateHex(event.target.value)}
                  maxLength={7}
                  aria-label="Código HEX"
                  aria-invalid={hexError}
                  className={cn(
                    "h-10 rounded-md border bg-background px-3 font-mono text-sm uppercase text-foreground outline-none focus:ring-2 focus:ring-ring",
                    hexError ? "border-destructive" : "border-input",
                  )}
                />
              </span>
              {hexError && <small className="text-destructive">Usa un código como #111827.</small>}
            </label>
          </div>
        </fieldset>

        <div>
          <h3 className="mb-3 text-sm font-bold text-foreground">Vista previa</h3>
          <div className="theme-preview overflow-hidden rounded-lg border border-border bg-background shadow-panel">
            <div className="grid min-h-64 grid-cols-[86px_1fr]">
              <aside className="border-r border-sidebar-border bg-sidebar p-3">
                <span className="mb-5 grid size-7 place-items-center rounded-md bg-primary text-[10px] font-black text-primary-foreground">S</span>
                <div className="grid gap-2">
                  <span className="h-5 rounded bg-sidebar-accent" />
                  <span className="h-5 rounded border border-sidebar-border" />
                  <span className="h-5 rounded border border-sidebar-border" />
                </div>
              </aside>
              <div className="min-w-0">
                <header className="flex h-12 items-center justify-between border-b border-border px-4">
                  <span className="text-xs font-bold text-foreground">Vista previa</span>
                  <span className="size-6 rounded-full bg-secondary" />
                </header>
                <div className="grid gap-3 p-4">
                  <div className="rounded-md border border-border bg-card p-3">
                    <span className="block text-xs font-bold text-foreground">Resumen</span>
                    <span className="mt-1 block text-[10px] text-muted-foreground">Tu información se mantiene legible.</span>
                    <div className="mt-3 flex gap-2">
                      <span className="rounded-md bg-primary px-3 py-1.5 text-[10px] font-bold text-primary-foreground">Acción</span>
                      <span className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-[10px] text-muted-foreground">Buscar…</span>
                    </div>
                  </div>
                  <div className="overflow-hidden rounded-md border border-border text-[9px]">
                    <div className="grid grid-cols-2 bg-surface-raised px-2 py-1.5 font-bold text-muted-foreground"><span>Cliente</span><span>Total</span></div>
                    <div className="grid grid-cols-2 border-t border-border px-2 py-2 text-foreground"><span>Skyloop</span><span>RD$ 10,000</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button type="button" variant="outline">
              <RotateCcw /> Restaurar configuración predeterminada
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Restaurar la apariencia predeterminada?</AlertDialogTitle>
              <AlertDialogDescription>Se eliminarán el modo, tema y fondo personalizados de tu cuenta.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleRestore}>Restaurar</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Button type="button" onClick={handleSave} disabled={isSaving || !hasChanges || hexError}>
          {isSaving ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </section>
  );
}

import { ArrowDown, ArrowUp, X } from "lucide-react";

import {
  dashboardBlockCatalog,
  moveBlock,
  useDashboardPrefs,
  type DashboardBlockId,
} from "@/lib/dashboard-prefs";

const labels = new Map(dashboardBlockCatalog.map((block) => [block.id, block]));

export function DashboardCustomizer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { layout, setLayout, save, restore, discard, hasChanges, isSaving } = useDashboardPrefs();

  if (!open) return null;

  function toggle(id: DashboardBlockId) {
    setLayout((current) =>
      current.map((block) => (block.id === id ? { ...block, visible: !block.visible } : block)),
    );
  }

  function handleClose() {
    discard();
    onClose();
  }

  async function handleSave() {
    if (await save()) onClose();
  }

  async function handleRestore() {
    await restore();
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={handleClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[380px] flex-col border-l border-border bg-surface-raised shadow-xl">
        <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
              PERSONALIZAR
            </p>
            <h3 className="mt-0.5 text-lg font-bold text-foreground">Mi Dashboard</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Elige qué aparece y en qué orden.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          <ul className="grid gap-2">
            {layout.map((block, index) => {
              const meta = labels.get(block.id);
              return (
                <li
                  key={block.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <input
                    type="checkbox"
                    checked={block.visible}
                    onChange={() => toggle(block.id)}
                    className="size-4 accent-[var(--primary)]"
                    aria-label={meta?.label ?? block.id}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{meta?.label ?? block.id}</p>
                    <p className="truncate text-[11px] text-muted-foreground">{meta?.hint}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setLayout((current) => moveBlock(current, index, -1))}
                      disabled={index === 0}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-35"
                      aria-label="Subir"
                    >
                      <ArrowUp className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setLayout((current) => moveBlock(current, index, 1))}
                      disabled={index === layout.length - 1}
                      className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-35"
                      aria-label="Bajar"
                    >
                      <ArrowDown className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <footer className="grid gap-2 border-t border-border px-4 py-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-opacity disabled:opacity-45"
            >
              {isSaving ? "Guardando…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              Cancelar
            </button>
          </div>
          <button
            type="button"
            onClick={handleRestore}
            disabled={isSaving}
            className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-45"
          >
            Restaurar predeterminado
          </button>
        </footer>
      </aside>
    </div>
  );
}

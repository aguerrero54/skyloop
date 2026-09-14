import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { money, num } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { supabase } from "@/integrations/supabase/client";
import { SectionTitle, StatusBadge } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/servicios")({
  head: () => ({
    meta: [
      { title: "Servicios — Skyloop Control" },
      {
        name: "description",
        content:
          "Catálogo de servicios de Skyloop con precio sugerido, costo estimado y margen de cada uno.",
      },
      { property: "og:title", content: "Servicios — Skyloop Control" },
      {
        property: "og:description",
        content: "Precio, costo y margen de cada servicio que ofrece la agencia.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const { data, openForm, refresh } = useSkyloop();
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);

  const selected =
    selectedIds.length === 1
      ? data.services.find((service) => service.id === selectedIds[0]) ?? null
      : null;

  function toggleSelecting() {
    setSelecting((current) => !current);
    setSelectedIds([]);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((selectedId) => selectedId !== id) : [...current, id],
    );
  }

  async function handleDelete() {
    if (selectedIds.length === 0) return;
    const confirmed = window.confirm(
      selectedIds.length === 1
        ? `¿Eliminar el servicio seleccionado? Esta acción no se puede deshacer.`
        : `¿Eliminar los ${selectedIds.length} servicios seleccionados? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase.from("services").delete().in("id", selectedIds);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar", { description: error.message });
      return;
    }
    toast.success(selectedIds.length === 1 ? "Servicio eliminado" : "Servicios eliminados");
    setSelectedIds([]);
    setSelecting(false);
    await refresh();
  }

  return (
    <div>
      <SectionTitle
        title="Catálogo de servicios"
        description="Precio, costo estimado y margen de cada servicio."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleSelecting}
              className="rounded-lg border border-border px-3 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              {selecting ? "Cancelar" : "Seleccionar"}
            </button>
            <button
              type="button"
              onClick={() => openForm("service")}
              className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              + Nuevo servicio
            </button>
          </div>
        }
      />

      {selecting && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-panel">
          {selectedIds.length > 0 ? (
            <>
              <p className="text-sm text-foreground">
                <b>{selectedIds.length}</b> {selectedIds.length === 1 ? "seleccionado" : "seleccionados"}
              </p>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selected && openForm("service", { service: selected })}
                  disabled={!selected}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  {deleting ? "Eliminando…" : `Eliminar${selectedIds.length > 1 ? ` (${selectedIds.length})` : ""}`}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Marca uno para editarlo o varios para eliminarlos.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.services.map((service) => {
          const price = num(service.suggested_price);
          const cost = num(service.estimated_cost);
          const margin = price ? ((price - cost) / price) * 100 : 0;
          const isSelected = selecting && selectedIds.includes(service.id);
          return (
            <article
              key={service.id}
              onClick={selecting ? () => toggleSelected(service.id) : undefined}
              className={`rounded-2xl border bg-card p-5 shadow-panel transition-colors ${
                selecting ? "cursor-pointer" : ""
              } ${isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
            >
              <div className="flex items-center justify-between">
                {selecting ? (
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelected(service.id)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label={`Seleccionar ${service.name}`}
                    className="size-5 cursor-pointer accent-primary"
                  />
                ) : (
                  <span className="grid size-10 place-items-center rounded-xl bg-secondary text-foreground">
                    ◇
                  </span>
                )}
                <StatusBadge status={service.status} />
              </div>
              <h3 className="mt-4 text-base font-bold text-foreground">{service.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{service.category}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <small className="block text-muted-foreground">Precio</small>
                  <b className="text-foreground">{money(price)}</b>
                </div>
                <div>
                  <small className="block text-muted-foreground">Costo</small>
                  <b className="text-foreground">{money(cost)}</b>
                </div>
                <div>
                  <small className="block text-muted-foreground">Margen</small>
                  <b className="text-foreground">{margin.toFixed(0)}%</b>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

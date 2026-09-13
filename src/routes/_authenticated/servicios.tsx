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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selected = data.services.find((service) => service.id === selectedId) ?? null;

  function toggleSelecting() {
    setSelecting((current) => !current);
    setSelectedId(null);
  }

  async function handleDelete() {
    if (!selected) return;
    const confirmed = window.confirm(
      `¿Eliminar el servicio "${selected.name}"? Esta acción no se puede deshacer.`,
    );
    if (!confirmed) return;
    setDeleting(true);
    const { error } = await supabase.from("services").delete().eq("id", selected.id);
    setDeleting(false);
    if (error) {
      toast.error("No se pudo eliminar", { description: error.message });
      return;
    }
    toast.success("Servicio eliminado");
    setSelectedId(null);
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
          {selected ? (
            <>
              <p className="text-sm text-foreground">
                Seleccionado: <b>{selected.name}</b>
              </p>
              <div className="ml-auto flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openForm("service", undefined, undefined, selected)}
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
                >
                  {deleting ? "Eliminando…" : "Eliminar"}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Toca un servicio de la lista para editarlo o eliminarlo.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {data.services.map((service) => {
          const price = num(service.suggested_price);
          const cost = num(service.estimated_cost);
          const margin = price ? ((price - cost) / price) * 100 : 0;
          const isSelected = selecting && selectedId === service.id;
          return (
            <article
              key={service.id}
              onClick={
                selecting ? () => setSelectedId(isSelected ? null : service.id) : undefined
              }
              className={`rounded-2xl border bg-card p-5 shadow-panel transition-colors ${
                selecting ? "cursor-pointer" : ""
              } ${isSelected ? "border-primary ring-2 ring-primary/40" : "border-border"}`}
            >
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-secondary text-foreground">
                  ◇
                </span>
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

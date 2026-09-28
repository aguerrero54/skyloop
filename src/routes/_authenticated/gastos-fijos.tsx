import { useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import {
  monthLabel,
  money,
  num,
  type FixedCost,
} from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { useAgencyNet } from "@/lib/agency";
import { EmptyRow, KpiCard, Panel, TableShell } from "@/components/skyloop/ui";

export const Route = createFileRoute("/_authenticated/gastos-fijos")({
  head: () => ({
    meta: [
      { title: "Gastos fijos — Skyloop Control" },
      {
        name: "description",
        content: "Plataformas, oficina y demás gastos fijos mensuales de la agencia y su ganancia neta.",
      },
      { property: "og:title", content: "Gastos fijos — Skyloop Control" },
      {
        property: "og:description",
        content: "Controla los gastos fijos de la agencia y calcula la ganancia neta del mes.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FixedCostsPage,
});

const CATEGORIES = ["Plataformas", "Oficina", "Servicios profesionales", "Otros"];


const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground";

function FixedCostsPage() {
  const { month, refresh } = useSkyloop();
  const { clientProfit, fixed, net } = useAgencyNet();
  const [editing, setEditing] = useState<FixedCost | "new" | null>(null);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selected =
    selectedIds.length === 1 ? fixed.rows.find((r) => r.id === selectedIds[0]) ?? null : null;

  function toggle(id: string) {
    setSelectedIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }

  async function handleDelete() {
    if (!selectedIds.length) return;
    if (!window.confirm(`¿Eliminar ${selectedIds.length === 1 ? "el gasto fijo" : `${selectedIds.length} gastos fijos`}? Se quitará de todos los meses.`)) return;
    const { error } = await supabase.from("agency_fixed_costs").delete().in("id", selectedIds);
    if (error) return void toast.error("No se pudo eliminar", { description: error.message });
    toast.success("Eliminado");
    setSelectedIds([]);
    await refresh();
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Ganancia de clientes" value={money(clientProfit)} footnote="Pagos mensuales − servicios" icon="↗" />
        <KpiCard label="Gastos fijos" value={money(fixed.total)} footnote={monthLabel(month)} icon="↘" />
        <KpiCard label="Ganancia neta" value={money(net)} footnote="Después de gastos fijos" icon="△" />
      </div>

      <Panel
        title="Gastos fijos del mes"
        subtitle="Se repiten cada mes mientras estén activos"
        action={
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setSelecting((s) => !s);
                setSelectedIds([]);
              }}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-foreground hover:bg-secondary"
            >
              {selecting ? "Cancelar" : "Seleccionar"}
            </button>
            <button
              type="button"
              onClick={() => setEditing("new")}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90"
            >
              + Nuevo gasto fijo
            </button>
          </div>
        }
      >
        {selecting && selectedIds.length > 0 && (
          <div className="mb-3 flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">{selectedIds.length}</span> seleccionado(s)
            <button
              type="button"
              disabled={!selected}
              onClick={() => selected && setEditing(selected)}
              className="ml-auto rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground disabled:opacity-40"
            >
              Editar
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg border border-destructive/40 px-3 py-1.5 font-bold text-destructive hover:bg-destructive/10"
            >
              Eliminar
            </button>
          </div>
        )}
        <TableShell
          head={
            <tr>
              {selecting && <th className="w-12 px-4 py-3" />}
              <th className="px-4 py-3 font-semibold">Gasto</th>
              <th className="px-4 py-3 font-semibold">Categoría</th>
              <th className="px-4 py-3 font-semibold">Desde</th>
              <th className="px-4 py-3 text-right font-semibold">Monto</th>
              <th className="px-4 py-3 text-right font-semibold">En pesos</th>
            </tr>
          }
          footer={
            fixed.rows.length ? (
              <tr className="border-t border-border font-bold text-foreground">
                {selecting && <td />}
                <td className="px-4 py-3" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right">{money(fixed.total)}</td>
              </tr>
            ) : undefined
          }
        >
          {fixed.rows.length === 0 ? (
            <EmptyRow colSpan={selecting ? 6 : 5} label="Sin gastos fijos este mes" />
          ) : (
            fixed.rows.map((row) => (
              <tr
                key={row.id}
                onClick={selecting ? () => toggle(row.id) : undefined}
                className={`border-t border-border ${selecting ? "cursor-pointer hover:bg-secondary" : ""} ${selectedIds.includes(row.id) ? "bg-primary/10" : ""}`}
              >
                {selecting && (
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={() => toggle(row.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="size-5 accent-primary"
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-foreground">
                  {row.name}
                  {row.adjusted && (
                    <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase text-primary-soft">
                      ajustado
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.category}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {row.start_month ? monthLabel(row.start_month) : "—"}
                </td>
                <td className="px-4 py-3 text-right">{money(row.amount, row.currency)}</td>
                <td className="px-4 py-3 text-right">{money(row.dop)}</td>
              </tr>
            ))
          )}
        </TableShell>
      </Panel>

      {editing && (
        <FixedCostModal
          cost={editing === "new" ? null : editing}
          month={month}
          effectiveAmount={editing === "new" ? 0 : (fixed.rows.find((r) => r.id === editing.id)?.amount ?? num(editing.amount))}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            setSelectedIds([]);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function FixedCostModal({
  cost,
  month,
  effectiveAmount,
  onClose,
  onSaved,
}: {
  cost: FixedCost | null;
  month: string;
  effectiveAmount: number;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const amount = num(f.get("amount"));
    const base = {
      name: String(f.get("name") ?? "").trim(),
      category: String(f.get("category")),
      currency: String(f.get("currency")),
      start_month: String(f.get("start_month") || "") || null,
      end_month: String(f.get("end_month") || "") || null,
    };
    if (!base.name) return void toast.error("Escribe un nombre");
    setSaving(true);
    let error;
    if (!cost) {
      ({ error } = await supabase.from("agency_fixed_costs").insert({ ...base, amount }));
    } else if (f.get("all_months")) {
      ({ error } = await supabase.from("agency_fixed_costs").update({ ...base, amount }).eq("id", cost.id));
      if (!error) await supabase.from("agency_fixed_cost_months").delete().eq("fixed_cost_id", cost.id);
    } else {
      ({ error } = await supabase.from("agency_fixed_costs").update(base).eq("id", cost.id));
      if (!error && amount !== num(cost.amount)) {
        ({ error } = await supabase
          .from("agency_fixed_cost_months")
          .upsert({ fixed_cost_id: cost.id, month, amount }, { onConflict: "fixed_cost_id,month" }));
      } else if (!error) {
        await supabase.from("agency_fixed_cost_months").delete().eq("fixed_cost_id", cost.id).eq("month", month);
      }
    }
    setSaving(false);
    if (error) return void toast.error("No se pudo guardar", { description: error.message });
    toast.success("Gasto fijo guardado");
    await onSaved();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="grid w-full max-w-md gap-3 rounded-2xl border border-border bg-card p-6 shadow-panel"
      >
        <h3 className="text-lg font-bold text-foreground">{cost ? "Editar gasto fijo" : "Nuevo gasto fijo"}</h3>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Nombre
          <input name="name" defaultValue={cost?.name ?? ""} placeholder="Ej. Canva Pro" className={inputClass} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Categoría
          <select name="category" defaultValue={cost?.category ?? "Plataformas"} className={inputClass}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Monto {cost ? `(${monthLabel(month)})` : "mensual"}
            <input name="amount" type="number" step="any" min="0" defaultValue={cost ? effectiveAmount : ""} className={inputClass} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Moneda
            <select name="currency" defaultValue={cost?.currency ?? "DOP"} className={inputClass}>
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </select>
          </label>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <label className="grid gap-1 text-xs text-muted-foreground">
            Desde
            <input name="start_month" type="month" defaultValue={cost?.start_month ?? month} className={inputClass} />
          </label>
          <label className="grid gap-1 text-xs text-muted-foreground">
            Hasta (opcional)
            <input name="end_month" type="month" defaultValue={cost?.end_month ?? ""} className={inputClass} />
          </label>
        </div>
        {cost && (
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input type="checkbox" name="all_months" className="accent-primary" />
            Aplicar el monto a todos los meses (cambia el valor habitual)
          </label>
        )}
        <div className="mt-2 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground">
            Cancelar
          </button>
          <button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-60">
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

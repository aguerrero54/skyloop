import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { num } from "@/lib/finance";
import { useSkyloop } from "@/lib/skyloop-context";
import { Panel } from "@/components/skyloop/ui";
import { PersonalizationPanel } from "@/components/skyloop/PersonalizationPanel";

export const Route = createFileRoute("/_authenticated/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — Skyloop Control" },
      {
        name: "description",
        content:
          "Parámetros financieros de la agencia: moneda principal y tasa de conversión de dólar a peso.",
      },
      { property: "og:title", content: "Configuración — Skyloop Control" },
      {
        property: "og:description",
        content: "Moneda principal y tasa USD a DOP usadas en todos los cálculos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data, refresh } = useSkyloop();
  const [currency, setCurrency] = useState(data.settings?.currency ?? "DOP");
  const [rate, setRate] = useState(String(num(data.settings?.usd_rate) || 60));
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ currency, usd_rate: num(rate) || 60, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setSaving(false);
    if (error) {
      toast.error("No se pudo guardar", { description: error.message });
      return;
    }
    await refresh();
    toast.success("Configuración guardada");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Panel title="Finanzas" subtitle="Parámetros globales de la agencia">
        <div className="grid gap-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Moneda principal
            </label>
            <select
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className={inputClass}
            >
              <option value="DOP">DOP / RD$</option>
              <option value="USD">USD / US$</option>
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Tasa USD → DOP
            </label>
            <input
              type="number"
              step="0.01"
              value={rate}
              onChange={(event) => setRate(event.target.value)}
              className={inputClass}
            />
          </div>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="w-fit rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar configuración"}
          </button>
        </div>
      </Panel>

      <Panel title="Tu información" subtitle="Cómo funciona este espacio">
        <p className="rounded-xl border border-border bg-surface-raised p-4 text-sm text-muted-foreground">
          Toda la información se guarda en la nube y es compartida por las cuentas del equipo, así
          que puedes trabajar desde cualquier computadora o celular. Los montos en dólares se
          convierten a pesos usando la tasa configurada aquí.
        </p>
      </Panel>

      <Panel className="xl:col-span-2">
        <PersonalizationPanel />
      </Panel>
    </div>
  );
}

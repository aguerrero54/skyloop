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

const MAX_LOGO_WIDTH = 600;

async function fileToLogoDataUrl(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("Imagen no válida"));
    element.src = dataUrl;
  });
  if (image.width <= MAX_LOGO_WIDTH) return dataUrl;
  const ratio = MAX_LOGO_WIDTH / image.width;
  const canvas = document.createElement("canvas");
  canvas.width = MAX_LOGO_WIDTH;
  canvas.height = Math.round(image.height * ratio);
  const context = canvas.getContext("2d");
  if (!context) return dataUrl;
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

function SettingsPage() {
  const { data, refresh } = useSkyloop();
  const [currency, setCurrency] = useState(data.settings?.currency ?? "DOP");
  const [rate, setRate] = useState(String(num(data.settings?.usd_rate) || 60));
  const [publicUrl, setPublicUrl] = useState(
    data.settings?.public_url ?? "https://clauds-doc-finder.lovable.app",
  );
  const [saving, setSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  const logo = data.settings?.logo_url ?? null;

  async function saveLogo(value: string | null) {
    setLogoBusy(true);
    const { error } = await supabase
      .from("app_settings")
      .update({ logo_url: value, updated_at: new Date().toISOString() })
      .eq("id", 1);
    setLogoBusy(false);
    if (error) {
      toast.error("No se pudo guardar el logo", { description: error.message });
      return;
    }
    await refresh();
    toast.success(value ? "Logo actualizado" : "Logo eliminado");
  }

  async function onLogoFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elige una imagen (PNG o JPG)");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe pasar de 5 MB");
      return;
    }
    setLogoBusy(true);
    try {
      const dataUrl = await fileToLogoDataUrl(file);
      setLogoBusy(false);
      await saveLogo(dataUrl);
    } catch (error) {
      setLogoBusy(false);
      toast.error("No se pudo procesar la imagen", {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  }

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
              step="any"
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

      <Panel title="Logo de la factura" subtitle="Se mostrará en todas las facturas y en el PDF">
        <div className="grid gap-4">
          <div className="grid place-items-center rounded-xl border border-dashed border-border bg-surface-raised p-6">
            {logo ? (
              <img src={logo} alt="Logo de la empresa" className="max-h-24 w-auto object-contain" />
            ) : (
              <p className="text-sm text-muted-foreground">Aún no has cargado un logo</p>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="w-fit cursor-pointer rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90">
              {logoBusy ? "Procesando…" : logo ? "Cambiar logo" : "Cargar logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                disabled={logoBusy}
                onChange={(event) => {
                  void onLogoFile(event.target.files?.[0]);
                  event.target.value = "";
                }}
              />
            </label>
            {logo && (
              <button
                type="button"
                disabled={logoBusy}
                onClick={() => void saveLogo(null)}
                className="rounded-lg border border-destructive/40 px-3 py-2 text-sm font-bold text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-60"
              >
                Quitar logo
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Formatos PNG, JPG o WEBP hasta 5 MB. Se recomienda fondo transparente.
          </p>
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

import { useState } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { num, todayISO } from "@/lib/finance";
import { useSkyloop, type FormKind } from "@/lib/skyloop-context";

type Option = { value: string; label: string };

type Field = {
  name: string;
  label: string;
  type: "text" | "number" | "date" | "email" | "select" | "textarea";
  options?: Option[];
  required?: boolean;
  defaultValue?: string | undefined;
  full?: boolean;
  integer?: boolean;
};

const titles: Record<FormKind, string> = {
  income: "Registrar ingreso",
  expense: "Registrar gasto",
  client: "Nuevo cliente",
  provider: "Nuevo proveedor",
  service: "Nuevo servicio",
  assignment: "Asignar servicio / proveedor",
  obligation: "Nuevo servicio pendiente de proveedor",
};

const plain = (values: string[]): Option[] => values.map((value) => ({ value, label: value }));

export function RecordModal() {
  const { formState, closeForm, data, refresh } = useSkyloop();
  const [saving, setSaving] = useState(false);

  if (!formState) return null;
  const kind = formState.kind;
  const presetClient = formState.clientId ?? "";
  const editingAssignment = kind === "assignment" ? formState.assignment : undefined;
  const editingService = kind === "service" ? formState.service : undefined;
  const editingProvider = kind === "provider" ? formState.provider : undefined;

  const clientOptions = data.clients.map((client) => ({ value: client.id, label: client.name }));
  const providerOptions = data.providers.map((provider) => ({
    value: provider.id,
    label: provider.name,
  }));
  const serviceOptions = data.services.map((service) => ({
    value: service.id,
    label: service.name,
  }));

  const fields: Field[] = (() => {
    switch (kind) {
      case "income":
        return [
          { name: "date", label: "Fecha", type: "date", required: true, defaultValue: todayISO() },
          {
            name: "client_id",
            label: "Cliente",
            type: "select",
            required: true,
            defaultValue: presetClient,
            options: [{ value: "", label: "Seleccionar…" }, ...clientOptions],
          },
          { name: "concept", label: "Concepto", type: "text", required: true },
          { name: "amount", label: "Monto", type: "number", required: true },
          { name: "currency", label: "Moneda", type: "select", options: plain(["DOP", "USD"]) },
          {
            name: "status",
            label: "Estado",
            type: "select",
            options: plain(["Pendiente", "Cobrado", "Parcial", "Vencido"]),
          },
          { name: "due_date", label: "Vencimiento", type: "date", defaultValue: todayISO() },
        ];
      case "expense":
        return [
          { name: "date", label: "Fecha", type: "date", required: true, defaultValue: todayISO() },
          { name: "concept", label: "Concepto", type: "text", required: true },
          {
            name: "category",
            label: "Categoría",
            type: "select",
            options: plain([
              "Nómina/Servicios",
              "Audiovisual",
              "Diseño",
              "Community Management",
              "Paid Media",
              "Fotografía",
              "Plataformas",
              "Transporte",
              "Alimentos",
              "Servicios",
              "Proyecto",
              "Branding",
              "Talentos",
              "Estrategia",
              "Social Media",
              "Otros",
            ]),
          },
          { name: "amount", label: "Monto", type: "number", required: true },
          { name: "currency", label: "Moneda", type: "select", options: plain(["DOP", "USD"]) },
          {
            name: "client_id",
            label: "Cliente relacionado",
            type: "select",
            defaultValue: presetClient,
            options: [{ value: "", label: "Gasto general" }, ...clientOptions],
          },
          {
            name: "provider_id",
            label: "Proveedor",
            type: "select",
            options: [{ value: "", label: "Sin proveedor" }, ...providerOptions],
          },
          {
            name: "status",
            label: "Estado",
            type: "select",
            options: plain(["Pendiente", "Pagado", "Parcial", "Vencido"]),
          },
          { name: "due_date", label: "Vencimiento", type: "date", defaultValue: todayISO() },
        ];
      case "client":
        return [
          { name: "name", label: "Nombre de la marca", type: "text", required: true },
          {
            name: "status",
            label: "Estado",
            type: "select",
            options: plain(["Activo", "Prospecto", "Pausado", "Finalizado"]),
          },
          { name: "company", label: "Empresa", type: "text" },
          { name: "country", label: "País", type: "text" },
          { name: "contact", label: "Contacto", type: "text" },
          { name: "email", label: "Correo", type: "email" },
          { name: "phone", label: "Teléfono", type: "text" },
          { name: "tax_id", label: "RNC / Identificación fiscal", type: "text" },
          { name: "address", label: "Dirección", type: "text", full: true },
          { name: "currency", label: "Moneda", type: "select", options: plain(["DOP", "USD"]) },
          { name: "monthly_payment", label: "Pago mensual", type: "number" },
          { name: "notes", label: "Notas internas", type: "textarea", full: true },
        ];
      case "provider":
        return [
          {
            name: "name",
            label: "Nombre",
            type: "text",
            required: true,
            defaultValue: editingProvider?.name,
          },
          {
            name: "specialty",
            label: "Especialidad",
            type: "text",
            required: true,
            defaultValue: editingProvider?.specialty ?? undefined,
          },
          {
            name: "reference_rate",
            label: "Tarifa de referencia",
            type: "number",
            defaultValue: editingProvider ? String(num(editingProvider.reference_rate)) : undefined,
          },
          {
            name: "status",
            label: "Estado",
            type: "select",
            defaultValue: editingProvider?.status ?? undefined,
            options: plain(["Activo", "Disponible", "No disponible", "Inactivo"]),
          },
          {
            name: "phone",
            label: "Teléfono",
            type: "text",
            defaultValue: editingProvider?.phone ?? undefined,
          },
          {
            name: "email",
            label: "Correo",
            type: "email",
            defaultValue: editingProvider?.email ?? undefined,
          },
        ];
      case "service":
        return [
          {
            name: "name",
            label: "Nombre",
            type: "text",
            required: true,
            defaultValue: editingService?.name,
          },
          {
            name: "category",
            label: "Categoría",
            type: "text",
            required: true,
            defaultValue: editingService?.category ?? undefined,
          },
          {
            name: "suggested_price",
            label: "Precio sugerido",
            type: "number",
            defaultValue: editingService ? String(num(editingService.suggested_price)) : undefined,
          },
          {
            name: "estimated_cost",
            label: "Costo estimado",
            type: "number",
            defaultValue: editingService ? String(num(editingService.estimated_cost)) : undefined,
          },
          {
            name: "status",
            label: "Estado",
            type: "select",
            defaultValue: editingService?.status ?? undefined,
            options: plain(["Activo", "Inactivo"]),
          },
        ];
      case "assignment":
        return [
          {
            name: "client_id",
            label: "Cliente",
            type: "select",
            required: true,
            defaultValue: editingAssignment?.client_id ?? presetClient,
            options: clientOptions,
          },
          {
            name: "service_id",
            label: "Servicio",
            type: "select",
            required: true,
            defaultValue: editingAssignment?.service_id ?? undefined,
            options: serviceOptions,
          },
          {
            name: "provider_id",
            label: "Proveedor",
            type: "select",
            defaultValue: editingAssignment?.provider_id ?? "",
            options: [{ value: "", label: "Sin proveedor" }, ...providerOptions],
          },
          {
            name: "monthly_quantity",
            label: "Cantidad ofrecida por mes",
            type: "number",
            integer: true,
            defaultValue: String(editingAssignment ? num(editingAssignment.monthly_quantity) : 0),
          },
          {
            name: "cost",
            label: "Costo asignado",
            type: "number",
            integer: true,
            defaultValue: editingAssignment ? String(num(editingAssignment.cost)) : undefined,
          },
        ];
      case "obligation":
        return [
          {
            name: "provider_id",
            label: "Proveedor",
            type: "select",
            required: true,
            options: [{ value: "", label: "Seleccionar…" }, ...providerOptions],
          },
          { name: "description", label: "Servicio u obligación", type: "text", required: true },
          { name: "amount", label: "Monto acordado", type: "number", required: true },
          { name: "currency", label: "Moneda", type: "select", options: plain(["DOP", "USD"]) },
          {
            name: "service_id",
            label: "Servicio del catálogo",
            type: "select",
            options: [{ value: "", label: "Sin servicio del catálogo" }, ...serviceOptions],
          },
          { name: "due_date", label: "Vencimiento", type: "date" },
          { name: "notes", label: "Notas", type: "textarea", full: true },
        ];
    }
  })();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const get = (key: string) => String(form.get(key) ?? "").trim();
    const orNull = (key: string) => get(key) || null;
    setSaving(true);

    try {
      let error: { message: string } | null = null;

      if (kind === "income") {
        ({ error } = await supabase.from("incomes").insert({
          invoice_date: get("date"),
          client_id: orNull("client_id"),
          concept: get("concept"),
          amount: num(get("amount")),
          currency: get("currency"),
          status: get("status"),
          due_date: orNull("due_date"),
        }));
      } else if (kind === "expense") {
        ({ error } = await supabase.from("expenses").insert({
          expense_date: get("date"),
          concept: get("concept"),
          category: orNull("category"),
          amount: num(get("amount")),
          currency: get("currency"),
          client_id: orNull("client_id"),
          provider_id: orNull("provider_id"),
          status: get("status"),
          due_date: orNull("due_date"),
          direct_cost: Boolean(get("client_id")),
        }));
      } else if (kind === "client") {
        ({ error } = await supabase.from("clients").insert({
          name: get("name"),
          status: get("status"),
          company: orNull("company"),
          country: orNull("country"),
          contact: orNull("contact"),
          email: orNull("email"),
          phone: orNull("phone"),
          tax_id: orNull("tax_id"),
          address: orNull("address"),
          currency: get("currency"),
          monthly_payment: num(get("monthly_payment")),
          notes: orNull("notes"),
          start_date: todayISO(),
        }));
      } else if (kind === "provider" && editingProvider) {
        ({ error } = await supabase
          .from("providers")
          .update({
            name: get("name"),
            specialty: orNull("specialty"),
            reference_rate: num(get("reference_rate")),
            status: get("status"),
            phone: orNull("phone"),
            email: orNull("email"),
          })
          .eq("id", editingProvider.id));
      } else if (kind === "provider") {
        ({ error } = await supabase.from("providers").insert({
          name: get("name"),
          specialty: orNull("specialty"),
          reference_rate: num(get("reference_rate")),
          status: get("status"),
          phone: orNull("phone"),
          email: orNull("email"),
        }));
      } else if (kind === "service" && editingService) {
        ({ error } = await supabase
          .from("services")
          .update({
            name: get("name"),
            category: orNull("category"),
            suggested_price: num(get("suggested_price")),
            estimated_cost: num(get("estimated_cost")),
            status: get("status"),
          })
          .eq("id", editingService.id));
      } else if (kind === "service") {
        ({ error } = await supabase.from("services").insert({
          name: get("name"),
          category: orNull("category"),
          suggested_price: num(get("suggested_price")),
          estimated_cost: num(get("estimated_cost")),
          status: get("status"),
        }));
      } else if (kind === "obligation") {
        ({ error } = await supabase.from("provider_obligations").insert({
          provider_id: get("provider_id"),
          service_id: orNull("service_id"),
          description: get("description"),
          amount: num(get("amount")),
          currency: get("currency"),
          due_date: orNull("due_date"),
          notes: orNull("notes"),
        }));
      } else if (editingAssignment) {
        ({ error } = await supabase
          .from("client_services")
          .update({
            client_id: orNull("client_id"),
            service_id: orNull("service_id"),
            provider_id: orNull("provider_id"),
            cost: num(get("cost")),
            monthly_quantity: num(get("monthly_quantity")),
          })
          .eq("id", editingAssignment.id));
      } else {
        ({ error } = await supabase.from("client_services").insert({
          client_id: orNull("client_id"),
          service_id: orNull("service_id"),
          provider_id: orNull("provider_id"),
          cost: num(get("cost")),
          monthly_quantity: num(get("monthly_quantity")),
          active: true,
        }));
      }

      if (error) throw new Error(error.message);
      await refresh();
      toast.success("Registro guardado");
      closeForm();
    } catch (error) {
      toast.error("No se pudo guardar", {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) closeForm();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-panel">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.13em] text-primary-soft">
              {editingAssignment || editingService || editingProvider
                ? "EDITAR REGISTRO"
                : "NUEVO REGISTRO"}
            </p>
            <h3 className="mt-1 text-lg font-bold text-foreground">
              {editingAssignment
                ? "Editar asignación"
                : editingService
                  ? "Editar servicio"
                  : editingProvider
                    ? "Editar proveedor"
                    : titles[kind]}
            </h3>
          </div>
          <button
            type="button"
            onClick={closeForm}
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          {fields.map((field) => (
            <div key={field.name} className={field.full ? "sm:col-span-2" : undefined}>
              <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
                {field.label}
              </label>
              {field.type === "select" ? (
                <select
                  name={field.name}
                  required={field.required}
                  defaultValue={field.defaultValue ?? ""}
                  className={inputClass}
                >
                  {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea name={field.name} rows={3} className={inputClass} />
              ) : (
                <input
                  name={field.name}
                  type={field.type}
                  step={field.type === "number" ? (field.integer ? "1" : "0.01") : undefined}
                  required={field.required}
                  defaultValue={field.defaultValue ?? ""}
                  className={inputClass}
                />
              )}
            </div>
          ))}

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg border border-border px-4 py-2 text-sm font-bold text-foreground transition-colors hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

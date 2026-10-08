import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const tokenSchema = z.string().regex(/^[a-f0-9]{48}$/);

async function resolveLink(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("provider_task_links")
    .select("provider_id, user_id, revoked")
    .eq("token", token)
    .maybeSingle();
  if (!data || data.revoked) return null;
  return { admin: supabaseAdmin, providerId: data.provider_id, userId: data.user_id };
}

export const getPublicTasks = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: tokenSchema }).parse(data))
  .handler(async ({ data }) => {
    const link = await resolveLink(data.token);
    if (!link) return null;
    const { admin, providerId, userId } = link;
    const [{ data: provider }, { data: tasks }] = await Promise.all([
      admin.from("providers").select("name").eq("id", providerId).eq("user_id", userId).maybeSingle(),
      admin
        .from("designer_tasks")
        .select("id, description, amount, currency, due_date, month, status, delivered_at, delivery_note, client_id")
        .eq("provider_id", providerId)
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),
    ]);
    const clientIds = [...new Set((tasks ?? []).map((t) => t.client_id).filter(Boolean))] as string[];
    const { data: clients } = clientIds.length
      ? await admin.from("clients").select("id, name").in("id", clientIds)
      : { data: [] as { id: string; name: string }[] };
    const names = new Map((clients ?? []).map((c) => [c.id, c.name]));
    return {
      providerName: provider?.name ?? "Diseñador",
      tasks: (tasks ?? []).map(({ client_id, ...t }) => ({
        ...t,
        clientName: client_id ? (names.get(client_id) ?? null) : null,
      })),
    };
  });

export const markTaskDelivered = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: tokenSchema,
        taskId: z.string().uuid(),
        delivered: z.boolean(),
        note: z.string().max(1000).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const link = await resolveLink(data.token);
    if (!link) throw new Error("Enlace no válido");
    const { admin, providerId, userId } = link;
    const { data: task } = await admin
      .from("designer_tasks")
      .select("status")
      .eq("id", data.taskId)
      .eq("provider_id", providerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Tarea no encontrada");
    if (task.status === "Facturada") throw new Error("Esta tarea ya fue facturada");
    const { error } = await admin
      .from("designer_tasks")
      .update(
        data.delivered
          ? { status: "Entregada", delivered_at: new Date().toISOString(), delivery_note: data.note?.trim() || null }
          : { status: "Pendiente", delivered_at: null },
      )
      .eq("id", data.taskId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

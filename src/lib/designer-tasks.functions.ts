import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TASK_ATTACHMENT_TTL } from "@/lib/task-attachments";

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
        .select("id, description, details, amount, currency, due_date, month, status, delivered_at, delivery_note, client_id, brand_label")
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
      tasks: (tasks ?? []).map(({ client_id, brand_label, ...t }) => ({
        ...t,
        clientName: brand_label || (client_id ? (names.get(client_id) ?? null) : null),
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
      .select("status, client_service_id, month, piece_type")
      .eq("id", data.taskId)
      .eq("provider_id", providerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) throw new Error("Tarea no encontrada");
    if (task.status === "Facturada") throw new Error("Esta tarea ya fue facturada");
    const wasDelivered = task.status === "Entregada";
    const { error } = await admin
      .from("designer_tasks")
      .update(
        data.delivered
          ? { status: "Entregada", delivered_at: new Date().toISOString(), delivery_note: data.note?.trim() || null }
          : { status: "Pendiente", delivered_at: null },
      )
      .eq("id", data.taskId);
    if (error) throw new Error(error.message);
    if (data.delivered && !wasDelivered) {
      const [{ data: prov }, { data: full }] = await Promise.all([
        admin.from("providers").select("name").eq("id", providerId).maybeSingle(),
        admin.from("designer_tasks").select("description").eq("id", data.taskId).maybeSingle(),
      ]);
      await admin.from("notifications").insert({
        user_id: userId,
        task_id: data.taskId,
        title: `${prov?.name ?? "Un diseñador"} entregó una tarea`,
        body: full?.description ?? null,
      });
    }
    if (task.client_service_id && wasDelivered !== data.delivered) {
      const { data: rec } = await admin
        .from("client_deliverables")
        .select("delivered_count")
        .eq("client_service_id", task.client_service_id)
        .eq("month", task.month)
        .eq("piece_type", task.piece_type ?? "")
        .maybeSingle();
      const count = Math.max(0, (rec?.delivered_count ?? 0) + (data.delivered ? 1 : -1));
      await admin.from("client_deliverables").upsert(
        {
          client_service_id: task.client_service_id,
          month: task.month,
          piece_type: task.piece_type ?? "",
          user_id: userId,
          delivered_count: count,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_service_id,month,piece_type" },
      );
    }
    return { ok: true };
  });

export const getTaskComments = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: tokenSchema, taskId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const link = await resolveLink(data.token);
    if (!link) return null;
    const { admin, providerId, userId } = link;
    const { data: task } = await admin
      .from("designer_tasks")
      .select("id")
      .eq("id", data.taskId)
      .eq("provider_id", providerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (!task) return null;
    const { data: comments } = await admin
      .from("designer_task_comments")
      .select("id, author, body, created_at")
      .eq("task_id", data.taskId)
      .order("created_at", { ascending: true });
    return comments ?? [];
  });

export const getTaskAttachments = createServerFn({ method: "GET" })
  .inputValidator((data) => z.object({ token: tokenSchema, taskId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const link = await resolveLink(data.token);
    if (!link) throw new Error("Enlace no válido");
    const { admin, providerId, userId } = link;
    const { data: task, error: taskError } = await admin.from("designer_tasks").select("id")
      .eq("id", data.taskId).eq("provider_id", providerId).eq("user_id", userId).maybeSingle();
    if (taskError || !task) throw new Error("Tarea no encontrada");
    const { data: files, error } = await admin.from("task_attachments")
      .select("id, file_name, file_path, mime_type, size_bytes")
      .eq("task_id", data.taskId).eq("user_id", userId).order("created_at");
    if (error) throw new Error("No se pudieron cargar las referencias");
    return Promise.all((files ?? []).map(async (file) => {
      const [preview, download] = await Promise.all([
        admin.storage.from("task-attachments").createSignedUrl(file.file_path, TASK_ATTACHMENT_TTL),
        admin.storage.from("task-attachments").createSignedUrl(file.file_path, TASK_ATTACHMENT_TTL, { download: file.file_name }),
      ]);
      if (preview.error || download.error) throw new Error("No se pudo abrir una referencia");
      const browserUrl = (url: string) => {
        const serverBase = process.env["SUPABASE_URL"];
        const browserBase = import.meta.env["VITE_SUPABASE_URL"];
        return serverBase && browserBase && url.startsWith(`${serverBase}/`) ? browserBase + url.slice(serverBase.length) : url;
      };
      return { id: file.id, file_name: file.file_name, mime_type: file.mime_type, size_bytes: file.size_bytes,
        url: browserUrl(preview.data.signedUrl), downloadUrl: browserUrl(download.data.signedUrl) };
    }));
  });

export const addTaskComment = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({
        token: tokenSchema,
        taskId: z.string().uuid(),
        body: z.string().trim().min(1).max(2000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const link = await resolveLink(data.token);
    if (!link) throw new Error("Enlace no válido");
    const { admin, providerId, userId } = link;
    const [{ data: task }, { data: provider }] = await Promise.all([
      admin
        .from("designer_tasks")
        .select("id")
        .eq("id", data.taskId)
        .eq("provider_id", providerId)
        .eq("user_id", userId)
        .maybeSingle(),
      admin.from("providers").select("name").eq("id", providerId).eq("user_id", userId).maybeSingle(),
    ]);
    if (!task) throw new Error("Tarea no encontrada");
    const { error } = await admin.from("designer_task_comments").insert({
      task_id: data.taskId,
      user_id: userId,
      author: provider?.name ?? "Diseñador",
      body: data.body,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

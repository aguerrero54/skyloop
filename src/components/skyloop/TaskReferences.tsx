import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Download, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getTaskAttachments } from "@/lib/designer-tasks.functions";
import { fileSize, MAX_TASK_FILES, TASK_ATTACHMENT_TTL, TASK_FILE_ACCEPT, validateTaskFiles, type TaskAttachment } from "@/lib/task-attachments";

function ReferenceList({ files, onRemove, busy }: { files: TaskAttachment[]; onRemove?: (id: string) => void; busy?: boolean }) {
  const [image, setImage] = useState<TaskAttachment | null>(null);
  return <>
    <div className="grid gap-2 sm:grid-cols-2">
      {files.map((file) => <div key={file.id} className="flex min-w-0 items-center gap-2 rounded-lg border border-border bg-background p-2">
        {file.mime_type.startsWith("image/") ?
          <Button type="button" variant="ghost" className="size-16 shrink-0 overflow-hidden p-0" onClick={() => setImage(file)} aria-label={`Ver ${file.file_name}`}>
            <img src={file.url} alt={file.file_name} className="size-full object-cover" />
          </Button> : <FileText className="size-8 shrink-0 text-primary-soft" />}
        <div className="min-w-0 flex-1">
          <a href={file.downloadUrl} download={file.file_name} target="_blank" rel="noreferrer" className="block break-words text-xs font-semibold text-foreground hover:text-primary">{file.file_name}</a>
          <p className="text-xs text-muted-foreground">{fileSize(file.size_bytes)}</p>
        </div>
        {onRemove && <Button type="button" size="icon" variant="ghost" className="shrink-0 text-destructive" disabled={busy} aria-label={`Eliminar ${file.file_name}`} title="Eliminar referencia" onClick={() => onRemove(file.id)}><Trash2 className="size-4" /></Button>}
        {!onRemove && <a href={file.downloadUrl} download={file.file_name} target="_blank" rel="noreferrer" aria-label={`Descargar ${file.file_name}`} title="Descargar referencia" className="shrink-0 p-1 text-primary"><Download className="size-4" /></a>}
      </div>)}
    </div>
    <Dialog open={!!image} onOpenChange={(open) => !open && setImage(null)}>
      <DialogContent className="z-[70] max-w-4xl">
        <DialogTitle className="break-words pr-6">{image?.file_name}</DialogTitle>
        {image && <img src={image.url} alt={image.file_name} className="max-h-[75vh] w-full object-contain" />}
      </DialogContent>
    </Dialog>
  </>;
}

export function PublicTaskReferences({ token, taskId }: { token: string; taskId: string }) {
  const fetchFiles = useServerFn(getTaskAttachments);
  const query = useQuery({ queryKey: ["public-task-references", token, taskId], queryFn: () => fetchFiles({ data: { token, taskId } }), staleTime: 0, refetchInterval: 45 * 60 * 1000, retry: false });
  return <div className="grid gap-2 rounded-lg bg-muted/40 p-3">
    <p className="flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] text-primary-soft"><Paperclip className="size-3.5" />REFERENCIAS</p>
    {query.isPending ? <p className="text-xs text-muted-foreground">Cargando referencias…</p> : query.isError ? <div className="text-xs text-destructive">No se pudieron cargar las referencias. <Button type="button" variant="ghost" size="sm" onClick={() => void query.refetch()}>Reintentar</Button></div> : query.data?.length ? <ReferenceList files={query.data} /> : <p className="text-xs text-muted-foreground">Sin archivos de referencia.</p>}
  </div>;
}

export function OwnerTaskReferences({ taskId }: { taskId: string }) {
  const picker = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const cache = useQueryClient();
  const queryKey = ["owner-task-references", taskId];
  const query = useQuery({ queryKey, queryFn: async () => {
    const { data, error } = await supabase.from("task_attachments").select("*").eq("task_id", taskId).order("created_at");
    if (error) throw error;
    return Promise.all(data.map(async (file) => {
      const [preview, download] = await Promise.all([
        supabase.storage.from("task-attachments").createSignedUrl(file.file_path, TASK_ATTACHMENT_TTL),
        supabase.storage.from("task-attachments").createSignedUrl(file.file_path, TASK_ATTACHMENT_TTL, { download: file.file_name }),
      ]);
      if (preview.error || download.error) throw new Error("No se pudo cargar una referencia");
      return { ...file, url: preview.data.signedUrl, downloadUrl: download.data.signedUrl };
    }));
  }, staleTime: 0, refetchInterval: 45 * 60 * 1000 });

  async function upload(files: File[]) {
    if (!files.length) return;
    const validation = validateTaskFiles(files, query.data?.length ?? 0);
    if (validation) return void toast.error(validation);
    setBusy(true);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Inicia sesión para subir referencias");
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const filePath = `${auth.user.id}/${taskId}/${crypto.randomUUID()}-${safeName}`;
        const mime = file.type || "application/octet-stream";
        const result = await supabase.storage.from("task-attachments").upload(filePath, file, { contentType: mime, upsert: false });
        if (result.error) throw result.error;
        const { error } = await supabase.from("task_attachments").insert({ task_id: taskId, user_id: auth.user.id, file_name: file.name, file_path: filePath, mime_type: mime, size_bytes: file.size });
        if (error) {
          await supabase.storage.from("task-attachments").remove([filePath]);
          throw error;
        }
      }
      toast.success("Referencias añadidas");
    } catch (error) { toast.error("No se pudieron subir todos los archivos", { description: error instanceof Error ? error.message : "Inténtalo nuevamente" }); }
    finally { setBusy(false); await cache.invalidateQueries({ queryKey }); }
  }

  async function remove(id: string) {
    const file = query.data?.find((item) => item.id === id);
    if (!file || !window.confirm(`¿Eliminar ${file.file_name}?`)) return;
    setBusy(true);
    try {
      const storage = await supabase.storage.from("task-attachments").remove([file.file_path]);
      if (storage.error) throw storage.error;
      const { error } = await supabase.from("task_attachments").delete().eq("id", id);
      if (error) throw error;
      toast.success("Referencia eliminada");
    } catch { toast.error("No se pudo eliminar la referencia"); }
    finally { setBusy(false); await cache.invalidateQueries({ queryKey }); }
  }

  return <section className="grid gap-2 border-t border-border pt-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h3 className="flex items-center gap-2 text-xs font-bold text-primary-soft"><Paperclip className="size-4" />Referencias</h3>
      <Button type="button" variant="outline" size="sm" disabled={busy || query.isPending || query.isError || (query.data?.length ?? 0) >= MAX_TASK_FILES} onClick={() => picker.current?.click()}><Upload className="size-4" />{busy ? "Procesando…" : "Subir archivos"}</Button>
    </div>
    <input ref={picker} type="file" multiple accept={TASK_FILE_ACCEPT} aria-label="Archivos de referencia" className="hidden" onChange={(event) => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void upload(files); }} />
    <p className="text-xs text-muted-foreground">{query.data?.length ?? 0}/10 archivos · Máximo 10 MB por archivo</p>
    {query.isError ? <Button type="button" variant="ghost" size="sm" onClick={() => void query.refetch()}>Reintentar referencias</Button> : <ReferenceList files={query.data ?? []} onRemove={(id) => void remove(id)} busy={busy} />}
  </section>;
}
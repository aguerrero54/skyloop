CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.designer_tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  file_name text NOT NULL,
  file_path text NOT NULL UNIQUE,
  mime_type text NOT NULL DEFAULT 'application/octet-stream',
  size_bytes bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.task_attachments TO authenticated;
GRANT ALL ON public.task_attachments TO service_role;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY task_attachments_owner_read ON public.task_attachments FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY task_attachments_owner_insert ON public.task_attachments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.designer_tasks t WHERE t.id = task_id AND t.user_id = auth.uid()));
CREATE POLICY task_attachments_owner_delete ON public.task_attachments FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE INDEX task_attachments_task_idx ON public.task_attachments(task_id);
CREATE FUNCTION public.validate_task_attachment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  PERFORM 1 FROM public.designer_tasks WHERE id = NEW.task_id AND user_id = NEW.user_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tarea no válida'; END IF;
  IF NEW.size_bytes < 0 OR NEW.size_bytes > 10485760 THEN RAISE EXCEPTION 'Máximo 10 MB por archivo'; END IF;
  IF NEW.file_path NOT LIKE NEW.user_id::text || '/' || NEW.task_id::text || '/%' OR array_length(string_to_array(NEW.file_path, '/'), 1) <> 3 THEN RAISE EXCEPTION 'Ruta de archivo no válida'; END IF;
  IF NEW.file_name !~* '\.(jpg|jpeg|png|gif|webp|avif|bmp|heic|heif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip)$' THEN RAISE EXCEPTION 'Tipo de archivo no permitido'; END IF;
  IF (SELECT count(*) FROM public.task_attachments WHERE task_id = NEW.task_id) >= 10 THEN RAISE EXCEPTION 'Máximo 10 archivos por tarea'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER task_attachment_limits BEFORE INSERT ON public.task_attachments FOR EACH ROW EXECUTE FUNCTION public.validate_task_attachment();
CREATE POLICY task_files_owner_read ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY task_files_owner_insert ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text AND array_length(storage.foldername(name), 1) = 2 AND EXISTS (SELECT 1 FROM public.designer_tasks t WHERE t.id::text = (storage.foldername(name))[2] AND t.user_id = auth.uid()));
CREATE POLICY task_files_owner_delete ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'task-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
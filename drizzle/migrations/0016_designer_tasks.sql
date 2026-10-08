CREATE TABLE public.designer_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DOP',
  due_date date,
  month text NOT NULL DEFAULT to_char(CURRENT_DATE, 'YYYY-MM'),
  status text NOT NULL DEFAULT 'Pendiente',
  delivered_at timestamptz,
  delivery_note text,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.designer_tasks TO authenticated;
GRANT ALL ON public.designer_tasks TO service_role;
ALTER TABLE public.designer_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY designer_tasks_own ON public.designer_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.provider_task_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  provider_id uuid NOT NULL UNIQUE REFERENCES public.providers(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_task_links TO authenticated;
GRANT ALL ON public.provider_task_links TO service_role;
ALTER TABLE public.provider_task_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY provider_task_links_own ON public.provider_task_links FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
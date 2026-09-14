ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS multi_client boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS invoice_items_client_id_idx ON public.invoice_items (client_id);
ALTER TABLE public.client_services ADD COLUMN IF NOT EXISTS breakdown jsonb;
ALTER TABLE public.client_service_months ADD COLUMN IF NOT EXISTS breakdown jsonb;
ALTER TABLE public.designer_tasks ADD COLUMN IF NOT EXISTS piece_type text;
ALTER TABLE public.client_deliverables ADD COLUMN IF NOT EXISTS piece_type text NOT NULL DEFAULT '';
ALTER TABLE public.client_deliverables DROP CONSTRAINT IF EXISTS client_deliverables_client_service_id_month_key;
ALTER TABLE public.client_deliverables ADD CONSTRAINT client_deliverables_service_month_piece_key UNIQUE (client_service_id, month, piece_type);
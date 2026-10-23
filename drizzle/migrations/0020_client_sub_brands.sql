ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS sub_brands text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.designer_tasks ADD COLUMN IF NOT EXISTS brand_label text;
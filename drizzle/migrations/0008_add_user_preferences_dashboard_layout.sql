ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS dashboard_layout jsonb;
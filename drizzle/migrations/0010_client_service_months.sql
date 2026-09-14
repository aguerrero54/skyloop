CREATE TABLE public.client_service_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_service_id uuid NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  month text NOT NULL,
  cost numeric NOT NULL DEFAULT 0,
  monthly_quantity numeric NOT NULL DEFAULT 0,
  provider_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_service_id, month)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_service_months TO authenticated;
GRANT ALL ON public.client_service_months TO service_role;

ALTER TABLE public.client_service_months ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_service_months_own ON public.client_service_months
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX client_service_months_service_idx ON public.client_service_months (client_service_id);
CREATE INDEX client_service_months_user_month_idx ON public.client_service_months (user_id, month);
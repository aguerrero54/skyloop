CREATE TABLE public.agency_fixed_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Plataformas',
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DOP',
  start_month text,
  end_month text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_fixed_costs TO authenticated;
GRANT ALL ON public.agency_fixed_costs TO service_role;
ALTER TABLE public.agency_fixed_costs ENABLE ROW LEVEL SECURITY;
CREATE POLICY agency_fixed_costs_own ON public.agency_fixed_costs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.agency_fixed_cost_months (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  fixed_cost_id uuid NOT NULL REFERENCES public.agency_fixed_costs(id) ON DELETE CASCADE,
  month text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fixed_cost_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_fixed_cost_months TO authenticated;
GRANT ALL ON public.agency_fixed_cost_months TO service_role;
ALTER TABLE public.agency_fixed_cost_months ENABLE ROW LEVEL SECURITY;
CREATE POLICY agency_fixed_cost_months_own ON public.agency_fixed_cost_months FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.client_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  client_service_id uuid NOT NULL REFERENCES public.client_services(id) ON DELETE CASCADE,
  month text NOT NULL,
  delivered_count integer NOT NULL DEFAULT 0,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_service_id, month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_deliverables TO authenticated;
GRANT ALL ON public.client_deliverables TO service_role;
ALTER TABLE public.client_deliverables ENABLE ROW LEVEL SECURITY;
CREATE POLICY client_deliverables_own ON public.client_deliverables FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
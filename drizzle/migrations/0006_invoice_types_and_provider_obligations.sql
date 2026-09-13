ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type text NOT NULL DEFAULT 'client';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS financial_type text NOT NULL DEFAULT 'income';
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.providers(id) ON DELETE SET NULL;

CREATE TABLE public.provider_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  description text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'DOP',
  status text NOT NULL DEFAULT 'Pendiente',
  due_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.provider_obligations TO authenticated;
GRANT ALL ON public.provider_obligations TO service_role;

ALTER TABLE public.provider_obligations ENABLE ROW LEVEL SECURITY;

CREATE POLICY provider_obligations_all ON public.provider_obligations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX provider_obligations_provider_idx ON public.provider_obligations (provider_id, status);

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS obligation_id uuid REFERENCES public.provider_obligations(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.recalc_provider_obligations()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  target uuid;
  inv public.invoices;
  ratio numeric;
  grp record;
  allocated numeric;
  total_ob numeric;
BEGIN
  IF TG_TABLE_NAME = 'invoices' THEN
    target := COALESCE(new.id, old.id);
  ELSE
    target := COALESCE(new.invoice_id, old.invoice_id);
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE id = target;
  IF inv.id IS NULL OR inv.invoice_type <> 'vendor' THEN
    RETURN COALESCE(new, old);
  END IF;

  IF inv.status IN ('Borrador', 'Cancelada') OR COALESCE(inv.total, 0) <= 0 THEN
    ratio := 0;
  ELSE
    ratio := LEAST(COALESCE(inv.amount_paid, 0) / inv.total, 1);
  END IF;

  FOR grp IN
    SELECT ii.obligation_id AS oid, SUM(ii.amount) AS amt
    FROM public.invoice_items ii
    WHERE ii.invoice_id = target AND ii.obligation_id IS NOT NULL
    GROUP BY ii.obligation_id
  LOOP
    SELECT amount INTO total_ob FROM public.provider_obligations WHERE id = grp.oid;
    IF total_ob IS NULL THEN
      CONTINUE;
    END IF;
    allocated := ROUND(LEAST(grp.amt, total_ob) * ratio, 2);
    UPDATE public.provider_obligations SET
      amount_paid = allocated,
      status = CASE
        WHEN total_ob > 0 AND allocated >= total_ob THEN 'Pagado'
        WHEN allocated > 0 THEN 'Parcialmente pagado'
        ELSE 'Pendiente'
      END,
      updated_at = now()
    WHERE id = grp.oid;
  END LOOP;

  RETURN COALESCE(new, old);
END;
$$;

CREATE TRIGGER invoices_recalc_obligations
AFTER INSERT OR UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.recalc_provider_obligations();

CREATE TRIGGER invoice_items_recalc_obligations
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_items
FOR EACH ROW EXECUTE FUNCTION public.recalc_provider_obligations();
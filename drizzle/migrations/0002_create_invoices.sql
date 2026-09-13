-- Datos fiscales/contacto adicionales del cliente (aditivo, nullable)
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS company text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS tax_id text;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL UNIQUE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.providers(id) ON DELETE SET NULL,
  order_number text,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  payment_terms text NOT NULL DEFAULT 'Pagadera inmediatamente',
  subject text,
  currency text NOT NULL DEFAULT 'DOP',
  subtotal numeric NOT NULL DEFAULT 0,
  discount numeric NOT NULL DEFAULT 0,
  discount_type text NOT NULL DEFAULT 'percent',
  shipping numeric NOT NULL DEFAULT 0,
  adjustment numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  balance_due numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Borrador',
  notes text,
  terms text,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  service_id uuid REFERENCES public.services(id) ON DELETE SET NULL,
  description text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  rate numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  amount numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'Transferencia bancaria',
  reference text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX invoices_client_idx ON public.invoices (client_id, issue_date DESC);
CREATE INDEX invoices_status_idx ON public.invoices (status);
CREATE INDEX invoice_items_invoice_idx ON public.invoice_items (invoice_id, position);
CREATE INDEX invoice_payments_invoice_idx ON public.invoice_payments (invoice_id, payment_date);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO authenticated;
GRANT ALL ON public.invoice_items TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_all ON public.invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY invoice_items_all ON public.invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY invoice_payments_all ON public.invoice_payments FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.touch_invoice_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  new.updated_at = now();
  RETURN new;
END;
$$;

CREATE TRIGGER invoices_touch_updated_at
BEFORE UPDATE ON public.invoices
FOR EACH ROW EXECUTE FUNCTION public.touch_invoice_updated_at();

-- Recalcula totales pagados, saldo y estado a partir de los pagos registrados
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  target uuid;
  paid numeric;
  inv public.invoices;
BEGIN
  target := COALESCE(new.invoice_id, old.invoice_id);
  SELECT COALESCE(sum(amount), 0) INTO paid FROM public.invoice_payments WHERE invoice_id = target;
  SELECT * INTO inv FROM public.invoices WHERE id = target;
  IF inv.id IS NULL THEN
    RETURN COALESCE(new, old);
  END IF;

  UPDATE public.invoices SET
    amount_paid = paid,
    balance_due = GREATEST(inv.total - paid, 0),
    status = CASE
      WHEN inv.status IN ('Borrador', 'Cancelada') THEN inv.status
      WHEN paid >= inv.total AND inv.total > 0 THEN 'Pagada'
      WHEN paid > 0 THEN 'Parcialmente pagada'
      WHEN inv.due_date IS NOT NULL AND inv.due_date < CURRENT_DATE THEN 'Vencida'
      ELSE 'Pendiente'
    END
  WHERE id = target;

  RETURN COALESCE(new, old);
END;
$$;

CREATE TRIGGER invoice_payments_recalc
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_totals();
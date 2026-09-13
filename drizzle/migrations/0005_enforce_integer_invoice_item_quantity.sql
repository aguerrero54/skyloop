ALTER TABLE public.invoice_items
ADD CONSTRAINT invoice_items_quantity_positive_integer
CHECK (quantity >= 1 AND quantity = trunc(quantity)) NOT VALID;
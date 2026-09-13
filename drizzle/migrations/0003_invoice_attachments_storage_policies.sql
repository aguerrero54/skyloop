CREATE POLICY invoice_attachments_select ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'invoice-attachments');

CREATE POLICY invoice_attachments_insert ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'invoice-attachments');

CREATE POLICY invoice_attachments_update ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'invoice-attachments')
WITH CHECK (bucket_id = 'invoice-attachments');

CREATE POLICY invoice_attachments_delete ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'invoice-attachments');
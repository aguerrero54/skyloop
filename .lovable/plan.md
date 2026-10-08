# Tareas para diseñadores (dentro de Entregables)

## Cómo funciona

1. En **Entregables** aparece una pestaña nueva, **Tareas**, junto a la vista actual.
2. Creas una tarea con: diseñador (de tu lista de Equipo), cliente (opcional), descripción, precio, moneda y fecha límite.
3. Cada diseñador tiene su **enlace personal** (botón "Copiar enlace"). Lo abre sin cuenta y ve solo **sus** tareas pendientes y entregadas.
4. Desde ese enlace el diseñador pulsa **"Marcar como entregada"** y, si quiere, deja una nota o un enlace al trabajo. El precio lo ve, pero no lo puede cambiar.
5. En tu pestaña Tareas ves todo: pendientes y entregadas por diseñador y por mes, con el total acumulado de cada uno.
6. Al final del mes pulsas **"Generar factura del mes"** para un diseñador. Se crea una factura de proveedor en **Borrador** en Facturas (numeración INV-P) con cada tarea entregada como artículo (descripción, cliente y precio). Esas tareas quedan marcadas como "facturadas" para que no se repitan.
7. Puedes revocar o regenerar el enlace de un diseñador en cualquier momento.

## Seguridad

- El enlace usa un código secreto y difícil de adivinar para cada diseñador. Quien no lo tenga no ve nada.
- La página pública solo muestra las tareas de ese diseñador (descripción, cliente, precio, fecha y estado), nunca otros datos de la agencia.
- Lo único que el diseñador puede cambiar es el estado de entregada y su nota.

## Detalles técnicos

- Tabla `designer_tasks` (user_id, provider_id, client_id, description, amount, currency, due_date, status Pendiente/Entregada/Facturada, delivered_at, delivery_note, invoice_id, month). Lleva GRANT y RLS `auth.uid() = user_id`, y no se da acceso anónimo.
- Tabla `provider_task_links` (user_id, provider_id, token único aleatorio, revoked boolean). RLS por dueño.
- Ruta pública `src/routes/tareas.$token.tsx` (SSR, head propio con noindex). Los datos se leen y se marcan como entregados con `createServerFn` públicos que validan el token con zod y usan el cliente admin dentro del handler. Solo se devuelven las columnas seguras y solo se actualizan status, delivered_at y delivery_note.
- Pestañas en `entregables.tsx` con un estado local (Entregables | Tareas) y un componente `DesignerTasks.tsx`.
- "Generar factura del mes" inserta en `invoices` (invoice_type vendor, vendor_id, status Borrador, siguiente número INV-P) y en `invoice_items`, una línea por tarea con client_id. Luego actualiza esas tareas a Facturada con invoice_id. Reutiliza los helpers de `invoice-actions`.
- Las tareas se cargan en `skyloop-context`.

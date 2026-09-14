# Eliminar factura desde su detalle ("Ver")

## Qué verás
- En la página de detalle de una factura (la que abre el botón "Ver"), aparece un botón **Eliminar** junto a las demás acciones.
- Al pulsarlo se pide confirmación ("Esta factura y sus pagos registrados se eliminarán de forma permanente") antes de borrar nada.
- Al confirmar: la factura desaparece del listado y vuelves a la página de Facturas.

## Qué se elimina
- La factura, sus artículos y sus pagos registrados.
- Si es una factura de proveedor vinculada a servicios pendientes, esos servicios vuelven a estado "Pendiente" con monto pagado en 0 (como si el gasto nunca se hubiera registrado).
- Los archivos adjuntos guardados dejan de estar enlazados (la referencia desaparece con la factura).

## Detalles técnicos
- `src/routes/_authenticated/facturas/$invoiceId.tsx`: botón "Eliminar" (estilo destructivo) con estado `deleting`; usa `window.confirm`, luego borra en orden: `invoice_items` → `invoice_payments` → `invoices` (por id), con `refresh()` y `navigate({ to: "/facturas" })`.
- Antes de borrar los artículos, se resetean las obligaciones de proveedor vinculadas (`UPDATE provider_obligations SET amount_paid = 0, status = 'Pendiente' WHERE id IN (SELECT obligation_id ...)` vía cliente Supabase) para que no queden montos pagados huérfanos, ya que el trigger de recálculo no recorre obligaciones cuyo artículo ya fue borrado.
- Fix incluido: guarda defensiva en `effectiveAssignments` (`finance.ts`) para el error momentáneo "Cannot read properties of undefined (reading 'find')" visto tras la recarga en caliente del cambio anterior (`overrides ?? []`).

## Verificación
1. Typecheck limpio.
2. Crear una factura de prueba, abrirla con "Ver", eliminarla y confirmar que ya no aparece en el listado; los datos de prueba se limpian al terminar.

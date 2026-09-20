# Equipo: Generado, Pagado y Pendiente por mes

## Qué cambia

En las tarjetas de Equipo, los tres números pasan a leerse así, siempre del mes seleccionado arriba:

- **Generado**: suma de los presupuestos asignados a esa persona en el desarrollo de trabajo de los clientes, con los valores del mes (respeta los ajustes por mes). Esto ya funciona así y se mantiene.
- **Pagado**: lo que le has pagado según las facturas de proveedor emitidas a su nombre en ese mes (la parte ya cobrada de cada factura).
- **Pendiente**: lo que queda por pagarle de esas mismas facturas del mes (saldo pendiente).

Así, si no le has facturado nada en el mes pero el cliente ya te pagó el servicio donde esa persona está asignada, en **Pendiente** verás el monto asignado que le debes, sin necesidad de crear primero su factura. Cuando registras la factura de proveedor y sus pagos, Pendiente pasa a reflejar el saldo de la factura y Pagado lo cobrado.

Las facturas en dólares se convierten a pesos con la tasa de Configuración, para que los tres valores se comparen en la misma moneda.

El resto de la página no cambia: directorio, selección múltiple y la tabla de servicios y obligaciones quedan igual.

## Detalles técnicos

- `src/routes/_authenticated/equipo.tsx`: tomar `data.invoices` de `useSkyloop()` en lugar de `monthExpenses` para los dos últimos valores.
- Facturas del proveedor en el mes: `invoiceKind(inv) === "vendor" && inv.vendor_id === provider.id && monthOf(inv.issue_date) === month`, excluyendo las anuladas/canceladas.
- `paid` = suma de `toDop(num(inv.amount_paid), inv.currency, usdRate)`; `pending` = suma de `toDop(invoiceBalance(inv), inv.currency, usdRate)` (`invoiceBalance` ya está en `src/lib/invoices.ts`).
- `total` (Generado) sigue igual: suma de `num(row.cost)` en `monthClientServices` con `provider_id === provider.id && active`.
- Pendiente sin factura: para cada asignación activa del proveedor en el mes, si el cliente de esa asignación tiene pagos registrados en el mes (`invoice_payments` de facturas de cliente del mes, o ingresos con estado "Cobrado" y `amount_paid` en sus facturas de cliente), se suma `num(row.cost)` al `pending` del proveedor; al emitirse la factura de proveedor correspondiente ese monto lo cubre el saldo de la factura.
- Verificación: `bunx tsgo --noEmit` y revisión en la vista previa con un proveedor que tenga factura parcialmente pagada en el mes.

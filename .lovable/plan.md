# Fecha de ingreso y finalización de clientes

## Qué verás
- Al crear o editar un cliente: dos campos nuevos, **Fecha de ingreso a la agencia** y **Fecha de finalización** (opcional; vacío = sigue activo).
- En Clientes, Reportes/Rentabilidad y Dashboard, al elegir un mes solo aparecen los clientes que estaban en la agencia ese mes:
  - Si ingresó después de ese mes, no aparece.
  - Si terminó antes de ese mes, no aparece.
  - El mes de ingreso y el mes de finalización sí cuentan.
- Los clientes actuales conservan su fecha de ingreso ya guardada; si no tienen, aparecen en todos los meses hasta que les pongas una.
- La ficha del cliente sigue accesible desde enlaces aunque no esté en el mes (sus datos históricos no se borran).

## Detalles técnicos
- Migración: `ALTER TABLE public.clients ADD COLUMN end_date date;` (reutiliza `start_date` existente).
- Helper `clientActiveInMonth(client, "YYYY-MM")` en `src/lib/finance.ts`: compara `start_date.slice(0,7) <= month` y `end_date.slice(0,7) >= month`, nulos = sin límite.
- `RecordModal.tsx`: campos `start_date` y `end_date` (tipo date) en crear/editar cliente; validar fin >= ingreso.
- Aplicar el filtro en `clientes/index.tsx`, `ProfitTable`/Reportes y bloques del Dashboard que listan o suman clientes.
- Ficha del cliente: mostrar ambas fechas.

# "Generado" = suma de los presupuestos asignados al proveedor

## Qué cambia

Hoy, en Equipo, **Generado** suma los gastos registrados del mes para ese proveedor. Pasará a sumar lo que le asignaste en el desarrollo de trabajo de cada cliente.

Ejemplo: Juan en Abordo con 5,000 y en De Boca en Boca con 5,000 → **Generado: RD$10,000**.

Detalles:
- Suma el **costo asignado** de todas las asignaciones activas donde ese proveedor aparece, en cualquier marca, usando los valores del **mes seleccionado** arriba (respeta los ajustes por mes).
- **Pagado** sigue siendo lo que ya le pagaste (gastos registrados con estado Pagado).
- **Pendiente** pasa a ser Generado − Pagado, es decir: de todo lo que debería ganar este mes, lo que aún no le has pagado. Si lo pagado supera lo asignado, se muestra RD$0 en vez de un negativo.

Nada más de la página cambia: el directorio, la selección múltiple y la tabla de servicios pendientes quedan igual.

## Detalles técnicos

- `src/routes/_authenticated/equipo.tsx`: tomar `monthClientServices` de `useSkyloop()`; `total` = suma de `num(row.cost)` de las filas con `row.provider_id === provider.id && row.active`; `paid` sigue calculándose con `monthExpenses` filtrados por `status === "Pagado"`; pendiente = `Math.max(total - paid, 0)`.
- Se conserva `sumDop`/`usdRate` solo para `paid`; los costos asignados ya están en pesos.
- Verificación: `bunx tsgo --noEmit` y revisión en la vista previa de un proveedor asignado a dos marcas.

# Asignaciones que respeten el mes (altas y bajas)

## Qué pasó
- La casilla "Aplicar a todos los meses" solo protege las **ediciones**. Agregar una asignación nueva o eliminar una hoy afecta **todos los meses**.
- En la base de datos, la asignación de Juan (Community Management) ya no existe: se eliminó por completo, así que desapareció de todos los meses.
- La de Genesis se creó sin mes de inicio, así que aparece también en meses pasados.

## Qué cambiará
1. **Agregar** una asignación: empieza a contar desde el mes seleccionado. Los meses anteriores no la muestran.
2. **Eliminar** una asignación: se deja de contar desde el mes seleccionado. Los meses anteriores la siguen mostrando. Se mantiene una opción aparte para "Eliminar de todos los meses" si de verdad quieres borrarla por completo.
3. Arreglo de tus datos:
   - Genesis (Community Management, Sky Europa) contará solo desde **octubre 2026**.
   - Juan se restaurará en Community Management **hasta septiembre 2026**. Hace falta el costo y la cantidad que tenía (no se conservan tras la eliminación). Si no lo indicas, se usa RD$2,000 y cantidad 1, como Genesis.

## Detalles técnicos
- Migración: `client_services.start_month text null`, `end_month text null` (formato YYYY-MM).
- `effectiveAssignments`: excluir filas con `start_month > month` o `end_month < month`.
- Insert en RecordModal: `start_month = month` seleccionado.
- Eliminar en ficha del cliente: por defecto `update end_month = mes anterior`; "Eliminar de todos los meses" hace el delete actual (y borra sus `client_service_months`).
- Datos: update Genesis `start_month='2026-10'`; insert Juan con `end_month='2026-09'`.

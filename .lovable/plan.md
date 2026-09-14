# Asignaciones por mes: editar sin afectar meses pasados

## Problema
Hoy cada asignación (servicio + proveedor + costo + cantidad) es un solo registro: si lo editas, cambia para todos los meses. Quieres que los cambios de costo, proveedor o cantidad afecten solo el mes que estás viendo, conservando el historial de meses anteriores (ej.: Kristian a RD$14,000 en agosto, Manuel a RD$13,000 en septiembre).

## Solución
La asignación actual pasa a ser el **valor habitual** (el que se usa en cualquier mes sin cambios). Encima se guardan **ajustes por mes**: cuando editas una asignación desde un mes concreto, se guarda el ajuste de ese mes y los demás meses siguen mostrando lo suyo.

### Qué verás
- En la ficha del cliente, la tabla "Servicios y equipo asignado" muestra los valores **del mes seleccionado** arriba en la barra. Al cambiar de mes, cambian costo/proveedor/cantidad si ese mes tiene ajustes.
- Las filas con ajuste del mes llevan una marca discreta (por ejemplo, un punto o etiqueta "ajustado") para saber que ese mes difiere del valor habitual.
- Al editar una asignación, el formulario indica: "Este cambio aplica solo a **septiembre 2026**", con una casilla opcional "Aplicar también a todos los meses" para actualizar el valor habitual.
- Las cantidades estimadas (Presupuesto mensual, lista de clientes y Rentabilidad) se calculan con los valores del mes seleccionado, así cada mes conserva su propia ganancia estimada.
- Crear una asignación nueva la registra como valor habitual (aparece en todos los meses). Eliminarla la quita por completo; solo las **ediciones** son por mes.

## Detalles técnicos
- Nueva tabla `client_service_months` (ajustes por mes): `client_service_id`, `user_id`, `month` (texto `YYYY-MM`), `cost`, `monthly_quantity`, `provider_id`. RLS por usuario, GRANTs, índices; migración nueva.
- `fetchAll` carga también los ajustes; el contexto expone `monthClientServices` = asignaciones efectivas del mes (base + ajuste si existe), y la ficha/lista/rentabilidad pasan a usarlas.
- `RecordModal` (asignación): al editar, hace upsert del ajuste del mes seleccionado (o actualiza la base si se marca "todos los meses"); al crear, inserta la fila base como hoy.
- Helper `effectiveAssignments(assignments, overrides, month)` en `finance.ts`.

## Verificación
1. Typecheck limpio.
2. En un mes, cambiar costo/proveedor de una asignación de prueba: solo ese mes cambia; el mes anterior conserva sus valores.
3. Marcar "aplicar a todos los meses" actualiza el valor habitual.
4. Revertir los datos de prueba al terminar.

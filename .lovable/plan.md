# Gastos fijos de la agencia + Entregables por cliente

## 1. Gastos fijos (nueva sección en el menú)

Aquí registras lo que la agencia paga todos los meses, sin importar el cliente: plataformas del equipo (Canva, Adobe, ChatGPT, Meta Verified…), internet, oficina, contador, etc.

- Lista de gastos fijos con: nombre, categoría (Plataformas, Oficina, Servicios profesionales, Otros), monto, moneda (pesos o dólares), mes de inicio y mes de fin (opcional).
- Se repiten solos cada mes mientras estén activos. Si en un mes cambia el precio, se ajusta solo ese mes sin tocar los anteriores (igual que las asignaciones).
- Botones: + Nuevo gasto fijo, Seleccionar, Editar, Eliminar (mismo estilo que Servicios/Proveedores).
- Resumen arriba del mes seleccionado:
  - Ganancia de clientes (pagos mensuales − servicios ofrecidos)
  - Total de gastos fijos (dólares convertidos a pesos con tu tasa)
  - **Ganancia neta de la agencia** = ganancia de clientes − gastos fijos
- Esa ganancia neta también se muestra en Reportes y como bloque opcional en el Dashboard.

## 2. Entregables (nueva sección en el menú)

Una tabla por mes para marcar si se entregó lo acordado a cada cliente.

- Se arma sola a partir de los servicios asignados a cada cliente en ese mes y su "cantidad ofrecida por mes". Ej.: Abordo Magazine con 12 posts → aparecen 12 casillas.
- Tabla agrupada por cliente: Servicio · Proveedor · Cantidad acordada · Casillas para tachar · Progreso (ej. 8/12).
- Filtro por cliente y barra de progreso general del mes.
- Cada mes empieza desmarcado; lo marcado en meses pasados queda guardado.
- En la ficha de cada cliente se muestra también su progreso de entregables del mes.

## Detalles técnicos

- Tabla `agency_fixed_costs` (name, category, amount, currency, start_month, end_month, user_id) + `agency_fixed_cost_months` para ajustes por mes. GRANTs y RLS `auth.uid() = user_id`.
- Tabla `client_deliverables` (client_service_id, month YYYY-MM, delivered_count, notes, user_id), única por (client_service_id, month); RLS igual.
- Rutas nuevas `/_authenticated/gastos-fijos` y `/_authenticated/entregables`, enlaces en `AppShell`.
- Datos cargados en `skyloop-context`; cálculo `fixedCostsForMonth` en `finance.ts` usando `toDop`; casillas usan `effectiveAssignments` del mes.
- Nuevos tipos de formulario en `RecordModal` para gasto fijo.

# Presupuesto mensual por cliente (ganancia estimada)

## Contexto

Hoy la app solo muestra montos reales (ingresos y gastos registrados del mes). No existe ningún campo donde registrar el monto cerrado con el cliente (ej. los $850/mes de Gran Hotel Europa), así que la ganancia "pago mensual − costo de servicios ofrecidos" no se puede ver en ninguna parte.

## Lógica acordada

- El **pago mensual** del cliente es el total cerrado del trato (valor mensual).
- Cada servicio asignado tiene su **Costo asignado**, que se descuenta del pago mensual.
- **Ganancia estimada = Pago mensual − suma de Costos asignados** de los servicios activos. Ej.: pago RD$50,000 − servicios RD$20,000 = ganancia RD$30,000.
- El pago mensual se ingresa en la moneda del cliente (campo Moneda que ya existe); los costos asignados se leen en esa misma moneda.

## Cambios

### 1. Base de datos
- Migración: agregar columna `monthly_payment numeric NOT NULL DEFAULT 0` a `public.clients` (sin romper nada; valor 0 = cliente sin presupuesto registrado).

### 2. Formulario de cliente (`RecordModal.tsx`)
- Nuevo campo "Pago mensual" en el formulario de cliente (admite decimales; en edición carga el valor guardado).

### 3. Cálculo (`src/lib/finance.ts`)
- Nueva función `estimatedMetrics(client, assignments)` que devuelve:
  - `payment`: pago mensual del cliente
  - `serviceCost`: suma de `cost` de las asignaciones activas del cliente
  - `estimatedProfit`: pago − servicios
  - `estimatedMargin`: margen en % sobre el pago mensual
- Conversión USD→DOP con la tasa existente para totales entre clientes (Rentabilidad).

### 4. Ficha del cliente (`clientes/$clientId.tsx`)
- Panel "Presupuesto mensual" con: Pago mensual, Costo de servicios, Ganancia estimada (verde/rojo) y barra de qué % del pago ya está comprometido en servicios.

### 5. Lista de clientes (`clientes/index.tsx`)
- Cada tarjeta muestra además Pago mensual y Ganancia estimada junto a los montos reales.

### 6. Rentabilidad (`ProfitTable.tsx`)
- Nuevas columnas: Pago mensual, Servicios, Ganancia estimada, junto a las reales (Facturación, Costos, Ganancia, Margen). Clientes con pago mensual pero sin movimientos del mes también aparecen.

## Fuera de alcance
- No cambia la ganancia real (ingresos/gastos registrados ni facturas) — se muestran ambas cifras por separado.
- No toca facturas, pagos ni PDFs.

## Verificación
- Typecheck limpio.
- Prueba en la vista previa: crear/editar un cliente con pago mensual, asignarle servicios con costo, y ver la ganancia estimada en ficha, lista y rentabilidad.

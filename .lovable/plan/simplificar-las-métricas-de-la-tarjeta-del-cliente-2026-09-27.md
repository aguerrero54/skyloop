# Simplificar las métricas de la tarjeta del cliente

## Cambios

En la tarjeta superior de la ficha del cliente (`src/routes/_authenticated/clientes/$clientId.tsx`), dejar solo 4 datos (una fila limpia de 4 columnas):

1. **PAGO MENSUAL** — el monto acordado con el cliente (en su moneda; si es USD, se muestra el equivalente en pesos con la tasa configurada, como ya funciona).
2. **SERVICIOS OFRECIDOS** — costo de los servicios asignados activos del mes.
3. **GANANCIA REAL** — pago mensual − costo de los servicios (en verde si es positiva, rojo si es negativa).
4. **MARGEN** — porcentaje de ganancia sobre el pago mensual: ganancia real ÷ pago mensual × 100.

## Eliminar

Los bloques de datos reales del mes que ya no se necesitan en esta tarjeta:

- FACTURACIÓN
- COSTOS
- GANANCIA (la real por facturas/ingresos/gastos)

Estas cifras siguen disponibles en Reportes y en los Movimientos del cliente, sin cambios.

## Verificación

- La tarjeta muestra exactamente las 4 métricas, en una fila.
- Cliente en USD: pago en dólares con su equivalente en pesos.
- Ganancia real y margen coinciden con pago mensual − servicios ofrecidos.
- Typecheck limpio con `bunx tsgo --noEmit`.

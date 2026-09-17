# Ajuste de montos en las tarjetas de clientes

## Cambios

- Cambiar la etiqueta **Costos** por **Gastos** en todas las tarjetas de la cartera de clientes.
- Para clientes cuyo pago mensual esté en **USD**:
  - Sustituir **Ganancia estimada** por **Pago mensual en pesos**.
  - Mostrar el pago mensual convertido a pesos usando la tasa del dólar configurada en la web.
- Para clientes cuyo pago mensual esté en **DOP**, mantener **Ganancia estimada** y su cálculo actual sin cambios.

## Verificación

- Confirmar que una tarjeta en USD muestre el pago original en dólares y su equivalente mensual en pesos.
- Confirmar que una tarjeta en DOP conserve la ganancia estimada.
- Confirmar que todas las tarjetas muestren **Gastos**.
- Ejecutar la comprobación de tipos del proyecto.

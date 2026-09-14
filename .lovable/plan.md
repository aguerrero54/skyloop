# Cuentas aisladas: cada quien ve solo sus propios datos

## Objetivo

Hoy cualquier persona que se registra en la web ve (y puede editar o borrar) TODA la información existente: clientes, facturas, proveedores, ingresos y gastos. El objetivo es que cada cuenta sea un espacio propio y vacío: cada persona administra sus propios clientes, facturas y movimientos, sin ver los datos de nadie más.

- Tu cuenta (Arli Guerrero) conserva todo lo que ya está registrado.
- Las cuentas nuevas (como la de Juan Jose Ceballos Perez) empiezan vacías.

## Alcance

**Cambia** el acceso a los datos en la base: todas las tablas de negocio pasarán a estar marcadas con el dueño de cada fila (cuenta registrada) y la base solo devolverá a cada usuario las filas que le pertenecen.

**No cambia** nada visual: la interfaz, formularios, facturas y cálculos quedan igual. Tampoco cambian las cosas que ya eran personales: nombre mostrado, tema oscuro/claro y la personalización del Dashboard.

**Queda compartido** (a propósito): la configuración general de Configuración (moneda, tasa del dólar, nombre de agencia). Si más adelante quieres que cada cuenta tenga su propia configuración, se hace como cambio aparte.

## Cambios en la base de datos (una sola migración)

Tablas afectadas: `clients`, `services`, `providers`, `client_services`, `incomes`, `expenses`, `monthly_history`, `invoices`, `invoice_items`, `invoice_payments`, `provider_obligations`.

Para cada una:

1. Agregar columna `user_id` (dueño de la fila).
2. Asignar todas las filas existentes a tu cuenta (id `5e265e4f-5eff-428f-bdfe-7e31470ffbb9` — Arli Guerrero), así no pierdes nada.
3. Hacer la columna obligatoria y con valor automático: toda fila nueva se asigna sola a la cuenta que la crea (no hay que tocar los formularios).
4. Reemplazar la regla actual "cualquier usuario autenticado ve todo" por "cada usuario ve y edita únicamente sus filas" (RLS con `auth.uid() = user_id`).

No se borra ni se pierde ningún dato existente.

## Cambios en la aplicación

- Ninguno estructural: los formularios y pantallas siguen funcionando igual, porque la base asigna el dueño automáticamente y filtra las lecturas.
- Verificación de que ninguna consulta depended de ver datos de otros usuarios (paneles de Facturas, Por cobrar, Por pagar, Rentabilidad, Reportes).

## Pruebas

1. Entrar con tu cuenta (Arli Guerrero): todo debe seguir igual que hoy.
2. Crear una cuenta de prueba nueva: dashboard, clientes, facturas, etc. deben mostrarse vacíos, y lo que esa cuenta cree debe ser visible solo para ella.
3. Confirmar que la cuenta de prueba NO ve tus clientes ni tus facturas.
4. Borrar la cuenta de prueba y sus datos al terminar.

## Ajuste visual adicional (formulario de factura)

En la sección "Información de la factura" de la creación de facturas:

- Los campos de rellenar (N.º de factura, Número de orden, Moneda, Fecha de la factura, Términos, Fecha de vencimiento) se reducen un 25% de largo.
- El campo "Asunto" se reduce un 50% de largo.

Solo cambia el ancho de los campos; la distribución de columnas y el resto del formulario quedan igual.

## Fuera de alcance

- Cada cuenta con su propia Configuración (moneda, tasa, nombre de agencia) — cambio aparte si lo quieres.
- Restringir quién puede registrarse (hoy cualquiera puede crear cuenta). Si prefieres que solo tú puedas crear cuentas, dímelo y lo agregamos.

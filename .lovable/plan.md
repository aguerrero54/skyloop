# Skyloop Control — versión web real

Convertir el prototipo local (que guardaba todo en el navegador) en una aplicación web real con cuentas de usuario y datos en la nube, manteniendo el mismo diseño oscuro con acento morado.

## Cómo se va a usar

1. Se entra con correo y contraseña. Cada persona tiene su cuenta.
2. Al entrar se ve el panel con el resumen del mes: facturación, cobrado, gastos y ganancia.
3. Desde el menú lateral se manejan: Clientes, Servicios, Equipo/Proveedores, Ingresos, Gastos, Cuentas por cobrar, Cuentas por pagar, Rentabilidad, Reportes y Configuración.
4. Todo lo que se registre queda guardado en la nube y se ve desde cualquier computadora o celular.

## Qué incluye

- **Panel principal**: facturación, cobrado, gastos, ganancia contable, gráfico de ingresos vs. gastos, ranking de clientes por facturación, rentabilidad por cliente y lista de pendientes.
- **Clientes**: tarjetas con ingresos, costos, ganancia y margen del mes; ficha individual con servicios y equipo asignado, resumen financiero y todos sus movimientos.
- **Servicios**: catálogo con precio sugerido, costo estimado y margen.
- **Equipo / Proveedores**: directorio con lo generado, pagado y pendiente de cada colaborador.
- **Ingresos y gastos**: registro con concepto, monto, moneda, estado, cliente, proveedor y vencimiento.
- **Cuentas por cobrar y por pagar**: todo lo pendiente ordenado por vencimiento.
- **Rentabilidad**: margen real por cliente.
- **Reportes**: exportar ingresos y gastos a CSV y respaldo completo.
- **Configuración**: moneda principal y tasa USD → DOP.
- **Filtro por mes** en la barra superior, aplicado a todas las pantallas.

## Datos iniciales

Se cargan tal cual los del prototipo: los 5 clientes (Abordo Magazine, Purpose ID, Japana Motors, AdAutos, Blinds & Shutters), los 10 servicios, los 6 proveedores (Manuel, Juan, Scarla, Kristian, Alma, Miguel), las asignaciones de servicio por cliente, los 4 ingresos de septiembre, los 14 gastos y el histórico de julio a septiembre.

Estos datos quedan visibles para cualquier cuenta del equipo, como un espacio de trabajo compartido de la agencia.

## Diseño

Se conserva el estilo del prototipo: fondo casi negro, paneles gris oscuro, acento morado, verde para positivos, rojo para negativos y amarillo para pendientes; tarjetas redondeadas, tipografía Inter y montos en formato RD$.

## Detalles técnicos

- Se activa Lovable Cloud (base de datos, autenticación y almacenamiento).
- Autenticación por correo/contraseña con página `/auth`; el panel vive bajo rutas protegidas (`/dashboard`, `/clientes`, etc.) y `/` redirige según sesión.
- Tabla `profiles` (nombre a mostrar) creada automáticamente al registrarse, para el nombre e inicial en la barra lateral.
- Migración basada en `supabase-schema.sql`, con lo que falta añadido: `profiles`, `monthly_history`, `app_settings`, columnas `direct_cost`/`status`, GRANTs y RLS en todas las tablas (lectura y escritura para usuarios autenticados; sin acceso anónimo).
- Los datos iniciales van como INSERT dentro de la misma migración.
- Los cálculos del prototipo se reimplementan como utilidades: conversión USD→DOP, métricas del mes, métricas por cliente, clases de estado y margen.
- Lectura y escritura mediante funciones de servidor autenticadas + TanStack Query, con invalidación tras cada registro.
- Formularios en modal reutilizable para ingreso, gasto, cliente, proveedor, servicio y asignación, igual que el prototipo.
- Exportación CSV/JSON generada en el navegador desde los datos ya cargados.

## Fuera de alcance por ahora

Roles y permisos diferenciados, facturas con pagos parciales, recurrencias mensuales automáticas, subida de comprobantes, overhead distribuido y reportes PDF.

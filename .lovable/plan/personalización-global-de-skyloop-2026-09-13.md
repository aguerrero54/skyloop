# Personalización global de Skyloop

## Objetivo
Añadir **Configuración → Personalización** dentro de la página actual, manteniendo el diseño de Skyloop y aplicando la apariencia elegida a todos los módulos protegidos.

## Implementación

### 1. Preferencias por usuario
- Crear `user_preferences`, vinculada al perfil del usuario, con modo (`light`, `dark`, `system`), tema predefinido, fondo personalizado y fecha de actualización.
- Proteger cada preferencia para que solo su propietario pueda verla o modificarla.
- Crear automáticamente valores predeterminados cuando aún no exista una preferencia guardada.

### 2. Sistema global de temas
- Ampliar las variables CSS existentes en lugar de reemplazarlas.
- Definir paletas completas y accesibles para **Predeterminado, Slate, Blue, Purple, Green y Rose**, en claro y oscuro.
- Mantener los colores de marca de Skyloop en el logotipo y elementos identificativos.
- Derivar superficies, tarjetas, sidebar, bordes, inputs, tablas, texto, estados y controles desde las variables semánticas existentes.
- Calcular una paleta legible alrededor del fondo personalizado, con texto claro u oscuro según contraste.
- Respetar `prefers-color-scheme` en modo Sistema y reaccionar si el dispositivo cambia de modo.

### 3. Proveedor de apariencia
- Crear un proveedor reutilizable dentro del área autenticada que cargue las preferencias del usuario y aplique atributos/variables al documento.
- Aplicar cambios al instante en toda la aplicación, sin recargar.
- Mantener una copia temporal mientras se edita; **Guardar cambios** la persiste y una salida sin guardar recupera la apariencia guardada.
- Evitar parpadeos al cambiar de módulo y sincronizar correctamente al iniciar/cerrar sesión.

### 4. Sección Personalización
Integrarla en la página actual de Configuración con:
- Selector visual de **Claro / Oscuro / Sistema**.
- Temas predefinidos mediante muestras de color.
- Fondo predeterminado o personalizado.
- Selector de color y campo HEX sincronizados, con validación.
- Vista previa viva con sidebar, encabezado, tarjeta, botón, input y tabla.
- Botón **Guardar cambios**, estados de carga y mensajes de éxito/error.
- Botón **Restaurar configuración predeterminada** con confirmación Cancelar/Restaurar.

### 5. Compatibilidad y accesibilidad
- Revisar los componentes compartidos, formularios, modales, tablas, gráficos y páginas de facturas para eliminar cualquier supuesto exclusivo del tema oscuro.
- Mantener el PDF de factura blanco y profesional: la personalización afecta la aplicación, no el documento descargado.
- Verificar contraste, foco, estados, overlays y legibilidad en colores personalizados claros y oscuros.

## Validación
- Probar Claro, Oscuro y Sistema con varios temas y fondos personalizados.
- Comprobar cambio inmediato en Dashboard, Clientes, Facturas, Servicios, Equipo, Ingresos, Gastos, Cobros, Pagos, Rentabilidad, Reportes y Configuración.
- Guardar, cerrar sesión, volver a entrar y confirmar persistencia por usuario.
- Probar restauración, HEX inválido, cambio del sistema y vistas de escritorio/móvil.

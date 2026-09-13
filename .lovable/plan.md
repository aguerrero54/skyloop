# Personalizar el Dashboard

## Objetivo
Al lado del selector de mes, añadir un botón **Personalizar** que permita elegir qué bloques aparecen en el Dashboard y en qué orden, guardado por usuario.

## Cómo se verá
- En la barra superior, junto al mes: botón discreto con icono de ajustes y texto "Personalizar" (solo visible en el Dashboard).
- Al pulsarlo se abre un panel lateral con:
  - Lista de bloques del Dashboard con casillas para mostrar u ocultar.
  - Flechas para subir/bajar cada bloque y cambiar el orden.
  - Botones **Guardar**, **Cancelar** y **Restaurar predeterminado**.
- Los cambios se ven al instante en el Dashboard y se conservan al volver a entrar.

## Bloques que se podrán activar u ocultar
Tarjetas principales (Facturación, Cobrado, Gastos, Margen) — cada una por separado
- Panel "Facturación del módulo de Facturas"
- Gráfico "Ingresos vs. gastos"
- "Clientes por facturación"
- "Rentabilidad por cliente"
- "Control inmediato"
- Nota del período al final

## Detalles técnicos
- Migración: añadir `dashboard_layout jsonb` a `public.user_preferences` (lista ordenada de `{ id, visible }`). Sin cambios de RLS ni GRANTs (ya existen).
- Nuevo módulo `src/lib/dashboard-prefs.tsx`: catálogo de bloques (id, etiqueta), preferencias por defecto, contexto con carga desde `user_preferences`, copia temporal mientras se edita, guardado y caché en localStorage para evitar parpadeo (mismo patrón que `theme-context`).
- Proveedor montado en `src/routes/_authenticated/route.tsx` junto a `ThemeProvider`.
- `AppShell.tsx`: en `TopBar`, botón "Personalizar" a la derecha del `<select>` de mes, visible solo cuando la ruta es `/dashboard`; abre el panel (Sheet de shadcn ya disponible o panel propio con el estilo actual).
- `dashboard.tsx`: cada bloque actual se extrae a una función de render y se recorre la lista ordenada de preferencias, mostrando solo los visibles. Sin cambios de cálculo ni de datos.
- Nuevo componente `src/components/skyloop/DashboardCustomizer.tsx` con la lista, casillas, orden y acciones.

## Validación
- Ocultar y reordenar bloques, guardar, recargar y confirmar que persiste.
- Restaurar predeterminado y comprobar que vuelve el orden original.
- Verificar que el botón no aparece en otras secciones y que la vista móvil funciona.

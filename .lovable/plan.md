# Plan: enlace del diseñador que abra directo, sin registro en Lovable

## Problema
El botón "Copiar enlace" de la pestaña Tareas genera el enlace usando la dirección de la vista previa (`window.location.origin`). Esa dirección es privada: quien la abre ve la pantalla de registro/inicio de sesión de Lovable en lugar del portal de tareas.

## Solución
Generar el enlace con la dirección pública de la app publicada: `https://clauds-doc-finder.lovable.app/tareas/<token>`. Esa dirección es abierta: el diseñador la abre y ve su portal directamente, sin cuenta ni registro.

## Cambios
1. **src/components/skyloop/DesignerTasks.tsx** — en "Copiar enlace", usar la URL pública publicada en lugar de `window.location.origin`.
2. **Configuración** — agregar un campo "URL pública de la app" en Ajustes (guardado en `app_settings`), con la URL publicada como valor por defecto. Así, si algún día conectas un dominio propio, solo cambias ese campo y los enlaces se generan con el nuevo dominio sin tocar código.

## Verificación
- Copiar el enlace de un diseñador y comprobar que empieza con `https://clauds-doc-finder.lovable.app/tareas/`.
- Abrirlo en una ventana sin sesión y confirmar que muestra el portal del diseñador directamente.

## Nota
Para que el enlace funcione para tus diseñadores, la app debe estar publicada con los últimos cambios (botón Publicar). La vista previa seguirá siendo privada; eso es normal y no afecta a los enlaces.

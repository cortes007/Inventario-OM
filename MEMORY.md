# Memoria técnica

- Frontend: React + Vite en `om-herramental/`, con servicios y repositorios inyectados desde `src/container.js`.
- Supabase usa `herramientas.codigo` como código de activo único: el valor predeterminado genera un código si se omite y permite especificar uno manual.
- El stock es derivado de `movimientos`; el acceso de cliente a `herramientas.stock_actual` está restringido y el trigger actualiza el campo.
- Los documentos se relacionan desde `tool_documents` y se almacenan en el bucket privado `tool-documents`; aplicar cambios existentes desde `supabase/migrations/`.
- El dashboard y los estados de ubicación derivan préstamos pendientes de `inventario_prestamos_resumen`; registra devoluciones como movimientos `ENTRADA`. Los cambios manuales de condición se guardan en `herramienta_estado_historial`.
- Dashboard: Supabase Realtime para cambios en herramientas/movimientos y recarga periódica de respaldo.
- Las pantallas usan servicios/repositorios inyectados. Los documentos pasan por `ToolDocumentService`; los exportadores XLSX/PDF están en `src/utils/`.
- RLS da acceso compartido a usuarios autenticados. No hay roles ni aislamiento por usuario, obra o empresa.

# Memoria técnica

- Frontend: React + Vite en `om-herramental/`, con servicios y repositorios inyectados desde `src/container.js`. En Vercel, `api/analizar.js` ofrece el análisis de movimientos con Groq en el mismo proyecto; sus variables son `GROQ_API_KEY` y opcionalmente `GROQ_MODEL`.
- Nombre de la empresa mostrado: OM Construcciones y Acabados SAS.
- Cada herramienta nueva es un activo individual (stock inicial exactamente 1); las salidas y devoluciones múltiples por persona se registran de forma atómica y las devoluciones no pueden superar las unidades prestadas.
- Supabase usa `herramientas.codigo` como código de activo único: el valor predeterminado genera un código si se omite y permite especificar uno manual.
- Cada herramienta representa un activo individual de una unidad; el movimiento ya no muestra cantidad y la migración `20261007000000_individual_asset_movements.sql` valida una unidad, exige nueva ubicación y actualiza condición/ubicación con triggers. El stock residual de la base se conserva como dato derivado por compatibilidad, sin métricas ni controles de stock mínimo en la interfaz.
- Los documentos se relacionan desde `tool_documents` y se almacenan en el bucket privado `tool-documents`; aplicar cambios existentes desde `supabase/migrations/`.
- El dashboard y los estados de ubicación derivan préstamos pendientes de `inventario_prestamos_resumen`; registra devoluciones como movimientos `ENTRADA`. Los cambios manuales de condición se guardan en `herramienta_estado_historial`.
- Dashboard: Supabase Realtime para cambios en herramientas/movimientos, recarga periódica de 5 segundos y aviso diagnóstico si la suscripción no conecta. La migración `20261002030000_enable_inventory_realtime.sql` habilita las dos tablas en `supabase_realtime`.
- Las pantallas usan servicios/repositorios inyectados. Los documentos pasan por `ToolDocumentService`; los exportadores XLSX/PDF están en `src/utils/`.
- Las salidas múltiples usan `registrar_movimientos_lote` (`20261002020000_atomic_multi_tool_movements.sql`) y las devoluciones usan `registrar_devoluciones_lote` (`20261002040000_atomic_multi_tool_returns.sql`); ambas operaciones se validan de forma atómica.
- RLS da acceso compartido a usuarios autenticados. No hay roles ni aislamiento por usuario, obra o empresa.

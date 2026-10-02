# OM Herramental

Sistema de inventario y control de herramientas de **OM Construcciones y Acabados SAS**. Permite registrar herramientas, controlar sus entradas y salidas (préstamos a obra) y generar informes exportables a Excel.

## Funcionalidades

- **Dashboard** en tiempo real con unidades en bodega, préstamos pendientes, alertas de bajo stock y herramientas en mantenimiento.
- **CRUD de herramientas** con código de activo autogenerado y editable, búsqueda y filtros dinámicos por estado.
- **Activos individuales:** cada herramienta nueva se registra como una unidad (cantidad 1) para conservar una ficha y documentación propias.
- **Detalle de herramienta** con historial de movimientos/cambios de estado y documentos en almacenamiento privado; también permite preadjuntar archivos al crear una herramienta.
- **Entradas y salidas** con responsable y obra sugeridos; permite entregar varias herramientas a una persona en una sola operación atómica.
- **Informes** filtrados por rango de fechas y tipo; la tabla completa tiene desplazamiento interno para evitar desbordamiento y el resultado filtrado se puede exportar a Excel XLSX, incluyendo referencia, fecha, tipo, código de activo, herramienta, cantidad, responsable, destino y observación.
- **Códigos automáticos**: `HER-0001` para herramientas y `MOV-000001` para movimientos; fecha y usuario se asignan solos.
- **Stock automático**: un trigger en la base de datos actualiza el stock y rechaza salidas mayores al disponible.
- **Historial inmutable**: los movimientos no se editan ni se eliminan, lo que sirve de auditoría.
- **Autenticación** con Supabase Auth.

## Tecnologías

React 18 · Vite · Tailwind CSS 3 · Lucide React · Supabase (PostgreSQL, Auth, PostgREST, RLS)

## Arquitectura

Cliente–servidor: el cliente React se comunica con la API REST de Supabase, que expone una base PostgreSQL protegida con RLS y triggers.

```
src/
├── components/     UI reutilizable (Button, Modal, Login…)
├── pages/          Pantallas: Dashboard, Tools, Movements, Reports
├── hooks/          useResource (estado asíncrono)
├── services/       Reglas de negocio: ToolService, MovementService, ReportService
├── repositories/   Acceso a datos: BaseRepository → ToolRepository, MovementRepository
├── lib/            Cliente de Supabase
├── utils/          Utilidades (CSV)
└── container.js    Inyección de dependencias (composition root)
supabase/
├── schema.sql              Tablas, secuencias, trigger y políticas RLS
├── migrations/             Cambios incrementales para proyectos existentes
└── seed_inventario.sql     Carga inicial del inventario
```

El número de unidades prestadas se calcula en una vista de base de datos protegida por RLS. Las entradas marcadas como "Stock inicial" no se interpretan como devoluciones; las demás entradas descuentan el saldo prestado. Por ello, registra las devoluciones como entradas para mantener los indicadores sincronizados. El dashboard escucha cambios de herramientas y movimientos mediante Supabase Realtime, con recarga cada 30 segundos si Realtime no está disponible. La lista de entradas y salidas muestra como máximo los 10 movimientos más recientes; informes muestra todos los resultados filtrados dentro de una tabla desplazable y el Excel incluye el conjunto completo.

**SOLID**
- **S**: cada capa y clase tiene una única responsabilidad.
- **O**: los repositorios se extienden por herencia sin modificar la base.
- **L**: `MovementRepository` sustituye a `BaseRepository` y bloquea de forma explícita editar o borrar.
- **I**: servicios pequeños, uno por caso de uso.
- **D**: los servicios reciben los repositorios por constructor; solo `container.js` conoce las clases concretas.

## Instalación

Requisitos: Node.js 18 o superior y un proyecto en [Supabase](https://supabase.com).

1. Clona el repositorio e instala las dependencias:
   ```bash
   git clone https://github.com/cortes007/Inventario-OM.git
   cd Inventario-OM/om-herramental
   npm install
   ```
2. En Supabase → **SQL Editor**, ejecuta `supabase/schema.sql` para una instalación nueva. En una instalación existente, aplica todas las migraciones de `supabase/migrations/` en orden, incluida `20261002030000_enable_inventory_realtime.sql`. En Supabase → **Database → Replication**, confirma que `herramientas` y `movimientos` estén habilitadas para Realtime. Ejecuta `supabase/seed_inventario.sql` solo si quieres cargar los datos iniciales.
3. En Supabase → **Authentication → Users**, crea un usuario (marca *Auto Confirm User*).
4. Copia `.env.example` a `.env` y completa los valores (Project Settings → API):
   ```dotenv
   VITE_SUPABASE_URL=https://<tu-proyecto>.supabase.co
   VITE_SUPABASE_ANON_KEY=<clave anon o publishable>
   ```
5. Inicia la aplicación:
   ```bash
   npm run dev
   ```

## Scripts

| Comando | Descripción |
| --- | --- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Compilación de producción en `dist/` |
| `npm run preview` | Vista previa de la compilación |

## Seguridad

- Usa solo la clave **anon/publishable** en el frontend. La clave `service_role` o `sb_secret_...` **nunca** debe ir en el cliente ni en el repositorio.
- El archivo `.env` está en `.gitignore`. Si una llave se expone, róptala en Project Settings → API Keys.
- Las tablas tienen RLS activado: solo usuarios autenticados acceden al inventario compartido. Los movimientos son de solo lectura e inserción.
- `herramientas.codigo` se genera cuando se omite al crear y admite un valor manual único; el cliente no puede modificar `stock_actual`, que solo cambia por el trigger de movimientos.
- Los documentos se registran en `tool_documents` y se guardan en el bucket privado `tool-documents`. Solo su usuario cargador puede borrarlos; las lecturas requieren autenticación.
- No hay roles ni separación por empresa en el esquema actual: todas las cuentas autenticadas comparten los mismos datos. Define ese modelo antes de añadir permisos diferenciados por usuario/obra.

## Despliegue

El proyecto genera archivos estáticos (`npm run build`), así que se puede publicar en Vercel, Netlify o Cloudflare Pages. Configura allí las dos variables `VITE_SUPABASE_*` y vuelve a desplegar después de cambiarlas. Si el WebSocket de Realtime está bloqueado, el inventario se vuelve a consultar automáticamente cada 5 segundos.

## Equipo

Proyecto del Consultorio Tecnológico, Universidad de Sabaneta, para OM Construcciones y Acabados SAS.

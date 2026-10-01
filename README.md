# OM Herramental

Sistema de inventario y control de herramientas de **AcabadosOM SAS**. Permite registrar herramientas, controlar sus entradas y salidas (préstamos a obra) y generar informes exportables a Excel, reemplazando el control informal por WhatsApp.

## Funcionalidades

- **CRUD de herramientas** con búsqueda, estado (disponible, en reparación, baja) y alerta de stock bajo.
- **Entradas y salidas** con un formulario rápido: responsable y obra se autocompletan con valores anteriores.
- **Informes** filtrados por rango de fechas y tipo, con exportación a CSV compatible con Excel (movimientos e inventario actual).
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
├── pages/          Pantallas: Tools, Movements, Reports
├── hooks/          useResource (estado asíncrono)
├── services/       Reglas de negocio: ToolService, MovementService, ReportService
├── repositories/   Acceso a datos: BaseRepository → ToolRepository, MovementRepository
├── lib/            Cliente de Supabase
├── utils/          Utilidades (CSV)
└── container.js    Inyección de dependencias (composition root)
supabase/
├── schema.sql              Tablas, secuencias, trigger y políticas RLS
└── seed_inventario.sql     Carga inicial del inventario
```

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
2. En Supabase → **SQL Editor**, ejecuta en orden `supabase/schema.sql` y, si quieres los datos iniciales, `supabase/seed_inventario.sql`.
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
- Las tablas tienen RLS activado: solo usuarios autenticados acceden a los datos.

## Despliegue

El proyecto genera archivos estáticos (`npm run build`), así que se puede publicar en Vercel, Netlify o Cloudflare Pages. Configura allí las dos variables `VITE_SUPABASE_*`.

## Equipo

Proyecto del Consultorio Tecnológico, Universidad de Sabaneta, para AcabadosOM SAS.

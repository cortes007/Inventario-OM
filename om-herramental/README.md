# OM Herramental · OM Construcciones y Acabados SAS

## Puesta en marcha
1. Supabase → SQL Editor → pega y ejecuta `supabase/schema.sql`.
2. Supabase → Authentication → Users → crea los usuarios del equipo (correo + contraseña).
3. `cp .env.example .env` y pega la anon key (Project Settings → API).
4. `npm install && npm run dev` (para ejecutar frontend y función API desde una terminal).

Si la base ya existe, aplica las migraciones de `supabase/migrations/` en orden antes de usar los nuevos movimientos por activo.

El comando `npm run dev` también sirve `/api/analizar` y carga `GROQ_API_KEY` y `GROQ_MODEL` desde `../backend/.env`, si existe. No necesitas iniciar aparte el servidor antiguo de `backend/`. En Vercel, establece `om-herramental` como **Root Directory** y configura `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `GROQ_API_KEY` como variables de entorno. `GROQ_MODEL` es opcional. La función verifica el token de la sesión de Supabase antes de consumir Groq; por ello, ambas variables `VITE_SUPABASE_*` también deben estar disponibles para la función.

## Arquitectura (cliente–servidor)
Cliente React/Vite ⇄ API REST de Supabase (PostgREST) ⇄ PostgreSQL con RLS y triggers. Cada herramienta representa un activo único con estado, ubicación actual, documentos e historial propios.

    pages/components  → UI (solo presentación)
    hooks             → estado asíncrono
    services          → reglas de negocio (ToolService, MovementService, ReportService)
    repositories      → acceso a datos (BaseRepository → ToolRepository, MovementRepository)
    container.js      → inyección de dependencias (único lugar que conoce las clases concretas)

SOLID: S (una responsabilidad por capa/clase) · O (repositorios se extienden por herencia) ·
L (MovementRepository sustituye a BaseRepository bloqueando edición de forma explícita) ·
I (servicios pequeños por caso de uso) · D (servicios reciben repositorios por constructor).

## Automatización
- Código de herramienta `HER-0001` y de movimiento `MOV-000001`: los genera la base de datos.
- Fecha y usuario: automáticos. Cada salida o devolución se registra para un solo activo y actualiza su condición y ubicación mediante triggers.
- Responsable y ubicación de destino se autocompletan con valores anteriores; la ubicación es obligatoria en movimientos.
- Informes: filtro por fechas/tipo y exportación CSV compatible con Excel.

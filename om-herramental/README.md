# OM Herramental · AcabadosOM SAS

## Puesta en marcha
1. Supabase → SQL Editor → pega y ejecuta `supabase/schema.sql`.
2. Supabase → Authentication → Users → crea los usuarios del equipo (correo + contraseña).
3. `cp .env.example .env` y pega la anon key (Project Settings → API).
4. `npm install && npm run dev`

## Arquitectura (cliente–servidor)
Cliente React/Vite ⇄ API REST de Supabase (PostgREST) ⇄ PostgreSQL con RLS y triggers.

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
- Fecha, usuario y stock: automáticos (trigger `aplicar_movimiento`); una salida mayor al stock se rechaza.
- Responsable y destino se autocompletan con valores anteriores.
- Informes: filtro por fechas/tipo y exportación CSV compatible con Excel.

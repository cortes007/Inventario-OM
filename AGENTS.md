# AGENTS.md - Directrices para Agentes y Desarrolladores

Este documento establece las reglas estrictas de arquitectura, desarrollo y comportamiento operativo para cualquier agente o desarrollador que trabaje en el proyecto **Inventario-OM**.

---

## 1. Reglas y Estructura del Programa Actual

### Arquitectura y Tecnologías
* **Stack:** React 18, Vite, Tailwind CSS 3, Lucide React, Supabase (PostgreSQL, Auth, PostgREST, RLS).
* **Ubicación del Código:** Todo el código fuente del frontend y configuraciones de Supabase se encuentran dentro del subdirectorio `om-herramental/`.
* **Estructura del Código Fuente (`om-herramental/src/`):**
  * `components/`: Componentes UI reutilizables (Botones, Modales, Login, etc.).
  * `pages/`: Pantallas principales de la aplicación (`Tools.jsx`, `Movements.jsx`, `Reports.jsx`).
  * `hooks/`: Hooks personalizados (`useResource.js` para manejo de estado asíncrono).
  * `services/`: Reglas de negocio desacopladas (`ToolService.js`, `MovementService.js`, `ReportService.js`).
  * `repositories/`: Capa de acceso a datos (`BaseRepository.js`, `ToolRepository.js`, `MovementRepository.js`).
  * `lib/`: Configuración del cliente de Supabase (`supabase.js`).
  * `utils/`: Utilidades generales (exportación CSV).
  * `container.js`: Contenedor de Inyección de Dependencias (Composition Root).
* **Base de Datos y Esquema (`om-herramental/supabase/`):**
  * `schema.sql`: Tablas, secuencias, triggers de stock automático e integridad, y políticas RLS.
  * `seed_inventario.sql`: Datos iniciales del inventario.

---

## 2. Aplicación de Principios SOLID (Responsabilidad Única)

Todas las contribuciones, modificaciones de código y nuevas funcionalidades deben cumplir rigurosamente con los principios SOLID:

* **Principio de Responsabilidad Única (SRP - Single Responsibility Principle):**
  * Cada clase, servicio, repositorio, componente o archivo debe tener una **única razón para cambiar**.
  * Separar tajantemente la lógica de presentación (React components/pages), la lógica de negocio (services) y el acceso a datos (repositories).
  * No mezclar lógica de consultas directas a Supabase dentro de componentes de UI o páginas.
* **Abierto/Cerrado (OCP):** Las clases de repositorio y servicios deben poder extenderse sin modificar el código base ya probado (ej. herencia de `BaseRepository`).
* **Sustitución de Liskov (LSP):** Las clases derivadas deben cumplir estrictamente el contrato de sus clases base (ej. `MovementRepository` bloquea de forma explícita operaciones de edición/eliminación para garantizar el historial inmutable).
* **Segregación de Interfaces (ISP):** Mantener servicios y contratos enfocados en tareas específicas y acotadas.
* **Inversión de Dependencias (DIP):** Los servicios deben recibir sus dependencias (repositorios) por constructor. El único punto donde se instancian clases concretas es el Composition Root (`om-herramental/src/container.js`).

---

## 3. Restricciones de Git y GitHub

* **Cero cambios automáticos en GitHub:**
  * Está estrictamente prohibido realizar *pushes* automáticos, crear *Pull Requests*, abrir *Issues* o interactuar de manera autónoma con repositorios de GitHub sin la autorización explícita y manual del usuario.
  * Todas las acciones sobre control de versiones remoto deben ser manejadas de forma manual por el usuario o requerir confirmación explícita previa.

---

## 4. Gestión y Ciclo de Vida del Archivo `MEMORY.md`

* **Creación y Actualización Obligatoria:**
  * Lee  `MEMORY.md`. Cada vez que se realice un **cambio importante** en el proyecto (cambios estructurales mayores, modificaciones de arquitectura, adición de nuevas tecnologías o refactorizaciones de capas), se debe actualizar el archivo `MEMORY.md` ubicado en la raíz del repositorio.
  * Si el archivo `MEMORY.md` no existe en la raíz, debe crearse tras un cambio estructural significativo.
* **Limpieza y Mantenimiento de `MEMORY.md`:**
  * Si el archivo `MEMORY.md` se encuentra desactualizado respecto al estado actual del programa, **debe ser actualizado, resumido y depurado**, eliminando toda información obsoleta, datos temporales o detalles que ya no apliquen al estado actual del software.
  * El archivo debe mantenerse limpio, conciso y representar fielmente la memoria técnica y arquitectónica vigente del proyecto.

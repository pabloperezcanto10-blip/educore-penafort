# Reutilización del módulo de alumnos

## Regla de producto

Todo módulo común de EducaCora debe tener una única implementación visual compartida. Las diferencias entre Tutor, Director, Admin y Familia se controlan por props, permisos y modo de uso, nunca duplicando pantallas visuales.

Los módulos comunes de alumnos no deben tener implementaciones visuales distintas por rol. Las rutas pueden decidir permisos, datos y acciones, pero deben renderizar la misma base visual compartida.

## Componentes compartidos definitivos

### Listado

`src/components/students/student-directory.tsx`

- `StudentDirectoryHeader`
- `StudentDirectoryFilters`
- `StudentDirectoryList`

Uso: listados de alumnos con búsqueda, filtro de curso y tabla compacta.

### Ficha individual

`src/components/students/student-profile.tsx`

- `StudentProfileHeader`
- `StudentQuickActions`
- `StudentProfileTabs`
- `StudentStatusDashboard`
- `StudentActivityTimeline`

Uso: shell visual de ficha del alumno, acciones, tabs, estado y seguimiento reciente.

Estos componentes son presentacionales. No consultan Supabase, no aplican permisos y no ejecutan server actions. Cada ruta sigue cargando únicamente los datos permitidos para su rol.

## Rutas conectadas

- `/dashboard/tutor/students/[id]`
  - Usa `StudentProfileHeader`, `StudentQuickActions`, `StudentProfileTabs`, `StudentStatusDashboard` y `StudentActivityTimeline`.
  - Mantiene acciones operativas del tutor según permisos actuales.

- `/dashboard/director/students`
  - Usa `StudentDirectoryHeader`, `StudentDirectoryFilters` y `StudentDirectoryList`.

- `/dashboard/director/students/[id]`
  - Usa `StudentProfileHeader`, `StudentQuickActions`, `StudentProfileTabs`, `StudentStatusDashboard` y `StudentActivityTimeline`.
  - Mantiene pestañas de supervisión en solo lectura y acciones como navegación a cuaderno, comunicaciones y calificaciones.

- `/dashboard/admin/students/[id]`
  - Usa `StudentProfileHeader`, `StudentQuickActions`, `StudentProfileTabs`, `StudentStatusDashboard` y `StudentActivityTimeline`.
  - Mantiene modo superadmin de supervisión/gestión con acceso al cuaderno, observaciones y al CRUD separado.

## Rutas con lógica específica

- `/dashboard/tutor/students`
  - Mantiene panel interno de docencia/tutoría porque su flujo de selección por clase es específico del tutor.
  - La siguiente fase debería extraer su tabla compacta a un componente compartido adicional sin perder el panel de clases.

- `/dashboard/admin/students`
  - Sigue siendo mantenimiento CRUD: crear, editar, activar/desactivar.
  - No debe mezclarse con la vista de supervisión. La supervisión individual ya vive en `/dashboard/admin/students/[id]`.

## Garantía de reutilización

Cambios en la cabecera, acciones, tabs, dashboard de estado, timeline o lista compartida deben hacerse en `src/components/students/*`. Las rutas por rol solo deben adaptar datos autorizados y acciones permitidas mediante props.

## Pendiente recomendado

- Extraer la tabla de alumnos de `/dashboard/tutor/students` para que comparta el mismo componente base que `StudentDirectoryList`, conservando el panel interno de clases.
- Separar en admin una ruta futura de consulta global de alumnos si se quiere una vista de supervisión distinta del mantenimiento.
# Sprint 20.2E - Ensayo controlado de 037

Fecha: 27 de julio de 2026
Entorno exclusivo: Supabase staging
Project Ref: `zhnbrpcekmxldxlqrbhr`
Rama Git: `staging`

## 1. Estado inicial

- HEAD inicial: `08b96caf9c2964c4f2f78fddc12eb383886e1087`.
- Commit de trazabilidad previo: `ded117d`.
- `origin/staging` contiene el commit de trazabilidad.
- `main` y `origin/main`: `401148590b9694a987328145cc64361b84fb7a05`.
- Historial local y remoto de Supabase alineado en `001-036`.
- No existe `037` en `supabase/migrations` al iniciar el ensayo.
- `profiles` no contiene `school_id`.

## 2. Recuperación

Supabase informa:

- backups físicos disponibles: ninguno;
- PITR: desactivado;
- ramas de base de datos: ninguna;
- WAL-G: habilitado, sin un backup restaurable expuesto por la CLI.

El intento de `supabase db dump --linked` se detuvo antes de generar archivos
porque el equipo no dispone de Docker. No se obtuvo ni almacenó ningún dump.

Staging es un entorno aislado y descartable, sin datos operativos. El mecanismo
de recuperación verificable es su reconstrucción reproducible:

1. recrear el proyecto staging;
2. aplicar `supabase/baseline/000_public_schema_baseline.sql`;
3. reconciliar el historial `001-033`;
4. reaplicar `034`, `035` y `036`;
5. ejecutar sus verificadores antes de reanudar.

La migración `037` usa una transacción explícita. Un fallo durante su aplicación
revierte la unidad completa. No se ejecutará ningún reset, repair ni rollback
contra producción.

## 3. Preflight de datos

Fuente: `supabase/verification/020_2e_people_preflight.sql`.

| Tabla | Total | Resolubles | Ambiguas | Bloqueantes |
| --- | ---: | ---: | ---: | ---: |
| `students` | 0 | 0 | 0 | 0 |
| `families` | 0 | 0 | 0 | 0 |
| `student_families` | 0 | 0 | 0 | 0 |
| `parent_students` | 0 | 0 | 0 | 0 |
| `teachers` | 0 | 0 | 0 | 0 |
| `teacher_assignments` | 0 | 0 | 0 | 0 |

Comprobaciones adicionales:

- 9 memberships: 8 activas y 1 inactiva;
- 4 usuarios multischool válidos;
- 0 memberships duplicadas por usuario, centro y rol;
- 0 memberships huérfanas;
- 0 perfiles sin Auth user;
- 0 Auth users sin perfil;
- 13 policies requeridas disponibles;
- RLS activa en las 6 tablas de personas;
- 3 índices únicos de configuración requeridos disponibles;
- 4 columnas académicas `school_id` son UUID y `NOT NULL`;
- `profiles.school_id` no existe.

No se devolvieron nombres, correos ni datos personales.

## 4. Puertas de seguridad

El ensayo solo puede continuar si:

- la revisión estática no encuentra selección arbitraria;
- `supabase db lint` no devuelve errores;
- el dry-run contiene únicamente `037`;
- la aplicación confirma de nuevo el Project Ref de staging;
- `020_2d_people_checks.sql` termina completo sin persistir fixtures.

## 5. Resultado

### Primer ensayo

La primera aplicación de `037` terminó correctamente y los diez bloques de
`020_2d_people_checks.sql` pasaron. La regresión autenticada detectó, sin
embargo, una incompatibilidad de catálogo:

- la FK simple `students_course_id_fkey` convivía con la nueva FK compuesta
  `students_course_school_fkey`;
- PostgREST encontraba dos relaciones posibles entre `students` y `courses`;
- la ficha del alumno devolvía `more than one relationship`.

El ensayo se detuvo. Las contraseñas temporales QA se retiraron y staging se
restauró con `supabase/plans/20_2/037_rollback_staging.sql`. Después se marcó
`037` como revertida mediante `migration repair`. El preflight confirmó de
nuevo historial `001-036`, cero columnas de personas y los mismos agregados.

### Corrección

La versión corregida sustituye ocho FKs simples por sus FKs compuestas:

- `students`: course y academic year;
- `student_families`: student y family;
- `parent_students`: student;
- `teacher_assignments`: course, subject y academic year.

La migración verifica primero que las ocho relaciones reemplazables existen.
No se elimina ninguna relación Auth ni se relaja ninguna regla.

### Segundo ensayo

- aplicación de `037`: 7,67 segundos;
- historial local/remoto: `001-037`;
- dry-run posterior: vacío;
- columnas `school_id` UUID y `NOT NULL`: 6;
- FKs nuevas: 14;
- índices nuevos: 11;
- triggers de contexto: 6;
- policies tenant-scoped: 13;
- FKs simples reemplazadas restantes: 0;
- policies en tablas legacy: 0;
- fixtures persistentes tras QA: 0;
- `profiles.school_id`: no existe.

Los diez bloques de `020_2d_people_checks.sql` pasaron:

1. catálogo y funciones protegidas;
2. fuente única, ausente y ambigua;
3. superadmin;
4. director;
5. tutor multischool;
6. familia;
7. membership inactiva;
8. usuario sin membership;
9. relaciones cruzadas y roles incorrectos;
10. limpieza final.

### Regresión de aplicación

Se usaron exclusivamente las cinco cuentas `qa.*@example.test` ya existentes.
Se asignó una contraseña aleatoria temporal, no registrada en el repositorio,
y se retiró al finalizar. Las cinco identidades volvieron a quedar sin
contraseña interactiva.

Comprobaciones correctas:

- login de superadmin, director, tutor y familia;
- dashboards de los cuatro roles;
- alumnado y fichas en Tutor, Director y Admin;
- comunicaciones;
- cuadernos;
- asistencia;
- asignaciones y materias;
- cursos, materias y años académicos;
- familia sin datos visibles cuando no hay relaciones;
- usuario sin membership recibe cero datos;
- navegación privada sin sesión redirige a `/login`;
- staging responde 200 y mantiene `noindex`.

No se crearon alumnos, familias, profesores, calificaciones, comunicaciones ni
actividad operativa. No se detectaron errores de consola durante la regresión.

## 6. Decisión

`GO CON BLOQUEOS`.

La migración `037` puede mantenerse aplicada en staging. Su integridad, RLS,
compatibilidad PostgREST y aplicación han sido verificadas. Todavía no debe
promoverse a producción: falta ensayarla con un conjunto representativo,
anonimizado y determinista de filas resolubles antes de autorizar backfill de
datos históricos reales.

`038`, `039` y `040` permanecen fuera de `supabase/migrations`.

# Diseño seguro de la migración 037

Versión: 1.0  
Sprint: 20.2D  
Estado: diseño ejecutable, no aplicado  
Entorno objetivo futuro: Supabase staging

## 1. Alcance

La propuesta `037_add_school_id_to_people.sql` incorpora propiedad tenant a:

- `students`;
- `families` (legado);
- `student_families` (legado);
- `parent_students`;
- `teachers` (legado);
- `teacher_assignments`.

`profiles` sigue siendo identidad global. `school_memberships` ya contiene
`school_id` y es la autoridad de rol por centro. Ninguna fila se asigna desde
`profiles.role`, email, nombre, orden de memberships ni un UUID fijo.

## 2. Inventario y resolución

| Tabla | PK actual | Relaciones relevantes | Fuente de tenant | Bloqueos |
| --- | --- | --- | --- | --- |
| `profiles` | `id`, FK a Auth | identidad global | no recibe `school_id` | perfil sin Auth |
| `school_memberships` | `id`; unique user/school/role | Auth + school | existente | membership inactiva, rol incorrecto |
| `students` | `id` | course, academic year, tutor Auth | `course.school_id` | course nulo, año distinto, tutor sin membership tutor |
| `families` | `id` | sin FK de identidad | único school de sus `student_families` | cero o varios schools |
| `student_families` | `(student_id, family_id)` | student + legacy family | `student.school_id` | huérfano o family de otro school |
| `parent_students` | `id` | parent Auth + student | `student.school_id` | nulos, duplicado, parent sin membership family |
| `teachers` | `id` | sin FK de identidad | ninguna fuente fiable | cualquier fila bloquea 037 |
| `teacher_assignments` | `id` | teacher Auth, course, subject, year | `course.school_id` | nulos, cruce académico, teacher sin membership tutor |

El estado conocido indica que `families`, `student_families` y `teachers`
tienen cero filas. Si dejan de estar vacías antes de aplicar 037, los
diagnósticos deben repetirse.

Evidencia agregada disponible del 27 de julio de 2026:

- staging: cero filas en las seis tablas de esta oleada;
- producción: 51 students, 51 parent-students y 10 teacher assignments;
- producción: cero families, student-families y teachers legado;
- los diagnósticos anteriores no detectaron student sin course,
  course/year conflict, parent sin perfil family ni assignment/year conflict.

Esto no demuestra todavía que las identidades históricas tengan la membership
activa correcta: producción aún no dispone de la fundación 034-036. No hay una
ambigüedad confirmada en staging, pero sí bloqueos potenciales que deben
recalcularse tras crear memberships en un ensayo aislado.

## 3. Reglas deterministas

1. La raíz académica determina la propiedad de la fila.
2. La membership autoriza a la identidad relacionada, pero nunca elige el
   tenant.
3. Un usuario multischool es válido: cada relación usa el school de su curso o
   alumno y exige la membership compatible en ese mismo school.
4. Cero fuentes o varias fuentes bloquean la migración.
5. Una membership inactiva, un perfil inactivo o un rol incorrecto no autorizan
   relaciones nuevas.
6. Los registros históricos con identidad inactiva o membership ausente
   requieren una decisión auditada antes del backfill; no se corrigen
   automáticamente.
7. El cliente puede omitir `school_id` en writes existentes. Un trigger lo
   deriva y rechaza cualquier valor enviado que no coincida.

## 4. Integridad propuesta

Raíces tenant:

- unique `(students.id, students.school_id)`;
- unique `(families.id, families.school_id)`;
- unique `(teachers.id, teachers.school_id)`.

FKs compuestas:

- student -> course + school;
- student -> academic year + school;
- student-family legacy -> student + school;
- student-family legacy -> family + school;
- parent-student -> student + school;
- teacher assignment -> course + school;
- teacher assignment -> subject + school;
- teacher assignment -> academic year + school.

Las referencias a Auth no admiten una FK compuesta directa porque
`school_memberships` permite varios roles por usuario y centro. El trigger usa
`user_has_active_school_role()` para exigir:

- tutor en `students.tutor_teacher_id`;
- family en `parent_students.parent_id`;
- tutor en `teacher_assignments.teacher_id`.

## 5. RLS propuesta

La propuesta mantiene el alcance funcional anterior y añade tenant:

- Director lee students únicamente en schools con membership director activa.
- Tutor lee students asignados únicamente en schools con membership tutor
  activa.
- Family lee únicamente sus `parent_students` en schools con membership family
  activa.
- Superadmin lee y escribe people únicamente con membership superadmin en el
  school de la fila.
- Teacher lee únicamente sus assignments en schools con membership tutor
  activa.
- `families`, `student_families` y `teachers` siguen cerradas: RLS está activa
  y no se crean policies para clientes autenticados.

No se amplía en 037 el acceso de Familia a `students`, el de Dirección a
`parent_students` ni el de Dirección a `teacher_assignments`.

## 6. Riesgos y bloqueos previos

037 es `NO-GO` mientras se cumpla cualquiera:

- `students.course_id` nulo o course/year contradictorios;
- tutor, parent o teacher sin perfil activo y membership activa del rol
  correcto en el school derivado;
- `parent_students` o assignments duplicados;
- assignment con teacher/course/subject/year nulo;
- family legado sin student o compartido entre varios schools;
- cualquier fila en `teachers` legado sin mapa auditado;
- consultas administrativas que esperen acceso global sin school;
- ausencia de backup recuperable de staging;
- verificador `020_2d_people_checks.sql` no ejecutado íntegramente.

## 7. Datos históricos

La propiedad histórica se deriva de course/year o student, no del estado actual
del perfil. Sin embargo, una relación histórica cuya identidad ya no tiene una
membership activa queda bloqueada para revisión. Antes de promover 037 debe
decidirse, con evidencia, entre:

- restaurar una membership histórica explícita;
- reasignar la relación a una identidad autorizada;
- archivar o retirar la relación;
- documentar una excepción temporal separada de la migración.

La migración nunca activa memberships ni altera perfiles.

## 8. Orden previsto 037-040

1. `037`: personas y relaciones; derivación, NOT NULL, FKs compuestas, triggers
   de membership y RLS de estas tablas.
2. `038`: operativa; resolución desde student/course o contexto explícito,
   manteniendo `audit_logs.school_id` nullable para eventos de plataforma.
3. `039`: integridad transversal restante entre personas y operativa; valida
   todas las constraints pendientes y elimina duplicación del borrador antiguo.
4. `040`: RLS y grants de la operativa, retirada de policies globales y
   activación solo cuando las consultas propaguen `ActiveSchoolContext`.

## 9. Verificación futura

`supabase/verification/020_2d_people_checks.sql` comprueba:

- catálogo, NOT NULL, índices, FKs, triggers y policies;
- superadmin, director, tutor y family;
- membership inactiva y usuario sin membership;
- roles incorrectos;
- usuario multischool;
- cruces student/course, family/student y teacher/course/subject/year;
- clasificación de fuentes ausentes, únicas y ambiguas.

Todas las pruebas están encerradas en `BEGIN/ROLLBACK`. El archivo no se
ejecuta en este sprint porque 037 no se ha aplicado.

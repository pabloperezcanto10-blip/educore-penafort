# Plan de backfill tenant-aware de Colegio Peñafort

Versión: 1.4
Sprint: 20.2F, validación sintética representativa de personas
Estado: 035-037 aplicadas solo en staging; producción intacta
Entorno de diseño: `staging` (`zhnbrpcekmxldxlqrbhr`)
Commit de partida de la oleada: `4c04078`

## 1. Decisiones ejecutivas

- El esquema público contiene 29 tablas: 2 fundacionales y 27 previas.
- `schools` es la raíz del tenant. `profiles` es identidad global y no recibe
  `school_id`.
- `school_memberships` ya contiene `school_id`. Las otras 26 tablas reciben la
  columna en las propuestas de 20.2B.
- `audit_logs.school_id` permanecerá nullable para eventos de plataforma. Las
  otras 25 columnas nuevas pasarán a `NOT NULL` tras validar el backfill.
- `courses`, `subjects` y la configuración académica son propiedad del centro.
  Una futura plantilla se clona; no comparte filas operativas con Peñafort.
- `profiles.role` se conserva durante la transición. La autorización futura se
  basa en una membership activa y un rol por centro.
- Las migraciones 035, 036, 037 y la corrección RLS 038 están aplicadas
  únicamente en staging. `039-041` no se han aplicado y no se ha ejecutado
  backfill de operativa.
- Las propuestas `039-041` viven en `supabase/plans/20_2`, fuera del
  directorio consumido por `supabase db push`.

## 2. Tenant estable de Colegio Peñafort

| Campo | Valor propuesto |
| --- | --- |
| `id` | `20f20000-0000-4000-8000-000000000001` |
| `name` | `Colegio Peñafort` |
| `short_name` | `Peñafort` |
| `slug` | `colegio-penafort` |
| `status` / `active` | `active` / `true` |
| `logo_url` | `/branding/penafort-logo.jpg` |
| colores | `#075985`, `#0F172A`, `#0EA5E9` |
| `family_email_domain` | `penafort.com` |
| `calendar_id` | valor actual, validado antes de 20.2B |

El UUID, y no el nombre visible, es la clave de backfill. La inserción propuesta
es idempotente y falla si el slug ya existe con otro UUID o si el UUID
corresponde a otro centro.

## 3. Árbol de propiedad

```text
schools
|-- school_memberships -- profiles/auth.users
|-- academic_years
|   |-- courses
|   |   |-- students
|   |   |   |-- parent_students / student_families
|   |   |   |-- attendance_records / student_attendance
|   |   |   |-- grades / incidents / observations / notifications
|   |   |-- course_subjects / teacher_assignments / publications
|   |-- subjects
|       |-- criteria / weights / grades / assignments
|-- families (legado)
|-- teachers (legado)
|-- teacher_schedule
|-- internal_notifications
`-- audit_logs
```

Las entidades operativas críticas reciben `school_id` directo. Las relaciones
se validan además mediante FKs compuestas o triggers para impedir combinaciones
de IDs válidos pertenecientes a centros distintos.

## 4. Criterios comunes de la matriz

Abreviaturas: C = configuración, P = personas, O = operativa, I = identidad,
G = global; R = raíz y D = dependiente.

- Todas las columnas nuevas empiezan nullable.
- El backfill no usa `coalesce` para ocultar fuentes contradictorias.
- Una tabla marcada `NN` pasa a `NOT NULL` únicamente después de los checks.
- Toda raíz tenant obtiene `unique (id, school_id)`.
- Toda dependencia crítica obtiene FK compuesta con su raíz.
- El rollback conserva columnas y reactiva código/policies anteriores; nunca
  borra datos para volver atrás.

## 5. Matriz completa de las 29 tablas

| Tabla | Categoría y finalidad | PK / dependencias | Acceso/RLS actual | Tipo | Fuente de `school_id` | Backfill, índice y constraint | Consultas / service role | Ola | Riesgo y rollback |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `schools` | I, tenant | PK `id` | miembro activo | R | ya es tenant | N/A | contexto escolar | 1 | bajo; desactivar tenant |
| `school_memberships` | I, rol por centro | PK; school + auth user | usuario ve propias | D | existente | ya NN; unique user/school/role | contexto/auth | 1 | alto; conservar `profiles.role` |
| `profiles` | G, identidad | PK/FK auth user | propio + superadmin | R global | no necesita | N/A | todos; admin en altas/password | 1 | alto; no alterar datos |
| `academic_years` | C, curso escolar | PK | activo/director/superadmin | R | directo, Peñafort | UUID fijo; FK, índice y único activo; NN | admin, helpers, reportes | 2 | alto; helper legado temporal |
| `courses` | C, cursos | PK; academic year | authenticated lee; admin escribe | R | academic year | join year; FK, `(id,school_id)`, únicos tenant; NN | 46 archivos | 2 | alto; adaptar antes de RLS |
| `subjects` | C, materias | PK | authenticated lee; admin escribe | R | directo, Peñafort | UUID fijo; FK, `(id,school_id)`, nombre tenant; NN | evaluación/asistencia/admin | 2 | alto; no es global |
| `course_subjects` | C, oferta curso-materia | PK; course/subject/year | authenticated + admin | D | course, verificando subject/year | join course; FKs compuestas, índice; NN | admin/subjects | 2 | alto; parar ante discordancia |
| `evaluation_criteria` | C, criterios | PK; teacher/course/subject/year | docente + supervisión | D | course | join course; FKs compuestas; NN | cuaderno/criterios | 4 | alto; RLS en ola 5 |
| `annual_evaluation_weights` | C, pesos | PK; teacher/course/subject/year | docente + supervisión | D | course | join course; FKs compuestas; NN | grades/reportes, admin fallback | 4 | alto; suma y tenant |
| `evaluation_publications` | C, publicación trimestral | PK; course/year/actor | dirección/admin/tutor/family | D | course | join course; FKs compuestas; NN | cierres/reportes | 4 | alto; family |
| `final_evaluation_publications` | C, publicación final | PK; course/year/actor | supervisión + lectura acotada | D | course | join course; FKs compuestas; NN | cierre/reportes | 4 | alto; family |
| `students` | P, alumnado | PK; course/tutor/year | tutor + supervisión | R | course | join course; `(id,school_id)` y FKs; NN | 69 archivos; import/admin | 3 | crítico; parar sin curso |
| `families` | P, familia legado | PK; sin FK | RLS sin policies | R legado | único school de sus students | bloquear cero/varios; `(id,school_id)`; NN | sin consultas de app | 3 | alto; congelar/deprecar |
| `student_families` | P, relación legado | student/family | RLS sin policies | D legado | student | join student; FKs compuestas; NN | sin consultas de app | 3 | alto; huérfanos/duplicados |
| `parent_students` | P, family Auth-alumno | PK; auth parent/student | family propia + admin | D | student | join student; FK compuesta + trigger family; NN | comms/family/admin | 3 | crítico; no inferir del parent |
| `teachers` | P, docente legado | PK; sin FK | RLS sin policies | R legado | no existe fuente fiable | bloquear cualquier fila; `(id,school_id)`; NN | sin consultas operativas | 3 | alto; congelar/deprecar |
| `teacher_assignments` | P, docente-curso-materia | PK; teacher/course/subject/year | docente + admin | D | course | join course; FKs + membership; NN | admin/tutor/grades/import | 3 | crítico; docente multicentro |
| `teacher_schedule` | O, horario | PK; teacher; etiquetas curso/materia | docente + supervisión | R operativa | directo, Peñafort | UUID fijo; FK + membership; NN | tutor/attendance | 4 | alto; etiquetas no son claves |
| `attendance_records` | O, lista por sesión | PK; student/teacher/course/subject/schedule | teacher/family/supervisión | D | student | join student; FKs compuestas; NN | tutor/attendance | 4 | crítico; comprobar ramas |
| `student_attendance` | O, asistencia tutor | PK; student/tutor/year | tutor/family/director | D | student | join student; FKs + membership; NN | family/tutor/director | 4 | crítico; dos modelos |
| `partial_grades` | O, notas parciales | PK; student/teacher/subject/course/year | teacher/family/supervisión | D | student | join student; FKs compuestas; NN | cuaderno/reportes, admin fallback | 4 | crítico; visibilidad |
| `quarter_final_grades` | O, trimestral antigua | PK; student/teacher/subject/course/year | teacher + supervisión | D | student | join student; FKs compuestas; NN | grades | 4 | alto; coexistencia |
| `term_subject_grades` | O, final trimestral | PK; student/teacher/subject/course/year | teacher/family/supervisión | D | student | join student; FKs compuestas; NN | tutor/reportes/grades | 4 | crítico; publicación |
| `final_course_grades` | O, final anual | PK; student/teacher/subject/course/year | teacher/family/supervisión | D | student | join student; FKs compuestas; NN | annual/reportes | 4 | crítico; cierre |
| `student_incidents` | O, incidencias | PK; student/tutor/year | tutor propio | D | student | join student; FKs + membership; NN | tutor/director/family | 4 | alto; sensible |
| `student_observations` | O, observaciones internas | PK; student/tutor/year | tutor + supervisión | D | student | join student; FKs + membership; NN | tutor/director | 4 | crítico; nunca family |
| `notifications` | O, comunicaciones | PK; sender/receiver/student/year | participantes + roles | R operativa | student; sin student, contexto compartido | diagnóstico; FK + triggers; NN | 35 archivos; admin clients | 4 | crítico; actores ambiguos |
| `internal_notifications` | O, avisos internos | PK; auth user | propio + staff/admin | R operativa | contexto explícito/membership única | diagnóstico; FK + membership; NN | notificaciones internas | 4 | alto; usuario multicentro |
| `audit_logs` | O/G, auditoría | PK; actor opcional | director + superadmin | R operativa | contexto de operación | nullable permanente; FK e índice | `src/lib/audit.ts`, admin | 4 | alto; eventos globales |

No existe una tabla de eventos o calendario en el esquema versionado. El
calendario actual procede de configuración y no se inventa una entidad.

### Cifra final

- 27 tablas quedan tenant-scoped: `school_memberships` ya lo está y 26 reciben
  una columna nueva.
- Solo 1 tabla puede permanecer global: `profiles`.
- 2 tablas no llevan `school_id`: `schools`, porque es la raíz del tenant, y
  `profiles`, porque es identidad global.
- 25 de las 26 columnas nuevas acabarán en `NOT NULL`.
- `audit_logs.school_id` queda nullable para eventos de plataforma.

## 6. Fuente del centro y diagnóstico

La fuente es única por tabla. No se usa `coalesce` para esconder conflictos:

- La configuración académica ya está tenant-aware tras 036.
- `students` deriva de `course`; relaciones familiares derivan de `student`;
  assignments derivan de `course`.
- `families` legado solo puede derivarse si todos sus vínculos apuntan a un
  único school. `teachers` legado no se deriva por email ni por coincidencia de
  UUID y bloquea 037 mientras contenga filas sin mapa auditado.
- La operativa del alumno deriva de `student` y se verifica contra course,
  subject, year, teacher y schedule.
- Una comunicación con alumno deriva de `student`. Sin alumno, emisor y receptor
  deben compartir exactamente una membership activa; con cero o varias se para.
- Un aviso interno requiere una membership activa inequívoca o contexto
  explícito aportado por la operación.
- Auditoría se etiqueta solo si módulo, entidad o actor producen un centro único.
  Los eventos de plataforma quedan `NULL`.
- Horario recibe Peñafort directamente en el backfill monotenante. Las etiquetas
  de curso y materia nunca determinan el tenant.

## 7. Memberships y alcance de superadmin

Por cada `profiles` con usuario Auth se propone una membership idempotente para
Peñafort con el mismo rol y `active = profiles.active`. Un perfil sin Auth, un
rol nulo o un rol fuera de `app_role` bloquea la ola 1.

`superadmin` recibe membership Peñafort para conservar acceso al centro, pero el
alcance global permanece temporalmente en `profiles.role`. Ese rol global no
autorizará por sí solo filas de otros centros y deberá evolucionar a una
capacidad de plataforma separada. `profiles.role` no se elimina en 20.2B.

## 8. Curso académico, cursos y materias

- `academic_years.school_id` se añade nullable, se rellena y se valida.
- El único global de curso activo pasa a índice parcial único por `school_id`.
- `active_academic_year_id(p_school_id uuid)` usa `search_path` fijo y nunca
  elige un centro implícito.
- `set_default_academic_year_id()` deberá usar el `school_id` de la fila.
- `courses` y `subjects` son configuración por centro.
- `course_subjects` exige que course, subject y academic year compartan tenant.
- Una futura plantilla crea copias con IDs nuevos; no comparte filas con
  Peñafort.

## 9. Personas y relaciones

- `students.school_id` se deriva de su curso. Alumno sin curso o con curso/año
  contradictorios bloquea la ola.
- El modelo operativo de familias es `profiles` + `parent_students`; las tablas
  `families` + `student_families` son legado coexistente y se etiquetan, se
  congelan y se deprecan en un sprint posterior.
- `parent_students` deriva del alumno y exige una membership family activa del
  parent en ese centro.
- `teachers` es legado. La identidad docente operativa es Auth/profile +
  membership.
- `teacher_assignments` deriva del curso y valida teacher, subject y year.
- Un docente puede pertenecer a varios centros, pero cada assignment y horario
  contiene un único `school_id`.
- No se modifican emails, usuarios Auth ni vínculos reales durante 20.2A.

## 10. Integridad contra cruces

1. Las raíces tenant reciben `unique (id, school_id)`.
2. Las dependientes usan FKs compuestas `(foreign_id, school_id)`.
3. Los usuarios Auth se validan con membership activa mediante trigger.
4. `parent_students` exige parent family activo en el mismo centro.
5. Las notas validan student, course, subject, year y teacher.
6. La asistencia valida student, course, schedule y teacher/tutor.
7. `notifications` valida sender, receiver y, si existe, student.
8. `teacher_schedule` valida membership docente y nunca usa nombres como clave.
9. Los wrappers rechazan centro ausente/inactivo y relaciones cruzadas antes de
   crear un admin client.

Donde no cabe una FK compuesta a `auth.users`, se usa un trigger pequeño que
consulta `school_memberships`; no se delega la integridad al frontend.

## 11. Matriz RLS futura por operación

Toda policy incorpora `auth.uid()`, membership activa y `row.school_id`.
`superadmin` global deja de ser un atajo sobre filas tenant.

| Tabla(s) | SELECT | INSERT | UPDATE | DELETE | Relación adicional |
| --- | --- | --- | --- | --- | --- |
| `schools` | miembros; plataforma | plataforma | plataforma | plataforma | centro activo |
| `school_memberships` | propia; gestión autorizada | wrapper | wrapper | wrapper | no autoelevar rol |
| `profiles` | propia/actores autorizados | hook/admin | propia protegida/admin | admin | global |
| `academic_years`, `courses`, `subjects`, `course_subjects` | miembros del centro | admin contextual | admin contextual | admin contextual | elimina lectura global |
| `students` | tutor, supervisión y family vinculada | admin | admin | admin | course mismo centro |
| `families`, `teachers`, `student_families` | mantenimiento contextual | admin | admin | admin | legado |
| `parent_students` | family propia; supervisión | admin/import | admin/import | admin/import | parent + student |
| `teacher_assignments`, `teacher_schedule` | docente propio; supervisión | admin | admin | admin | membership + raíces |
| `evaluation_criteria`, `annual_evaluation_weights` | docente asignado; supervisión | docente | docente | docente/admin | course/subject/year |
| `partial_grades`, `quarter_final_grades`, `term_subject_grades`, `final_course_grades` | docente; supervisión; family visible/publicado | docente | docente | admin | todas las raíces |
| `evaluation_publications`, `final_evaluation_publications` | supervisión; family publicado | director/admin | director/admin | director/admin | actor membership |
| `attendance_records`, `student_attendance` | docente/tutor; supervisión; family propia | docente/tutor | docente/tutor | admin | student/course/schedule |
| `student_incidents` | tutor; supervisión | tutor | tutor | admin | datos sensibles |
| `student_observations` | tutor; supervisión | tutor | tutor | admin | nunca family |
| `notifications` | participantes; supervisión del centro | participante autorizado | participante/estado | admin | no depende de leído |
| `internal_notifications` | receptor; staff autorizado | staff contextual | receptor/staff | admin | user membership |
| `audit_logs` | director del centro; plataforma global | wrapper audit | ninguno | ninguno | null solo plataforma |

Helpers propuestos: `is_active_school_member(uuid)` y
`has_school_role(uuid, app_role[])`, ambos `SECURITY DEFINER`, con
`search_path = public, pg_temp` y sin aceptar un tenant no validado.

### Matriz detallada de policies

`M` significa membership activa en `row.school_id`. `Rel` añade la relación
funcional indicada; no sustituye a `M`.

| Tabla | SELECT | INSERT | UPDATE | DELETE | Roles / Rel / service risk |
| --- | --- | --- | --- | --- | --- |
| `schools` | M | plataforma | plataforma | plataforma | usuario ve solo centros propios |
| `school_memberships` | propia | plataforma | plataforma | plataforma | gestión futura auditada |
| `profiles` | propia/autorizada | hook | propia protegida/admin | admin | global; no filtra por school |
| `academic_years` | M | director/admin | director/admin | admin | elimina active global |
| `courses` | M | admin | admin | admin | elimina authenticated global |
| `subjects` | M | admin | admin | admin | elimina authenticated global |
| `course_subjects` | M | admin | admin | admin | Rel course/subject/year |
| `evaluation_criteria` | docente/director/admin | docente | docente | docente/admin | M + assignment |
| `annual_evaluation_weights` | docente/director/admin | docente | docente | docente/admin | M + assignment |
| `evaluation_publications` | staff; family publicado | director/admin | director/admin | director/admin | M + course |
| `final_evaluation_publications` | staff; family publicado | director/admin | director/admin | director/admin | M + course |
| `students` | tutor/director/admin; family propia | admin | admin | admin | M + assignment/vínculo |
| `families` | admin | admin | admin | admin | legado, M |
| `student_families` | admin | admin | admin | admin | legado, M + student/family |
| `parent_students` | family propia; staff | admin/import | admin/import | admin/import | M + parent/student |
| `teachers` | admin | admin | admin | admin | legado, M |
| `teacher_assignments` | docente propio; staff | admin | admin | admin | M + course/subject/year |
| `teacher_schedule` | docente propio; staff | admin | admin | admin | M + docente |
| `attendance_records` | docente/staff; family propia | docente | docente | admin | M + session/student |
| `student_attendance` | tutor/staff; family propia | tutor | tutor | admin | M + student |
| `partial_grades` | docente/staff; family visible | docente | docente | admin | M + assignment/student |
| `quarter_final_grades` | docente/staff; family publicado | docente | docente | admin | M + assignment/student |
| `term_subject_grades` | docente/staff; family publicado | docente | docente | admin | M + assignment/student |
| `final_course_grades` | docente/staff; family publicado | docente | docente | admin | M + assignment/student |
| `student_incidents` | tutor/staff | tutor | tutor | admin | M + student; sensible |
| `student_observations` | tutor/staff | tutor | tutor | admin | M + student; nunca family |
| `notifications` | participantes/staff | participante autorizado | participante/estado | admin | M + actores/student; admin client alto |
| `internal_notifications` | receptor/staff | staff | receptor/staff | admin | M + receptor; admin client medio |
| `audit_logs` | director/admin del centro; plataforma | wrapper | ninguno | ninguno | tenant nullable para plataforma |

## 12. Inventario de `service_role`

| Área / archivo | Operación actual | Cambio obligatorio 20.2B | ¿Puede usar RLS? |
| --- | --- | --- | --- |
| `src/lib/audit.ts` | insertar audit log | exigir contexto/entidad y `school_id` | mantener wrapper |
| `src/lib/communications/actions.ts` | leer/actualizar comunicaciones | validar actor, participantes y centro | parcialmente |
| `src/lib/communications/notifications.ts` | resolver vínculos/etiquetas | filtrar student/parent/profile por tenant | sí |
| acciones de comunicaciones por rol | insertar/responder/cerrar | wrapper único tenant-aware | preferible |
| comunicaciones Admin | supervisión global actual | centro obligatorio | sí, salvo operación justificada |
| `dashboard/family/actions.ts` | mensajes y receptor | parent/student/receptor mismo centro | sí |
| `dashboard/admin/actions.ts` | Auth admin/mantenimiento | contexto + membership + auditoría | Auth admin permanece |
| `dashboard/admin/import/actions.ts` | importación/limpieza | transacción tenant; dominio desde school | wrapper |
| `src/lib/director/students.ts` | supervisión | RLS de director o filtro obligatorio | sí |
| `src/lib/grades/grades.ts`, `annual.ts` | etiquetas/cálculo | raíces filtradas por school | sí/wrapper cierre |
| `src/lib/reports/*-report-pdf.ts` | boletines | actor, alumno, publicación y tenant | preferible |
| `src/lib/family/student.ts` | etiquetas | vínculo + tenant | sí |
| `change-password/actions.ts` | flag global de perfil | autoridad Auth propia; sin school | caso global |

El wrapper futuro recibe `{ actorId, schoolId, operation, entity }`, valida
centro y membership y registra auditoría. Un `school_id` del cliente nunca es
autoridad suficiente.

## 13. Inventario de consultas por módulo

| Módulo | Estado actual | Cambio obligatorio 20.2B |
| --- | --- | --- |
| Superadmin/Admin | consultas globales por rol y admin client | selector de centro y filtros tenant |
| Director | policies globales y algunos bypass | membership director + school |
| Tutor | asignaciones/tutorías sin tenant | contexto activo en course/student |
| Family | `parent_students` y visibilidad | vínculo y mismo school |
| Importación | course implícito y dominio hardcoded | wrapper tenant y dominio school |
| Comunicaciones | IDs y varios admin clients | school y participantes validados |
| Evaluación | academic year global y roots por ID | helper por school + FKs |
| Asistencia | teacher/student/course/schedule | contexto y consistencia compuesta |
| Calendario | ID fijo de Peñafort | `schools.calendar_id` |
| Informes | student/publication con bypass | validación de actor y school |
| Corium | no envía datos académicos automáticamente | mantener sin contexto sensible |

Clasificación del inventario:

- A, filtrables: helpers de schools/memberships ya creados.
- B, dependen de RLS: la mayoría de lecturas Tutor, Family y Director.
- C, globales por rol: Admin/Director y lecturas authenticated de cursos/materias.
- D, service role: las operaciones del apartado 12.
- E, hardcodes: dominio `penafort.com`, branding y calendar ID.

Ninguna consulta operativa es plenamente multitenant mientras no existan las
columnas. Las lecturas actuales pueden mantenerse durante olas 1-4, pero deben
cambiar antes de activar la ola 5.

### Rutas y familias de consulta revisadas

| Ruta o librería | Tablas principales | Clase actual | Acción previa a ola 5 |
| --- | --- | --- | --- |
| `dashboard/admin/**` | profiles, students, courses, subjects, assignments, notifications | C/D | centro explícito en mantenimiento y supervisión |
| `dashboard/director/**` | students, grades, attendance, incidents, notifications, publications | B/C/D | RLS de director por membership |
| `dashboard/tutor/**` | assignments, students, grades, attendance, schedule, notifications | B | contexto activo y school en writes |
| `dashboard/family/**` | parent_students, students, visible grades, attendance, notifications | B/D | school del vínculo familiar |
| `dashboard/admin/import/actions.ts` | Auth, profiles, students, parent_students, assignments | D/E | wrapper tenant, dominio desde school |
| `src/lib/communications/**` | notifications, parent_students, profiles, students | B/D | participantes y student del mismo school |
| `src/lib/grades/**` | criteria, weights, assignments, grades, publications | B/D | academic year y raíces por school |
| `src/lib/attendance/**` | schedule, attendance, students, assignments | B | consistencia school/session |
| `src/lib/reports/**` | students, courses, subjects, grades, publications | D | actor y publicación tenant-aware |
| `src/lib/calendar/ical.ts` | calendar externo | E | calendar ID desde Brand/School context |
| `src/lib/ai/**`, `components/ai/**` | sin tablas académicas automáticas | sin cambio | mantener privacidad Fase 1 |

## 14. Oleadas y rollback

| Ola | Alcance | Precondiciones y validación | Criterio de parada | Rollback operativo |
| --- | --- | --- | --- | --- |
| 1 Identidad | Peñafort + memberships | Auth/profile 1:1, roles válidos, UUID libre | perfil sin Auth/rol inválido | desactivar membership/tenant; `profiles.role` sigue |
| 2 Configuración | year/course/subject/relations | conteos y relaciones coherentes | varios años activos/cruce | código anterior; columnas quedan |
| 3 Personas | alumnado/familias/docentes/relations | huérfanos/duplicados explicados | fuente ambigua | RLS anterior; columnas nullable |
| 4 Operativa | asistencia/notas/comms/seguimiento/audit | fuente única y conteos idénticos | conflicto de ramas/actor | no activar uso nuevo |
| 5 Seguridad | NN/FKs/RLS/consultas | null/cruces cero; app preparada | consulta global no inventariada | código y policies anteriores |

Cada propuesta es transaccional. No hay deletes ni renombrados. El rollback
desactiva el uso tenant-aware y conserva columnas para diagnóstico.

## 15. Diagnósticos y validaciones automáticas

`020_2a_production_diagnostics.sql`, `020_2a_pre_backfill_checks.sql` y
`020_2a_post_backfill_checks.sql` devuelven solo agregados o fallan con mensajes
explícitos.

Antes:

- conteos de las 29 tablas;
- perfiles por rol/estado, sin identidad;
- huérfanos, nulos, duplicados y relaciones académicas incompatibles;
- filas con fuente tenant cero, múltiple o conflictiva.

Después:

- conteos totales idénticos;
- 25 tablas obligatorias sin `school_id` nulo;
- filas monotenantes asignadas al UUID estable;
- cero relaciones cruzadas y duplicados nuevos;
- cero cambios de emails, usuarios Auth o datos académicos;
- `audit_logs` nulo solo para eventos de plataforma documentados.

Los resultados de producción no se versionan y nunca contienen PII. En 20.2A
solo se ejecutarán consultas agregadas de solo lectura con guard de entorno.

### Baseline agregada observada el 27 de julio de 2026

Producción continúa deliberadamente en el esquema pre-034 de 27 tablas:

| Entidad | Total | Entidad | Total |
| --- | ---: | --- | ---: |
| profiles | 55 | students | 51 |
| parent_students | 51 | courses | 12 |
| subjects | 18 | course_subjects | 102 |
| teacher_assignments | 10 | teacher_schedule | 38 |
| academic_years | 1 | evaluation_criteria | 14 |
| partial_grades | 17 | term_subject_grades | 2 |
| student_attendance | 2 | student_observations | 3 |
| notifications | 5 | audit_logs | 188 |
| annual_evaluation_weights | 0 | attendance_records | 0 |
| evaluation_publications | 0 | final_evaluation_publications | 0 |
| final_course_grades | 0 | quarter_final_grades | 0 |
| student_incidents | 0 | internal_notifications | 0 |
| families (legado) | 0 | student_families (legado) | 0 |
| teachers (legado) | 0 |  |  |

Distribución de perfiles activa: director 1, family 51, superadmin 1 y tutor 2.
No se extrajo ninguna identidad. Las 11 puertas pre-backfill y los 12
diagnósticos consolidados ejecutados devolvieron cero anomalías.

Staging contiene 2 centros (`QA School` y `Colegio Peñafort`), 9 memberships
(8 activas y 1 inactiva), 5 perfiles QA y cero filas operativas. El usuario
`qa.nomembership@example.test` continúa sin membership. No hay memberships sin
Auth user ni sin school. La ausencia de `schools` y `school_memberships` en
producción es esperada: 034 y 035 solo están aplicadas en staging.

## 16. Ensayo reversible

El Sprint 20.2B ejecutó en staging una simulación transaccional que desactiva el
tenant Peñafort y sus memberships y termina siempre en `ROLLBACK`. La
postcondición confirmó que el tenant y sus cuatro memberships continuaron
activos. Ninguna tabla operativa depende aún del tenant, y `profiles.role`
permite mantener el comportamiento anterior durante la transición.

## 17. Estado de las migraciones 035-041

| Propuesta | Propósito |
| --- | --- |
| 035 | Aplicada solo en staging: Peñafort, memberships QA y pre/postcondiciones |
| 036 | Aplicada solo en staging: configuración tenant-aware, constraints, RLS y fixtures QA |
| 037 | Aplicada solo en staging: personas tenant-aware, FKs, triggers y RLS |
| 038 | Aplicada solo en staging: lectura RLS de students por teacher assignment tenant-aware |
| 039 | `school_id` nullable en operativa y diagnóstico |
| 040 | integridad transversal restante entre personas y operativa |
| 041 | RLS y grants de operativa tras adaptar consultas |

Los borradores `039-041` permanecen en `supabase/plans/20_2/`, fuera del
historial de Supabase, y están marcados como no aplicables. Las versiones
ejecutables de `035-038` están en `supabase/migrations/`.

## 18. Criterios que bloquean 20.2C

- baseline agregada inesperada;
- relación huérfana o duplicada no explicada;
- perfil sin Auth, rol inválido o actor sin membership determinista;
- tabla sin fuente única de `school_id`;
- conflicto student/course/subject/year/teacher/schedule;
- comunicación sin alumno cuyos participantes no compartan un centro único;
- RLS o admin client sin estrategia de contexto;
- consulta global no inventariada;
- migración destructiva, rollback ausente o staging no restaurable;
- posible etiquetado de datos ajenos como Peñafort.

## 19. Conclusiones obligatorias A-W

| Letra | Conclusión |
| --- | --- |
| A | 27 tablas deben tener `school_id`; una ya lo tiene y 26 lo añadirían. |
| B | Solo `profiles` puede permanecer global. `schools` tampoco lleva `school_id` porque es la raíz tenant, no una tabla global. |
| C | `schools` es raíz tenant y `profiles` raíz global; years/courses/subjects son raíces del centro. |
| D | Las dependientes heredan de course o student; comms/audit usan reglas explícitas. |
| E | Sí tras aplicar las reglas; cualquier fila ambigua bloquea o queda global si se justifica. |
| F | Inserción idempotente con UUID `20f2...0001`, slug y branding actuales. |
| G | Desde profiles/Auth, conservando rol/estado y evitando duplicados. |
| H | `profiles.role` se mantiene temporalmente; no es la única autoridad tenant. |
| I | Academic years por school, único activo y helper con school obligatorio. |
| J | Courses es configuración por centro. |
| K | Subjects también es por centro; las plantillas se clonan. |
| L | FKs compuestas, `(id,school_id)`, triggers de membership y RLS. |
| M | Todas las policies operativas incorporan membership + school. |
| N | Cambian Admin, Director, Tutor, Family, import, comms, evaluación, asistencia, calendario e informes. |
| O | Todo admin client se contextualiza; algunos vuelven a RLS y otros usan wrapper. |
| P | Staging no tiene datos operativos; producción solo se inspecciona con agregados. |
| Q | Cualquier criterio de parada del apartado 18. |
| R | 035 se aplicó solo en staging; 036-040 no se aplicaron. |
| S | Solo se persistió identidad tenant y memberships QA; no hubo backfill académico. |
| T | Producción no se modifica. |
| U | Peñafort permanece intacto. |
| V | Colegio EducaCora no se crea. |
| W | Avanzar a 20.2C tras aceptar las validaciones de la oleada 1. |

## 20. Resultado de la oleada 1 en staging

Fecha de aplicación: 27 de julio de 2026.

- migración aplicada: `035_penafort_tenant_and_memberships.sql`;
- entorno: staging `zhnbrpcekmxldxlqrbhr`;
- tenant: `Colegio Peñafort`;
- UUID: `20f20000-0000-4000-8000-000000000001`;
- slug: `colegio-penafort`;
- configuración: activo, dominio familiar `penafort.com`, logo y colores
  institucionales ya documentados;
- memberships Peñafort: superadmin, director, tutor y family QA, todas activas;
- unicidad: constraint `(user_id, school_id, role)`;
- `QA School` y su membership inactiva permanecen intactas;
- el usuario QA sin membership continúa sin contexto de centro;
- `profiles.role` permanece como puente global temporal;
- el superadmin conserva `profiles.role = superadmin` y además dispone de una
  membership Peñafort explícita;
- RLS impide a usuarios normales escribir `schools`, crear o elevar
  memberships y modificar `profiles.role` o `profiles.active`;
- la selección explícita y el aislamiento entre QA School y Peñafort se
  validaron en ambos sentidos;
- la resolución de branding completo, incompleto y fallback temporal fue
  validada sin conceder acceso;
- el rollback operativo consiste en desactivar tenant y memberships; la prueba
  transaccional confirmó que el modelo anterior sigue disponible;
- `db push --linked --dry-run` quedó vacío tras aplicar 035.

No se añadieron columnas `school_id` a tablas operativas, no se crearon filas
académicas, no se aplicaron 036-040 y no se creó Colegio EducaCora. Producción,
`main` y la instancia real de Colegio Peñafort no se modificaron.

La siguiente oleada deberá rediseñar y validar
`supabase/plans/20_2/037_add_school_id_to_people.sql`. El borrador permanece
fuera de `supabase/migrations/` y no debe aplicarse en su estado actual.

## 21. Resultado de la configuración tenant-aware en staging

Fecha de aplicación: 27 de julio de 2026.

- migración aplicada: `036_add_school_id_to_configuration.sql`;
- entorno: staging `zhnbrpcekmxldxlqrbhr`;
- historial local/remoto: 001-036;
- dry-run posterior: vacío;
- tablas adaptadas: `academic_years`, `courses`, `subjects` y
  `course_subjects`;
- propiedad tenant: `school_id uuid not null`, FK e índice en las cuatro;
- integridad: FKs compuestas entre curso académico, curso, materia y relación;
- RLS: lectura por membership/rol y escritura controlada para superadmin;
- helper nuevo: `active_academic_year_id(uuid)`;
- helper legado sin argumentos: conservado como puente y priorizando Peñafort;
- datos: únicamente fixtures sintéticos con UUIDs `20e2...` y `20f3...`;
- conteos: 2 cursos académicos, 2 cursos, 3 materias y 3 relaciones;
- relaciones cruzadas: cero;
- datos reales, Auth users nuevos y PII: cero.

La excepción destructiva autorizada se limitó a cuatro objetos de unicidad
global. Primero se crearon los índices tenant-aware y después se eliminaron,
en la misma transacción, el índice global de curso activo y las tres
constraints globales de nombre. No hubo `DROP TABLE`, `DROP COLUMN`,
`TRUNCATE`, `DELETE` ni modificación de datos reales.

Las acciones administrativas que crean configuración y los helpers de curso
activo usan temporalmente el UUID estable de Peñafort hasta que las rutas
propaguen un selector de centro. No se modificó la interfaz de los dashboards.

La propuesta 037 fue revisada pero no aplicada ni promovida. Queda bloqueada
hasta añadir resolución determinista para personas, FKs compuestas,
postcondiciones, RLS y pruebas que impidan asignar identidades ambiguas a un
centro.

## 22. Diseño seguro de personas del Sprint 20.2D

`supabase/plans/20_2/037_add_school_id_to_people.sql` ha sido sustituida por
una propuesta determinista. Sigue fuera de `supabase/migrations` y no se ha
aplicado.

La propiedad se resuelve así:

- student desde course y academic year coincidentes;
- parent-student desde student;
- teacher assignment desde course, subject y academic year coincidentes;
- legacy student-family desde student y legacy family del mismo school;
- legacy family únicamente cuando todos sus students pertenecen a un school;
- legacy teacher no tiene fuente fiable y cualquier fila bloquea la migración.

Una membership nunca determina el tenant de la fila. Solo autoriza la
identidad relacionada dentro del school ya derivado: tutor para student,
family para parent-student y tutor para assignment. Perfil o membership
inactivos, rol incorrecto, cero fuentes o varias fuentes bloquean la
aplicación.

Las FKs compuestas impiden cruces student-course-year,
student-family, parent-student y assignment-course-subject-year. Los triggers
derivan `school_id` en nuevos writes y rechazan un valor de cliente
contradictorio, por lo que no es necesario confiar en el frontend.

Las policies existentes de students, parent-students y assignments quedan
acotadas por membership activa y rol en `row.school_id`. Las tablas legado
permanecen cerradas a clientes autenticados.

La especificación completa y los bloqueos están en
`docs/MULTITENANT_PEOPLE_MIGRATION_037.md`.
`supabase/verification/020_2d_people_checks.sql` contiene únicamente fixtures
sintéticos dentro de `BEGIN/ROLLBACK` y pasó íntegramente en staging.

Orden revisado:

1. 037 completa la frontera de personas.
2. 038 amplía exclusivamente la lectura RLS de students por assignments.
3. 039 incorpora propiedad tenant a operativa.
4. 040 valida la integridad transversal que no pertenezca ya a 037.
5. 041 sustituye RLS y grants de operativa cuando la aplicación propague
   contexto escolar explícito.

El estado de esta oleada es `GO CON BLOQUEOS`: 037 puede mantenerse en staging,
pero no se promueve a producción hasta ensayar filas anonimizadas resolubles y
repetir el diagnóstico sobre una copia representativa del histórico real.

## 24. Resultado del dataset sintético 20.2F

El requisito de validar patrones representativos se cubrió sin copiar,
anonimizar ni transformar registros reales. Se crearon temporalmente en
staging dos conjuntos académicos aislados con 10 alumnos, 5 familias legacy,
4 docentes legacy, responsables Auth, assignments y casos multischool.

La resolución fue determinista:

- students heredó de course y academic year coincidentes;
- parent-students y student-families heredaron del student;
- teacher-assignments validó teacher, course, subject, year, membership y rol;
- families legacy solo aceptó una fuente única;
- teachers legacy exigió `school_id` auditado explícito;
- fuentes ausentes, múltiples o cruzadas abortaron.

La aplicación no presentó errores 500 ni PostgREST y Family funcionó en ambos
centros. La promoción continúa bloqueada porque Director/Tutor del segundo
centro y el tutor multischool no reciben todavía un `ActiveSchoolContext`
explícito en todas las rutas. También debe eliminarse el fallback
`legacy-profile` antes de exigir membership activa como condición de acceso al
shell protegido.

La limpieza idempotente devolvió a cero todos los conteos 20.2F y preservó
Colegio Peñafort QA, QA School y los fixtures de sprints anteriores. 037 puede
prepararse como candidata, pero no aplicarse en producción. La oleada
operativa, ahora numerada `039-041`, puede revisarse en diseño, pero no
implementarse ni ejecutarse hasta cerrar el contexto de tenant en la
aplicación.

## Actualización Sprint 20.2G

El bloqueo aplicativo identificado en 20.2F queda resuelto en código:

- `ActiveSchoolContext` se propaga por los layouts protegidos;
- Director, Tutor, Family y Admin validan una membership activa del centro;
- desaparece el fallback `legacy-profile` como autorización del shell;
- desaparece `DEFAULT_OPERATIONAL_SCHOOL_ID` de la aplicación protegida;
- usuarios multischool requieren selección explícita y no se usa la primera
  membership;
- las consultas académicas, comunicaciones, informes y acciones derivan el
  tenant del contexto validado.

No se ha ejecutado backfill, SQL remoto ni migración nueva en este sprint. La
baseline de staging permanece en `001-037`.

Antes de promover 037 a producción todavía deben cumplirse:

1. repetir una regresión autenticada con usuarios representativos y sin datos
   reales;
2. verificar el inventario de Peñafort previo al cambio;
3. confirmar el plan de reversión y la ventana operativa;
4. diseñar 039 para añadir ownership directo a notificaciones, horarios y
   auditoría;
5. mantener bloqueada cualquier fila ambigua en vez de asignarle un centro por
   defecto.

La estrategia de 039 debe preservar el criterio determinista usado en 036 y
037: una fila sin evidencia única de tenant aborta o queda explícitamente fuera
de alcance hasta su revisión.

## Actualización Sprint 20.2G-R2B

La regresión R2 confirmó que el aislamiento era correcto, pero la policy de
`students` solo permitía lectura al tutor directo. La migración aditiva `038`
mantiene esa vía y añade acceso para el docente con `teacher_assignment`
coincidente en centro, curso y año académico.

La prueba transaccional y la regresión autenticada verificaron:

- tutor multischool A -> B -> A sin contaminación;
- alumnos de cursos asignados visibles en su centro activo;
- cursos sin assignment y alumnos del otro centro invisibles;
- Director, Tutor directo, Family y Superadmin sin regresiones;
- memberships inactivas, usuarios sin membership y roles incompatibles
  bloqueados.

No se ejecutó backfill, no se modificó `037` y no se tocó producción. Los
fixtures `20_2G_QA` se conservan para R3. Los borradores operativos quedan
renumerados como `039-041` y continúan bloqueados hasta completar su diseño,
ensayo y plan de reversión.

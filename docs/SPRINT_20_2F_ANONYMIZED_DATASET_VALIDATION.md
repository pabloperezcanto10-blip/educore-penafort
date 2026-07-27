# Sprint 20.2F - Validacion con dataset sintetico

Fecha: 27 de julio de 2026
Entorno exclusivo: Supabase staging
Project Ref: `zhnbrpcekmxldxlqrbhr`
Rama: `staging`
Base: `f479239a862a539fece18a39e87dc3913b1038a5`

## 1. Objetivo y limites

Este sprint valida la migracion 037 sobre relaciones equivalentes a las de un
colegio real, construidas exclusivamente con datos sinteticos.

No se usan, copian ni anonimizan filas reales. No se crean notas,
comunicaciones, incidencias, asistencias, documentos, observaciones ni
actividad academica historica. Produccion, `main` y los datos reales de Colegio
Penafort quedan fuera del alcance.

Los dos centros activos son infraestructura QA anterior y no pertenecen a
20.2F:

- School A: Colegio Penafort QA,
  `20f20000-0000-4000-8000-000000000001`;
- School B: QA School, `20e10000-0000-4000-8000-000000000001`.

20.2F crea temporalmente un centro inactivo propio:

- `202f0000-0000-4000-8000-000000000001`,
  slug `20-2f-inactive-school`.

## 2. Convenciones y limpieza

- Todos los UUID propios comienzan por `202f`.
- Todos los correos usan `example.test` y el prefijo `20_2f.`.
- Todos los nombres y codigos visibles usan el prefijo `20_2F`.
- Los casos negativos usan UUID del bloque `202fb000` y siempre se revierten.
- Las credenciales de login se generan fuera del repositorio, son temporales y
  se invalidan antes de eliminar los usuarios.
- `020_2f_cleanup.sql` elimina unicamente los UUID enumerados en este documento.
- `020_2f_post_cleanup.sql` debe demostrar cero residuos.

## 3. Inventario previo exacto

### 3.1 Auth users y profiles

Cada identidad crea un `auth.users` y un `profiles` con el mismo UUID.

| UUID final | Correo sintetico | Rol profile | Caso |
| --- | --- | --- | --- |
| `202f1000-0000-4000-8000-000000000001` | `20_2f.superadmin@example.test` | superadmin | supervision explicita de A y B |
| `202f1000-0000-4000-8000-000000000002` | `20_2f.director.a@example.test` | director | direccion limitada a A |
| `202f1000-0000-4000-8000-000000000003` | `20_2f.director.b@example.test` | director | direccion B y membership en centro inactivo |
| `202f1000-0000-4000-8000-000000000004` | `20_2f.tutor.multi@example.test` | tutor | docente multischool |
| `202f1000-0000-4000-8000-000000000005` | `20_2f.tutor.a@example.test` | tutor | docente de A |
| `202f1000-0000-4000-8000-000000000006` | `20_2f.tutor.b@example.test` | tutor | docente de B |
| `202f1000-0000-4000-8000-000000000007` | `20_2f.tutor.inactive@example.test` | tutor | membership tutor inactiva |
| `202f1000-0000-4000-8000-000000000008` | `20_2f.family.multi@example.test` | family | familia con dos hijos |
| `202f1000-0000-4000-8000-000000000009` | `20_2f.family.second@example.test` | family | segundo responsable |
| `202f1000-0000-4000-8000-000000000010` | `20_2f.family.b@example.test` | family | familia de B con dos hijos |
| `202f1000-0000-4000-8000-000000000011` | `20_2f.family.inactive@example.test` | family | relacion historica, membership inactiva |
| `202f1000-0000-4000-8000-000000000012` | `20_2f.nomembership@example.test` | family | usuario sin membership |
| `202f1000-0000-4000-8000-000000000013` | `20_2f.incompatible@example.test` | director | rol incompatible con tutor/family |

Modalidad: persistente temporal. Limpieza: UUID exacto y correo
`20_2f.%@example.test`.

### 3.2 School memberships

| UUID | Usuario | Centro | Rol | Estado final | Caso |
| --- | --- | --- | --- | --- | --- |
| `202f1100-0000-4000-8000-000000000001` | superadmin | A | superadmin | activa | supervision A |
| `202f1100-0000-4000-8000-000000000002` | superadmin | B | superadmin | activa | supervision B |
| `202f1100-0000-4000-8000-000000000003` | director.a | A | director | activa | aislamiento A |
| `202f1100-0000-4000-8000-000000000004` | director.b | B | director | activa | aislamiento B |
| `202f1100-0000-4000-8000-000000000005` | director.b | inactivo | director | activa | filtrado de centro inactivo |
| `202f1100-0000-4000-8000-000000000006` | tutor.multi | A | tutor | activa | multischool A |
| `202f1100-0000-4000-8000-000000000007` | tutor.multi | B | tutor | activa | multischool B |
| `202f1100-0000-4000-8000-000000000008` | tutor.a | A | tutor | activa | tutor A |
| `202f1100-0000-4000-8000-000000000009` | tutor.b | B | tutor | activa | tutor B |
| `202f1100-0000-4000-8000-000000000010` | tutor.inactive | A | tutor | inactiva | acceso historico revocado |
| `202f1100-0000-4000-8000-000000000011` | family.multi | A | family | activa | dos hijos |
| `202f1100-0000-4000-8000-000000000012` | family.second | A | family | activa | dos responsables |
| `202f1100-0000-4000-8000-000000000013` | family.b | B | family | activa | familia B |
| `202f1100-0000-4000-8000-000000000014` | family.inactive | A | family | inactiva | acceso historico revocado |
| `202f1100-0000-4000-8000-000000000015` | incompatible | A | director | activa | rechazo de rol incorrecto |

El usuario `nomembership` no recibe ninguna membership. Modalidad: persistente
temporal. Limpieza: rango UUID exacto `202f1100...001-015`.

### 3.3 Configuracion academica

Los dos anos activos previos se reutilizan como raices para la regresion de
aplicacion y no se modifican:

- A: `20f30000-0000-4000-8000-000000000001`;
- B: `20e20000-0000-4000-8000-000000000001`.

20.2F crea dos anos historicos inactivos para comprobar propiedad tenant:

| UUID | Centro | Nombre |
| --- | --- | --- |
| `202f2000-0000-4000-8000-000000000001` | A | 20_2F Historical Year A |
| `202f2000-0000-4000-8000-000000000002` | B | 20_2F Historical Year B |

Cursos:

| UUID | Centro | Ano activo previo | Nombre |
| --- | --- | --- | --- |
| `202f3000-0000-4000-8000-000000000001` | A | A | 20_2F 5A |
| `202f3000-0000-4000-8000-000000000002` | A | A | 20_2F 6A |
| `202f3000-0000-4000-8000-000000000003` | B | B | 20_2F 5B |
| `202f3000-0000-4000-8000-000000000004` | B | B | 20_2F 6B |

Subjects:

| UUID | Centro | Nombre |
| --- | --- | --- |
| `202f4000-0000-4000-8000-000000000001` | A | 20_2F Ciencias A |
| `202f4000-0000-4000-8000-000000000002` | A | 20_2F Lengua A |
| `202f4000-0000-4000-8000-000000000003` | A | 20_2F Matematicas A |
| `202f4000-0000-4000-8000-000000000004` | B | 20_2F Ciencias B |
| `202f4000-0000-4000-8000-000000000005` | B | 20_2F Lengua B |
| `202f4000-0000-4000-8000-000000000006` | B | 20_2F Matematicas B |

Course-subjects:

| UUID | Curso | Subject | Centro |
| --- | --- | --- | --- |
| `202f5000-0000-4000-8000-000000000001` | A-5A | A-Lengua | A |
| `202f5000-0000-4000-8000-000000000002` | A-5A | A-Matematicas | A |
| `202f5000-0000-4000-8000-000000000003` | A-6A | A-Ciencias | A |
| `202f5000-0000-4000-8000-000000000004` | A-6A | A-Matematicas | A |
| `202f5000-0000-4000-8000-000000000005` | B-5B | B-Lengua | B |
| `202f5000-0000-4000-8000-000000000006` | B-5B | B-Matematicas | B |
| `202f5000-0000-4000-8000-000000000007` | B-6B | B-Ciencias | B |
| `202f5000-0000-4000-8000-000000000008` | B-6B | B-Matematicas | B |

Modalidad: persistente temporal. Limpieza: UUID exacto por tabla.

### 3.4 Students

| UUID final | Centro/curso | Tutor | Caso |
| --- | --- | --- | --- |
| `202f8000-0000-4000-8000-000000000001` | A / 5A | tutor.multi | dos responsables |
| `202f8000-0000-4000-8000-000000000002` | A / 5A | tutor.multi | segundo hijo |
| `202f8000-0000-4000-8000-000000000003` | A / 6A | tutor.a | familia historica e inactiva |
| `202f8000-0000-4000-8000-000000000004` | A / 6A | tutor.a | alumno sin familia |
| `202f8000-0000-4000-8000-000000000005` | A / 6A | tutor.inactive | tutor historico inactivo |
| `202f8000-0000-4000-8000-000000000006` | B / 5B | tutor.multi | familia B |
| `202f8000-0000-4000-8000-000000000007` | B / 5B | tutor.multi | segundo hijo B |
| `202f8000-0000-4000-8000-000000000008` | B / 6B | tutor.b | familia legado B |
| `202f8000-0000-4000-8000-000000000009` | B / 6B | tutor.b | aislamiento B |
| `202f8000-0000-4000-8000-000000000010` | B / 6B | tutor.b | aislamiento B |

Todos tienen `birth_date = NULL`; no se usan fechas personales. El trigger de
037 deriva `school_id` desde course y academic year.

### 3.5 Families y student_families legado

| Family UUID | Centro | Correo | Students relacionados |
| --- | --- | --- | --- |
| `202f7000-0000-4000-8000-000000000001` | A | `20_2f.legacy.family.a.multi@example.test` | A01, A02 |
| `202f7000-0000-4000-8000-000000000002` | A | `20_2f.legacy.family.a.second@example.test` | A01 |
| `202f7000-0000-4000-8000-000000000003` | A | `20_2f.legacy.family.a.historical@example.test` | A03 |
| `202f7000-0000-4000-8000-000000000004` | B | `20_2f.legacy.family.b.multi@example.test` | B01, B02 |
| `202f7000-0000-4000-8000-000000000005` | B | `20_2f.legacy.family.b.single@example.test` | B03 |

Las siete relaciones `student_families` usan las combinaciones anteriores. No
tienen UUID propio; la limpieza exige simultaneamente los rangos de student y
family, por lo que no puede afectar relaciones anteriores.

### 3.6 Parent-students

| UUID | Family user | Student | Caso |
| --- | --- | --- | --- |
| `202f9000-0000-4000-8000-000000000001` | family.multi | A01 | primer hijo |
| `202f9000-0000-4000-8000-000000000002` | family.multi | A02 | segundo hijo |
| `202f9000-0000-4000-8000-000000000003` | family.second | A01 | segundo responsable |
| `202f9000-0000-4000-8000-000000000004` | family.inactive | A03 | relacion historica revocada |
| `202f9000-0000-4000-8000-000000000005` | family.b | B01 | primer hijo B |
| `202f9000-0000-4000-8000-000000000006` | family.b | B02 | segundo hijo B |

Las relaciones se crean con membership activa para validar el trigger y despues
se desactiva exclusivamente la membership temporal correspondiente.

### 3.7 Teachers legado

| UUID | Centro | Correo |
| --- | --- | --- |
| `202f6000-0000-4000-8000-000000000001` | A | `20_2f.legacy.teacher.a1@example.test` |
| `202f6000-0000-4000-8000-000000000002` | A | `20_2f.legacy.teacher.a2@example.test` |
| `202f6000-0000-4000-8000-000000000003` | B | `20_2f.legacy.teacher.b1@example.test` |
| `202f6000-0000-4000-8000-000000000004` | B | `20_2f.legacy.teacher.b2@example.test` |

Estas filas exigen un `school_id` auditado. No existe relacion entre la tabla
legado y Auth que permita inferirlo desde una membership.

### 3.8 Teacher assignments

| UUID | Tutor | Centro/curso/subject | Caso |
| --- | --- | --- | --- |
| `202fa000-0000-4000-8000-000000000001` | tutor.multi | A / 5A / Matematicas | multischool A |
| `202fa000-0000-4000-8000-000000000002` | tutor.multi | B / 5B / Matematicas | multischool B |
| `202fa000-0000-4000-8000-000000000003` | tutor.a | A / 5A / Lengua | varias assignments |
| `202fa000-0000-4000-8000-000000000004` | tutor.a | A / 6A / Ciencias | varias assignments |
| `202fa000-0000-4000-8000-000000000005` | tutor.b | B / 5B / Lengua | varias assignments |
| `202fa000-0000-4000-8000-000000000006` | tutor.b | B / 6B / Ciencias | varias assignments |
| `202fa000-0000-4000-8000-000000000007` | tutor.inactive | A / 6A / Matematicas | historica revocada |

## 4. Casos exclusivamente transaccionales

El bloque UUID `202fb000` representa:

- student con `school_id` manipulado;
- student con course/year cruzados;
- student con school inexistente;
- cambio posterior de school incompatible;
- parent-student cruzado;
- student-family cruzado;
- relacion familiar duplicada;
- assignment con raices cruzadas;
- assignment con membership inactiva;
- assignment sin membership;
- assignment con rol incompatible;
- people row en centro inactivo;
- assignment duplicada;
- teacher legado sin school;
- teacher legado con school explicito;
- fuente resoluble, ausente y ambigua.

Todos estos casos se ejecutan dentro de `BEGIN/ROLLBACK`.

## 5. Riesgo de aplicacion conocido antes del ensayo

`resolveActiveSchoolContext()` exige seleccion explicita cuando hay mas de un
centro, pero las rutas protegidas actuales aun no propagan ese contexto y varios
helpers conservan `DEFAULT_OPERATIONAL_SCHOOL_ID` como compatibilidad temporal.

El SQL y RLS pueden validar correctamente al usuario multischool por fila. La
regresion web determinara si la seleccion de centro esta suficientemente
conectada o si este punto obliga a cerrar el sprint como `GO CON BLOQUEOS`.

## 6. Resultados

### 6.1 Carga controlada

Antes de cualquier escritura se verificaron rama, HEAD y Project Ref y se
mostro:

```text
TARGET ENVIRONMENT: STAGING
PROJECT REF: zhnbrpcekmxldxlqrbhr
```

La carga persistente temporal creo exactamente:

| Tabla | Filas 20.2F |
| --- | ---: |
| `auth.users` | 13 |
| `profiles` | 13 |
| `school_memberships` | 15 |
| `academic_years` | 2 |
| `courses` | 4 |
| `subjects` | 6 |
| `course_subjects` | 8 |
| `students` | 10 |
| `families` | 5 |
| `student_families` | 7 |
| `parent_students` | 6 |
| `teachers` | 4 |
| `teacher_assignments` | 7 |

No se creo actividad operativa, calificaciones, comunicaciones, incidencias,
asistencia, documentos ni observaciones.

### 6.2 Integridad y casos negativos

`020_2f_negative_cases.sql` paso 14 casos rechazados o clasificados y termino
en `ROLLBACK`. Se comprobaron:

- students con `school_id`, course o academic year inexistentes o cruzados;
- cambio posterior de `school_id` incompatible;
- parent-student y student-family entre centros;
- relacion familiar y assignment duplicadas;
- assignment con raices cruzadas, membership inactiva, usuario sin membership
  o rol incompatible;
- escritura sobre centro inactivo;
- teachers legado con tenant explicito y rechazo sin fuente;
- clasificacion determinista de fuente unica, ausente y ambigua.

Los rechazos procedieron de constraints, FKs compuestas, triggers o funciones
de contexto. El frontend no fue la unica barrera.

### 6.3 RLS

`020_2f_people_checks.sql` paso 12 bloques transaccionales. El primer ensayo
confirmo ademas que `authenticated` no dispone de `UPDATE` sobre
`school_memberships`; la prueba se ajusto para aceptar ese
`insufficient_privilege`, sin conceder permisos ni reducir protecciones.

- Superadmin vio A y B de forma global controlada.
- Director A y Director B quedaron limitados a sus centros.
- Tutor A, Tutor B y Tutor multischool quedaron limitados a assignments y
  alumnos permitidos por fila.
- Family multi vio sus dos hijos; el segundo responsable vio el alumno
  compartido; Family B vio sus dos hijos.
- Memberships inactivas y usuario sin membership obtuvieron cero filas.
- El rol incompatible no obtuvo acceso de tutor/family ni pudo crear
  assignments.
- Las tablas legacy `families`, `student_families` y `teachers` permanecieron
  cerradas para clientes autenticados, de acuerdo con el diseno de 037.

### 6.4 Usuario multischool

`npx --yes tsx scripts/verify-school-context.ts` paso todos los casos locales:

- seleccion explicita entre dos memberships activas;
- resolucion por rol;
- `SCHOOL_SELECTION_REQUIRED` cuando falta seleccion;
- rechazo de un centro no autorizado;
- filtrado de memberships y centros inactivos;
- ausencia de fallback a la primera membership.

En SQL, el tutor multischool tuvo assignments independientes en A y B sin
mezcla. La aplicacion todavia no propaga este contexto a todas las rutas.

### 6.5 Regresion de aplicacion

Se usaron exclusivamente los usuarios sinteticos temporales:

- **Superadmin:** login y rutas de panel, mantenimiento, usuarios, alumnado,
  configuracion academica, cuaderno y comunicaciones sin error 500.
- **Director A:** alumnado A y ficha A visibles; alumnado B no visible.
- **Director B:** login correcto y sin fuga, pero el listado academico muestra
  `No hay curso escolar activo` porque la aplicacion aun usa el centro
  operacional por defecto.
- **Tutor A:** dashboard, alumnos, ficha, materias, cuaderno, asistencia,
  horario, criterios y comunicaciones sin error.
- **Tutor B:** login correcto y cero mezcla, pero no resuelve su curso B por el
  mismo uso del centro operacional por defecto.
- **Tutor multischool:** SQL permite A y B; la UI solo muestra A y no ofrece
  selector de centro.
- **Family A/B:** dashboard y vistas de alumno, notas, comunicaciones y
  calendario sin errores. Family multi ve A01/A02, Family B ve B01/B02 y el
  segundo responsable ve A01.
- **Membership inactiva y usuario sin membership:** RLS devuelve cero datos,
  pero el fallback temporal de `profiles.role` aun permite abrir el shell del
  rol. No existe fuga, aunque el acceso al shell debe bloquearse.
- **Rol incompatible:** conserva solo las capacidades legitimas de su
  membership director; las operaciones tutor/family son rechazadas por RLS.

No se observaron errores de consola, PostgREST ni paginas 500. Las rutas
privadas redirigen a `/login` sin sesion. `/`, `/app`, `/login`, `/register`,
`/manifest.json` y `/robots.txt` respondieron HTTP 200. Staging mantiene
`noindex, nofollow`, `robots.txt` bloquea todo, el registro publico esta
desactivado y Corium no aparece al estar deshabilitado.

### 6.6 Bloqueos confirmados

1. Las rutas protegidas no propagan todavia `ActiveSchoolContext`; varios
   helpers consumen `DEFAULT_OPERATIONAL_SCHOOL_ID`.
2. No existe selector de centro para usuarios multischool en el producto.
3. La compatibilidad `legacy-profile` permite cargar el shell protegido a
   usuarios sin membership activa, aunque RLS les entrega cero filas.
4. La supervision directa de tablas legacy de familias/docentes permanece
   cerrada intencionadamente y debe definirse mediante APIs tenant-aware, no
   abriendo policies globales.

### 6.7 Validaciones tecnicas finales

- `npm run lint`: OK, sin warnings ni errores.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK, 65 paginas generadas.
- `supabase db lint --linked --level warning`: OK, cero resultados.
- `supabase migration list --linked`: local/remoto alineados `001-037`.
- `supabase db push --linked --dry-run`: `Remote database is up to date`.
- Escaneo de secretos: solo aparecen nombres de columnas de password vacias;
  no hay claves, tokens, hashes ni credenciales.
- Escaneo de emails: todos los correos del sprint terminan en `example.test`.
- No hay referencias al Project Ref de produccion ni a migraciones 038-040 en
  los scripts ejecutables.
- `.env.local` y `supabase/migrations` no tienen cambios.

## 7. Limpieza y conteos finales

`020_2f_cleanup.sql` invalido primero las credenciales temporales y elimino
solo UUID, correos, codigos y slugs propios de 20.2F, en orden compatible con
las FKs.

`020_2f_post_cleanup.sql` paso y demostro cero en:

- auth users, identities, profiles y memberships;
- students, families, student_families y parent_students;
- teachers y teacher_assignments;
- academic years, courses, subjects y course_subjects;
- centro inactivo y relaciones residuales.

Los dos centros QA previos continuaron activos. La carpeta temporal que
contenia la clave efimera fue eliminada y no existe ninguna credencial en el
repositorio.

## 8. Decision

**GO CON BLOQUEOS.**

La migracion 037 demuestra integridad, aislamiento RLS y resolucion
determinista con un dataset sintetico representativo. No asigna tenants por
aproximacion ni usa la primera membership como fallback. Los bloqueos estan en
la integracion del contexto de centro en la aplicacion, no en la frontera SQL
validada.

037 puede prepararse como candidata de produccion, pero no debe aplicarse
hasta conectar `ActiveSchoolContext`, bloquear shells sin membership activa y
repetir la regresion sobre una copia controlada del esquema/datos de
produccion. No se recomienda implementar ni aplicar 038 antes de cerrar esos
puntos; su revision de diseno puede continuar sin ejecucion remota.

## 9. Conclusiones obligatorias

| Clave | Conclusion |
| --- | --- |
| A-B | No se usaron datos reales; el dataset fue totalmente sintetico. |
| C-E | Se crearon temporalmente 10 alumnos, 5 familias y 4 docentes legacy. |
| F | Si, hubo un tutor Auth multischool con assignments independientes. |
| G-H | Si, hubo familias con dos hijos y un alumno con dos responsables. |
| I-K | Si, se probaron usuario sin membership, memberships inactivas y rol incompatible. |
| L | Si, todas las relaciones cruzadas fueron rechazadas. |
| M | Si, teachers legado bloqueo fuentes ausentes o ambiguas. |
| N | No se uso la primera membership como fallback en SQL ni en el helper de contexto. |
| O-S | RLS aislo centros; superadmin fue global controlado; director, tutor y family quedaron acotados. |
| T-U | No hubo errores 500, PostgREST ni errores de consola observables. |
| V-W | La limpieza fue completa y quedaron cero residuos. |
| X-Y | 037 no se modifico; 038-040 no se aplicaron. |
| Z-AB | Produccion, Colegio Penafort real y `main` no cambiaron. |
| AC | El `db push --linked --dry-run` final quedo vacio. |
| AD | Preparar 037: si como candidata; aplicarla: no hasta cerrar bloqueos. |
| AE | No comenzar la implementacion/aplicacion de 038; solo revision de diseno. |

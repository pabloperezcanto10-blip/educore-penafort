# Baseline estructural de base de datos

Estado: completada en staging durante el Sprint 20.1D.
Fecha de extracción: 25 de julio de 2026.
Ámbito: esquema operativo actual, sin filas de aplicación.

## 1. Entornos

| Entorno | Project Ref | Uso en este sprint |
| --- | --- | --- |
| Producción | `higdnodnztismxmusejz` | Catálogo estructural en solo lectura |
| Staging | `zhnbrpcekmxldxlqrbhr` | Bootstrap, comprobaciones y repair |

`scripts/assert-supabase-target.ps1` comprueba el Project Ref enlazado. Rechaza
cualquier operación declarada como escritura cuando el destino es producción.
La guarda complementa, pero no sustituye, la revisión humana.

## 2. Método de extracción

Se comprobó la sintaxis de Supabase CLI `2.109.1` y se intentó:

```powershell
supabase db dump --linked --schema public --file output/database-baseline/schema-review.sql
```

La CLI abortó antes de generar el archivo porque `db dump` ejecuta `pg_dump`
en Docker y Docker Desktop no está instalado en el equipo. No se leyó ni
modificó ninguna fila.

Para no instalar infraestructura ni obtener credenciales de base de datos, se
utilizó la API oficial de consulta de la CLI con un único `SELECT` sobre los
catálogos PostgreSQL:

```powershell
supabase db query --linked `
  --file supabase/verification/020_1d_schema_inventory.sql `
  --output-format json
```

El resultado bruto se guardó localmente en
`output/database-baseline/production-schema-inventory.json`. `output/` está
ignorado por Git. El snapshot versionado se genera con:

```powershell
node scripts/generate-supabase-baseline.mjs `
  output/database-baseline/production-schema-inventory.json `
  supabase/baseline/000_public_schema_baseline.sql
```

El inventario obtiene únicamente metadatos:

- tablas y columnas;
- tipos;
- primary keys, foreign keys, uniques y checks;
- índices;
- secuencias;
- funciones;
- triggers;
- RLS y políticas;
- extensiones;
- grants de tablas y funciones.

También obtiene la definición del hook aplicativo
`auth.users.on_auth_user_created`. No exporta el esquema gestionado de Auth ni
consulta filas de `auth.users`.

## 3. Revisión de seguridad

El inventario y la baseline saneada se revisaron sin imprimir valores
potencialmente sensibles.

| Patrón | Resultado |
| --- | --- |
| `COPY public.` | 0 |
| Emails | 0 |
| URLs | 0 |
| Project Refs | 0 en la baseline |
| `DROP` | 0 |
| `TRUNCATE` | 0 |
| Filas Auth | 0 |

La baseline contiene un único `INSERT INTO` dentro de la definición estructural
de `public.handle_new_user()`. No es una fila exportada. Las apariciones de
`service_role`, `auth.users` y `must_change_password` son grants, relaciones o
identificadores del esquema.

No se generó `schema-review.sql` porque el comando Docker falló antes de crear
un dump. No hubo que eliminar archivos inseguros.

## 4. Inventario real

Producción contiene:

- 27 tablas públicas;
- 237 columnas;
- 145 constraints;
- 90 índices;
- 0 secuencias públicas;
- 8 funciones públicas;
- 22 triggers sobre tablas públicas;
- 1 hook aplicativo sobre `auth.users`;
- 100 políticas RLS;
- 1 tipo propio (`app_role`);
- 5 extensiones instaladas;
- 567 grants de tabla;
- 24 grants de función.

Tablas:

`academic_years`, `annual_evaluation_weights`, `attendance_records`,
`audit_logs`, `course_subjects`, `courses`, `evaluation_criteria`,
`evaluation_publications`, `families`, `final_course_grades`,
`final_evaluation_publications`, `internal_notifications`, `notifications`,
`parent_students`, `partial_grades`, `profiles`, `quarter_final_grades`,
`student_attendance`, `student_families`, `student_incidents`,
`student_observations`, `students`, `subjects`, `teacher_assignments`,
`teacher_schedule`, `teachers` y `term_subject_grades`.

## 5. Tablas no creadas por 001-033

La auditoría inicial señalaba cinco tablas. La comparación completa encontró
tres tablas heredadas adicionales. En total, ocho tablas de producción no
tienen ningún `CREATE TABLE` en las migraciones 001-033:

| Tabla | Estructura real resumida | Relaciones y seguridad |
| --- | --- | --- |
| `courses` | `id uuid`, `name text`, `academic_year_id uuid` | PK `id`, unique `name`, FK a `academic_years`, RLS y 4 policies |
| `notifications` | 12 columnas de conversación, estado, lectura y curso | FKs a usuarios, alumno y año; 2 checks; 6 índices; RLS y 4 policies |
| `parent_students` | `id`, `parent_id`, `student_id` | FKs a `auth.users` y `students`; RLS y 4 policies |
| `students` | identidad, nombre, fecha, curso, tutor, estado y año | FKs a curso y año; 3 índices; RLS y 5 policies |
| `teacher_assignments` | profesor, materia, curso, fecha y año | 4 FKs; 4 índices; RLS y 4 policies |
| `families` | identidad, nombre, email, teléfono y fecha | PK; RLS activada sin policies |
| `student_families` | alumno, familia y relación | PK compuesta; 2 FKs; RLS activada sin policies |
| `teachers` | identidad, nombre, email, tutoría y fecha | PK, email único; RLS activada sin policies |

La baseline conserva tipos, defaults, constraints, índices, RLS, policies y
triggers exactamente como aparecen en el catálogo real. No infiere columnas.

## 6. Matriz de diferencias

| Objeto | Clasificación | Migraciones | Diferencia | Riesgo | Acción |
| --- | --- | --- | --- | --- | --- |
| 19 tablas públicas | A | 001-033 | Se crean en el historial | Bajo | Absorbidas por baseline |
| 8 tablas heredadas | C | Varias las modifican | Existen, pero nunca se crean | Crítico en DB vacía | Recuperadas desde catálogo real |
| Columnas, constraints e índices finales | A/B | 001-033 | Coinciden con producción | Bajo tras comparación | Incluidos en baseline |
| Funciones, triggers y RLS | A/B | 001-033 | Coinciden con producción | Bajo tras comparación | Incluidos en baseline |
| Hook `on_auth_user_created` | B | 001, 008 | Está fuera de `public` | Perfil incompleto al crear usuario | Recuperado como hook aplicativo |
| Seeds y backfills legados | E intencional | 011, 023, 025, 026, 031, 032 | No se copian al staging vacío | Reintroduciría datos de instancia/prueba | Retirados del bootstrap |
| `schools` y `school_memberships` | D esperado | 034 | No existen en producción ni staging | Ninguno mientras 034 siga pendiente | No aplicar sin autorización |

No se detectó ningún objeto creado por 001-033 que falte en producción. Tras
el bootstrap, la comparación objeto a objeto entre producción y staging dio
`STRUCTURAL_DIFFERENCES=0`.

## 7. Estrategia elegida

Se evaluaron cuatro opciones:

| Opción | Decisión |
| --- | --- |
| A. Migración baseline anterior a 001 | Rechazada: podría entrar en el flujo normal y colisionar con producción |
| B. Migración complementaria | Rechazada: no cubriría el estado final ni el historial incompleto |
| C. Snapshot exclusivo | Insuficiente sin reconciliar las versiones locales |
| D. Baseline versionada y repair de historial | Elegida |

La baseline vive en `supabase/baseline/`, fuera de `supabase/migrations/`.
Nunca será propuesta automáticamente por `db push`. Solo se admite en un
proyecto nuevo, vacío y verificado.

Está dividida en seis transacciones:

1. tipos y tablas;
2. constraints;
3. funciones, defaults e índices;
4. triggers, RLS y policies;
5. grants;
6. hook Auth aplicativo.

## 8. Restauración reproducible

1. Enlazar explícitamente el proyecto staging.
2. Ejecutar la guarda:

```powershell
powershell -ExecutionPolicy Bypass `
  -File scripts/assert-supabase-target.ps1 `
  -ExpectedEnvironment staging `
  -Operation write
```

3. Verificar `0` tablas públicas y `0` usuarios Auth:

```powershell
supabase db query --linked `
  --file supabase/verification/020_1d_staging_preflight.sql
```

4. Generar la baseline a partir del inventario local revisado.
5. Aplicarla:

```powershell
powershell -ExecutionPolicy Bypass `
  -File scripts/bootstrap-staging-schema.ps1 `
  -Apply
```

6. Volver a extraer el inventario de staging y comparar todos los objetos.
7. Confirmar todos los conteos a cero con
   `020_1d_staging_data_counts.sql`.
8. Solo después, reconciliar 001-033:

```powershell
powershell -ExecutionPolicy Bypass `
  -File scripts/repair-staging-baseline-history.ps1 `
  -Apply
```

9. Ejecutar `supabase migration list` y `supabase db push --linked --dry-run`.

El parámetro `-StartPhase` del bootstrap existe únicamente para reanudar un
bootstrap transaccional interrumpido. Exige 27 tablas públicas y 0 usuarios.

## 9. Repair de migraciones

Producción y staging no tenían tabla de historial al comenzar. La baseline
consolidada absorbió el estado estructural final de 001-033. Los seeds y
backfills de instancia no se ejecutaron y se retiraron deliberadamente del
bootstrap para cumplir la política de cero datos.

| Versión | Evidencia estructural o decisión de baseline |
| --- | --- |
| 001 | `app_role`, `profiles`, funciones, policies y hook Auth presentes |
| 002 | Policy de lectura de alumnos por tutor presente |
| 003 | `student_incidents`, índices y RLS presentes |
| 004 | Columnas, checks, índices y policies de `notifications` presentes |
| 005 | `student_attendance`, índices y policies presentes |
| 006 | Policy familiar de `parent_students` presente |
| 007 | Policy de Dirección sobre `students` presente |
| 008 | Rol `superadmin`, funciones y policies administrativas presentes |
| 009 | `student_observations`, índices y policies presentes |
| 010 | `subjects`, `partial_grades` y policies presentes |
| 011 | DDL y policies presentes; seeds de Peñafort omitidos |
| 012 | Unique de evaluaciones parciales presente |
| 013 | Criterios y calificaciones trimestrales presentes |
| 014 | Policy de borrado de criterios presente |
| 015 | `term_subject_grades`, trigger y policies presentes |
| 016 | Publicaciones de evaluación, trigger y policies presentes |
| 017 | Policy de inserción de Dirección presente |
| 018 | Policy de inserción familiar presente |
| 019 | Policy de justificación familiar presente |
| 020 | Visibilidad familiar publicada presente |
| 021 | Policy de Dirección sobre cursos presente |
| 022 | Pesos y cierre final, funciones, triggers y policies presentes |
| 023 | Todo el DDL académico final presente; seed/backfill omitido |
| 024 | Columna `profiles.active` presente; no había filas que actualizar |
| 025 | Seed 2026-2027 retirado del baseline sin datos |
| 026 | `course_subjects` y sus policies presentes; currículo seed omitido |
| 027 | `internal_notifications`, índices y policies presentes |
| 028 | `must_change_password` presente; no había filas que actualizar |
| 029 | `audit_logs`, índices y policies presentes |
| 030 | Estado e índice de conversaciones presentes |
| 031 | `teacher_schedule` y policies presentes; horario de prueba omitido |
| 032 | Asignaciones de `tutor.prueba` omitidas deliberadamente |
| 033 | `attendance_records`, índices, trigger y policies presentes |

`migration repair --status applied` se ejecutó únicamente en staging para
001-033. Al cierre del Sprint 20.1D no se había reparado ni aplicado 034.

Resultado al cierre del Sprint 20.1D:

- local/remoto 001-033 alineados;
- 034 solo local;
- dry-run: únicamente `034_multitenant_foundation.sql`.

## 10. Estado de datos

Después del bootstrap y el repair, antes del Sprint 20.1E:

- todas las 27 tablas públicas: `0` filas;
- `auth.users`: `0`;
- `profiles`, `students`, `parent_students`, `notifications`,
  `teacher_assignments` y `courses`: `0`;
- `schools`: no existe;
- `school_memberships`: no existe.

No se copiaron alumnos, familias, comunicaciones, calificaciones, cursos,
usuarios, Storage ni datos de Colegio Peñafort.

## 11. Rollback

La baseline no contiene `DROP` ni `TRUNCATE`. Si falla una fase, su transacción
se revierte. Las fases anteriores pueden permanecer aplicadas y el bootstrap se
reanuda solo después de verificar el estado esperado.

Como staging no contiene datos y es un proyecto aislado, el rollback completo
consiste en recrear el proyecto staging o restaurar su snapshot vacío. Nunca se
debe ejecutar un rollback, reset o repair de esta baseline contra producción.

## 12. Riesgos y siguiente fase

- Las migraciones históricas mezclan DDL con seeds de instancia.
- Producción carece de historial remoto 001-033.
- La baseline es un snapshot consolidado, no un sustituto del flujo futuro.
- Los tres modelos heredados `families`, `student_families` y `teachers`
  requieren decisión funcional antes del diseño multitenant.

Sprint 20.1E debe:

1. revisar y separar seeds legados del historial estructural;
2. validar la estrategia de migración futura desde un proyecto vacío;
3. aplicar 034 solo en staging y con autorización expresa;
4. comprobar las tablas y RLS multitenant;
5. mantener producción y Colegio Peñafort sin cambios.

## 13. Aplicación de 034 en staging

El 26 de julio de 2026 se completó el Sprint 20.1E contra el Project Ref
`zhnbrpcekmxldxlqrbhr`.

La secuencia aplicada fue:

1. guarda de entorno con destino `STAGING`;
2. `supabase migration list`;
3. `supabase db push --linked --dry-run`;
4. revisión de 034 y de los seeds históricos;
5. `supabase db push --linked`;
6. comprobación de historial y catálogo;
7. fixtures QA mínimos;
8. pruebas RLS, contexto, branding y aplicación.

El dry-run propuso únicamente `034_multitenant_foundation.sql`. El push aplicó
solo esa migración y el historial local/remoto quedó alineado en 001-034.
`db push` no ejecutó seeds separados y las migraciones 025-026 ya estaban
reconciliadas; no se ejecutaron sus inserciones históricas.

### Resultado estructural

| Colección | Antes | Después |
| --- | ---: | ---: |
| Tablas públicas | 27 | 29 |
| Columnas | 237 | 258 |
| Constraints | 145 | 159 |
| Índices | 90 | 97 |
| Funciones | 8 | 9 |
| Triggers públicos | 22 | 25 |
| Hook Auth aplicativo | 1 | 1 |
| Policies | 100 | 102 |
| Tipos propios | 1 | 1 |
| Extensiones | 5 | 5 |

`scripts/compare-multitenant-foundation.mjs` confirmó que las únicas
diferencias corresponden a `schools`, `school_memberships`, sus objetos
auxiliares, la actualización prevista de `handle_new_user()` y la protección
de `profiles`.

### Fixtures y datos

Staging contiene únicamente:

- 1 centro `QA School`;
- 5 usuarios Auth QA con dominio `example.test`;
- 5 perfiles QA;
- 4 memberships activas;
- 1 membership inactiva;
- 1 usuario QA sin membership.

Las 26 tablas académicas y operativas revisadas conservan 0 filas. No existen
alumnos, familias, cursos, notas, comunicaciones ni datos reales. No se creó
Colegio EducaCora ni Colegio Peñafort.

### Verificación reproducible

- `supabase/verification/020_1e_qa_setup.sql`: setup idempotente con guardas
  contra datos no QA;
- `supabase/verification/020_1e_foundation_checks.sql`: estructura,
  constraints, índices, grants y triggers;
- `supabase/verification/020_1_security_checks.sql`: RLS y escalado de
  privilegios con escrituras transaccionales revertidas;
- `scripts/verify-school-context.ts`: resolución de contexto y branding;
- `scripts/compare-multitenant-foundation.mjs`: comparación antes/después.

Las pruebas confirmaron que `authenticated` solo puede leer su membership y
el centro concedido por una membership activa. No puede escribir en las tablas
de fundación ni elevar roles. `profiles.role`, `active`,
`must_change_password`, email, id y fecha de creación quedan protegidos para
el propio usuario no superadmin.

### Rollback y siguiente fase

Staging sigue siendo descartable. El rollback completo consiste en recrear el
proyecto desde la baseline y reconciliar 001-033. No debe ejecutarse ningún
rollback ni repair de este procedimiento contra producción.

El siguiente sprint debe diseñar el backfill tenant-aware y su orden de
aplicación, sin trasladarlo todavía a producción ni mezclarlo con seeds de
instancia.

## 14. Plan previo al backfill tenant-aware

El Sprint 20.2A usa como baseline el inventario posterior a 034:

- 29 tablas públicas;
- 258 columnas;
- 159 constraints;
- 97 índices;
- 9 funciones;
- 25 triggers;
- 102 policies.

El diseño resultante añade `school_id` a 26 tablas en futuras migraciones,
mantiene `profiles` como identidad global y usa `schools` como raíz. No se ha
alterado esta baseline: los borradores 035-040 están aislados en
`supabase/plans/20_2` y `supabase db push --dry-run` debe permanecer vacío.

Los scripts `020_2a_production_diagnostics.sql`,
`020_2a_pre_backfill_checks.sql` y `020_2a_post_backfill_checks.sql` fijan los
conteos y controles agregados que deberán ejecutarse antes y después del
backfill. No extraen datos personales ni realizan escrituras.

La lectura agregada de producción del 27 de julio de 2026 confirmó 55 perfiles,
51 alumnos, 51 relaciones parent-student, 12 cursos, 18 materias, 102
course-subjects, 10 assignments, 38 tramos horarios y 188 audit logs. Las
puertas de huérfanos y conflictos académicos devolvieron cero. Producción sigue
sin las tablas de 034, como corresponde al aislamiento de este sprint.

## 15. Baseline de staging tras la oleada 20.2B

La migración 035 está aplicada únicamente en staging. El esquema mantiene las
29 tablas y no incorpora columnas `school_id` nuevas fuera de
`school_memberships`.

Estado QA validado:

- 2 centros: `QA School` y `Colegio Peñafort`;
- 5 perfiles QA ficticios;
- 8 memberships activas: cuatro por cada centro;
- 1 membership inactiva de QA School;
- 1 usuario QA sin ninguna membership;
- 0 filas en las tablas académicas y operativas;
- 0 memberships huérfanas o duplicadas.

Peñafort usa el UUID `20f20000-0000-4000-8000-000000000001`. `profiles.role`
sigue presente y protegido. Las pruebas RLS, contexto multi-centro, branding,
aislamiento y rollback están en
`supabase/verification/020_2b_wave1_checks.sql`.

El historial local/remoto de staging está alineado en 001-035 y el dry-run está
vacío. Producción continúa en su baseline previa: no recibió 034, 035 ni
escrituras de este sprint.

## 16. Baseline de configuración tras la oleada 20.2C

La migración `036_add_school_id_to_configuration.sql` está aplicada únicamente
en Supabase staging `zhnbrpcekmxldxlqrbhr`. El historial local/remoto está
alineado en 001-036 y el dry-run posterior está vacío.

La configuración académica tiene ahora propiedad tenant obligatoria:

| Tabla | `school_id` | Integridad principal |
| --- | --- | --- |
| `academic_years` | UUID, FK, índice, NOT NULL | nombre y único activo por centro |
| `courses` | UUID, FK, índice, NOT NULL | curso académico y nombre por centro |
| `subjects` | UUID, FK, índice, NOT NULL | nombre por centro |
| `course_subjects` | UUID, FK, índice, NOT NULL | course, subject y year del mismo centro |

Las FKs compuestas impiden relaciones cruzadas aunque la operación use un rol
privilegiado. Las policies sustituyen las lecturas globales autenticadas:
membership activa, centro de la fila y rol compatible determinan el acceso.
El superadmin conserva supervisión global controlada sobre centros activos.

`active_academic_year_id(uuid)` resuelve el curso activo por centro. La función
sin argumentos continúa temporalmente para compatibilidad con tablas
operativas anteriores a esta oleada y prioriza Peñafort. El código compartido
usa el UUID estable de Peñafort como contexto operativo por defecto hasta que
las rutas protegidas incorporen selección explícita de centro.

Staging contiene exclusivamente fixtures sintéticos:

- 2 cursos académicos activos, uno de QA School y otro de Peñafort QA;
- 2 cursos;
- 3 materias;
- 3 relaciones course-subject;
- cero relaciones cruzadas y cero `school_id` nulos.

No se crearon alumnos, familias, docentes, notas, asistencias,
comunicaciones ni PII. Producción, `main` y el Colegio Peñafort real no se
modificaron.

Las tablas de criterios, pesos, publicaciones y evaluaciones se clasifican
como operativa académica: pueden derivar su futuro `school_id` desde course,
subject o academic year, pero quedan fuera de 036 para no mezclar oleadas.
Las tablas de personas y relaciones esperan a una propuesta 037 rediseñada.

La verificación reproducible está en
`supabase/verification/020_2c_configuration_checks.sql`. Cubre catálogo,
fixtures, RLS, roles, memberships, aislamiento, unicidad, integridad compuesta
y compatibilidad del curso activo. La regresión
`020_2b_wave1_checks.sql` sigue pasando.

El rollback operativo mantiene columnas y datos y desactiva temporalmente el
código tenant-aware si fuera necesario. El rollback completo de staging
consiste en recrearlo desde la baseline; no se ejecuta contra producción.

## 17. Diseño de personas posterior a 036

El Sprint 20.2D no cambia la baseline remota. Rediseña únicamente la propuesta
local 037 y añade su verificador futuro.

Tablas previstas:

- `students`;
- `families`;
- `student_families`;
- `parent_students`;
- `teachers`;
- `teacher_assignments`.

`profiles` continúa global y `school_memberships` continúa como autoridad de
rol por centro. Students deriva de course/year; parent-students deriva de
student; assignments deriva de course/subject/year. Las identities Auth deben
tener perfil activo y membership activa del rol correcto en el school
derivado.

Los modelos heredados requieren precaución adicional. Families solo puede
derivarse cuando todos sus vínculos pertenecen a un único school. Teachers no
tiene FK ni otra evidencia fiable y cualquier fila bloquea 037. No se permite
usar email, rol global ni un tenant fijo para resolverlos.

La propuesta añade NOT NULL, FKs compuestas, triggers de derivación y RLS de
personas en una misma transacción futura. `020_2d_people_checks.sql` valida la
estructura y el aislamiento con fixtures sintéticos revertidos.

Estado al cierre del diseño: 037 no aplicada, ningún dato de personas creado,
producción y `main` intactos.

## 18. Baseline tras el ensayo de personas

El Sprint 20.2E promovió y aplicó `037` solo en staging. Tras detectar y
corregir una ambigüedad PostgREST, el catálogo final contiene:

- 6 columnas `school_id` UUID y `NOT NULL` en personas;
- 14 FKs tenant-aware;
- 11 índices;
- 6 triggers de derivación y validación;
- 13 policies existentes acotadas por membership;
- 0 relaciones simples duplicadas;
- `profiles` sin `school_id`;
- 0 filas en las seis tablas de personas.

El historial local y remoto queda alineado en `001-037`. La siguiente oleada
no puede comenzar hasta revisar de nuevo los borradores `038-040` contra esta
baseline.

## 19. Baseline tras la validación sintética 20.2F

La migración 037 permaneció sin cambios y fue validada sobre staging con datos
temporales 20.2F equivalentes a relaciones reales entre dos centros:
memberships, configuración académica, alumnos, responsables, familias legacy,
docentes legacy y assignments.

Resultado de la base:

- FKs compuestas y triggers rechazaron todos los cruces entre tenants;
- RLS aisló ambos centros y mantuvo acceso global controlado de superadmin;
- memberships inactivas y usuario sin membership devolvieron cero filas;
- teachers/families legacy bloquearon fuentes ausentes o ambiguas;
- no se usó un tenant fijo ni la primera membership para resolver ownership;
- no se aplicaron 038, 039 ni 040.

Tras las pruebas, `020_2f_cleanup.sql` y
`020_2f_post_cleanup.sql` demostraron cero residuos en Auth, personas,
relaciones y configuración académica 20.2F. La baseline remota sigue en
`001-037`; producción y `main` permanecen intactos.

El bloqueo vigente es aplicativo: `ActiveSchoolContext` aún no se propaga a
todas las rutas académicas y el fallback `legacy-profile` todavía permite
cargar shells sin membership activa. Hasta resolverlo, 037 no debe promoverse
a producción y 038 no debe aplicarse.

## Estado aplicativo tras Sprint 20.2G

La baseline remota no cambia: staging continúa alineado en `001-037` y no se
ha ejecutado SQL ni `db push`.

El bloqueo aplicativo anterior queda resuelto en la rama `staging`:

- el contexto activo se resuelve desde memberships y centros activos;
- todas las rutas protegidas heredan un layout que exige contexto válido;
- cada layout de rol exige el rol de la membership contextual;
- las operaciones académicas usan `school_id` y curso activo del contexto;
- no existe centro operativo por defecto en la aplicación protegida;
- no se autoriza mediante `profiles.role` cuando falta membership;
- una cuenta multischool no selecciona silenciosamente el primer centro.

Las tablas todavía pendientes de ownership directo en 038 se consumen con una
política conservadora. Las filas cuya relación no demuestra el centro activo
no se muestran. `audit_logs` permanece disponible solo en contexto global de
superadmin y un horario ambiguo de un docente multischool se bloquea.

El detalle de rutas, acciones, branding, caché, pruebas y límites está en
`docs/SPRINT_20_2G_ACTIVE_SCHOOL_CONTEXT.md`.

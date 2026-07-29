# Arquitectura multitenant de EducaCora

Estado: fundación técnica del Sprint 20.1.
Ámbito: estructuras aditivas, seguridad de Auth y preparación del backfill.
Producción: no depende todavía de las tablas nuevas.

## 1. Diagnóstico de partida

La aplicación funciona actualmente como una instancia monotenante de Colegio Peñafort:

- `profiles.role` contiene un rol global;
- no existe un identificador de centro en las tablas operativas;
- el curso académico activo es global;
- las RLS actuales filtran por rol y relaciones funcionales, no por centro;
- branding, dominio familiar y calendario contienen valores específicos de Peñafort;
- varios flujos de servidor usan `service_role` sin contexto de tenant;
- `/app` muestra un único centro configurado de forma estática.

Los dashboards y componentes pueden reutilizarse. El bloqueo es el aislamiento de datos, no la interfaz.

## 2. Modelo fundacional

### `schools`

| Campo | Uso |
| --- | --- |
| `id` | Identificador UUID estable |
| `name` | Nombre completo |
| `short_name` | Nombre corto |
| `slug` | Identificador público único y normalizado |
| `status` | `onboarding`, `active` o `suspended` |
| `active` | Habilitación operativa |
| `logo_url` | Recurso de marca opcional |
| `primary_color` | Color principal hexadecimal |
| `secondary_color` | Color secundario hexadecimal |
| `accent_color` | Color de acento hexadecimal |
| `family_email_domain` | Dominio configurable para familias |
| `calendar_id` | Calendario del centro |
| `created_at`, `updated_at` | Auditoría temporal |

No se inserta Colegio Peñafort ni Colegio EducaCora en la migración fundacional. El registro técnico de Peñafort se difiere al Sprint 20.2 para ejecutarlo en staging con un identificador documentado y conteos previos.

### `school_memberships`

| Campo | Uso |
| --- | --- |
| `id` | Identificador UUID |
| `school_id` | Centro asociado |
| `user_id` | Usuario de `auth.users` |
| `role` | Reutiliza `public.app_role` |
| `active` | Membresía habilitada |
| `created_at`, `updated_at` | Auditoría temporal |

La unicidad es `(user_id, school_id, role)`. Esta decisión permite varios roles de una misma persona en un centro y pertenencia a varios centros, sin duplicar una misma asignación.

Los borrados son conservadores:

- eliminar un usuario Auth elimina sus membresías;
- un centro con membresías no puede eliminarse en cascada.

## 3. Índices y constraints

La migración `034_multitenant_foundation.sql` añade:

- unicidad y formato normalizado de `schools.slug`;
- validación de estado, colores y dominio familiar;
- índice de centros por actividad y estado;
- índices de membresías activas por usuario y por centro;
- timestamps automáticos con `public.set_updated_at()`.

No se añade `school_id` a tablas operativas y no se ejecuta backfill.

## 4. RLS inicial

RLS se activa únicamente en `schools` y `school_memberships`.

- Un usuario autenticado puede leer sus propias membresías.
- Un usuario autenticado puede leer un centro cuando tiene una membresía activa en él.
- `anon` no tiene acceso.
- `authenticated` no recibe privilegios de escritura.
- No existen políticas cliente de `insert`, `update` o `delete`.

La gestión de centros y membresías deberá realizarse más adelante mediante operaciones de servidor autorizadas, con centro, actor, operación y auditoría explícitos.

Las RLS de las tablas operativas existentes no cambian en este sprint.

## 5. Contexto activo

`src/lib/schools/context.ts` es la fuente central futura para:

- consultar membresías activas;
- validar el centro solicitado contra la membresía;
- resolver el rol dentro del centro;
- exigir contexto o rol;
- resolver branding.

Reglas:

1. Una única membresía de centro se selecciona directamente.
2. Varias membresías de centro requieren selección futura.
3. Un `school_id` recibido del cliente nunca se acepta sin comprobar la membresía.
4. Varios roles en el mismo centro priorizan temporalmente `profiles.role`; si no coincide y hay ambigüedad, se exige selección.
5. Centros inactivos no se resuelven como contexto.

No se implementa aún selector de centro ni se conecta esta capa al layout protegido.

## 6. Compatibilidad temporal

`profiles.role` se mantiene sin cambios como fuente operativa actual. Si las tablas nuevas aún no existen o un usuario de Peñafort todavía no tiene membresía, el helper puede devolver un contexto `legacy-profile`:

- `schoolId: null`;
- rol procedente de `profiles.role`;
- branding actual de Peñafort.

Este fallback está declarado mediante `LEGACY_PROFILE_FALLBACK_ENABLED` y debe retirarse después de:

1. crear el registro técnico de Peñafort;
2. completar y verificar todas sus membresías;
3. conectar las rutas protegidas al contexto;
4. comprobar que no quedan usuarios sin membresía.

No debe convertirse en un fallback permanente ni utilizarse para un segundo centro.

## 7. Endurecimiento de Auth

### Registro público

Antes del Sprint 20.1, `/register` aceptaba `family`, `tutor` y `director` y enviaba el rol en metadatos Auth.

Ahora:

- la página informa de que el alta requiere un proceso autorizado;
- la server action no crea usuarios;
- el trigger `handle_new_user()` deja de confiar en `raw_user_meta_data.role`;
- la asignación administrativa existente sigue upsertando el rol desde código servidor confiable.

Por compatibilidad con el enum y el modelo actual, un alta Auth externa sin perfil previo recibe el rol legado mínimo `family`, pero no obtiene membresía ni relación con alumnos. Debe desactivarse también el registro público en la configuración de Supabase Auth antes de considerar cerrado el perímetro externo.

### Autoedición de perfil

La policy histórica permite actualizar la fila propia, pero no limita columnas. La migración añade `protect_profile_sensitive_fields()`:

- un usuario normal conserva la edición legítima de `full_name`;
- no puede modificar `id`, `email`, `role`, `active`, `must_change_password` ni `created_at`;
- las operaciones de Superadmin y `service_role` mantienen su comportamiento actual.

## 8. Inventario de `service_role`

Usos localizados de `createAdminClient()`:

| Categoría | Ubicaciones principales | Migración futura |
| --- | --- | --- |
| Auth administrativo | `dashboard/admin/actions.ts`, `change-password/actions.ts` | Exigir autoridad y contexto cuando la operación afecte a un centro |
| Importación y limpieza | `dashboard/admin/import/actions.ts` | Sprint de importación tenant-aware; `school_id` obligatorio |
| Auditoría | `src/lib/audit.ts` | Añadir `school_id` y actor contextual |
| Comunicaciones | `src/lib/communications/*` y actions por rol | Filtrar y auditar por centro |
| Calificaciones | `src/lib/grades/grades.ts`, `annual.ts` | Exigir centro y año del centro |
| Informes | `src/lib/reports/*` | Validar centro antes de leer o generar |
| Supervisión | `src/lib/director/students.ts` | Sustituir lectura global por contexto |
| Familia | `src/lib/family/student.ts`, `dashboard/family/actions.ts` | Validar membresía y relaciones del mismo centro |
| Comunicaciones administrativas | páginas/actions de Admin y Director | Restringir por centro activo |

Regla obligatoria para nuevos usos: ningún wrapper con `service_role` debe aceptar un `school_id` sin validar. Debe recibir autoridad, centro, operación y datos de auditoría. Este sprint no reescribe los flujos actuales para evitar una regresión masiva.

## 9. Curso académico por centro

Propuesta para una fase posterior:

1. añadir `academic_years.school_id` nullable;
2. crear el año activo de Peñafort y hacer backfill;
3. verificar conteos y relaciones;
4. sustituir el índice activo global por uno parcial único `(school_id) where active`;
5. añadir `active_academic_year_id(school_id uuid)`;
6. migrar callers y triggers;
7. aplicar `not null` solo después de verificar cero nulos.

El curso activo actual no cambia en este sprint.

## 10. Branding, dominio familiar y calendario

`src/lib/schools/branding.ts` transforma un `School` en configuración visual y mantiene `penafortBrand` como fallback temporal.

La resolución contempla:

- nombre y nombre corto;
- logo;
- colores;
- dominio familiar;
- calendario;
- producto y `poweredBy`.

No se conecta a dashboards. `@penafort.com`, el calendario fijo y el branding visible permanecen intactos.

La importación futura deberá construir emails con `school.family_email_domain`, no con un dominio enviado por el cliente.

## 11. Backfill por oleadas

Cada oleada exige conteo previo, transacción ensayada en staging, conteo posterior, comprobación de nulos y relaciones cruzadas, y rollback documentado.

### A. Identidad

- crear Peñafort de forma idempotente;
- crear membresías a partir de `profiles.role`;
- comprobar usuarios sin membresía, duplicados, emails y roles.

### B. Configuración

- `academic_years`;
- `courses`;
- `subjects`;
- `course_subjects`.

Origen: centro técnico validado de Peñafort.

### C. Personas

- `students`;
- `parent_students`;
- `teacher_assignments`.

Origen: relaciones con perfiles, cursos y asignaciones ya verificadas.

### D. Operativa

- asistencia;
- calificaciones y evaluaciones;
- comunicaciones;
- incidencias y observaciones;
- horarios y calendario.

No se aplicará `not null` ni RLS tenant-aware hasta que cada tabla tenga cero nulos y cero relaciones cruzadas.

## 12. Baseline y verificación

`supabase/verification/020_1_baseline_counts.sql` contiene únicamente conteos agregados, sin PII.

`supabase/verification/020_1_security_checks.sql` comprueba mediante catálogo:

- existencia de tablas;
- RLS activada;
- ausencia de políticas de escritura;
- trigger de protección de perfiles;
- función Auth endurecida.

Pruebas manuales obligatorias en staging:

1. un usuario normal puede cambiar `full_name`;
2. el mismo usuario no puede cambiar `role`, `active` ni flags;
3. un usuario autenticado no puede crear o modificar memberships;
4. una membresía activa resuelve su único centro;
5. un centro solicitado sin membresía se rechaza;
6. varias membresías requieren selección;
7. el fallback legado conserva Peñafort antes del backfill;
8. `/register` no crea cuentas ni ofrece roles.

El repositorio no tiene framework de tests. No se añade una dependencia pesada en este sprint.

## 13. Esquema versionado incompleto

Las migraciones existentes usan tablas cuya creación no está versionada:

- `students`;
- `courses`;
- `parent_students`;
- `teacher_assignments`;
- `notifications`.

No deben recrearse a ciegas. Antes de levantar staging hay que exportar solo la definición del esquema real, comparar constraints, índices, triggers y RLS, y crear una baseline reproducible sin datos personales.

Los tipos actuales también omiten tablas versionadas como:

- `annual_evaluation_weights`;
- `final_course_grades`;
- `final_evaluation_publications`.

En este sprint solo se añaden tipos de las dos tablas nuevas. La regeneración completa queda pendiente hasta disponer de acceso controlado al esquema real y revisar el diff.

## 14. Staging

No se ha identificado en el repositorio una configuración verificable de proyecto Supabase de staging. Por tanto:

- la migración `034` queda versionada, no aplicada;
- no se ejecuta SQL contra producción;
- no se copian datos personales;
- la aplicación desplegada no debe depender de las tablas nuevas.

Antes del Sprint 20.2 se necesita un proyecto recuperable con esquema equivalente, secretos separados y datos sintéticos o anonimizados mínimos.

## 15. Rollback

El rollback funcional preferido es no activar la capa nueva:

- los dashboards continúan usando `profiles.role`;
- el layout no consulta membresías;
- el branding visible no cambia;
- las tablas nuevas pueden permanecer vacías y sin uso.

Si una migración aplicada en staging debe revertirse, primero se comprueba que no existen memberships ni centros con uso. No se eliminarán tablas con datos. La protección de perfil y el trigger Auth pueden revertirse restaurando explícitamente su definición anterior, nunca mediante borrado indiscriminado.

## 16. Garantías para Peñafort

Este sprint no:

- crea centros ni usuarios;
- modifica o elimina datos;
- ejecuta backfill;
- cambia emails, roles o relaciones;
- modifica RLS operativas;
- conecta dashboards a nuevas tablas;
- cambia importación, curso activo, branding, dominio, `/app`, Storage o Corium;
- añade dependencias.

La regresión autenticada completa deberá ejecutarse en staging con cuentas de prueba de los cuatro roles antes de activar cualquier dependencia de memberships.

## 17. Criterios para el Sprint 20.2

Avanzar solo cuando:

1. exista staging restaurable;
2. se capture la baseline previa;
3. se obtenga una baseline reproducible del esquema real;
4. se apruebe el UUID y slug técnicos de Peñafort;
5. se ensaye la creación idempotente del centro;
6. se genere un dry-run de memberships;
7. se verifiquen cero cambios de usuarios, emails, roles y relaciones;
8. se complete la matriz de regresión de los cuatro roles.

## 18. Entorno de staging independiente

El Sprint 20.1C crea un laboratorio aislado para preparar la reconstrucción del
esquema, sin aplicar migraciones ni copiar datos.

### Recursos

- rama Git: `staging`, creada desde `4011485`;
- Supabase: `educacora-staging`;
- Project Ref: `zhnbrpcekmxldxlqrbhr`;
- región: `eu-west-1`;
- Vercel: `educacora-staging`;
- repositorio: `pabloperezcanto10-blip/educore-penafort`;
- Production Branch del proyecto Vercel: `staging`;
- URL: `https://educacora-staging.vercel.app`.

El repositorio local está enlazado únicamente al Project Ref de staging. La
carpeta `supabase/.temp/` y la configuración `.vercel/` son artefactos locales
ignorados por Git.

### Variables de Vercel

Obligatorias, siempre con valores pertenecientes al proyecto staging:

- `DEPLOYMENT_ENV=staging`;
- `NEXT_PUBLIC_SUPABASE_URL`;
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`;
- `SUPABASE_SERVICE_ROLE_KEY`;
- `AI_ASSISTANT_ENABLED=false`.

Las integraciones de contacto son opcionales. Si se prueban, deben usar
credenciales y destinatarios específicos de staging:

- `RESEND_API_KEY`;
- `CONTACT_TO_EMAIL`;
- `CONTACT_FROM_EMAIL`;
- `NEXT_PUBLIC_CONTACT_EMAIL`;
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`;
- `TURNSTILE_SECRET_KEY`.

No se configuran claves de proveedores de IA. Corium permanece desactivado.

### Auth

Configuración exclusiva del proyecto Supabase staging:

- Site URL: `https://educacora-staging.vercel.app`;
- login: `https://educacora-staging.vercel.app/login`;
- recuperación: `https://educacora-staging.vercel.app/change-password`;
- confirmación: `https://educacora-staging.vercel.app/auth/callback`.

No se modifica Auth de producción y no se crean usuarios durante este sprint.
La verificación posterior confirmó `disable_signup=true`, acceso anónimo
desactivado, proveedor email disponible y cero usuarios en staging.

### Noindex

Cuando `DEPLOYMENT_ENV=staging`:

- la metadata global declara `noindex` y `nofollow`;
- `robots.txt` bloquea todas las rutas;
- todas las respuestas incluyen `X-Robots-Tag: noindex, nofollow, noarchive`;
- Google Analytics no se carga.

Producción conserva su configuración SEO porque no define ese valor.

El primer deployment de `staging`, generado desde `24139e1`, finalizó en estado
`Ready`. Se verificaron con respuesta `200`:

- `/`;
- `/app`;
- `/login`;
- `/register`;
- `/manifest.json`;
- `/robots.txt`.

Las seis rutas incluyen `X-Robots-Tag`, la Home declara `noindex`, `robots.txt`
bloquea todo el sitio, `/register` mantiene el registro desactivado y todos los
iconos declarados por el manifest cargan correctamente.

### Estado y aislamiento

- Supabase staging y producción tienen Project Ref diferentes;
- Vercel staging es un proyecto independiente;
- las credenciales configuradas en Vercel proceden solo de Supabase staging;
- `.env.local` de producción no se utiliza para el deployment staging;
- al cerrar el Sprint 20.1C no se habían ejecutado `db push`,
  `migration repair`, `db reset`, SQL ni dumps;
- no se han creado centros, usuarios ni datos de prueba;
- Colegio Peñafort y producción permanecen intactos.

### Siguiente sprint

El Sprint 20.1D podrá comenzar únicamente después de verificar el deployment,
Auth y el aislamiento. Allí se obtendrá y revisará una baseline estructural sin
datos, se reconciliará el historial de migraciones en staging y se comprobará
mediante `db push --dry-run` que la única migración pendiente sea `034`.

## 19. Baseline estructural reproducible

El Sprint 20.1D reconstruye staging mediante una baseline estructural derivada
del catálogo real de producción y almacenada fuera del flujo normal de
migraciones:

- baseline: `supabase/baseline/000_public_schema_baseline.sql`;
- inventario: `supabase/verification/020_1d_schema_inventory.sql`;
- bootstrap protegido: `scripts/bootstrap-staging-schema.ps1`;
- repair protegido: `scripts/repair-staging-baseline-history.ps1`;
- procedimiento completo: `docs/DATABASE_BASELINE.md`.

La extracción de catálogo se realizó en producción mediante consultas `SELECT`.
La CLI se volvió a enlazar a staging inmediatamente después. No se ejecutó
ninguna escritura en producción.

El inventario reveló 27 tablas públicas. Además de las cinco tablas conocidas
sin creación versionada (`courses`, `notifications`, `parent_students`,
`students` y `teacher_assignments`), existen tres tablas heredadas adicionales:
`families`, `student_families` y `teachers`.

Staging reproduce el catálogo estructural con:

- 27 tablas;
- 237 columnas;
- 145 constraints;
- 90 índices;
- 8 funciones;
- 22 triggers públicos;
- 1 hook Auth aplicativo;
- 100 políticas RLS;
- 0 diferencias estructurales frente a producción.

Al cierre del Sprint 20.1D, todos los conteos de aplicación y `auth.users`
permanecían a cero. No existían `schools` ni `school_memberships`, por lo que
034 todavía no se había aplicado.

Las versiones 001-033 quedaron reconciliadas exclusivamente en staging como
historial absorbido por la baseline. Los seeds y backfills de Peñafort o prueba
no se ejecutaron. El dry-run propone únicamente
`034_multitenant_foundation.sql`.

Producción, `main`, Auth de producción y Colegio Peñafort permanecen sin
cambios.

## 20. Fundación multitenant validada en staging

El 26 de julio de 2026, el Sprint 20.1E aplicó
`034_multitenant_foundation.sql` exclusivamente en el proyecto Supabase de
staging `zhnbrpcekmxldxlqrbhr`.

Antes de la escritura se comprobó:

- rama `staging` y worktree limpio;
- Project Ref de staging mediante `scripts/assert-supabase-target.ps1`;
- historial remoto 001-033 reconciliado;
- `auth.users` y las 27 tablas públicas sin filas;
- dry-run con una única migración pendiente: 034;
- ausencia de `DROP TABLE`, `TRUNCATE`, borrados, backfill o inserts de centro
  dentro de 034.

Los `DROP ... IF EXISTS` de 034 se limitan a policies y triggers que se
recrean inmediatamente para hacer la migración idempotente. No eliminan datos,
tablas, columnas ni objetos operativos.

### Objetos resultantes

- `schools`: 14 columnas, PK UUID, `slug` único, constraints de nombre, slug,
  estado, colores y dominio familiar;
- `school_memberships`: 7 columnas, PK UUID, FK a `schools`, FK a
  `auth.users` y unicidad por usuario, centro y rol;
- 7 índices de soporte entre ambas tablas;
- triggers `updated_at` en ambas tablas;
- RLS activa en ambas tablas;
- policies de lectura para memberships propias y centros con membership
  activa;
- cliente `authenticated` con lectura, sin grants de escritura;
- `anon` sin acceso;
- función y trigger de protección de campos sensibles de `profiles`;
- `profiles.role` conservado para la transición.

El inventario posterior contiene 29 tablas, 258 columnas, 159 constraints, 97
índices, 9 funciones, 25 triggers públicos, 102 policies y el mismo hook Auth.
La comparación automatizada confirmó que todos los objetos anteriores a 034
permanecen idénticos.

### Datos QA aislados

Solo se crearon fixtures ficticios en staging:

- centro técnico `QA School`;
- `qa.superadmin@example.test`;
- `qa.director@example.test`;
- `qa.tutor@example.test`;
- `qa.family@example.test`;
- `qa.nomembership@example.test`;
- cuatro memberships activas, una membership inactiva y un usuario sin
  membership.

No se documentaron contraseñas. No se crearon alumnos, familias, cursos,
calificaciones, asistencias, incidencias ni comunicaciones. No se copiaron
datos personales ni datos de Colegio Peñafort.

### Seguridad y contexto

`supabase/verification/020_1_security_checks.sql` validó con sesiones QA
simuladas y transacciones revertidas que:

- un usuario normal no crea, modifica ni elimina centros;
- no crea, activa ni eleva memberships;
- solo consulta memberships propias;
- una membership inactiva y un usuario sin membership no conceden centro;
- tutor, director y family no pueden elevar su rol;
- los campos sensibles de `profiles` están protegidos;
- el nombre propio autorizado sigue siendo editable.

`supabase/verification/020_1e_foundation_checks.sql` validó constraints,
foreign keys, unicidad, roles, grants y triggers `updated_at`.

`scripts/verify-school-context.ts` validó el contexto con membership activa,
el rechazo de centros no autorizados, la ausencia de centro sin membership y
el fallback temporal de branding de Peñafort. Este fallback no concede un
`school_id` y sigue siendo únicamente un puente de compatibilidad.

### Límite del sprint y rollback

No se creó Colegio EducaCora ni Peñafort como tenant, no se añadió `school_id`
a tablas operativas y no se inició ningún backfill. Producción, `main`,
Colegio Peñafort y los flujos académicos permanecen intactos.

Si staging debe revertirse, se recreará desde
`supabase/baseline/000_public_schema_baseline.sql`, se reconciliará 001-033 y
se decidirá si volver a aplicar 034. No se ejecutará ese rollback contra
producción.

El Sprint 20.2 puede comenzar con el diseño del backfill y la incorporación
progresiva de `school_id`, siempre primero en staging y con una matriz de
tablas, acciones y policies revisada.

## 21. Diseño ejecutable del backfill de Peñafort

El Sprint 20.2A concreta la transición sin aplicar cambios remotos. La fuente
de verdad operativa es
`docs/PENAFORT_TENANT_BACKFILL_PLAN.md`.

Decisiones cerradas:

- `schools` es la raíz tenant y `profiles` permanece global;
- 27 tablas quedan tenant-scoped: una ya dispone de `school_id` y 26 lo
  incorporarán de forma nullable por oleadas;
- `courses` y `subjects` son configuración propia de cada centro;
- `profiles.role` se conserva como compatibilidad temporal;
- Peñafort tendrá UUID estable `20f20000-0000-4000-8000-000000000001`;
- las dependencias críticas usarán FKs compuestas y validadores de membership;
- las policies globales se sustituyen solo después de adaptar las consultas;
- `audit_logs.school_id` admite `NULL` únicamente para actividad de plataforma.

Los diagnósticos de `supabase/verification/020_2a_*.sql` son de solo lectura.
Al cierre de 20.2A, las propuestas 035-040 se guardaban en
`supabase/plans/20_2` y no formaban parte del historial ejecutable. En ese
momento no se había creado Peñafort como tenant ni ejecutado backfill, y
producción no se había modificado.

## 22. Identidad tenant de Peñafort en staging

El Sprint 20.2B promovió únicamente la propuesta 035 al historial ejecutable y
la aplicó el 27 de julio de 2026 al proyecto staging
`zhnbrpcekmxldxlqrbhr`.

Peñafort usa el UUID estable
`20f20000-0000-4000-8000-000000000001`. Convive con `QA School` para probar
aislamiento de centro. Cuatro identidades QA tienen memberships Peñafort
activas con roles superadmin, director, tutor y family; el usuario QA sin
membership y la membership inactiva de QA School se conservan.

La unicidad operativa de memberships sigue siendo
`(user_id, school_id, role)`. `profiles.role` permanece como compatibilidad
global temporal: en particular, el superadmin conserva el rol global y usa una
membership explícita cuando opera dentro de Peñafort. Los clientes
autenticados solo pueden leer sus memberships y centros activos; no pueden
crear, modificar ni elevar memberships.

La selección explícita entre QA School y Peñafort, los roles por centro, el
rechazo de centros no autorizados, el branding y el rollback por desactivación
se validan mediante `scripts/verify-school-context.ts` y
`supabase/verification/020_2b_wave1_checks.sql`.

Esta oleada no cambia dashboards ni consultas operativas. No añade `school_id`
a ninguna tabla operativa, no inicia backfill académico y no aplica 036-040.
Producción y `main` permanecen intactos.

## 23. Configuración académica tenant-aware en staging

El Sprint 20.2C promovió y aplicó
`036_add_school_id_to_configuration.sql` exclusivamente en Supabase staging
`zhnbrpcekmxldxlqrbhr`. Producción, `main` y los datos reales de Colegio
Peñafort no se modificaron.

La oleada incorpora `school_id uuid not null` a:

- `academic_years`;
- `courses`;
- `subjects`;
- `course_subjects`.

Cada columna tiene FK a `schools` e índice de soporte. Las relaciones
`course -> academic_year` y `course_subject -> course/subject/academic_year`
añaden FKs compuestas con `school_id`, por lo que una relación entre centros
distintos falla en la base de datos incluso con una sesión privilegiada.

La unicidad pasa a ser por centro:

- nombre y único curso académico activo por `school_id`;
- nombre de curso por centro y curso académico;
- nombre de materia por centro;
- relación course-subject por centro, curso académico, curso, materia y track.

Con autorización explícita, la migración sustituyó dentro de la misma
transacción cuatro objetos globales incompatibles: el índice de curso activo y
las constraints globales de nombre de curso académico, curso y materia. Sus
reemplazos tenant-aware se crearon antes de ejecutar los cuatro `DROP`
limitados. No se eliminó ninguna tabla, columna o fila.

`active_academic_year_id(uuid)` resuelve el curso activo de un centro. La
sobrecarga sin argumentos se conserva temporalmente para las tablas operativas
anteriores a esta oleada y prioriza Peñafort como puente de compatibilidad.
El trigger exclusivo de `courses` deriva y valida conjuntamente centro y curso
académico; el trigger legado compartido por operativa no se modificó.

Las policies de configuración ya no contienen lecturas autenticadas con
`USING (true)`. Tutor, family y director leen únicamente centros con membership
activa y rol compatible. El superadmin conserva supervisión global controlada
para centros activos. Las escrituras de configuración siguen reservadas al
superadmin.

Los únicos datos añadidos son fixtures ficticios y deterministas:

- 2 cursos académicos activos, uno por cada centro QA;
- 2 cursos;
- 3 materias;
- 3 relaciones course-subject.

No existen alumnos, familias, docentes ni datos académicos reales. Las pruebas
de `020_2c_configuration_checks.sql` validaron catálogo, RLS, roles,
memberships activas e inactivas, ausencia de membership, aislamiento en ambos
sentidos, superadmin controlado, unicidad e integridad compuesta. La regresión
`020_2b_wave1_checks.sql` continuó pasando y el dry-run remoto quedó vacío.

La aplicación mantiene temporalmente
`DEFAULT_OPERATIONAL_SCHOOL_ID = Peñafort` en helpers y acciones que aún no
reciben selector de centro. Es un puente explícito: debe desaparecer cuando
cada ruta protegida propague `ActiveSchoolContext`.

### Revisión de la propuesta 037

`supabase/plans/20_2/037_add_school_id_to_people.sql` permanece como diseño,
sin aplicar ni mover al historial. Antes de promoverla debe:

- usar las FKs compuestas de configuración creadas por 036;
- resolver cada persona desde una fuente tenant determinista;
- evitar asignar globalmente familias o docentes a Peñafort;
- incorporar pruebas de memberships, nulos, relaciones cruzadas y RLS;
- demostrar con diagnósticos agregados que no existe una identidad ambigua.

No se avanzará a 037 hasta cerrar esos puntos en un sprint específico.

## 24. Frontera de personas diseñada en 20.2D

El Sprint 20.2D rediseña
`supabase/plans/20_2/037_add_school_id_to_people.sql` sin promoverla ni
aplicarla. La fuente de verdad detallada es
`docs/MULTITENANT_PEOPLE_MIGRATION_037.md`.

Decisiones:

- `profiles` permanece global y una persona puede tener memberships en varios
  centros;
- la propiedad de students y assignments nace en la configuración académica
  tenant-aware de 036;
- parent-students y relaciones legacy heredan del student;
- ninguna membership, email, nombre o `profiles.role` elige el school;
- la membership activa y el rol correcto validan a la identidad relacionada
  después de derivar el school;
- cualquier fuente ausente o múltiple aborta;
- `teachers` legado carece de una relación fiable y debe estar vacío o disponer
  de un mapa auditado externo antes de aplicar;
- los writes actuales pueden omitir `school_id`; triggers de base lo derivan y
  rechazan contradicciones;
- FKs compuestas y RLS impiden cruces incluso ante IDs válidos.

La verificación diseñada cubre superadmin, director, tutor, family, membership
inactiva, usuario sin membership, rol incorrecto, usuario multischool,
ambigüedad y relaciones cruzadas. Todas las escrituras QA están delimitadas
por `BEGIN/ROLLBACK`.

## 25. Personas tenant-aware ensayadas en staging

El Sprint 20.2E aplicó la versión corregida de
`037_add_school_id_to_people.sql` exclusivamente en Supabase staging.

La migración incorpora `school_id` obligatorio, 14 FKs, 11 índices, 6 triggers
de contexto y 13 policies tenant-scoped en la oleada de personas. `profiles`
continúa siendo una identidad global.

La regresión inicial reveló que mantener simultáneamente una FK simple y su
reemplazo compuesto genera relaciones ambiguas para PostgREST. La base staging
se restauró, se sustituyeron explícitamente ocho FKs simples y la segunda
aplicación pasó SQL, RLS y navegación autenticada.

Estado final:

- staging y su historial están en `001-037`;
- no hay datos operativos en las tablas de personas;
- los fixtures QA se ejecutaron con rollback;
- `039-041` siguen bloqueadas;
- producción y `main` permanecen intactos.

## 26. Dataset sintético representativo del Sprint 20.2F

La frontera de personas de 037 se validó en staging con un dataset temporal
completamente sintético: 10 alumnos, 5 familias legacy, 4 docentes legacy,
6 responsables Auth y 7 asignaciones docentes distribuidas entre dos centros
activos. También se probaron un centro inactivo, memberships inactivas, usuario
sin membership, rol incompatible y tutor multischool.

Los tests transaccionales rechazaron cruces de students, parent-students,
student-families y teacher-assignments. Las fuentes legacy ausentes o ambiguas
se bloquearon; no se eligió nunca la primera membership. RLS mantuvo el alcance
global controlado de superadmin y limitó director, tutor y family por centro y
relación.

La regresión web confirmó un bloqueo de integración: las rutas académicas aún
no propagan `ActiveSchoolContext` y consumen
`DEFAULT_OPERATIONAL_SCHOOL_ID`. Por ello, Director/Tutor del segundo centro no
resuelven su curso activo y el tutor multischool solo ve el centro por defecto.
Además, la compatibilidad `legacy-profile` deja abrir el shell del rol a un
usuario sin membership activa, aunque RLS devuelve cero filas.

Todos los fixtures 20.2F y sus credenciales efímeras se eliminaron. El
post-cleanup demostró cero residuos y preservó la infraestructura QA anterior.
La decisión es `GO CON BLOQUEOS`: 037 puede mantenerse como candidata, pero no
debe promoverse a producción ni debe aplicarse la oleada operativa, ahora
numerada `039-041`, hasta integrar el contexto
de centro en la aplicación y retirar el fallback legacy de las rutas
protegidas.

## Sprint 20.2G - propagación de ActiveSchoolContext

La aplicación protegida deja de depender de
`DEFAULT_OPERATIONAL_SCHOOL_ID`, de la primera membership disponible y del rol
legacy de `profiles` como fuente de autorización. El acceso operativo se
resuelve mediante `ActiveSchoolContext`, construido exclusivamente a partir de
memberships activas y centros activos.

Reglas vigentes:

- un único centro autorizado se selecciona automáticamente;
- varios centros requieren una selección explícita o una cookie HTTP-only
  previamente validada;
- una selección manipulada o caducada nunca concede acceso;
- un usuario sin membership activa no puede cargar un dashboard de centro;
- `profiles.role` solo puede desambiguar entre roles que ya estén autorizados
  por memberships activas del mismo centro;
- el superadmin global conserva una vista global controlada y puede entrar en
  contexto de centro mediante una selección explícita;
- curso académico, branding, navegación y consultas operativas derivan del
  centro activo.

Los layouts protegidos y de rol resuelven el contexto antes de ejecutar las
consultas del dashboard. Las Server Actions y handlers sensibles vuelven a
validarlo en servidor. El inventario y las decisiones completas están en
`docs/SPRINT_20_2G_ACTIVE_SCHOOL_CONTEXT.md`.

### Límites previos a la oleada operativa 039

`notifications`, `internal_notifications`, `teacher_schedule` y `audit_logs`
todavía no disponen de ownership directo por `school_id`. Hasta que 039 lo
incorpore:

- una notificación solo se muestra si una entidad relacionada demuestra el
  tenant seleccionado;
- un horario ambiguo para un docente multischool se oculta;
- la auditoría administrativa y directiva se limita a la vista global de
  superadmin;
- no se infiere ownership mediante nombres, orden de filas o centros por
  defecto.

Estas restricciones reducen temporalmente cobertura funcional, pero evitan
lecturas cruzadas. La promoción de 037 a producción sigue requiriendo una
regresión autenticada representativa y los controles del plan de backfill.

## Corrección RLS de students mediante assignments

El Sprint 20.2G-R2B añadió la migración ejecutable `038` únicamente en
staging. Su alcance es deliberadamente reducido: modifica solo la policy
SELECT de Tutor sobre `students`.

La policy mantiene la tutoría directa y permite también lectura cuando existe
una `teacher_assignment` del usuario para el mismo `school_id`, `course_id` y
`academic_year_id` del alumno. La membership activa con rol Tutor y el centro
activo siguen siendo obligatorios mediante `has_school_role`.

La decisión arquitectónica es:

- RLS continúa siendo la autoridad;
- las consultas no duplican una restricción de tutoría directa más estrecha;
- un assignment nunca concede acceso a otro curso, año o centro;
- no se añaden permisos de escritura ni funciones `SECURITY DEFINER`;
- `037` no se modifica retroactivamente;
- los borradores de operativa pasan a `039-041`.

La verificación transaccional y la regresión autenticada A -> B -> A
confirmaron cero filas cruzadas, cero errores PostgREST y bloqueo de
memberships inactivas, roles incompatibles y usuarios sin membership.

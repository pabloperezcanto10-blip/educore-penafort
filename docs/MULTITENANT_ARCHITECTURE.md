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

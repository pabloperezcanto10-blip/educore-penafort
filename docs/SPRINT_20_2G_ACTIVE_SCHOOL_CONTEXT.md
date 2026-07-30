# Sprint 20.2G - ActiveSchoolContext

Fecha: 28 de julio de 2026
Rama: `staging`
Supabase staging: `zhnbrpcekmxldxlqrbhr`
Estado de base al iniciar: migraciones `001-037` alineadas, dry-run vacío.

## 1. Alcance

Este sprint propaga el centro activo por la aplicación protegida sin cambiar
el esquema remoto. No aplica migraciones, no ejecuta `039-041`, no modifica
producción y no crea datos operativos.

La fuente única de autoridad es `ActiveSchoolContext`. Un dashboard de centro
ya no puede abrirse únicamente porque `profiles.role` sea compatible.

## 2. Fuente única de contexto

`src/lib/schools/context.ts` resuelve:

- `userId`;
- `schoolId` y `school`;
- `membershipId`, `membershipRole` y `membershipStatus`;
- rol contextual;
- capacidad global de superadmin;
- centros y memberships activas disponibles;
- necesidad de selección explícita;
- branding del centro;
- curso académico activo del centro;
- origen `membership` o `global-superadmin`.

Reglas deterministas:

1. Se descartan memberships inactivas y centros inactivos.
2. Una única escuela autorizada se resuelve automáticamente.
3. Varias escuelas requieren `school_id` explícito o cookie válida.
4. Nunca se elige la primera membership.
5. Varias memberships de rol en el mismo centro usan `profiles.role` solo para
   escoger entre roles ya autorizados; si no hay coincidencia única, se
   bloquea con `SCHOOL_ROLE_REQUIRED`.
6. `profiles.role` no crea acceso a un centro ni sustituye una membership.
7. El superadmin puede operar globalmente o elegir un centro donde tenga
   membership activa.

## 3. Persistencia segura

La selección se guarda en la cookie HTTP-only
`educacora_active_school_id`.

- `SameSite=Lax`;
- `Secure` en producción;
- ámbito `/`;
- duración máxima de 30 días;
- no contiene rol, permisos ni datos personales;
- se valida server-side contra memberships y centro activo en cada resolución;
- una cookie manipulada, revocada o de un centro inactivo no concede acceso;
- al seleccionar otro centro se reemplaza;
- al cerrar sesión se elimina;
- el superadmin puede eliminarla para volver a la vista global.

Una cookie inválida se ignora y el resolver vuelve a aplicar las reglas
deterministas. No se usa `localStorage` ni estado cliente como autoridad.

## 4. Entrada, selector y estado sin centro

`/select-school`:

- consulta únicamente memberships activas y centros activos;
- no acepta un UUID enviado por el cliente sin validarlo;
- muestra solo centros autorizados y sus roles;
- permite cambiar A -> B -> A;
- revalida el layout protegido antes de redirigir;
- no realiza consultas operativas del centro anterior.

`/no-school`:

- vive fuera del layout protegido;
- no monta `AppShell`;
- no muestra navegación privada;
- no ejecuta consultas académicas u operativas;
- no usa `profiles.role` para conceder un centro;
- permite cerrar sesión.

Login, registro y cambio de contraseña usan `getAuthenticatedEntryPath` y
respetan selección requerida, ausencia de membership y vista global.

## 5. Layouts y autorización

El layout protegido valida, en este orden:

1. sesión y perfil activo;
2. cambio de contraseña;
3. `ActiveSchoolContext`;
4. centro y membership cuando son necesarios;
5. curso académico del centro;
6. montaje de `AppShell`.

Los layouts de `admin`, `director`, `tutor` y `family` ejecutan
`requireRole`. Esta función compara el rol requerido con el rol de la
membership contextual y redirige una URL de otro rol antes de cargar su
contenido.

`AppShell` recibe contexto, branding, navegación y curso académico ya
resueltos. El selector aparece solo con varios centros o para el superadmin
global con centros disponibles.

## 6. Inventario de rutas privadas

Todas las páginas heredan el layout protegido. Las rutas Admin, Director,
Tutor y Family heredan además su layout de rol. `AA` significa que el curso
académico se resuelve o valida dentro del helper cuando la pantalla lo usa.

| Ruta | Rol/layout | Contexto, AA y datos | Estado |
| --- | --- | --- | --- |
| `/dashboard/admin` | superadmin | global o centro; señales tenant-aware; auditoría solo global | contextual |
| `/dashboard/admin/academic-years` | superadmin | centro obligatorio; AA por `school_id` | contextual |
| `/dashboard/admin/calendar` | superadmin | calendario del branding; vacío seguro en global/sin ID | contextual |
| `/dashboard/admin/communications` | superadmin | global o conversaciones autorizadas del centro | contextual |
| `/dashboard/admin/courses` | superadmin | centro obligatorio; cursos y AA por centro | contextual |
| `/dashboard/admin/create` | superadmin | centro obligatorio; perfiles, cursos y materias scoped | contextual |
| `/dashboard/admin/families` | superadmin | centro obligatorio; memberships y relaciones scoped | contextual |
| `/dashboard/admin/final-grades` | superadmin | centro obligatorio; curso/alumno del centro | contextual |
| `/dashboard/admin/gradebook` | superadmin | centro obligatorio; cuaderno scoped por personas/config | contextual |
| `/dashboard/admin/grades` | superadmin | centro obligatorio; supervisión de notas por recursos | contextual |
| `/dashboard/admin/import` | superadmin | centro, AA, curso y dominio familiar contextual | contextual |
| `/dashboard/admin/maintenance` | superadmin | centro obligatorio; estructura y personas scoped | contextual |
| `/dashboard/admin/reports` | superadmin | centro obligatorio; cursos/publicaciones scoped | contextual |
| `/dashboard/admin/security` | superadmin | global; en contexto oculta audit logs ambiguos hasta 039 | conservador |
| `/dashboard/admin/students` | superadmin | centro obligatorio; alumnos y tutores scoped | contextual |
| `/dashboard/admin/students/[id]` | superadmin | ID validado contra `students.school_id` | contextual |
| `/dashboard/admin/subjects` | superadmin | centro obligatorio; materias/asignaciones scoped | contextual |
| `/dashboard/admin/users` | superadmin | centro obligatorio; perfiles derivados de memberships | contextual |
| `/dashboard/director` | director | centro obligatorio; actividad y señales autorizadas | contextual |
| `/dashboard/director/attendance` | director | alumnos del centro antes de leer asistencia | contextual |
| `/dashboard/director/calendar` | director | calendario del branding del centro | contextual |
| `/dashboard/director/communications` | director | participantes/alumno del centro activo | contextual |
| `/dashboard/director/final-grades` | director | curso/alumnos del centro | contextual |
| `/dashboard/director/gradebook` | director | cursos y notas supervisadas del centro | contextual |
| `/dashboard/director/grades` | director | etiquetas de alumno/curso/materia scoped | contextual |
| `/dashboard/director/reports` | director | cursos/publicaciones del centro | contextual |
| `/dashboard/director/students` | director | alumnos y cursos del centro | contextual |
| `/dashboard/director/students/[id]` | director | ID validado contra el centro | contextual |
| `/dashboard/tutor` | tutor | AA, agenda, señales y branding del centro | contextual |
| `/dashboard/tutor/attendance` | tutor | tutor, AA y alumnos del centro | contextual |
| `/dashboard/tutor/attendance/[sessionId]` | tutor | sesión, assignment, curso y alumnos validados | contextual |
| `/dashboard/tutor/attendance-history` | tutor | assignment, curso, materia y alumnos scoped | contextual |
| `/dashboard/tutor/calendar` | tutor | calendario del branding del centro | contextual |
| `/dashboard/tutor/communications` | tutor | alumnos, familias y mensajes del centro | contextual |
| `/dashboard/tutor/evaluation-settings` | tutor | assignment y criterios del AA activo | contextual |
| `/dashboard/tutor/final-grades` | tutor | assignment, curso, materia y alumno scoped | contextual |
| `/dashboard/tutor/gradebook` | tutor | assignment y recursos del centro | contextual |
| `/dashboard/tutor/schedule` | tutor | política conservadora previa a 039 | conservador |
| `/dashboard/tutor/students` | tutor | tutor, AA, cursos y alumnos del centro | contextual |
| `/dashboard/tutor/students/[id]` | tutor | tutor/alumno/relaciones y acciones scoped | contextual |
| `/dashboard/tutor/subjects` | tutor | assignments y cursos del centro | contextual |
| `/dashboard/family` | family | hijos por relación `school_id`; datos visibles | contextual |
| `/dashboard/family/calendar` | family | calendario del branding del centro | contextual |
| `/dashboard/family/communications` | family | hijos, participantes y mensajes del centro | contextual |
| `/dashboard/family/grades` | family | hijos y publicaciones visibles del centro | contextual |
| `/dashboard/family/student` | family | relación familiar y alumno del centro | contextual |
| `/dashboard/familia` | compartido | alias sin datos; redirige a Family | seguro |
| `/dashboard/reports/term-preview` | compartido | helper valida rol, centro, alumno y publicación | contextual |
| `/dashboard/reports/term-pdf` | compartido | redirige a preview validada | seguro |
| `/dashboard/reports/final-pdf` | compartido | helper valida rol, centro, alumno y publicación | contextual |

Total inventariado: 50 páginas y route handlers privados.

## 7. Server Actions y handlers

Las acciones de mantenimiento, importación, comunicaciones, asistencia,
cuaderno, notas finales, ficha de alumno, publicaciones y notificaciones:

- resuelven sesión, rol y centro antes de usar privilegios de servicio;
- no aceptan `school_id` del formulario como autoridad;
- validan IDs contra `students`, `courses`, `subjects`,
  `teacher_assignments`, `parent_students` o memberships del centro;
- rechazan recursos de otro tenant;
- insertan `school_id` en las tablas de configuración/personas adaptadas;
- notifican únicamente a memberships o relaciones del centro;
- limitan borrados de usuarios con memberships en otros centros;
- mantienen a `profiles` como identidad global.

El endpoint `/api/ai/chat` exige contexto escolar autorizado antes de atender
una petición autenticada.

## 8. Caché y navegación

No hay React Query ni SWR en las rutas protegidas. Las lecturas de Supabase son
dinámicas por cookie. Cambiar de centro reemplaza la cookie y revalida
`/dashboard` a nivel de layout.

El único `fetch` cacheado en dashboards es el calendario ICS. Su URL incluye el
`calendar_id` del branding del centro, por lo que la clave de caché cambia con
el tenant. Un centro sin calendario no hereda el de Peñafort.

Los `revalidatePath` invalidan rutas, pero no almacenan datos tenant en el
cliente. Los filtros viven en search params y contienen IDs que los helpers
vuelven a validar contra el centro activo.

## 9. Branding

Los dashboards compartidos reciben `BrandConfig` derivado del contexto. Solo
un centro cuyo slug identifica Peñafort usa su fallback visual; cualquier
centro genérico sin assets usa EducaCora. La vista global usa EducaCora.

El `AppShell`, selector, calendarios y boletines reciben nombre, logo, colores,
dominio familiar y calendario desde el contexto. La importación no vuelve a
generar direcciones `@penafort.com` para otros centros: exige el dominio
configurado del tenant.

## 10. Límites conservadores previos a la oleada operativa 039

`notifications` e `internal_notifications` todavía no tienen `school_id`.

- comunicaciones: se muestran solo si emisor y receptor tienen membership
  activa en el centro y, cuando existe alumno, también pertenece al centro;
- notificaciones internas: fuera de la vista global solo se muestran si
  alumno, curso o materia relacionados demuestran el tenant;
- filas sin relación demostrable se ocultan.

`teacher_schedule` todavía no tiene `school_id`.

- se contrasta con assignments, curso y materia del centro activo;
- si el docente tiene assignments en más de un centro, se oculta el horario
  completo porque una fila no puede atribuirse de forma inequívoca;
- los alias temporales `Math/Matemáticas` y `Science/Ciencias` solo normalizan
  etiquetas y no otorgan acceso.

`audit_logs` todavía no tiene `school_id`.

- la vista global de superadmin conserva la auditoría global;
- en una vista de centro se ocultan logs no demostrables;
- Director no mezcla estos logs en su timeline contextual.

Estas limitaciones son deliberadas: degradan información secundaria antes que
exponer datos de otro centro.

## 11. Verificación local

`scripts/verify-school-context.ts` usa exclusivamente UUIDs sintéticos y
correos `example.test`. Cubre:

- selección automática con un centro;
- selección obligatoria con dos;
- A -> B -> A;
- Director, Tutor y Family en ambos centros;
- tutor multischool;
- membership activa e inactiva;
- centro activo e inactivo;
- usuario sin membership;
- `school_id` manipulado;
- rol de membership frente al rol legacy;
- ambigüedad de roles;
- superadmin global y contextual;
- branding global y fallback genérico.

No crea usuarios, filas remotas, credenciales ni fixtures persistentes.

## 12. Migraciones y recomendación

Este sprint no modifica `supabase/migrations`, no aplica SQL y no ejecuta
`039`, `040` ni `041`.

La migración 037 puede seguir preparándose para producción desde el punto de
vista aplicativo porque el fallback legacy y el centro operativo por defecto
han desaparecido de las rutas privadas. Aun así, su promoción exige repetir
la regresión autenticada sobre un entorno representativo y los controles de
producción definidos en el plan de backfill.

La migración operativa 039 puede comenzar como sprint de diseño/aplicación en staging
solo después de aceptar estos bloqueos explícitos. Debe añadir ownership
directo, como mínimo, a notificaciones, horarios, auditoría y el resto de
operativa clasificada en el plan; no debe resolverse con inferencias por
nombre.

## 13. Validación de cierre

Validaciones completadas:

- verificador determinista de `ActiveSchoolContext`: correcto;
- `npm run lint`: correcto, sin avisos;
- `npx tsc --noEmit`: correcto;
- `npm run build`: correcto, 67 rutas generadas;
- `supabase db lint --linked --level warning`: sin errores;
- migraciones locales/remotas: `001-037` alineadas;
- `supabase db push --linked --dry-run`: vacío;
- build local: páginas públicas `200` y todas las entradas privadas probadas
  redirigen a `/login` sin sesión;
- escaneos: sin secretos reales, datos personales, migraciones nuevas,
  archivos temporales ni centro operativo por defecto.

La regresión autenticada remota no se ejecutó porque el entorno disponible no
conservaba sesiones QA ni variables de credenciales de prueba. No se crearon
usuarios, contraseñas o datos remotos para sortear esta restricción. Antes de
promover 037 o declarar seguridad end-to-end completa debe repetirse la matriz
Superadmin/Director/Tutor/Family en dos centros con identidades sintéticas
controladas.

## 14. Regresión autenticada R2 en staging

Fecha de ejecución: 29 de julio de 2026.

La fase `20.2G-R2` completó la regresión autenticada contra Supabase staging
`zhnbrpcekmxldxlqrbhr`. No se utilizó `.env.local`, no se accedió a producción
y no se aplicó ninguna migración.

Se creó un manifiesto temporal cerrado e ignorado por Git con los IDs exactos
del conjunto `20_2G_QA`. Las credenciales aleatorias permanecen en un archivo
temporal independiente, también ignorado. Ninguno de los dos archivos se
versiona y el manifiesto no contiene contraseñas.

### 14.1. Usuarios

Se reutilizaron tres identidades QA preexistentes:

- superadmin global;
- tutor con memberships activas en dos centros;
- usuario sin membership.

Se crearon siete identidades sintéticas `example.test`:

- Director A y Director B;
- Tutor A y Tutor B;
- Family A y Family B;
- Tutor con una única membership inactiva.

Los otros dos usuarios QA preexistentes y sus memberships permanecieron
intactos. No se usaron correos, nombres o datos personales reales.

### 14.2. Conteos del manifiesto

| Recurso | Creado | Reutilizado |
| --- | ---: | ---: |
| `auth.users` | 7 | 3 para login |
| `profiles` | 7 | 3 |
| `school_memberships` | 7 | memberships QA del multischool/superadmin |
| `academic_years` | 0 | 2 |
| `courses` | 2 | 0 |
| `subjects` | 2 | 0 |
| `course_subjects` | 2 | 0 |
| `students` | 2 | 0 |
| `families` legacy | 2 | 0 |
| `student_families` | 2 | 0 |
| `parent_students` | 2 | 0 |
| `teachers` legacy | 0 | 0 |
| `teacher_assignments` | 4 | 0 |

No se crearon notificaciones, comunicaciones, notas parciales o finales,
asistencia, incidencias, observaciones, documentos ni otra actividad
operativa.

### 14.3. Resultados por rol

- **Superadmin:** abre la vista global sin centro arbitrario; selecciona A y B,
  vuelve a A y regresa a global. Branding, curso activo y alumnos cambian con
  el centro. No se observó mezcla.
- **Director A/B:** cada cuenta entra directamente en su centro, sin selector.
  Cursos y alumnos quedan limitados a su tenant. Un `student_id` del otro
  centro devuelve estado no encontrado y una URL de Admin redirige al
  dashboard Director.
- **Tutor A/B:** cada cuenta ve su assignment, curso, materia, alumno y ficha
  propios. Los IDs y filtros de B no aparecen en A, ni viceversa. Una URL de
  Director redirige al dashboard Tutor.
- **Tutor multischool:** el login exige `/select-school`. A -> B -> A actualiza
  branding, curso activo y assignments sin contaminación de caché. Tras
  logout/login vuelve a una selección segura, sin elegir el primer centro.
- **Family A/B:** cada cuenta entra en su centro y solo ve su hijo. La ficha del
  otro tenant devuelve `404`. No se muestran observaciones internas.
- **Sin membership:** entra en `/no-school`, sin `AppShell`; una URL privada
  vuelve a `/no-school`.
- **Membership inactiva:** no aparece selector, no monta `AppShell`, no concede
  datos y cualquier URL privada vuelve a `/no-school`.

### 14.4. Matriz RLS autenticada

El verificador temporal de solo lectura inició sesión con cada identidad y
consultó `students`, `teacher_assignments`, `parent_students`, `courses` y
`subjects` por `school_id`.

- Director A/B: alumnos, cursos y materias del otro centro = `0`.
- Tutor A/B: alumno y assignment del otro centro = `0`.
- Tutor multischool: assignments A = `1`, B = `1`; no hay filas cruzadas.
- Family A/B: relación `parent_students` propia = `1`, ajena = `0`.
- Sin membership e inactiva: todas las tablas verificadas = `0`.
- Fallos de assertions RLS = `0`.

Los conteos totales de cursos y materias incluyen fixtures QA anteriores de
staging, pero siempre quedaron restringidos al centro autorizado.

### 14.5. Pruebas negativas

- cookie o `school_id` no autorizado: `SCHOOL_MEMBERSHIP_REQUIRED`;
- membership y centro inactivos: descartados;
- rol incorrecto: redirección al dashboard autorizado;
- `student_id` de otro tenant: sin datos y `404`/estado de acceso denegado;
- `course_id` y `subject_id` de otro tenant: no se muestran curso, materia ni
  alumno ajenos;
- `school_id` enviado a `selectActiveSchool`: se valida contra las memberships
  activas antes de escribir la cookie HTTP-only;
- cambio A -> B -> A: sin datos residuales del contexto previo;
- logout/login multischool: nueva selección explícita segura.

El caso de revocación y el de centro inactivo se cubrieron con identidades
inactivas, la matriz RLS y el verificador determinista. No se mutaron
memberships ni centros compartidos durante la regresión.

## 15. Bloqueo conservador detectado

La policy de `students` aplicada por 037 permite al Tutor leer únicamente filas
con `students.tutor_teacher_id = auth.uid()`. No incluye todavía la relación por
`teacher_assignments`.

Por ello, el tutor multischool:

- ve correctamente su assignment A y su assignment B;
- cambia correctamente de tenant;
- no ve alumnos cruzados;
- tampoco puede leer el alumno del curso cuando no es su tutor directo.

El resultado es seguro pero funcionalmente incompleto. No se amplió la policy
ni se modificó 037 durante R2. Debe resolverse en una migración posterior con
una regla explícita tenant-aware para docencia, no mediante un fallback de
aplicación.

## 16. Observabilidad y corrección

Resultados:

- respuestas HTTP `500`: `0`;
- errores PostgREST no controlados: `0`;
- loops de redirección: `0`;
- datos cruzados: `0`;
- errores de assertions RLS: `0`.

Durante la automatización aparecieron seis respuestas
`refresh_token_not_found` al rotar repetidamente sesiones en varias pestañas
del mismo navegador. No produjeron `500`, acceso indebido ni errores
PostgREST; son ruido de sesión del procedimiento de QA y no se reprodujeron
como fallo de una identidad individual.

QA School conservaba una URL de logo sintética bajo
`/brand/educacora/logo.svg`, mientras el asset actual vive en
`/brand/educore/logo.svg`. `getSchoolBranding` normaliza únicamente ese prefijo
legacy antes de renderizar. No se cambió la fila remota ni el diseño.

## 17. Estado de cierre R2

- fixtures `20_2G_QA`: intactos en staging para R3;
- manifiesto y credenciales: intactos e ignorados por Git;
- cleanup: no ejecutado;
- commit final: no creado;
- push: no realizado;
- producción, `main` y Colegio Peñafort real: intactos.

Decisión provisional: **QA FALLA**.

El aislamiento y `ActiveSchoolContext` pasan, pero el criterio del sprint exige
que el tutor multischool pueda trabajar con los alumnos de sus assignments. La
policy actual no lo permite. Antes de ejecutar el cleanup de `20.2G-R3`, se
recomienda decidir y aplicar una nueva migración tenant-aware que amplíe esa
lectura de forma explícita, repetir este caso autenticado y limpiar después por
el manifiesto cerrado.

## 18. Corrección RLS 20.2G-R2B

Fecha de ejecución: 29 de julio de 2026.

La causa del bloqueo era exclusivamente la policy SELECT
`students_tutor_can_read_assigned_students`. La versión aplicada por `037`
exigía:

```sql
students.tutor_teacher_id = auth.uid()
and public.has_school_role(students.school_id, array['tutor'])
```

Esta regla preservaba correctamente la tutoría directa, pero no contemplaba
que un docente puede impartir clase en un curso mediante
`teacher_assignments` sin ser el tutor directo del grupo.

La migración aditiva
`038_students_tutor_assignment_select.sql`, aplicada únicamente en staging,
mantiene el acceso directo y añade una segunda vía mediante un `EXISTS` sobre
`teacher_assignments`. La nueva vía exige simultáneamente:

- membership activa con rol `tutor` en `students.school_id`;
- centro activo;
- `teacher_assignments.teacher_id = auth.uid()`;
- mismo `school_id`, `course_id` y `academic_year_id` que el alumno.

No se amplió ningún permiso de escritura, no se añadió `USING (true)`, no se
consultó `profiles.role` y no se eligió una membership o assignment por orden.
La migración `037` permanece byte a byte sin cambios. Tampoco hicieron falta
funciones o índices nuevos: los índices y FKs compuestas creados por `037`
cubren el predicado y bloquean relaciones académicas cruzadas.

### 18.1. Pruebas SQL

`supabase/verification/020_2g_r2b_student_assignment_rls.sql` ejecuta todas
sus mutaciones dentro de `BEGIN/ROLLBACK`. Antes y después de aplicar `038`
pasaron:

- tutor multischool: alumno A = `1` en A y alumno B = `1` en B;
- curso sin assignment = `0`;
- tutor A y Tutor B conservan su acceso directo y obtienen `0` del otro centro;
- membership inactiva, centro inactivo, rol incompatible, identidad inactiva y
  usuario sin membership = `0`;
- `school_id` manipulado y assignment cruzado = rechazados;
- superadmin, director y family conservaron sus políticas previas.

### 18.2. Regresión autenticada

La aplicación se arrancó con `.env.staging.qa.local` y se verificó en el
puerto `3102`:

- tutor multischool A -> B -> A sin mezcla de caché;
- listado y ficha del alumno asignado en cada centro;
- ausencia del alumno del otro centro;
- URL forzada del alumno B mientras A estaba activo: acceso rechazado;
- Director A/B, Tutor A/B y Family A/B aislados;
- superadmin global y contextual correcto;
- usuario sin membership y membership inactiva detenidos en `/no-school`.

La ficha compartida dejó de aplicar un filtro duplicado por
`tutor_teacher_id`; la autorización continúa residiendo en la RLS. Las
incidencias siguen limitadas al tutor autor de acuerdo con su consulta
existente.

Resultados observados:

- respuestas HTTP `500`: `0`;
- errores PostgREST no controlados: `0`;
- loops: `0`;
- datos cruzados: `0`;
- assertions RLS fallidas: `0`.

Los avisos de caché de un calendario ICS externo superior al límite de Next.js
y la rotación intensiva de sesiones QA no alteraron datos ni permisos. Son
limitaciones operativas ajenas a esta policy.

### 18.3. Estado y siguiente paso

Staging queda alineado en `001-038` y el `db push --dry-run` queda vacío. Los
fixtures `20_2G_QA`, su manifiesto y las credenciales temporales permanecen
intactos e ignorados por Git para R3. No se ejecutó cleanup.

Los borradores operativos se reservan ahora como `039-041` para evitar
colisionar con la corrección RLS `038`.

Decisión: **QA PASA CON BLOQUEOS**.

La lectura de alumnos por assignment funciona con aislamiento completo. Antes
de producción siguen siendo obligatorios el ensayo de promoción de `037-038`
sobre una copia representativa, el plan de reversión y la resolución de la
oleada operativa `039-041`. Producción, `main` y el Colegio Peñafort real
permanecen intactos.

## 19. Cierre R3: regresión, cleanup y publicación

Fecha de ejecución: 30 de julio de 2026.

La regresión autenticada final repitió Superadmin global y contextual,
Director A/B, Tutor A/B, Tutor multischool, Family A/B, usuario sin membership
y membership inactiva. El cambio A -> B -> A conservó branding, curso,
assignments y alumnos del centro activo sin mezcla. Una URL del alumno B
forzada mientras A estaba activo fue rechazada.

Resultados:

- errores HTTP `500`: `0`;
- errores PostgREST no controlados: `0`;
- errores de consola: `0`;
- loops: `0`;
- datos cruzados: `0`.

El warning conocido del calendario ICS externo, cuyo payload supera el límite
de caché de Next.js, no produjo una respuesta `500` ni alteró datos o permisos.

El cleanup se ejecutó únicamente contra staging y por IDs exactos del
manifiesto cerrado. Se eliminaron:

| Recurso | Filas |
| --- | ---: |
| `auth.users` | 7 |
| `profiles` | 7 |
| `school_memberships` | 7 |
| `courses` | 2 |
| `subjects` | 2 |
| `course_subjects` | 2 |
| `students` | 2 |
| `families` | 2 |
| `student_families` | 2 |
| `parent_students` | 2 |
| `teacher_assignments` | 4 |

`academic_years`, `teachers`, `teacher_schedule`, notificaciones y toda la
actividad operativa eliminaron `0`, como exigía el manifiesto. Antes del
borrado se sustituyeron las siete contraseñas temporales y la eliminación Auth
revocó sus sesiones. Dos lecturas posteriores confirmaron cero residuos y el
rechazo de las siete credenciales antiguas.

Los cinco usuarios QA anteriores, sus cinco profiles, sus nueve memberships y
los dos centros QA activos permanecen intactos. Se eliminaron manifiesto,
credenciales, scripts y logs temporales. `.env.staging.qa.local` continúa
ignorado como configuración estable de staging.

Estado final del sprint:

- staging: migraciones `001-038`, dry-run vacío;
- `037`: sin cambios retroactivos;
- `038`: validada funcionalmente y mediante RLS;
- `039-041`: no ejecutadas;
- producción, `main` y Colegio Peñafort real: intactos.

Decisión: **GO CON BLOQUEOS**. ActiveSchoolContext y la lectura por assignments
están preparados para staging. La promoción a producción requiere todavía un
ensayo específico de `037-038`, backup recuperable, ventana operativa y plan
de reversión. La oleada operativa `039-041` puede continuar en diseño, no en
aplicación remota.

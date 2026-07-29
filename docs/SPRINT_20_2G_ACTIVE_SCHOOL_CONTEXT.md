# Sprint 20.2G - ActiveSchoolContext

Fecha: 28 de julio de 2026
Rama: `staging`
Supabase staging: `zhnbrpcekmxldxlqrbhr`
Estado de base al iniciar: migraciones `001-037` alineadas, dry-run vacío.

## 1. Alcance

Este sprint propaga el centro activo por la aplicación protegida sin cambiar
el esquema remoto. No aplica migraciones, no ejecuta `038-040`, no modifica
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
| `/dashboard/admin/security` | superadmin | global; en contexto oculta audit logs ambiguos hasta 038 | conservador |
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
| `/dashboard/tutor/schedule` | tutor | política conservadora previa a 038 | conservador |
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

## 10. Límites conservadores previos a 038

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
`038`, `039` ni `040`.

La migración 037 puede seguir preparándose para producción desde el punto de
vista aplicativo porque el fallback legacy y el centro operativo por defecto
han desaparecido de las rutas privadas. Aun así, su promoción exige repetir
la regresión autenticada sobre un entorno representativo y los controles de
producción definidos en el plan de backfill.

La migración 038 puede comenzar como sprint de diseño/aplicación en staging
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

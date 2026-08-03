# Sprint 20.2N1 - Colegio EducaCora como segundo tenant

Fecha: 3 de agosto de 2026

Rama: `staging`

Supabase staging: `zhnbrpcekmxldxlqrbhr`

Estado: **GO CON BLOQUEOS**

## 1. Cambio de estrategia

La transformación directa de producción legacy queda suspendida. Los
documentos M2 se conservan como evidencia histórica, pero ya no describen la
ruta activa. Staging, con las migraciones `001-041`, es el entorno canónico de
construcción y validación multitenant.

Producción legacy, `main` y sus datos no se consultaron ni modificaron durante
este sprint.

## 2. Tenant creado

- Nombre: Colegio EducaCora.
- Slug: `educacora`.
- UUID enmascarado: `fceb0798…ee9b`.
- Estado: activo.
- Tenant canónico Peñafort: `colegio-penafort`.
- Branding: assets oficiales existentes de EducaCora, verde `#2E7D5A`, navy
  `#0F172A` y dorado `#D4A64F`.

El script `scripts/bootstrap-educacora-tenant.mjs` es reproducible e
idempotente. Exige el URL exacto de staging y la opción `--apply`, bloquea otros
targets y no modifica contraseñas de cuentas existentes.

## 3. Selector y contexto activo

El selector obtiene los centros desde `school_memberships` activas y `schools`
activas del usuario autenticado. No contiene una lista hardcodeada.

El Superadmin existente conserva su membership explícita en Peñafort y recibe
una membership explícita en EducaCora. Su membership de Superadmin en `QA
School` se dejó inactiva, sin borrar el centro ni afectar las memberships de
otros usuarios QA. El conjunto canónico que alimenta su selector queda así:

1. Colegio Peñafort.
2. Colegio EducaCora.

**SELECTOR EDUCACORA VISIBLE: YES**

La selección se valida server-side, se guarda en la cookie HTTP-only
`educacora_active_school_id`, revalida el layout y redirige al dashboard del rol.
Las pruebas deterministas de `ActiveSchoolContext` cubren selección múltiple,
membership activa/inactiva, rol correcto/incorrecto, usuario sin membership,
Superadmin global/contextual y secuencia A -> B -> A.

## 4. Estructura académica independiente

La estructura sintética mínima replica la forma necesaria del centro canónico
sin copiar personas ni actividad:

- 1 año académico activo: `2026-2027 · 20_2N1`.
- 1 curso: `6º Primaria · 20_2N1`.
- 2 materias: Lengua Castellana y Matemáticas, etiquetadas `20_2N1`.
- 2 relaciones `course_subjects`.
- IDs propios y `school_id` EducaCora en todas las filas.

El esquema no ofrece actualmente columnas de etapa u orden independientes; el
nombre de curso mantiene el orden académico que utiliza la aplicación.

## 5. Usuarios y dataset sintético

Se crearon cuentas exclusivamente sintéticas para Director, Tutor y Familia.
Cada cuenta tiene profile activo, rol correcto y una única membership activa en
EducaCora. No tiene acceso a Peñafort.

Las contraseñas aleatorias solo existen en el archivo local ignorado:

`C:\Proyectos\Colegio-Penafort-Platform\.local\educacora-test-credentials.txt`

El dataset persistente `20_2N1` contiene:

- 1 alumno demo.
- 1 relación Familia-Alumno.
- 1 identidad docente sintética y 1 identidad familiar legacy compatibles.
- 2 teacher assignments.
- 4 criterios de evaluación con pesos completos.
- 2 notas parciales visibles para Familia.
- 2 cierres trimestrales sintéticos.
- 1 publicación trimestral sintética.

No contiene datos personales reales, comunicaciones, asistencia, incidencias ni
actividad histórica copiada de Peñafort.

## 6. Pruebas realizadas

### Datos y RLS

- Director, Tutor y Familia autenticados: PASS.
- Cada rol ve una única membership activa, la de EducaCora: PASS.
- Cada rol solo ve EducaCora en `schools`: PASS.
- Director ve el alumno EducaCora: PASS.
- Tutor ve el alumno asignado: PASS.
- Familia ve su relación y dos notas visibles: PASS.
- Lecturas de cursos Peñafort desde usuarios EducaCora: 0.
- Escritura de nota Tutor con `school_id` Peñafort y relaciones EducaCora:
  rechazada; filas persistidas: 0.
- Escritura de nota por Familia: rechazada; filas persistidas: 0.
- Segundo bootstrap: mismos conteos, sin duplicados.
- Huella operativa de Peñafort antes/después: idéntica.

### Aplicación en puerto 3102 contra staging

- Dashboard Director EducaCora: 200, branding correcto.
- Alumnado y Cuaderno de Dirección: 200, datos EducaCora.
- Dashboard Tutor EducaCora: 200, branding correcto.
- Mis alumnos, ficha y Cuaderno del Tutor: 200, alumno/datos EducaCora.
- Dashboard, ficha y Calificaciones de Familia: 200, branding correcto.
- Familia ve notas publicadas/visibles y no ve observaciones internas.
- Errores de consola observados: 0.
- Errores 500 observados: 0.

### Validación técnica

- `npm run lint`: PASS, sin avisos ni errores.
- `npx tsc --noEmit`: PASS.
- `npm run build`: PASS, 67 páginas generadas.
- `supabase db lint --linked --level warning`: PASS.
- Migraciones locales/remotas: `001-041` alineadas.
- `supabase db push --linked --dry-run`: vacío; base remota al día.
- `git diff --check`: PASS.

El selector del Superadmin se verificó mediante una sesión autenticada de API:
las dos opciones canónicas son Peñafort y EducaCora, y `QA School` no está en el
conjunto visible. No se cambió la contraseña del Superadmin. La interacción
visual completa de clic A -> B -> A queda cubierta por el verificador
determinista del contexto y debe repetirse como smoke test manual en el
deployment final de staging.

No existe un alumno Peñafort en staging con el que ejecutar una prueba de URL
cruzada por `student_id` real sin alterar Peñafort. Se verificó el mismo límite
con registros académicos Peñafort existentes, FKs compuestas, RLS y una
escritura cruzada negativa. No se creó un fixture en Peñafort para maquillar
esta ausencia.

## 7. Matriz de paridad

| Módulo | Ruta compartida | Componente compartido | Peñafort | EducaCora | Roles | Branding | Aislamiento | Lectura/escritura | Estado |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Selector | `/select-school` | `SelectSchoolPage` | Sí | Sí | Superadmin/multischool | Correcto | Verificado | Selección server-side | PARIDAD COMPLETA |
| Dashboard | `/dashboard/*` | Vistas de dashboard existentes | Sí | Sí | Director/Tutor/Familia | Correcto | Verificado | Según rol | PARIDAD COMPLETA |
| Mis alumnos | `/dashboard/tutor/students` y supervisión | `StudentDirectory` | Sí | Sí | Tutor/Director | Correcto | Verificado | Según rol | PARIDAD COMPLETA |
| Ficha de alumno | rutas `students/[id]` y Familia | `StudentProfile` | Sí | Sí | Director/Tutor/Familia | Correcto | Verificado | Según rol | FUNCIONAL CON LIMITACIÓN |
| Cuaderno | rutas `gradebook` | componentes `grades` | Sí | Sí | Director/Tutor | Correcto | Verificado | Tutor escribe; Director supervisa | PARIDAD COMPLETA |
| Criterios | `/dashboard/tutor/evaluation-settings` | UI existente | Sí | Sí | Tutor | Correcto | RLS verificada | No se editó en smoke test | FUNCIONAL CON LIMITACIÓN |
| Calificaciones | `/dashboard/family/grades` | componentes `grades` | Sí | Sí | Familia | Correcto | Verificado | Solo visibles/publicadas | PARIDAD COMPLETA |
| Cierres | rutas de Cuaderno/Reportes | helpers académicos | Sí | Sí | Tutor/Director | Correcto | RLS verificada | Dataset cerrado sintético | FUNCIONAL CON LIMITACIÓN |
| Publicaciones | rutas de Dirección/Familia | helpers académicos | Sí | Sí | Director/Familia | Correcto | RLS verificada | 1 publicación sintética | FUNCIONAL CON LIMITACIÓN |
| Asistencia | rutas existentes | componentes `attendance` | Sí | Sí | Tutor/Director/Familia | Correcto | Sin datos cruzados | Sin fixture operativo | BLOQUEADO DE FORMA SEGURA |
| Observaciones | ficha compartida | componentes `students` | Sí | Sí | Tutor/Director | Correcto | Sin datos cruzados | Sin fixture operativo | FUNCIONAL CON LIMITACIÓN |
| Incidencias | ficha/dashboard | componentes existentes | Sí | Sí | Tutor/Director | Correcto | Sin datos cruzados | Sin fixture operativo | FUNCIONAL CON LIMITACIÓN |
| Horario | `/dashboard/tutor/schedule` | módulo existente | Sí | Sí | Tutor | Correcto | Tenant-aware | Sin sesiones sintéticas | BLOQUEADO DE FORMA SEGURA |
| Comunicaciones | rutas `communications` | módulo compartido | Sí | Sí | Todos | Correcto | Tenant-aware | Sin conversación sintética | FUNCIONAL CON LIMITACIÓN |
| Avisos | dashboards | componentes existentes | Sí | Sí | Según rol | Correcto | Tenant-aware | Empty state | FUNCIONAL CON LIMITACIÓN |
| Calendario | rutas `calendar` | módulo existente | Sí | Sí | Según rol | Correcto | Config por centro | Sin calendario EducaCora | BLOQUEADO DE FORMA SEGURA |
| Notificaciones | dashboards | helpers existentes | Sí | Sí | Según rol | Correcto | Tenant-aware | Empty state | FUNCIONAL CON LIMITACIÓN |
| Configuración | rutas de Dirección/Admin | componentes existentes | Sí | Sí | Director/Superadmin | Correcto | Tenant-aware | Sin edición smoke | FUNCIONAL CON LIMITACIÓN |
| Corium AI | botón flotante compartido | componentes Corium | Sí | Sí | Según rol | Correcto | No usa dataset escolar en esta prueba | Visible | NO APLICA |

## 8. Archivos y seguridad

- Bootstrap versionado: `scripts/bootstrap-educacora-tenant.mjs`.
- Verificador autenticado: `scripts/verify-educacora-tenant.mjs`.
- Credenciales: solo `.local/`, ignorado por Git.
- No se añadió ninguna migración.
- No se versionan tokens, claves, contraseñas, logs ni dumps.
- Los assets oficiales existentes se reutilizan; no se crearon variantes.

## 9. Decisión y siguiente paso

Decisión: **GO CON BLOQUEOS**.

El segundo tenant existe, es accesible por sus tres roles, usa branding propio,
posee una estructura académica funcional y mantiene aislamiento demostrado. El
núcleo Director/Tutor/Familia, alumno y Cuaderno funciona. Los bloqueos son
operativos por ausencia deliberada de fixtures de asistencia, horario,
calendario y comunicaciones, no por mezcla de tenants ni por errores críticos.

Siguiente acción recomendada: ejecutar un sprint N2 acotado que añada fixtures
sintéticos mínimos para esos cuatro módulos y repita la matriz autenticada, sin
modificar producción ni relajar RLS.

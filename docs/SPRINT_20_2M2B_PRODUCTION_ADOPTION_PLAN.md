# Sprint 20.2M2B - Ruta de adopcion multitenant en produccion

Fecha: 3 de agosto de 2026

Rama de trabajo: `staging`

Produccion auditada: `higdnodnztismxmusejz`

Staging: `zhnbrpcekmxldxlqrbhr`

Estado: **diseno y verificadores; no aplicado**

## 1. Alcance y decision

Este sprint prepara una ruta de adopcion para un clon restaurado de produccion.
No ejecuta migraciones, `migration repair`, DDL, DML ni cambios de Auth en
produccion.

Decision: **GO CON BLOQUEOS para ensayar en un clon; NO-GO para produccion**.

La baseline `001-033` es determinable y los sustitutos de `035/036` evitan los
fixtures de staging. Antes del ensayo siguen siendo obligatorios:

1. disponer de un clon restaurado que incluya Auth;
2. demostrar que el restore reproduce los conteos y la huella estructural;
3. autorizar expresamente los `migration repair` solo en el clon;
4. validar los dos borradores mediante transacciones y pausas;
5. completar la regresion autenticada antes de considerar produccion.

## 2. Evidencia actual

La consulta read-only de produccion confirma:

- historial remoto de migraciones vacio;
- 27 tablas publicas, todas con RLS;
- `schools` y `school_memberships` ausentes;
- cero columnas `school_id`;
- cuatro usuarios Auth y cuatro profiles, sin discrepancias;
- un ano activo, 12 cursos, 18 materias y 102 relaciones curso-materia;
- un alumno, una relacion Familia-Alumno y nueve assignments del Tutor;
- 14 criterios, 17 notas parciales y dos notas trimestrales;
- cero raices invalidas, duplicados relevantes o ambiguedades.

La huella completa versionada en `DATABASE_BASELINE.md` sigue siendo:

| Objeto | Total |
| --- | ---: |
| Tablas publicas | 27 |
| Columnas | 237 |
| Constraints | 145 |
| Indices | 90 |
| Funciones publicas | 8 |
| Triggers publicos no internos | 22 |
| Policies | 100 |
| Tablas publicas con RLS desactivada | 0 |

## 3. Clasificacion de 001-033

`APPLIED_EQUIVALENT` significa que el efecto estructural final esta presente en
la baseline de produccion. No demuestra que el archivo historico se ejecutara.

| Version | Estado principal | Evidencia resumida | Accion en clon |
| --- | --- | --- | --- |
| 001 | APPLIED_EQUIVALENT | `app_role`, profiles, funciones, policies y hook Auth | marcar aplicada tras baseline check |
| 002 | APPLIED_EQUIVALENT | policy Tutor sobre students presente | marcar aplicada |
| 003 | APPLIED_EQUIVALENT | student_incidents, indices y RLS presentes | marcar aplicada |
| 004 | APPLIED_EQUIVALENT | notifications con columnas, checks, indices y RLS finales | marcar aplicada |
| 005 | APPLIED_EQUIVALENT | student_attendance y policies presentes | marcar aplicada |
| 006 | APPLIED_EQUIVALENT | policy familiar de parent_students presente | marcar aplicada |
| 007 | APPLIED_EQUIVALENT | policy Director sobre students presente | marcar aplicada |
| 008 | APPLIED_EQUIVALENT | superadmin, helpers y policies presentes | marcar aplicada |
| 009 | APPLIED_EQUIVALENT | student_observations y RLS presentes | marcar aplicada |
| 010 | APPLIED_EQUIVALENT | subjects, partial_grades y RLS presentes | marcar aplicada |
| 011 | PARTIAL | DDL/RLS presentes; mezcla seeds de subjects y assignments | no ejecutar; baseline absorbe DDL |
| 012 | SUPERSEDED | unique original sustituida por la variante con academic year | marcar aplicada, no recrear indice antiguo |
| 013 | APPLIED_EQUIVALENT | criteria y quarter grades presentes | marcar aplicada |
| 014 | APPLIED_EQUIVALENT | policy delete de criteria presente | marcar aplicada |
| 015 | APPLIED_EQUIVALENT | term grades, trigger y RLS presentes | marcar aplicada |
| 016 | APPLIED_EQUIVALENT | publicaciones, trigger y RLS presentes | marcar aplicada |
| 017 | APPLIED_EQUIVALENT | policy Director insert notifications presente | marcar aplicada |
| 018 | APPLIED_EQUIVALENT | policy Familia insert notifications presente | marcar aplicada |
| 019 | APPLIED_EQUIVALENT | policy de justificacion familiar presente | marcar aplicada |
| 020 | APPLIED_EQUIVALENT | visibilidad publicada de term grades presente | marcar aplicada |
| 021 | APPLIED_EQUIVALENT | policy Director sobre courses presente | marcar aplicada |
| 022 | APPLIED_EQUIVALENT | cierres finales, funciones, triggers y RLS presentes | marcar aplicada |
| 023 | PARTIAL | DDL final presente; contiene seed, backfills y reemplazo de uniques | no ejecutar; baseline absorbe estado final |
| 024 | APPLIED_EQUIVALENT | profiles.active, indice y helper presentes | marcar aplicada |
| 025 | DATA_ONLY | seed 2026-2027 y actualizaciones de cursos | nunca ejecutar sobre el restore |
| 026 | PARTIAL | course_subjects/RLS presentes; contiene curriculum seed | no ejecutar; baseline absorbe DDL |
| 027 | APPLIED_EQUIVALENT | internal_notifications, indices y RLS presentes | marcar aplicada |
| 028 | APPLIED_EQUIVALENT | must_change_password e indice presentes | marcar aplicada |
| 029 | APPLIED_EQUIVALENT | audit_logs, indices y RLS presentes | marcar aplicada |
| 030 | APPLIED_EQUIVALENT | estado e indice de conversaciones presentes | marcar aplicada |
| 031 | PARTIAL | teacher_schedule/RLS presentes; contiene horario seed | no ejecutar; baseline absorbe DDL |
| 032 | STAGING_ONLY | assignments y materias de `tutor.prueba` | nunca ejecutar |
| 033 | APPLIED_EQUIVALENT | attendance_records, trigger, indices y RLS presentes | marcar aplicada |

### 3.1 Puede marcarse como aplicada en el clon

Las versiones `001-033` pueden reconciliarse historicamente **como conjunto**
solo si `020_2m2b_baseline_check.sql` devuelve todos los valores esperados en
el clon restaurado. Esto incluye las migraciones mixtas y data-only porque el
restore ya conserva los datos correctos y ejecutarlas seria mas peligroso que
registrar su estado historico.

No se autoriza `migration repair` en produccion durante este plan.

### 3.2 No debe ejecutarse

No deben ejecutarse sobre el restore:

- `011`, `023`, `026` y `031`, porque mezclan estructura ya presente con DML;
- `025`, porque reintroduce un seed academico;
- `032`, porque es un fixture de `tutor.prueba`;
- los originales `035` y `036`, porque dependen de staging y fixtures QA.

### 3.3 Migraciones ausentes

No se detectan efectos estructurales ausentes dentro de `001-033`. La baseline
versionada contiene tambien las ocho tablas heredadas que nunca tuvieron
`CREATE TABLE` en ese historial.

## 4. Diagnostico del original 035

`035_penafort_tenant_and_memberships.sql` no es apta para produccion porque:

- exige que exista `QA School` con un UUID fijo;
- busca cuatro correos `example.test` de staging;
- crea memberships para identidades QA, no para las cuatro cuentas retenidas;
- depende de un usuario QA sin membership y de una membership QA inactiva;
- fija UUID de memberships propios del ensayo;
- exige exactamente cuatro memberships QA de Peñafort;
- contiene valores de instancia de staging en sus postcondiciones.

No contiene borrados, pero sus guardas fallarian en produccion. Eliminar esas
guardas sin sustituir la resolucion de identidades podria asignar memberships
incorrectas.

`035_production_school_adoption.sql` sustituye ese comportamiento con:

- UUID estable de Colegio Peñafort;
- una unica cuenta activa por cada rol esperado;
- resolucion por profile/rol ya auditado, sin correos ni UUID de usuario;
- cuatro memberships activas exactas;
- cero usuarios, passwords, fixtures o borrados.

## 5. Diagnostico del original 036

`036_add_school_id_to_configuration.sql` no es apta para produccion porque:

- exige exactamente dos tenants QA y rechaza cualquier otro;
- exige que configuration este completamente vacia;
- agrega `school_id` y lo convierte inmediatamente en `NOT NULL` sin backfill;
- inserta dos anos, dos cursos, tres materias y tres relaciones QA;
- usa UUID y nombres de fixtures fijos;
- valida conteos de fixtures incompatibles con 1/12/18/102 de produccion;
- reemplaza unicidad global bajo el supuesto de tablas vacias;
- contiene un fallback de Peñafort disenado para el ensayo de staging.

`036_production_tenant_backfill.sql` conserva el DDL compatible, pero:

- exige la huella exacta restaurada;
- asigna configuration al UUID estable de Peñafort;
- valida raices y duplicados antes de retirar unicidad global;
- crea primero los uniques tenant-aware y despues retira los globales;
- no inserta ninguna fila academica;
- valida la preparacion del alumno, Familia y Tutor para `037`.

### 5.1 Limite intencional entre 036-PROD y 037

El backfill de personas no puede ejecutarse antes de `037`: esas columnas se
crean en `037`, y crearlas en `036-PROD` haria que la guarda inicial de `037`
abortase. Por tanto:

- `036-PROD` hace el backfill real de configuration;
- `036-PROD` verifica de forma determinista el futuro backfill de personas;
- `037` crea las seis columnas de personas, rellena alumno, relaciones y
  assignments, y agrega FKs compuestas y RLS;
- el postflight M2B valida el resultado conjunto.

No se selecciona nunca la primera membership ni el primer centro.

## 6. Orden exacto del ensayo en clon

1. Restaurar la produccion limpia en un proyecto aislado, incluyendo Auth.
2. Ejecutar `020_2m2b_baseline_check.sql` y
   `020_2m2b_production_adoption_preflight.sql`.
3. Reconciliar `001-033` como aplicadas **solo en el clon**.
4. Aplicar `034_multitenant_foundation.sql`.
5. Aplicar `035_production_school_adoption.sql` y, tras validar, registrar la
   version `035` como aplicada solo en el clon para impedir que se ejecute el
   original de staging.
6. Aplicar `036_production_tenant_backfill.sql` y, tras validar, registrar la
   version `036` como aplicada solo en el clon.
7. Aplicar `037_add_school_id_to_people.sql`.
8. Aplicar `038_students_tutor_assignment_select.sql`.
9. Aplicar `039_academic_operations_school_scope.sql`.
10. Aplicar `040_academic_operations_rls.sql`.
11. Aplicar `041_remove_legacy_academic_uniques.sql`.
12. Ejecutar `020_2m2b_production_adoption_postflight.sql`, los verificadores
    `020_2e`, `020_2f`, `020_2j`, `020_2k` y `020_2l2`, y la regresion de app.
13. Si falla cualquier puerta, detener y restaurar el snapshot del clon.

Los registros de versiones `035/036` son parte del ensayo porque, de otro
modo, `db push` intentaria ejecutar los archivos originales. No se ejecutan en
este sprint ni se autorizan en produccion.

## 7. Pausas obligatorias

| Pausa | Momento | Evidencia necesaria |
| --- | --- | --- |
| P0 | tras restore | Auth=4, profiles=4, huella 27/145/90/100 y restore reproducible |
| P1 | antes de repair 001-033 | baseline check completamente verde |
| P2 | tras repair 001-033 | historial 001-033 y dry-run propone solo 034 |
| P3 | tras 034 | dos tablas nuevas; cuentas y datos sin cambios |
| P4 | tras 035-PROD | un centro, cuatro memberships, un rol por cuenta |
| P5 | tras 036-PROD | configuration 1/12/18/102, sin null ni cruces |
| P6 | tras 037 | alumno, relacion y nueve assignments preservados |
| P7 | tras 038 | lectura Tutor por assignment, sin acceso cruzado |
| P8 | tras 039 | criterios/notas 14/17/2 y valores sin cambios |
| P9 | tras 040 | matriz RLS autenticada completa |
| P10 | tras 041 | uniques legacy ausentes y escrituras tenant-aware validas |
| P11 | cierre | postflight, login por rol, app y restore final verificados |

## 8. Criterios de parada

El ensayo se detiene inmediatamente si:

- cambia el total de cuatro cuentas o cuatro profiles;
- se pierde la unica relacion Familia-Alumno;
- Tutor deja de tener nueve assignments o pierde el alumno tutorizado;
- aparece un `school_id` nulo en una tabla migrada;
- aparece cualquier relacion entre tenants distintos;
- falla el login de un rol retenido;
- cambia una nota, observacion o regla de visibilidad;
- aparece un error RLS, PostgREST o de contexto activo;
- un original de staging aparece como pendiente de ejecucion;
- el historial no coincide con el paso completado;
- el restore deja de ser reproducible.

## 9. Rollback

Cada archivo de sustitucion usa una transaccion. Un fallo previo al `COMMIT`
revierte ese paso de forma automatica.

Despues de un `COMMIT`, el unico rollback aprobado es restaurar el snapshot del
clon tomado antes del paso. No se autoriza una down migration improvisada,
borrado de usuarios ni reconstruccion manual de los uniques globales.

Antes de cualquier futura ventana real debe existir un mecanismo de backup y
restore que cubra public, Auth y los metadatos necesarios para recuperar los
cuatro accesos.

## 10. Verificadores

- `020_2m2b_baseline_check.sql`: huella `001-033` previa a 034.
- `020_2m2b_production_adoption_preflight.sql`: identidades, conteos,
  relaciones, duplicados y bloqueos previos.
- `020_2m2b_production_adoption_postflight.sql`: preservacion de conteos,
  ownership, anticruce, RLS y retirada de uniques legacy.

Los tres contienen unicamente `SELECT` y agregados. No devuelven UUID de
usuario, correos, nombres, notas ni observaciones.

El postflight espera 19 columnas publicas llamadas `school_id`: una en
`school_memberships`, cuatro de configuration, seis de personas y ocho
academicas. Una expectativa antigua de 26 en el preflight M1 era prospectiva;
el inventario ejecutable actual de staging confirma 19.

## 11. Archivos de diseno

- `supabase/plans/20_2/035_production_school_adoption.sql`
- `supabase/plans/20_2/036_production_tenant_backfill.sql`

Ambos tienen cabecera `DO NOT APPLY / DESIGN ONLY / PRODUCTION ADOPTION / NOT A
MIGRATION`, viven fuera de `supabase/migrations` y no son detectados por
`db push`.

## 12. Siguiente paso

Crear un clon restaurado nuevo, demostrar P0 y ejecutar el ensayo bajo una
autorizacion separada. Hasta entonces:

- produccion permanece en el esquema legacy;
- `staging` permanece alineado en `001-041`;
- ninguna version se repara en produccion;
- no se promueve nada a `main`.

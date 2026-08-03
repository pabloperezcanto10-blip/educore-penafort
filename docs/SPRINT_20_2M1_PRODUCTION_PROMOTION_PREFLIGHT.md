# Sprint 20.2M1 - Preflight read-only de produccion

Fecha del diagnostico: 3 de agosto de 2026
Rama: `staging`
HEAD inicial: `ffb415ff6e044550859f6ef25afb82bfb7d3b36c`
Staging: `zhnbrpcekmxldxlqrbhr`
Produccion: `higdnodnztismxmusejz`
Modo de produccion: **SELECT ONLY**

## 1. Decision ejecutiva

**NO-GO para promover 034-041 a produccion.**

Los datos legacy observados son pequenos y coherentes: todos los contadores de
orfandad, duplicidad y contexto academico irresoluble ejecutados en este sprint
son cero. Sin embargo, la promocion no es segura por cuatro bloqueos previos:

1. El historial remoto de migraciones de produccion esta vacio. No permite
   demostrar que `001-033` corresponden al esquema real ni usar `db push` de
   forma auditable.
2. `035_penafort_tenant_and_memberships.sql` es una migracion de staging. Exige
   identidades QA y solo crea cuatro memberships QA; no representa los 55
   perfiles reales de produccion.
3. `036_add_school_id_to_configuration.sql` es una migracion de staging. Rechaza
   expresamente tablas de configuracion no vacias, mientras produccion contiene
   1 curso academico, 12 cursos, 18 materias y 102 relaciones curso-materia.
4. No se ha verificado todavia un backup restaurable de produccion en un
   proyecto aislado.

No se ha ejecutado `migration repair`, `db push`, DDL, DML ni cambio de Auth.

## 2. Identificacion del entorno

La consulta se realizo mediante un contexto CLI temporal y aislado del
repositorio. Ese contexto se enlazo exclusivamente a
`higdnodnztismxmusejz`. El repositorio permanecio enlazado a staging
`zhnbrpcekmxldxlqrbhr`.

Identidad observada mediante SELECT:

| Propiedad | Resultado |
| --- | --- |
| Base de datos | `postgres` |
| Rol de consulta | `postgres` |
| Version de servidor | PostgreSQL 17.6 (`170006`) |
| Proyecto Supabase | `colegio-penafort` |
| Region | `eu-north-1` |
| Salud | `ACTIVE_HEALTHY` |

No se imprimieron credenciales, contrasenas, tokens ni valores personales.

## 3. Baseline local y staging

| Puerta | Resultado |
| --- | --- |
| Rama | `staging` |
| HEAD inicial | `ffb415f` |
| Worktree inicial | limpio |
| Migraciones locales | `001-041` |
| Migraciones remotas de staging | `001-041` |
| `db push --linked --dry-run` en staging | vacio |
| `main` | no modificado |

## 4. Estado real de produccion

### 4.1 Historial de migraciones

`supabase migration list` contra el contexto aislado de produccion no devuelve
ninguna version remota. Por tanto:

- no puede afirmarse desde el historial que `001-033` esten aplicadas;
- tampoco consta `034-041` como aplicada;
- el esquema visible demuestra que el producto legacy existe, pero no su
  procedencia migratoria;
- no se debe ejecutar `migration repair` hasta comparar de forma reproducible
  el esquema de produccion con la baseline `001-033` y aprobar el resultado.

### 4.2 Catalogo

| Objeto | Total |
| --- | ---: |
| Tablas publicas | 27 |
| Tablas publicas con RLS | 27 |
| Constraints | 145 |
| Indices | 90 |
| Policies | 100 |
| Funciones publicas | 8 |
| Triggers no internos | 22 |
| Grants de tabla para `anon`, `authenticated` y `service_role` | 567 |

La funcion legacy `active_academic_year_id()` existe sin parametros. No existe
su variante tenant-aware `active_academic_year_id(p_school_id uuid)`.

### 4.3 Evidencia de que 034-041 no estan estructuralmente aplicadas

- `public.schools`: ausente.
- `public.school_memberships`: ausente.
- columnas `school_id` en tablas publicas: 0.
- helpers tenant-aware de `036-040`: ausentes.
- indices, FKs compuestas, triggers de contexto y policies tenant-aware:
  ausentes.
- uniques legacy de configuracion y operativa: presentes.

El estado estructural es anterior a `034`. Las versiones `034-041` deben
considerarse pendientes **solo como objetivo funcional**; no pueden incorporarse
al historial hasta resolver la baseline remota.

## 5. Inventario agregado de datos

No se extrajeron nombres, emails, UUID, notas ni observaciones.

### 5.1 Identidad y personas

| Entidad | Total |
| --- | ---: |
| Auth users | 55 |
| Profiles | 55 |
| Profiles activos | 55 |
| Director | 1 |
| Tutor | 2 |
| Family | 51 |
| Superadmin | 1 |
| Students | 51 |
| Parent-student relations | 51 |
| Legacy families | 0 |
| Legacy student-family relations | 0 |
| Legacy teachers | 0 |
| Teacher assignments | 10 |

### 5.2 Configuracion academica

| Entidad | Total |
| --- | ---: |
| Academic years | 1 |
| Active academic years | 1 |
| Courses | 12 |
| Subjects | 18 |
| Course-subject relations | 102 |

### 5.3 Ocho tablas academicas de 039

| Tabla | Filas |
| --- | ---: |
| `partial_grades` | 17 |
| `evaluation_criteria` | 14 |
| `quarter_final_grades` | 0 |
| `term_subject_grades` | 2 |
| `evaluation_publications` | 0 |
| `annual_evaluation_weights` | 0 |
| `final_course_grades` | 0 |
| `final_evaluation_publications` | 0 |

Total operativo a recibir `school_id` en 039: **33 filas**.

## 6. Anomalias y puertas de datos

El verificador
`supabase/verification/020_2m1_production_preflight.sql` contiene un unico
`SELECT` y devolvio los siguientes resultados:

| Grupo | Puertas comprobadas | Resultado |
| --- | --- | --- |
| Auth | user sin profile; profile sin Auth user | 0 / 0 |
| Curso academico | anos activos | exactamente 1 |
| Configuracion | raices nulas, huerfanas o ano contradictorio | 0 |
| Configuracion | duplicados course-subject | 0 |
| Students | sin curso, huerfanos, curso/ano contradictorio | 0 |
| Tutor de student | profile ausente, inactivo o rol incorrecto | 0 |
| Parent-student | raices nulas, huerfanas, rol incorrecto | 0 |
| Parent-student | relaciones duplicadas | 0 |
| Teacher assignments | raices nulas/huerfanas/rol incorrecto | 0 |
| Teacher assignments | ano contradictorio o course-subject ausente | 0 |
| Teacher assignments | duplicados | 0 |
| 8 tablas academicas | contexto irresoluble | 0 en todas |
| 8 tablas academicas | conflictos de unique futura | 0 en todas |
| Publicaciones | metadata publicada incompleta | 0 |

### 6.1 Filas irresolubles y ambiguedad

No se detectaron filas legacy irresolubles con las relaciones disponibles.
Tampoco hay filas en las tablas legacy `families`, `student_families` o
`teachers`, que son los casos de mayor ambiguedad de `037`.

La resolucion tenant todavia no puede validarse mediante memberships porque la
tabla no existe. El modelo monotenant observable permite proponer una
membership Peñafort por cada uno de los 55 perfiles conservando su rol, pero esa
creacion necesita una migracion de produccion especifica, verificacion previa y
aprobacion. No debe inferirse mediante el `035` de staging.

## 7. Matriz 034-041

Los tiempos son estimaciones para la base actual y no incluyen backup ni
regresion. Deben confirmarse en una restauracion aislada de produccion.

| Migracion | Precondicion actual | Filas estimadas | Riesgo / bloqueo | Tiempo | Preflight / postflight | Rollback |
| --- | --- | ---: | --- | --- | --- | --- |
| 034 | Catalogo legacy compatible, pero historial incierto | 0 | Alto: no aplicar sin baseline 001-033 verificada | 1-2 min | catalogo M1 / `020_2a_staging_foundation_diagnostics.sql` | Preferir restore; si sigue vacia, desactivar capa nueva y conservar tablas |
| 035 | **No cumple**: faltan QA School e identidades QA | 55 memberships reales previstas | Critico: el archivo es exclusivo de staging | 1-3 min para sustituta | `020_2m1...` / variante de `020_2b_wave1_checks.sql` | Desactivar tenant/memberships; no borrar profiles |
| 036 | **No cumple**: configuracion no vacia | 133 filas | Critico: el archivo rechaza datos reales y no hace backfill | 2-5 min para sustituta | M1 + preflight prod / `020_2c_configuration_checks.sql` | Conservar columnas; restaurar codigo/policies o backup |
| 037 | Datos legacy limpios; depende de 035-036 correctas | 112 relaciones/personas | Alto: memberships aun inexistentes | 2-5 min | `020_2e_people_preflight.sql` / `020_2e_people_postflight.sql` y `020_2f_people_checks.sql` | El rollback destructivo de staging no sirve con datos; conservar columnas y restaurar acceso, o restore |
| 038 | Depende de 037 y assignments tenant-aware | 0 | Medio: cambio RLS de lectura | <1 min | matriz de tutor / `020_2g_r2b_student_assignment_rls.sql` | Restaurar policy previa |
| 039 | Contextos legacy limpios; depende de 036-038 | 33 | Alto: locks, backfill, FKs y triggers | 2-5 min | `020_2h_operational_academic_preflight.sql` / `020_2i_039a_*` | Conservar `school_id`; rollback operativo o restore |
| 040 | Depende de 039 y app tenant-aware | 0 | Critico: reemplaza autorizacion de 8 tablas | 1-3 min | `020_2j_039b_preflight.sql` / `020_2j_039b_postflight.sql` y matriz RLS | Adaptar y ensayar `040_039b_rollback_staging.sql` sobre clon |
| 041 | Datos sin colisiones; depende de app `ON CONFLICT` tenant-aware | 0 | Alto: retira siete uniques legacy | 1-2 min | `020_2l1_legacy_unique_consumers.sql` / `020_2l2_041_postflight.sql` | `041_rollback_staging.sql`, solo tras preflight de duplicados |

## 8. Backup y prueba de restauracion

No se ha ejecutado ningun backup en este sprint.

### 8.1 Mecanismo principal

1. Confirmar el plan de Supabase y la disponibilidad en **Database > Backups**.
2. Capturar el identificador y la hora del ultimo backup anterior a la ventana.
3. Si el plan lo permite, activar o confirmar PITR con una retencion aprobada.
4. Restaurar ese backup en **un proyecto nuevo**, nunca encima de produccion,
   para ensayar `034-041` y demostrar recuperabilidad.
5. Validar en el clon: esquema, 55 usuarios Auth, 55 profiles, 51 alumnos,
   relaciones, login por rol y checksums/conteos de operativa.

La restauracion nativa a un proyecto nuevo es la opcion preferida porque incluye
esquema, datos, Auth, roles y claves de cifrado. Sigue requiriendo reconfigurar
manualmente Auth settings, API keys, Realtime, Edge Functions y otros ajustes.
Storage objects no se copian con el backup de base de datos y deben respaldarse
por separado.

Documentacion oficial:

- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/reference/cli/supabase-inspect-db-role-configs
- https://supabase.com/docs/guides/storage/management/download-objects

### 8.2 Copia logica complementaria

Antes de la promocion se conservaran en almacenamiento cifrado y fuera del
repositorio:

- dump de roles;
- dump de esquema `public`;
- dump de datos `public`;
- snapshot de `auth` mediante el mecanismo oficial/restauracion nativa;
- catalogo de constraints, indices, policies, funciones, triggers y grants;
- lista de migraciones local y remota;
- exportacion separada de objetos de Storage si existen.

La CLI excluye por defecto esquemas gestionados como `auth` y `storage`; por eso
un `db dump` normal no sustituye al backup nativo para recuperar Auth.

### 8.3 Evidencia obligatoria

| Campo | Requisito |
| --- | --- |
| Responsable | una persona designada antes de la ventana |
| Fecha/hora | UTC y Europe/Madrid |
| Ubicacion | almacenamiento cifrado con acceso restringido |
| Retencion | minimo 30 dias o politica superior del centro |
| Restore test | clon aislado, nunca produccion |
| Criterio de exito | conteos, Auth y regresion Peñafort equivalentes |

Si el plan actual no permite backup nativo o restauracion a un proyecto nuevo,
la promocion permanece bloqueada hasta contratar la capacidad o validar una
restauracion logica completa equivalente.

## 9. Plan de promocion escalonada

### 9.1 Preparacion fuera de ventana

1. Ejecutar Sprint 20.2M2 y resolver el historial remoto.
2. Crear variantes de produccion seguras para 035 y 036 sin modificar las
   migraciones ya aplicadas en staging.
3. Ensayar la secuencia completa en un clon restaurado de produccion.
4. Repetir el preflight M1 y obtener todos los contadores en cero.
5. Aprobar backup, rollback, responsables y comunicaciones.

### 9.2 Ventana propuesta

Reservar **dos horas** fuera del horario lectivo, con escritura funcional
detenida. El volumen actual sugiere menos tiempo de SQL, pero la ventana debe
absorber verificacion, regresion y un posible restore.

### 9.3 Secuencia

1. Activar mantenimiento y detener escrituras.
2. Crear backup/restoration point y registrar la hora exacta.
3. Verificar el backup en el clon ya preparado.
4. Ejecutar preflight M1 fresco.
5. Aplicar 034 y la sustituta segura de 035. **Pausa**.
6. Verificar un tenant Peñafort y 55 memberships correctas.
7. Aplicar la sustituta segura de 036. **Pausa**.
8. Verificar 133 filas de configuracion, FKs compuestas y RLS.
9. Aplicar 037 y 038. **Pausa**.
10. Ejecutar checks de personas y lectura de tutor.
11. Aplicar 039. **Pausa**.
12. Verificar 33 filas, hashes funcionales, constraints y triggers.
13. Aplicar 040. **Pausa critica**.
14. Ejecutar la matriz RLS autenticada completa.
15. Ejecutar regresion Peñafort.
16. Aplicar 041 solo con aprobacion separada y consumidores legacy en cero.
17. Repetir postflight, errores de aplicacion y conteos.
18. Reabrir escrituras y retirar mantenimiento.

No deben aplicarse `035` y `036` actuales. `041` debe poder diferirse a otra
ventana sin impedir la operacion tenant-aware.

## 10. Regresion Peñafort

| Area | Comprobacion minima |
| --- | --- |
| Director | login, centro activo, dashboard y supervision |
| Tutor | login, alumnos asignados, materias y horario |
| Familia | login, hijo vinculado y solo datos publicados |
| Curso academico | unico activo para Peñafort |
| Alumnado | 51 alumnos accesibles segun rol |
| Cuaderno | criterios, notas parciales y cierres existentes |
| Publicaciones | visibilidad familiar sin ampliacion accidental |
| Selector de centro | una membership entra; multischool muestra selector |
| Sin membership | acceso protegido y ruta `/no-school` |
| Rutas privadas | rechazo a tenant ajeno e inactivo |
| API | cero errores 500 y cero errores PostgREST inesperados |
| Integridad | conteos y hashes funcionales anteriores/posteriores iguales |

No se ejecutara esta regresion contra usuarios reales si exige cambiar sus
credenciales. El ensayo previo usara el clon y cuentas QA autorizadas.

## 11. Rollback y criterios de parada

### 11.1 Estrategia

El rollback principal no elimina columnas ni datos:

1. detener la promocion en la pausa inmediata;
2. mantener el modo mantenimiento;
3. restaurar policies/codigo anterior cuando la estructura siga siendo valida;
4. conservar `school_id` y datos ya derivados para diagnostico;
5. usar el restore nativo si existe corrupcion, perdida de acceso, divergencia
   funcional o si no puede probarse la equivalencia.

Los scripts con sufijo `_staging.sql` no se ejecutaran en produccion sin
adaptacion y ensayo sobre el clon restaurado.

### 11.2 Activacion inmediata del rollback

- cualquier contador preflight distinto del valor esperado;
- membership ausente, duplicada o con rol incorrecto;
- cruce entre tenant o lectura cross-tenant;
- variacion de conteos o hashes funcionales;
- perdida de login Director, Tutor o Familia;
- ampliacion de visibilidad familiar;
- error 500/PostgREST recurrente;
- lock fuera del tiempo previsto;
- fallo de postflight de una migracion;
- backup no disponible o restore no demostrado.

## 12. Cambios de este sprint

- `supabase/verification/020_2m1_production_preflight.sql`: verificador agregado,
  un unico `SELECT`, sin PII.
- `docs/SPRINT_20_2M1_PRODUCTION_PROMOTION_PREFLIGHT.md`: este informe.

No se crearon ni modificaron migraciones.

## 13. Recomendacion para Sprint 20.2M2

Ejecutar un sprint separado de **baseline y ensayo de recuperacion**, sin tocar
todavia produccion:

1. generar una huella estructural reproducible de produccion `001-033`;
2. comparar esa huella con un reset local hasta `033`;
3. proponer, pero no ejecutar sin aprobacion, la reconciliacion del historial;
4. disenar migraciones inmutables de transicion para reemplazar los efectos de
   los `035/036` de staging en produccion;
5. obtener un backup nativo y restaurarlo a un proyecto aislado;
6. ensayar alli toda la secuencia y los rollbacks;
7. volver a emitir GO/NO-GO con evidencia de restore.

Hasta completar esos puntos, produccion, `main` y Colegio Peñafort deben
permanecer intactos.

# Sprint 20.2M2A-V - Auditoria read-only tras limpieza manual

Fecha: 3 de agosto de 2026

Entorno auditado: produccion `higdnodnztismxmusejz`

Modo: **SELECT ONLY**

Rama documental: `staging`

HEAD inicial: `93e8f25c747e382f5d997742e98ea1c36d515a56`

## 1. Resultado ejecutivo

La limpieza manual dejo produccion con las cuatro identidades objetivo y sin
cuentas adicionales. Los cuatro perfiles son activos, coinciden con sus roles,
estan confirmados en Auth y no estan eliminados ni bloqueados.

El grafo minimo Familia-Alumno-Tutor sigue operativo:

- Familia conserva una relacion con un unico alumno activo.
- El alumno pertenece a un curso y al unico ano academico activo.
- El alumno esta tutorizado por el Tutor objetivo.
- Tutor conserva nueve asignaciones; dos corresponden al curso del alumno.
- El curso del alumno conserva ocho relaciones con materias.

No se detectaron huerfanos. Persisten datos academicos y operativos ligados al
alumno y Tutor conservados. Son fixtures coherentes, no bloquean el futuro
backfill tenant-aware y se clasifican como **RESIDUO INOFENSIVO**.

Recomendacion: **A. Continuar con la reconciliacion de baseline y las
sustitutas seguras de produccion**, manteniendo la puerta de backup/restore
definida en M1 antes de cualquier promocion o escritura estructural.

## 2. Metodo y aislamiento

Las consultas se ejecutaron mediante un contexto CLI temporal separado del
repositorio. El contexto temporal apunto exclusivamente a produccion; el
repositorio continuo enlazado a staging `zhnbrpcekmxldxlqrbhr`.

Solo se ejecutaron consultas `SELECT`, lectura del historial de migraciones y
lectura de catalogo. No se ejecutaron DML, DDL, `db push`, `migration repair`,
cambios de Auth ni operaciones de Storage.

No se mostraron ni almacenaron contrasenas, tokens, UUID, nombres de alumnos,
calificaciones u observaciones.

## 3. Identidades conservadas

| Rol | Auth | Profile | Rol | Estado | Relaciones funcionales |
| --- | --- | --- | --- | --- | --- |
| Superadmin | 1 | 1 | correcto | activo, confirmado y no bloqueado | acceso administrativo estructuralmente disponible |
| Director | 1 | 1 | correcto | activo, confirmado y no bloqueado | supervision estructuralmente disponible |
| Tutor | 1 | 1 | correcto | activo, confirmado y no bloqueado | 9 assignments y 1 alumno tutorizado |
| Familia | 1 | 1 | correcto | activo, confirmado y no bloqueado | 1 relacion con 1 alumno |

Resumen:

| Comprobacion | Total |
| --- | ---: |
| Auth users | 4 |
| Profiles | 4 |
| Auth users adicionales | 0 |
| Profiles adicionales | 0 |
| Auth users sin profile | 0 |
| Profiles sin Auth user | 0 |
| Cuentas eliminadas, no confirmadas o bloqueadas | 0 |

No se realizo login con contrasena. El estado operativo se determino mediante
flags de Auth, profile activo, rol y relaciones; probar credenciales no era
necesario ni compatible con el alcance read-only sin manejar contrasenas.

Las tablas `teachers` y `families` estan vacias porque son legado. El modelo
operativo vigente utiliza Auth/profile + `teacher_assignments` para Tutor y
Auth/profile + `parent_students` para Familia.

## 4. Inventario restante

### 4.1 Configuracion

| Tabla | Filas | Clasificacion |
| --- | ---: | --- |
| `academic_years` | 1 | MINIMO FUNCIONAL |
| `courses` | 12 | RESIDUO INOFENSIVO / catalogo valido |
| `subjects` | 18 | RESIDUO INOFENSIVO / catalogo valido |
| `course_subjects` | 102 | RESIDUO INOFENSIVO / catalogo valido |

Existe exactamente un ano academico activo. El curso del alumno pertenece a ese
ano y conserva ocho materias relacionadas.

### 4.2 Personas y relaciones

| Tabla | Filas | Clasificacion |
| --- | ---: | --- |
| `profiles` | 4 | MINIMO FUNCIONAL |
| `students` | 1 | MINIMO FUNCIONAL |
| `parent_students` | 1 | MINIMO FUNCIONAL |
| `teacher_assignments` | 9 | MINIMO FUNCIONAL + RESIDUO INOFENSIVO |
| `families` legacy | 0 | LIMPIO |
| `student_families` legacy | 0 | LIMPIO |
| `teachers` legacy | 0 | LIMPIO |

El alumno esta activo, tiene curso y ano validos, pertenece a Familia y tiene
Tutor. Dos assignments del Tutor coinciden con su curso y ano academico.

### 4.3 Datos academicos

| Tabla | Filas | Propiedad verificada | Clasificacion |
| --- | ---: | --- | --- |
| `evaluation_criteria` | 14 | Tutor conservado | RESIDUO INOFENSIVO |
| `partial_grades` | 17 | alumno conservado | RESIDUO INOFENSIVO |
| `term_subject_grades` | 2 | alumno conservado | RESIDUO INOFENSIVO |
| `quarter_final_grades` | 0 | no aplica | LIMPIO |
| `annual_evaluation_weights` | 0 | no aplica | LIMPIO |
| `final_course_grades` | 0 | no aplica | LIMPIO |
| `evaluation_publications` | 0 | no aplica | LIMPIO |
| `final_evaluation_publications` | 0 | no aplica | LIMPIO |

Los 33 registros academicos restantes tienen raices completas y pertenecen al
contexto demo conservado. Coinciden con la baseline limpia diagnosticada en M1
y no generan ambiguedad para `039`.

### 4.4 Actividad operativa

| Tabla | Filas | Propiedad verificada | Clasificacion |
| --- | ---: | --- | --- |
| `student_attendance` | 2 | alumno conservado | RESIDUO INOFENSIVO |
| `student_observations` | 3 | alumno conservado | RESIDUO INOFENSIVO |
| `teacher_schedule` | 38 | Tutor conservado | RESIDUO INOFENSIVO |
| `audit_logs` | 340 | 331 con actor conservado; 9 sin actor | RESIDUO INOFENSIVO; conservar trazabilidad |
| `attendance_records` | 0 | no aplica | LIMPIO |
| `student_incidents` | 0 | no aplica | LIMPIO |
| `notifications` | 0 | no aplica | LIMPIO |
| `internal_notifications` | 0 | no aplica | LIMPIO |

No existe una tabla publica adicional fuera del inventario legacy de 27 tablas.
No quedan comunicaciones, notificaciones, incidencias ni publicaciones.

Los nueve audit logs sin actor no son huerfanos: `actor_user_id` es nullable y
representa actividad de sistema. No se recomienda eliminar auditoria como parte
de una limpieza de fixtures.

## 5. Huerfanos y contradicciones

Todos estos contadores devolvieron cero:

- students sin curso, curso huerfano, ano huerfano o Tutor invalido;
- relaciones familiares con parent, profile o student ausente;
- teacher assignments con teacher, course, subject o year ausente;
- partial grades, criterios, quarter grades, term grades y final grades con
  raices ausentes;
- notifications e internal notifications con usuarios ausentes;
- teacher schedule con Tutor ausente;
- audit logs que indiquen un actor inexistente;
- duplicados y contradicciones de contexto ya cubiertos por el preflight M1.

## 6. Estado por ambito

| Ambito | Estado | Motivo |
| --- | --- | --- |
| Auth y profiles | MINIMO FUNCIONAL | cuatro cuentas exactas, activas y sin extras |
| Familia-Alumno | MINIMO FUNCIONAL | una relacion valida con alumno activo |
| Tutor | MINIMO FUNCIONAL | assignments y alumno tutorizado disponibles |
| Configuracion academica | RESIDUO INOFENSIVO | catalogo completo y coherente; mayor que el minimo |
| Calificaciones y criterios | RESIDUO INOFENSIVO | ligados al unico contexto demo |
| Asistencia y observaciones | RESIDUO INOFENSIVO | ligados al alumno conservado |
| Horario docente | RESIDUO INOFENSIVO | ligado al Tutor conservado |
| Comunicaciones/publicaciones/incidencias | LIMPIO | cero filas |
| Auditoria | RESIDUO INOFENSIVO | trazabilidad valida; no debe limpiarse ampliamente |
| Baseline de migraciones | BLOQUEO PARA MULTITENANT | historial remoto sigue vacio |
| Migraciones 035/036 actuales | BLOQUEO PARA MULTITENANT | siguen siendo especificas de staging |
| Backup/restore | BLOQUEO PARA ESCRITURAS ESTRUCTURALES | M2A detecto que no habia backup nativo disponible |

## 7. Huella estructural

La huella coincide con M1:

| Objeto | Total |
| --- | ---: |
| Tablas publicas | 27 |
| Tablas con RLS | 27 |
| Constraints | 145 |
| Indices | 90 |
| Policies | 100 |
| Funciones | 8 |
| Triggers no internos | 22 |
| Columnas `school_id` | 0 |

El historial remoto de migraciones permanece vacio. No se aplico ni reparo
ninguna migracion y produccion conserva el esquema legacy anterior a `034`.

## 8. Recomendacion

### Opcion elegida: A

Continuar con un sprint separado de reconciliacion de baseline y diseno de
sustitutas seguras de produccion para los efectos de `035/036`.

Los residuos academicos no necesitan otra limpieza amplia: son pocos,
deterministas y ejercitan la futura migracion de datos. Si producto desea una
demo completamente vacia, puede plantearse despues una limpieza tecnica muy
acotada de las 38 filas de actividad academica/asistencia/observaciones, pero no
es requisito para la promocion multitenant.

Antes de ejecutar cualquier escritura estructural sigue siendo obligatorio:

1. disponer de un backup que cubra Auth;
2. demostrar su restauracion en un proyecto aislado;
3. reconciliar `001-033` sin suposiciones;
4. ensayar las sustitutas de produccion en el clon restaurado;
5. emitir un GO especifico para la ventana de promocion.

## 9. Confirmaciones

- Produccion: consultada en modo SELECT-only y no modificada.
- Auth: no modificado.
- Staging remoto: no consultado ni modificado durante la auditoria de datos.
- Migraciones: sin cambios.
- Esquema, RLS, grants, funciones y triggers: sin cambios.
- `main`: intacta.
- Storage: no consultado ni modificado; no era necesario al no existir borrado.
- Secretos y datos personales: no incluidos en este documento.

# Último resultado: horario de Pablo y asistencia

## Datos cargados

- Destino verificado: proyecto multicentro activo `zhnbrpcekmxldxlqrbhr`.
- Docente existente: `pablopereztutor@penafort.com`, Tutor activo de Colegio Peñafort.
- Curso activo: `QA Penafort 2026-2027`.
- Se reutilizaron los seis cursos canónicos y las materias `Matematicas Primaria` y `Ciencias Primaria`.
- Las nueve asignaciones curso-materia necesarias ya existían; no se creó ninguna.
- Horario cargado de forma idempotente: 44 bloques, 35 clases y 9 descansos.
- Distribución: lunes 9, martes 9, miércoles 9, jueves 8 y viernes 9.
- El jueves de 10:40 a 11:10 permanece vacío.

## Integración

- Dashboard y horario semanal consumen la tabla existente `teacher_schedule`.
- Cada clase lectiva conserva el acceso a `/dashboard/tutor/attendance/[sessionId]`.
- La sesión resuelve curso, materia y alumnado dentro del centro activo.
- Los descansos no ofrecen asistencia y muestran su etiqueta real: `Patio` o `Comedor/Patio`.

## Regresión autenticada

- Autenticación OTP del usuario real: PASS, sin cambiar email ni contraseña.
- Horario visible bajo RLS: 44 bloques.
- Sesión comprobada: miércoles 09:00, 6º de Primaria, Ciencias Primaria.
- Alumnos visibles: 18 de 6º de Primaria; alumnos de otros centros: 0.
- Inserción de asistencia con el cliente autenticado: PASS.
- Lectura inmediata después del guardado: PASS.
- Limpieza de asistencia sintética: PASS; registros restantes: 0.

La contraseña actual de Pablo no está disponible localmente. Para respetar la
instrucción de no cambiarla, la prueba autenticada se realizó mediante un token
OTP temporal oficial de Supabase. La navegación visual con el formulario de
contraseña requiere que el propietario introduzca la credencial vigente.

## Validación

- `npm.cmd run lint`: OK.
- `npx.cmd tsc --noEmit`: OK.
- `npm.cmd run build`: OK.
- `git diff --check`: OK.

La producción legacy `higdnodnztismxmusejz` y el tenant EducaCora no se
modificaron.

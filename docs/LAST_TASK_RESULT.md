# Ultimo resultado: alta docente desde Superadmin

## Diagnostico

El modelo docente operativo de EducaCora es `auth.users` + `profiles` +
`school_memberships`. Los listados y selectores obtienen los perfiles con
membership activa del centro seleccionado; `teacher_assignments.teacher_id`
usa el mismo UUID. La tabla `teachers` es legado y no participa en este flujo.

El alta creaba Auth, pero ignoraba el error de `profiles.upsert`. Por ello podia
continuar con la membership y devolver exito aunque el perfil canonico no se
hubiera persistido correctamente. Los helpers de asignacion tambien ignoraban
errores de lectura y escritura.

## Correccion

- El centro se resuelve en servidor antes de crear Auth.
- Se comprueba la escritura de perfil activo y membership.
- Si falla perfil, membership o una asignacion inicial, se ejecuta compensacion
  y no se deja una cuenta parcial.
- Los errores de asignacion dejan de declararse como exitos.
- La fila legacy `teachers` no se crea ni se duplica.

## Docente existente

`pablopereztutor@penafort.com` ya conserva Auth, perfil tutor activo,
membership activa en Colegio Penafort y dos asignaciones. No fue necesario
alterar su email, contrasena ni identidad.

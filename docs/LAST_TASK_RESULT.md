# Ultimo resultado: alta docente desde Superadmin

## Diagnostico

El modelo docente operativo de EducaCora es `auth.users` + `profiles` +
`school_memberships`. Los listados y selectores obtienen los perfiles con
membership activa del centro seleccionado; `teacher_assignments.teacher_id`
usa el mismo UUID. La tabla `teachers` es legado y no participa en este flujo.

La causa visible era el lector `getAdminProfiles()`: consultaba
`school_memberships` con el cliente autenticado, pero la RLS de esa tabla solo
permite leer la membership propia. Aunque el docente existia correctamente, el
Superadmin no podia verlo en listados ni selectores.

Ademas, el alta ignoraba el error de `profiles.upsert`, por lo que podia
devolver exito aunque el perfil canonico no se hubiera persistido. Los helpers
de asignacion tambien ignoraban errores de lectura y escritura.

## Correccion

- El centro se resuelve en servidor antes de crear Auth.
- El directorio usa service role unicamente despues de autorizar Director o
  Superadmin y siempre se limita al `school_id` del centro activo.
- Se comprueba la escritura de perfil activo y membership.
- Si falla perfil, membership o una asignacion inicial, se ejecuta compensacion
  y no se deja una cuenta parcial.
- Los errores de asignacion dejan de declararse como exitos.
- La fila legacy `teachers` no se crea ni se duplica.

## Docente existente

`pablopereztutor@penafort.com` ya conserva Auth, perfil tutor activo,
membership activa en Colegio Penafort y dos asignaciones. No fue necesario
alterar su email, contrasena ni identidad.

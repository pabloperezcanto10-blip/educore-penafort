# Sprint 20.2N1E - Reparacion de login real en staging

## Alcance

La actuacion se limita al proyecto Supabase de staging
`zhnbrpcekmxldxlqrbhr`, al proyecto Vercel `educacora-staging` y a la rama
`staging`.

No se ha consultado ni modificado el proyecto Supabase de produccion. La rama
`main` y el tenant real de Colegio Peñafort permanecen fuera del alcance.

## Causa

Las cuentas sinteticas existian en `auth.users`, pero las contraseñas guardadas
localmente no correspondian con una credencial de acceso operativa. El
bootstrap reutilizaba el usuario Auth existente sin restablecer su contraseña.

Ademas, la seleccion generica de un unico perfil Superadmin resolvia la cuenta
QA `qa.superadmin@example.test`, no la cuenta canonica solicitada
`admin@penafortplatform.com`. Esta ultima conservaba un perfil `family` y no
tenia memberships activas.

## Reparacion aplicada en staging

- Se reutilizaron los cuatro `auth.users` existentes; no se crearon duplicados.
- Se confirmaron los emails y se establecieron contraseñas nuevas solo en
  staging.
- `admin@penafortplatform.com` quedo como `superadmin`, activo y con memberships
  activas en Colegio Peñafort y Colegio EducaCora.
- Director, Tutor y Familia conservaron una unica membership activa en Colegio
  EducaCora con su rol canonico.
- Los perfiles quedaron activos y sin cambio de contraseña pendiente.
- Las contraseñas se guardaron exclusivamente en el archivo ignorado
  `.local/educacora-test-credentials.txt`.

## Validacion Auth

Las cuatro cuentas se probaron con `signInWithPassword` y devolvieron usuario y
sesion reales:

- Superadmin: PASS.
- Director EducaCora: PASS.
- Tutor EducaCora: PASS.
- Familia EducaCora: PASS.

No se utilizaron magic links, service role para simular sesiones, tokens
reutilizados ni cookies antiguas.

## Validacion contextual

Las pruebas se iniciaron en `/acceso-centro`, seleccionaron el centro y
enviaron el formulario desplegado:

- Superadmin + Colegio Peñafort: PASS.
- Superadmin + Colegio EducaCora: PASS.
- Director + Colegio EducaCora: PASS.
- Tutor + Colegio EducaCora: PASS.
- Familia + Colegio EducaCora: PASS.

El `ActiveSchoolContext`, la cookie HTTP-only, el branding contextual y la
redireccion al dashboard del rol quedaron verificados en el deployment real.

## Aislamiento

- Director EducaCora + Peñafort: rechazado.
- Tutor EducaCora + Peñafort: rechazado.
- Familia EducaCora + Peñafort: rechazado.
- Acceso directo anonimo a un dashboard: rechazado.
- Slug de centro inexistente: rechazado sin error 500.
- Lecturas cruzadas RLS: 0.
- Escrituras cruzadas RLS: 0.
- Datos Peñafort visibles en dashboards EducaCora: 0.

La regresion funcional confirma un alumno, una relacion familiar, dos
asignaciones docentes y dos calificaciones visibles de datos sinteticos
EducaCora.

## Cambios de codigo

- El formulario diferencia credenciales incorrectas de falta de acceso al
  centro seleccionado.
- El bootstrap selecciona el Superadmin canonico por email y rol, en vez de
  asumir que existe un unico perfil Superadmin en staging.
- El verificador usa las cuatro contraseñas reales y filtra las memberships del
  Superadmin autenticado.
- Se añade un reparador de staging con guardas de proyecto, sin contraseñas
  versionadas.

## Secretos

La documentacion, el codigo y el historial Git no contienen contraseñas,
tokens, claves de Supabase ni connection strings. Los archivos temporales y de
credenciales se encuentran bajo `.local/`, ignorado por Git.

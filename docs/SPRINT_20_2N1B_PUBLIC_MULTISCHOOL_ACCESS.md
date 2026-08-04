# Sprint 20.2N1B - Acceso público multicentro

## Alcance

Este sprint incorpora el flujo público compartido:

`Home -> /acceso-centro -> /login?school=<slug> -> dashboard por rol`

El trabajo se ha realizado exclusivamente en la rama `staging` y contra el proyecto Supabase staging `zhnbrpcekmxldxlqrbhr`. No se ha modificado producción ni `main`.

## Selectores de centro

### Selector público

- Ruta: `/acceso-centro`.
- No requiere autenticación.
- Muestra exclusivamente Colegio Peñafort y Colegio EducaCora.
- Consume una única allowlist en `src/lib/schools/public-schools.ts`.
- Solo expone nombre, slug público, ubicación opcional, estado visual de centro verificado y branding seguro.
- No consulta ni muestra memberships, UUID, usuarios o datos académicos.
- Un slug ausente, inventado o no autorizado vuelve al selector público.

### Selector autenticado

- Ruta: `/select-school`.
- Conserva su responsabilidad anterior.
- Solo muestra centros asociados a las memberships activas del usuario autenticado.
- No se utiliza como selector público ni se ha hecho pública su consulta.

## Inventario de accesos públicos

| Superficie | Componente | Acción | Destino final |
| --- | --- | --- | --- |
| Header de escritorio | `src/app/page.tsx` | Accede a tu centro | `/acceso-centro` |
| Hero | `src/components/landing/living-hero.tsx` | Acceder a nuestro centro | `/acceso-centro` |
| Bloque Centros conectados | `src/app/page.tsx` | Entrar | `/acceso-centro` |
| CTA comercial intermedio | `src/components/landing/commercial-closing-section.tsx` | Acceder a mi centro | `/acceso-centro` |
| CTA comercial final | `src/components/landing/commercial-closing-section.tsx` | Acceder a mi centro | `/acceso-centro` |
| Footer | `src/components/landing/commercial-closing-section.tsx` | Acceso a centros | `/acceso-centro` |
| Menú móvil | `src/components/landing/mobile-public-nav.tsx` | Accede a tu centro | `/acceso-centro` |
| Registro | `src/app/(auth)/register/register-form.tsx` | Volver al acceso | `/acceso-centro` |
| Cierre de sesión | `src/app/logout/route.ts` | Redirección posterior | `/acceso-centro` |
| Launcher PWA | `src/app/app/page.tsx` | Entrar por centro | `/login?school=<slug>` |

Los enlaces editoriales internos a la sección `#acceso` se mantienen porque no son acciones de autenticación.

## Login tenant-aware

El login exige un centro incluido en la allowlist pública. La selección solo establece el contexto visual y no concede permisos.

Después de autenticar, la Server Action:

1. obtiene el perfil activo;
2. obtiene las memberships activas visibles para el propio usuario;
3. comprueba que una membership pertenece al centro seleccionado;
4. resuelve `ActiveSchoolContext` con el rol de la membership;
5. guarda el centro activo en la cookie HTTP-only existente;
6. redirige al dashboard canónico de ese rol.

Si la cuenta no pertenece al centro elegido, la sesión se cierra, la cookie de centro se elimina y se devuelve un mensaje genérico. No existe redirección silenciosa a otro colegio ni se filtra la existencia previa del correo.

## Branding

- Peñafort usa `penafortBrand` y sus assets oficiales.
- Colegio EducaCora usa `educacoraSchoolBrand`, derivado del branding oficial de EducaCora.
- El formulario, nombre, logo y acción principal cambian según el slug público validado.
- No se han creado dashboards ni módulos específicos por centro.

## Usuarios de prueba de Colegio EducaCora

Se han validado cuentas sintéticas de staging para:

- Director: `director@educacora.example.test`.
- Tutor: `tutor@educacora.example.test`.
- Familia: `familia@educacora.example.test`.

Cada cuenta tiene perfil activo, una única membership activa de su rol y las relaciones funcionales requeridas en Colegio EducaCora. Las credenciales se conservan únicamente en el archivo local ignorado por Git:

`C:\Proyectos\Colegio-Penafort-Platform\.local\educacora-test-credentials.txt`

No se incluyen contraseñas en este documento, en Git ni en logs persistentes.

## Estado del Administrador de centro

El modelo canónico actual solo contiene los roles `superadmin`, `director`, `tutor` y `family`. No existen un rol `admin`/`school_admin`, dashboard, permisos ni políticas RLS de Administrador de centro.

Por seguridad no se ha creado una cuenta falsa con rol Director ni se ha concedido Superadmin global. Este es el único bloqueo funcional del sprint y debe resolverse como una capacidad de producto independiente.

## Pruebas positivas

- Home: todos los accesos generales abren `/acceso-centro`.
- Selector: muestra exactamente Peñafort y EducaCora; QA School no aparece.
- Peñafort: abre `/login?school=colegio-penafort` con branding Peñafort.
- EducaCora: abre `/login?school=educacora` con branding EducaCora.
- Director EducaCora: redirige a `/dashboard/director` y conserva Colegio EducaCora como contexto.
- Tutor EducaCora: redirige a `/dashboard/tutor` y conserva Colegio EducaCora como contexto.
- Familia EducaCora: redirige a `/dashboard/family` y conserva Colegio EducaCora como contexto.
- Cierre de sesión: vuelve al selector público.
- Desktop: selector en dos columnas, sin overflow horizontal.
- Móvil: tarjetas apiladas, controles accesibles y sin overflow horizontal.
- PWA: usa el mismo registro centralizado y genera enlaces contextualizados para ambos centros.

## Pruebas negativas y aislamiento

- Slug ausente, inventado o no autorizado: rechazado antes del login.
- QA School: excluido de la allowlist pública.
- Cuenta EducaCora en login Peñafort: rechazada con mensaje genérico.
- Centro solicitado sin membership activa: sesión cerrada y cookie eliminada.
- Membership inactiva, centro inactivo, usuario sin membership y rol incompatible: rechazados por `ActiveSchoolContext`.
- Director, Tutor y Familia EducaCora ven una única membership y un único centro activo.
- Lecturas cruzadas hacia Peñafort: 0.
- Escrituras cruzadas de Tutor: 0.
- Escrituras de calificaciones por Familia: 0.
- Datos Peñafort visibles desde roles EducaCora: 0.
- Errores 500, loops y errores PostgREST no controlados observados: 0.

El verificador remoto utiliza la service role únicamente desde un script local de QA para preparar clientes autenticados y confirmar el resultado de las RLS. Nunca se envía al navegador ni se persiste en el repositorio.

## Datos sintéticos validados

Colegio EducaCora contiene un dataset mínimo de staging: un curso académico, un curso, dos materias, dos relaciones curso-materia, un alumno, una relación familiar, dos asignaciones docentes, cuatro criterios, dos calificaciones parciales y dos calificaciones trimestrales. No se han usado datos reales.

## Evidencia visual

Se revisaron el selector público, ambos logins, los tres dashboards y el launcher PWA en escritorio y móvil. La comprobación incluyó orden de foco, contraste, estados hover/focus, proporción de logotipos, apilado responsive y ausencia de overflow horizontal. Las capturas de QA no contienen sesiones ni credenciales y no se versionan.

## Decisión

**GO CON UN BLOQUEO**.

El flujo público multicentro y los roles Director, Tutor y Familia están operativos y aislados. El único bloqueo es la ausencia real del rol Administrador de centro; no se ha sustituido por otro rol ni se han reducido protecciones.

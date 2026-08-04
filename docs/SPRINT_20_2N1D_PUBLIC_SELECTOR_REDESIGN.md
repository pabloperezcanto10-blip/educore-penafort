# Sprint 20.2N1D - Rediseño del selector público

## Alcance

El sprint alinea visualmente el flujo público multicentro sin modificar autenticación, memberships, RLS, slugs ni datos:

`Home -> /acceso-centro -> /login?school=<slug> -> dashboard por rol`

El trabajo se realiza exclusivamente en la rama `staging` y contra el proyecto Supabase staging `zhnbrpcekmxldxlqrbhr`.

## Problemas visuales detectados

- Cabecera aislada del lenguaje visual de la home.
- Logotipo de EducaCora repetido y sobredimensionado en el contenido.
- Exceso de espacio antes de la acción principal.
- Tarjetas genéricas con botones oscuros dominantes.
- Tratamiento desigual de logotipos, ubicación y badges.
- Texto técnico sin valor para el visitante.
- Falta de un cierre visual compartido con la página pública.

## Componentes compartidos

- `PublicSiteHeader`: header público único para home y selector, con navegación desktop y móvil.
- `MobilePublicNav`: navegación responsive parametrizada para rutas internas o enlaces a la home.
- `PublicSiteFooter`: footer público único extraído del cierre comercial existente.
- `PublicSchoolCard`: tarjeta reutilizable para todos los centros publicados.
- `PUBLIC_SCHOOLS`: allowlist centralizada que sigue siendo la única fuente de centros públicos y rutas de login.

No se han creado identidades, paletas, símbolos ni archivos de logo nuevos.

## Cambios realizados

- El selector reutiliza el header y footer reales de EducaCora.
- El hero se reduce a “Accede a tu centro” y “Selecciona tu centro para iniciar sesión.”
- Se elimina el logotipo central duplicado, el slogan repetido y el texto técnico inferior.
- Se eliminan los badges “Centro verificado” y la ubicación asimétrica de Peñafort.
- Toda la tarjeta es seleccionable y mantiene un foco visible.
- Las tarjetas tienen la misma altura, padding, borde, radio y sombra.
- Los logos se muestran con `object-contain` dentro de contenedores de tamaño uniforme.
- Cada centro conserva únicamente un acento discreto derivado de su branding oficial.
- La acción se presenta como enlace ligero “Acceder al centro”.
- El enlace secundario “Volver a la página principal” permanece visible.

## Responsive y accesibilidad

### Desktop

- Dos tarjetas equilibradas en una cuadrícula de dos columnas.
- Contenido limitado a 980 px dentro del ancho público de 1180 px.
- Header y footer mantienen los mismos anchos y tokens de la landing.

### Tablet y móvil

- La cuadrícula pasa a una columna por debajo del breakpoint `md`.
- El header conserva la navegación móvil existente.
- Los logos mantienen proporción, las acciones superan 44 px y no existe overflow horizontal.
- Los textos pueden crecer sin recortarse y se respeta `prefers-reduced-motion` en la navegación.
- Los anchos públicos usan `calc()` válido en los breakpoints móviles para no depender de reglas descartadas por el navegador.

### Accesibilidad

- La tarjeta completa tiene nombre accesible específico por centro.
- El foco es visible en tarjetas, enlaces, botones y menú móvil.
- El orden DOM es header, contenido, retorno y footer.
- Solo existe un `h1` en el selector.

## Continuidad con el login

- Colegio Peñafort abre `/login?school=colegio-penafort`.
- Colegio EducaCora abre `/login?school=educacora`.
- Cada login conserva el logo, nombre, color principal y fondo autorizados del centro.
- Ambos muestran el enlace “Cambiar de centro” hacia `/acceso-centro`.
- La elección pública sigue sin conceder permisos; la autorización se resuelve mediante perfil, membership activa y `ActiveSchoolContext`.

## Superadmin global

La cuenta esperada `admin@penafortplatform.com` conserva memberships activas de Superadmin en Peñafort y EducaCora. No pertenece exclusivamente a Peñafort.

Las vistas se clasifican así:

- **Globales:** `/dashboard/admin` cuando no existe un centro activo. Conservan la identidad general de la plataforma.
- **Contextualizadas:** vistas protegidas con un `schoolId` activo. Usan branding, curso académico y datos del centro seleccionado.
- **Selector autenticado:** `/select-school`, que permite cambiar entre las memberships activas sin reutilizar el selector público.

La contraseña del Superadmin no está disponible en los archivos locales. No se ha cambiado, reseteado ni inventado para este sprint. Su contexto e aislamiento se verifican mediante la cuenta existente y comprobaciones autenticadas sin enviar emails reales.

La ausencia de contraseña local impide repetir el login interactivo del Superadmin desde el formulario y obtener capturas contextualizadas sin alterar la cuenta. Esta limitación de QA se mantiene explícita: no se sustituye por credenciales inventadas ni por un reseteo.

## Credenciales de staging

El archivo local ignorado por Git contiene credenciales funcionales para Director, Tutor y Familia de Colegio EducaCora:

`C:\Proyectos\Colegio-Penafort-Platform\.local\educacora-test-credentials.txt`

No contiene un Administrador de centro y no se incluyen contraseñas en este documento.

## Pruebas realizadas

- Selector desktop a 1440 x 1000: dos tarjetas de 478 x 288, footer presente y sin overflow.
- Selector tablet a 768 x 1024: dos tarjetas de 354 x 288, navegación compacta y sin overflow.
- Selector móvil a 390 x 844: tarjetas apiladas de 335 x 288, menú dentro del viewport y sin overflow.
- Navegación por teclado: foco visible, controles de 44 px y un único `h1`.
- Login contextual Peñafort y EducaCora con logo, nombre, color y enlace de retorno correctos.
- Director, Tutor y Familia autenticados mediante las credenciales sintéticas de staging.
- Memberships activas del Superadmin global en Peñafort y EducaCora.
- Secuencia determinista Peñafort -> EducaCora -> Peñafort en `ActiveSchoolContext`.
- Lecturas cruzadas: 0. Escrituras cruzadas persistidas: 0.
- Familia: únicamente calificaciones visibles; dos registros visibles en el conjunto sintético.
- Lint y TypeScript sin errores; build completo de 68 rutas correcto.
- DB lint sin errores, migraciones 001-041 alineadas y dry-run vacío.

Las capturas de selector desktop, tablet y móvil, y de ambos logins son locales, no contienen credenciales y no se versionan. Las capturas interactivas del Superadmin no se generan porque su contraseña no está disponible localmente.

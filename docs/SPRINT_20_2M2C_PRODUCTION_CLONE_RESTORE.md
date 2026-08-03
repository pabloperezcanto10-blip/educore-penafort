# Sprint 20.2M2C - Clon aislado y restore completo de produccion

> **ESTRATEGIA SUSPENDIDA - NO ES LA RUTA ACTIVA ACTUAL.** Desde el Sprint
> 20.2N1, staging es el entorno canónico para construir y validar el producto
> multitenant. Este documento se conserva únicamente como evidencia histórica;
> no autoriza actuaciones sobre producción legacy.

Fecha: 3 de agosto de 2026

Rama: `staging`

HEAD inicial: `5ea7ea2079410e4007db2b6a07ceb073a18f3e3d`

Produccion auditada: `higdnodnztismxmusejz`

Staging: `zhnbrpcekmxldxlqrbhr`

Estado: **NO-GO; no se ha creado ningun clon**

## 1. Decision ejecutiva

No existe en el entorno actual un metodo demostrado que permita crear el clon
completo y recuperable exigido por el sprint sin introducir una sustitucion de
Auth no equivalente o una dependencia no disponible.

La restauracion oficial a un proyecto nuevo es la unica opcion identificada que
preserva en una sola operacion el esquema, los datos, los roles de base de
datos, Auth con hashes y la clave raiz de cifrado. El proyecto de produccion no
expone actualmente ningun backup restaurable mediante la CLI:

- backups disponibles: ninguno;
- datos de backup fisico expuestos: ninguno;
- PITR: desactivado;
- ramas existentes: ninguna.

El indicador `walg_enabled = true` no aporta por si solo un punto de restore
seleccionable. Sin un backup fisico disponible no puede iniciarse el flujo
oficial de restore a proyecto nuevo.

No se ha creado un proyecto vacio ni una rama como sustituto. Hacerlo no
demostraria la recuperabilidad de produccion ni cumpliria el criterio de Auth
del sprint.

## 2. Plan y capacidades observadas

La CLI no devuelve el nombre comercial del plan en `orgs list`. La sesion de
Dashboard no estaba autenticada durante esta comprobacion, por lo que no se
declara un plan por inferencia como hecho confirmado.

La capacidad observable es equivalente a un proyecto sin backup nativo
restaurable: `backups list` devuelve `backups = null` y no hay datos de backup
fisico. La documentacion oficial limita el restore a proyecto nuevo a planes de
pago con backups fisicos habilitados. Supabase Branching requiere Pro y las
ramas normales se crean sin datos de produccion.

Antes de reabrir el sprint debe confirmarse manualmente en Billing el plan de
la organizacion y en Database > Backups la aparicion de un punto de restore
fisico elegible.

## 3. Herramientas y credenciales

| Recurso | Estado | Consecuencia |
| --- | --- | --- |
| Supabase CLI | disponible mediante `npx`, version fijada `2.109.1` | permite inventario remoto de solo lectura |
| Docker | no disponible | impide levantar Supabase local y ejecutar el flujo CLI de dump/restore |
| `pg_dump` | no disponible | impide generar un backup logico local |
| `psql` | no disponible | impide restaurar y verificar un dump local |
| CLI Supabase instalada globalmente | no disponible | no bloquea las consultas realizadas con `npx` |
| Contrasena de base de datos | no disponible en las variables locales auditadas | impide conexion directa y dump logico |
| `.env.local` | ignorado, no versionado y sin cambios | no se utilizo ni se mostro ningun secreto |

No se imprimieron tokens, passwords, connection strings, API keys ni UUID de
usuarios.

## 4. Evaluacion de los metodos

### A. Restore oficial a proyecto nuevo

**No disponible ahora.** Requiere un plan de pago y un backup fisico habilitado
y visible. La fuente devuelve cero backups restaurables.

Es el metodo recomendado para un siguiente intento porque copia el contenido de
base de datos, incluidos Auth y las claves necesarias para leer los datos
cifrados. El nuevo proyecto queda independiente del origen.

### B. Branching o clone oficial

**No aceptado como clon valido.** No hay ramas existentes. Branching requiere
Pro y la documentacion define las ramas ordinarias como entornos aislados sin
datos de produccion. La CLI expone `--with-data`, pero no se dispone de evidencia
suficiente para declarar que esa opcion preserva el conjunto completo exigido:
Auth operativo, configuracion Auth, objetos de Storage y snapshot restaurable.

No se probo creando una rama porque hacerlo puede generar coste y, aun si se
creara, no resolveria la falta de una prueba documentada de restore completo.

### C. Backup logico compatible con Auth

**No disponible.** Faltan la contrasena de base de datos, `pg_dump` y `psql`.
Ademas, el dump normal de Supabase excluye por defecto esquemas gestionados como
`auth` y `storage`. Una exportacion parcial de `public` no cumple este sprint.

Copiar filas de Auth manualmente no equivale al restore oficial: puede perder
la clave raiz, configuracion gestionada, identidades, hashes compatibles o
relaciones internas.

### D. Supabase local desde dump completo

**No disponible.** Docker no esta instalado y tampoco existen las herramientas
PostgreSQL necesarias. Aunque se instalaran, seguiria siendo obligatorio
obtener un dump completo, cifrado y probado que incluya Auth de forma segura.

### E. Proyecto temporal con importacion controlada

**Rechazado para este sprint.** Un proyecto nuevo con datos publicos y cuatro
usuarios sustitutos no seria un clon fiel. Exigiria cambiar o recrear
credenciales y no demostraria que las cuatro cuentas actuales son recuperables.
Solo podria considerarse en un sprint distinto como `GO CON BLOQUEOS`, con una
excepcion de Auth expresamente aprobada.

## 5. Cobertura que no pudo demostrarse

Al no existir un clon valido no se ejecutaron las fases de restore, comparacion,
login, regresion ni snapshot. Los siguientes objetivos permanecen sin evidencia
en un entorno restaurado:

- equivalencia de 27 tablas, 237 columnas, 145 constraints, 90 indices, 8
  funciones, 22 triggers y 100 policies;
- equivalencia de grants y RLS;
- 4 `auth.users`, 4 profiles y sus roles;
- 1 alumno, 1 relacion Familia-Alumno y 9 assignments;
- configuration 1/12/18/102;
- 14 criterios, 17 notas parciales, 2 notas trimestrales, 2 asistencias, 3
  observaciones y 38 sesiones;
- login real de Superadmin, Director, Tutor y Familia;
- regresion sin errores 500, PostgREST ni loops;
- snapshot pre-034 recuperable.

Estos conteos son la baseline documental confirmada en M2A-V y M2B. No se han
vuelto a extraer datos personales de produccion durante este sprint.

## 6. Auth y Storage

### Auth

La restauracion oficial documenta la copia de usuarios Auth, hashes y clave
raiz. Ese mecanismo no esta disponible sin un backup fisico elegible. No se han
creado usuarios sustitutos, cambiado passwords, enviado correos ni iniciado
sesiones.

Resultado: **Auth no reproducida; criterio bloqueante**.

### Storage

Los backups de base de datos incluyen metadatos de Storage, pero no los objetos
binarios almacenados. Incluso con restore oficial seria necesaria una copia
separada de objetos y la reconfiguracion de buckets/settings. En este sprint no
se consultaron, descargaron ni publicaron objetos.

Resultado: **metadata no restaurada y objetos no copiados**.

## 7. Aislamiento y entornos

- No se creo project ref de clon.
- No se enlazo ningun proyecto a Vercel.
- No se crearon dominios, callbacks, webhooks, cron, `pg_net`, Corium ni
  integraciones externas.
- No se enviaron emails.
- No se modifico el enlace local del repositorio a staging.
- No se ejecuto `db push`, `migration repair`, DDL, DML ni SQL remoto.
- No se aplicaron las migraciones `034-041`.
- Produccion, staging remoto, `main` y Colegio Penafort permanecen intactos.

## 8. Snapshot

No existe snapshot nuevo porque no existe clon. Los backups listados por la CLI
no ofrecen un punto recuperable. Declarar un snapshot sin haber demostrado su
restore incumpliria la puerta P0 definida en M2B.

## 9. Requisitos para reabrir el ensayo

Opcion recomendada:

1. confirmar un plan de pago compatible;
2. habilitar o esperar a que exista un backup fisico visible;
3. usar Database > Backups > Restore to a New Project;
4. revisar y aceptar el coste del proyecto nuevo;
5. aislar inmediatamente Auth, SMTP, callbacks, webhooks, cron, `pg_net`,
   Functions, Realtime y Storage;
6. respaldar por separado los objetos de Storage si existen;
7. ejecutar P0 antes de cualquier `migration repair` o migracion;
8. crear un segundo punto recuperable del clon antes de `034`.

Alternativa solo si el restore oficial sigue sin estar disponible:

1. aprobar formalmente un flujo logico completo;
2. instalar Docker y PostgreSQL client con versiones compatibles;
3. facilitar la contrasena de base de datos por un canal seguro, nunca en Git;
4. generar dumps cifrados de roles, schema y datos, incluyendo una estrategia
   soportada para Auth;
5. demostrar el restore en un proyecto temporal antes de considerarlo valido.

La alternativa no puede rebajar el requisito de login real ni sustituir hashes
de las cuatro cuentas sin una excepcion aprobada.

## 10. Fuentes oficiales

- https://supabase.com/docs/guides/platform/clone-project
- https://supabase.com/docs/guides/platform/backups
- https://supabase.com/docs/guides/platform/migrating-within-supabase/backup-restore
- https://supabase.com/docs/guides/deployment/branching
- https://supabase.com/docs/guides/platform/manage-your-usage/branching

## 11. Decision y siguiente paso

Decision: **NO-GO**.

No se cumplen tres condiciones obligatorias: Auth reproducible, clon aislado
completo y snapshot recuperable. Crear un entorno parcial no resolveria esos
bloqueos.

Recomendacion para M2D: convertirlo primero en un sprint de habilitacion de
backup fisico y restore oficial. Solo cuando exista un punto restaurable se
debe repetir M2C, validar P0 y, en un sprint posterior, ensayar `034-041`.

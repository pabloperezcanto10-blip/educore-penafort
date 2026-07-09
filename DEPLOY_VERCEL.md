# Despliegue en Vercel

Guia para desplegar EducaCora - Colegio Penafort como entorno online de pruebas.

## 1. Preparar el repositorio

1. Abre una terminal en:

```bash
C:\Proyectos\Colegio-Penafort-Platform
```

2. Comprueba que el proyecto compila en local:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

3. Verifica que `.env.local` no se sube a Git. El archivo `.gitignore` ya ignora:

```bash
.env
.env*.local
```

## 2. Subir a GitHub

Si el proyecto ya tiene Git:

```bash
git status
git add .
git commit -m "Prepare Vercel deployment"
```

Despues crea un repositorio en GitHub y conecta el remoto:

```bash
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

Si el proyecto no tiene Git todavia:

```bash
git init
git add .
git commit -m "Initial EducaCora project"
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

No hagas `push` hasta confirmar que no hay claves reales en archivos versionados.

## 3. Conectar GitHub con Vercel

1. Entra en Vercel.
2. Selecciona `Add New Project`.
3. Importa el repositorio de GitHub.
4. Framework: `Next.js`.
5. Build command: `pnpm build`.
6. Install command: `pnpm install`.
7. Output directory: dejar vacio, Vercel detecta Next.js.

## 4. Variables de entorno en Vercel

En `Project Settings` -> `Environment Variables`, crea:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

Notas:

- `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` son publicas y necesarias para cliente/servidor.
- `SUPABASE_SERVICE_ROLE_KEY` es privada. No debe aparecer en el navegador ni en GitHub.
- Configura las variables en `Production`, `Preview` y `Development` si vas a usar los tres entornos.

## 5. Configurar Supabase Auth

En Supabase:

1. Ve a `Authentication` -> `URL Configuration`.
2. En `Site URL`, pon la URL principal de Vercel:

```bash
https://TU-PROYECTO.vercel.app
```

3. En `Redirect URLs`, anade:

```bash
https://TU-PROYECTO.vercel.app/auth/callback
https://TU-PROYECTO.vercel.app/login
https://TU-PROYECTO.vercel.app/change-password
```

Si usas previews de Vercel, anade tambien el patron de preview que corresponda.

## 6. Desplegar

1. Pulsa `Deploy` en Vercel.
2. Espera a que termine el build.
3. Abre la URL publicada.

## 7. Pruebas tras el deploy

Comprueba:

1. `/login` carga con estilos.
2. Login con usuarios de prueba.
3. Redireccion por rol:
   - tutor -> `/dashboard/tutor`
   - family -> `/dashboard/family`
   - director -> `/dashboard/director`
   - superadmin -> `/dashboard/admin`
4. Logout funciona.
5. Supabase lee datos reales.
6. Acciones que usan service role funcionan solo desde servidor:
   - creacion de usuarios desde superadmin
   - eliminacion real de usuarios

## 8. Checklist de seguridad

- No subir `.env.local`.
- No subir claves reales en `.env.example`.
- No pegar `SUPABASE_SERVICE_ROLE_KEY` en componentes cliente.
- Revisar `git status` antes de hacer commit.
- Mantener RLS activo en Supabase.

# Despliegue de EduCore en Vercel

EduCore se despliega desde GitHub a Vercel. El objetivo del flujo es que el enlace principal de producción no cambie nunca, aunque se publiquen nuevas versiones.

## URL de producción

URL fija actual:

`https://educore-wine-kappa.vercel.app`

Esta es la URL que debe compartirse con colegios, docentes, familias o personas que necesiten ver EduCore en producción.

No se deben compartir URLs temporales de deployments, porque cada despliegue genera una URL distinta para revisión técnica.

## Flujo definitivo

```text
Codex modifica código
↓
git add .
↓
git commit
↓
git push origin main
↓
Vercel detecta el push
↓
Vercel despliega automáticamente
↓
https://educore-wine-kappa.vercel.app queda actualizado
```

## GitHub conectado a Vercel

Repositorio GitHub:

`https://github.com/pabloperezcanto10-blip/educore-penafort.git`

La rama principal de trabajo y producción es:

`main`

En Vercel, el proyecto debe estar conectado a este repositorio y debe tener configurada `main` como Production Branch.

## Production y Preview

### Production

Production es el despliegue principal del proyecto.

- Sale de la rama `main`.
- Actualiza siempre la URL fija del proyecto.
- Es la versión que deben ver colegios y usuarios reales.
- La URL no cambia entre despliegues.

URL actual:

`https://educore-wine-kappa.vercel.app`

### Preview

Preview son despliegues temporales para probar cambios.

- Se crean normalmente desde ramas distintas a `main` o pull requests.
- Tienen URLs temporales.
- Sirven para revisión interna.
- No deben compartirse como enlace oficial del producto.

## Production Branch

La Production Branch debe ser:

`main`

Comprobación en Vercel:

1. Abrir el proyecto EduCore en Vercel.
2. Ir a `Settings`.
3. Entrar en `Git`.
4. Revisar `Production Branch`.
5. Confirmar que está configurada como `main`.

Si aparece otra rama, cambiarla a `main`.

## Qué URL compartir

Compartir siempre:

`https://educore-wine-kappa.vercel.app`

No compartir URLs con este patrón:

`https://educore-xxxxx.vercel.app`

si corresponden a previews o deployments concretos.

## Flujo correcto de trabajo

1. Trabajar en local.
2. Ejecutar validaciones:

```bash
npm run lint
npx tsc --noEmit
npm run build
```

3. Crear commit:

```bash
git add .
git commit -m "mensaje descriptivo"
```

4. Publicar:

```bash
git push origin main
```

5. Revisar en Vercel que el deployment de producción queda en estado `Ready`.

6. Abrir la URL fija:

`https://educore-wine-kappa.vercel.app`

## Variables de entorno

Las variables de entorno se gestionan en Vercel desde:

`Project → Settings → Environment Variables`

No deben subirse al repositorio.

El archivo `.env.local` debe mantenerse fuera de Git.

## Comprobaciones actuales del repo

- Remote GitHub: `origin`.
- Rama local principal: `main`.
- `.vercel/` está ignorado por Git.
- `vercel.json` declara el framework `nextjs`.
- La URL pública `https://educore-wine-kappa.vercel.app` responde correctamente.

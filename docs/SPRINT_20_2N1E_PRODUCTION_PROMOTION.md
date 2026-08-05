# Sprint 20.2N1E - Promocion multicentro a produccion

Estado: preflight y rollback preparados antes de la promocion.

## Decision de entorno

- Produccion multicentro candidata: `zhnbrpcekmxldxlqrbhr`.
- Produccion legacy de rollback: `higdnodnztismxmusejz`.
- Staging actual: `zhnbrpcekmxldxlqrbhr` hasta completar la promocion.
- Staging futuro: pendiente de crear despues de la promocion.

La base legacy no recibe migraciones `034-041` ni cambios de datos. Se conserva
intacta como punto de recuperacion.

## Punto de rollback previo

- Rama de produccion: `main`.
- Commit anterior de `main`: `401148590b9694a987328145cc64361b84fb7a05`.
- Proyecto Vercel: `educore` (`prj_qEIiE6jkTwFOspYcjSg1yq7GAzWW`).
- Deployment anterior: `dpl_FCHMxiuXLBk9KMDZW8of5ganxFVU`.
- URL inmutable del deployment anterior:
  `https://educore-gubjkbhru-pablo-perez-educore.vercel.app`.
- Aliases registrados antes de la promocion:
  - `https://www.educacora.es`
  - `https://educacora.es`
  - `https://educore-wine-kappa.vercel.app`
  - `https://educore-pablo-perez-educore.vercel.app`
  - `https://educore-git-main-pablo-perez-educore.vercel.app`

El deployment anterior no debe eliminarse.

## Variables Production afectadas

Los valores no se documentan ni se versionan. Solo se modifican en el entorno
`Production` del proyecto Vercel `educore`:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`

La configuracion legacy necesaria para rollback permanece disponible en el
archivo local ignorado `.env.local`. El inventario descargado de Vercel se
conserva en `.local/n1e-production-legacy.env`; la CLI puede representar los
valores sensibles como `[SENSITIVE]`. Ninguno de estos archivos se versiona.

## Procedimiento de rollback

1. Reasignar `educacora.es` y `www.educacora.es` al deployment anterior
   `dpl_FCHMxiuXLBk9KMDZW8of5ganxFVU`.
2. Restaurar exclusivamente en Vercel Production las cuatro variables
   anteriores desde la configuracion legacy local ignorada.
3. Crear un commit de reversion o avanzar `main` de forma no destructiva al
   codigo compatible con `401148590b9694a987328145cc64361b84fb7a05`.
4. Confirmar que la aplicacion vuelve a usar `higdnodnztismxmusejz`.
5. Validar home, selector, login y dashboards antes de cerrar el rollback.

No se debe usar `git push --force`, borrar deployments ni alterar la base
multicentro durante este procedimiento.

## Criterios de promocion

La promocion solo puede continuar si:

- los cinco accesos reales pasan en staging;
- los accesos cruzados son rechazados;
- `origin/main` puede avanzar por fast-forward;
- Vercel Production apunta a `zhnbrpcekmxldxlqrbhr`;
- el nuevo deployment queda `Ready`;
- los cinco accesos pasan de nuevo en el dominio de produccion.


# Ultimo resultado: refresco de vistas administrativas

## Diagnostico

Las Server Actions invalidaban sus rutas y redirigian con un toast, pero
`GlobalToast` eliminaba despues los parametros mediante `router.replace()`.
Esa segunda navegacion podia reutilizar el Router Cache anterior y volver a
mostrar el arbol de Server Components previo a la mutacion.

Ademas, las acciones de rol y estado de usuario escribian
`school_memberships` con el cliente autenticado. Esa tabla solo concede lectura
al rol `authenticated`, por lo que la escritura podia ser rechazada y el error
se ignoraba antes de mostrar el toast de exito.

Las eliminaciones de asignaciones tenian una variante del mismo problema:
PostgREST podia devolver `error = null` al afectar cero filas bajo RLS, y la
accion declaraba exito sin comprobar el resultado eliminado.

## Correccion

- El toast limpia su URL con `window.history.replaceState()` sin iniciar una
  segunda navegacion.
- Las mutaciones administrativas exitosas solicitan de forma explicita un
  unico `router.refresh()` despues de `revalidatePath()`; los errores, avisos y
  toasts del resto de la aplicacion no fuerzan refrescos.
- Las mutaciones de memberships se ejecutan con el cliente administrativo solo
  despues de autorizar al Superadmin y resolver el centro activo.
- Todas las lecturas y escrituras de memberships se limitan al `school_id`
  activo y comprueban que exista exactamente la fila afectada.
- El estado siguiente se calcula desde la membership persistida, no desde un
  campo oculto potencialmente obsoleto.
- Las eliminaciones individual y agrupada de asignaciones exigen filas
  eliminadas en el `school_id` activo antes de mostrar exito.
- Un fallo real ya no puede producir un toast de exito.

## Validacion

- `npm run lint`: OK.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- `git diff --check`: OK.

La comprobacion definitiva sin recarga manual se realiza en Production tras el
deployment del commit de esta tarea.

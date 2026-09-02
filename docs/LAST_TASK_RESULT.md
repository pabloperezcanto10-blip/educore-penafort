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

## Correccion

- El toast limpia su URL con `window.history.replaceState()` y conserva el
  render fresco recibido tras `revalidatePath()`.
- Las mutaciones de memberships se ejecutan con el cliente administrativo solo
  despues de autorizar al Superadmin y resolver el centro activo.
- Todas las lecturas y escrituras de memberships se limitan al `school_id`
  activo y comprueban que exista exactamente la fila afectada.
- El estado siguiente se calcula desde la membership persistida, no desde un
  campo oculto potencialmente obsoleto.
- Un fallo real ya no puede producir un toast de exito.

## Validacion

- `npm run lint`: OK.
- `npx tsc --noEmit`: OK.
- `npm run build`: OK.
- `git diff --check`: OK.

La comprobacion definitiva sin recarga manual se realiza en Production tras el
deployment del commit de esta tarea.

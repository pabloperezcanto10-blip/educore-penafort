# EducaCora Visual Foundations

Version: 1.3
Estado: Fuente de verdad para superficies públicas
Ámbito inicial: Home pública

## Principios

- Claridad antes que decoración.
- Una jerarquía visual explícita: información, interacción y contenido protagonista.
- Movimiento breve y funcional; nunca debe ocultar contenido esencial.
- Las superficies públicas deben conservar la identidad navy, verde, dorado y blanco cálido de EducaCora.
- Responsive significa preservar intención, legibilidad y acciones, no solo apilar elementos.

## Tokens

Los tokens viven en `src/app/globals.css` con el prefijo `--ec-`.

### Color y superficies

- `--ec-color-navy-*`: identidad y fondos oscuros.
- `--ec-color-green-*`: marca, foco y estados positivos.
- `--ec-color-gold-*`: énfasis institucional.
- `--ec-surface-page`, `--ec-surface-muted`, `--ec-surface-light`, `--ec-surface-dark`: fondos base.
- `--ec-surface-translucent`, `--ec-overlay`, `--ec-glow-brand`: capas y profundidad.
- `--ec-text-*`, `--ec-border-subtle`, `--ec-ring-brand`: texto, separación y foco.

### Radios, sombras y espacio

- Radios: `sm`, `md`, `lg`, `xl` y `feature`.
- Sombras: `soft`, `card` y `elevated`.
- Espaciado de sección: normal, narrativo, compacto y cierre.
- La profundidad elevada se reserva para contenido protagonista o interactivo.

### Z-index

Orden oficial: contenido, navbar sticky, popover, Corium, overlay y modal.
No deben introducirse valores arbitrarios que superen al modal de contacto.

## Jerarquía de superficies

### Informativas

No se desplazan en hover. Pueden reforzar ligeramente el borde, pero no aparentan ser clicables.

### Interactivas

Tienen foco visible, cursor y una elevación máxima de 2 px en dispositivos con hover.

### Protagonistas

Representan producto, CTA o narrativa principal. Admiten sombra elevada y un desplazamiento máximo de 3 px.

## Motion

- Feedback instantáneo: `120 ms`.
- Interacción corta: `180 ms`.
- Cambio de panel: `340 ms`.
- Reveal: `520 ms`.
- Ambiente: `16 s`.
- Distancia máxima de reveal: `16 px`.
- Stagger base: `70 ms`, con un máximo recomendado de cuatro elementos.

Los easings oficiales son entrada, salida y movimiento. El texto no debe escalar durante el reveal.

## Reduced motion

Con `prefers-reduced-motion: reduce`:

- el contenido aparece inmediatamente;
- se eliminan desplazamientos, escalas y loops;
- se desactiva la respiración de Corium y el fondo ambiental;
- menús y estados permanecen visibles y operativos;
- ninguna información depende de una animación.

La estrategia se centraliza en la media query pública de la Home y en las utilidades globales de Experience.

## Responsive

- Escritorio: navegación completa y Corium contextual visible.
- Tablet: navegación compacta con menú accesible.
- Móvil: logo legible, acciones táctiles de al menos 44 px y Corium colapsado.
- Los anchors deben respetar la altura del navbar sticky.
- La página no debe crear scroll horizontal; se usa `overflow-x: clip` cuando sea necesario sin romper sticky.

## Corium

- En escritorio puede mostrar un mensaje contextual breve.
- En móvil aparece como avatar compacto y solo expande el mensaje por acción consciente.
- `aria-live` permanece desactivado mientras el mensaje está contraído.
- Corium debe quedar por debajo de modales y no competir con navegación o contacto.

## Living Hero

La Home abre con una composición de dos áreas: propuesta de valor y superficie viva de producto. El Hero conserva su estructura semántica en servidor y aísla la única lógica interactiva en `HeroProductDemo`.

### Capas

- Campo ambiental claro con navy, verde y dorado corporativos.
- Grid técnico tenue, limitado al fondo y fuera del árbol accesible.
- Superficie de producto con dimensiones estables y profundidad reservada para contenido protagonista.
- Transición inferior hacia la explicación de acceso y conexión del centro.

### Microdemostración

- Representa un único flujo ficticio: Docente, Dirección y Familias.
- Muestra todos los pasos desde el inicio; el movimiento solo refuerza la conexión.
- Ejecuta un ciclo de dos transiciones y termina en un estado útil y estable.
- No consulta APIs, no usa datos reales y no anuncia automáticamente cada etapa.
- Los temporizadores se limpian al desmontar y se pausan cuando la pestaña queda oculta.

### Corium dentro de la escena

- Corium aparece integrado en el contexto del producto y no como decoración independiente.
- El lanzador flotante se oculta mientras el Hero está visible para evitar duplicidades.
- Tras abandonar el Hero, reaparece el lanzador contextual definido en la versión 1.0.
- En móvil se conserva una única representación de Corium en cada momento.

### Motion y reduced motion

- La entrada principal completa su secuencia en menos de `900 ms`.
- El movimiento ambiental no supera `8 px`, `1deg` ni una escala de `1.015`.
- Con reduced motion, la demostración muestra directamente el estado final y elimina flotación, gradientes animados y desplazamientos.

### Responsive y estabilidad

- Desktop mantiene copy y producto en dos columnas.
- Tablet apila la escena cuando la lectura en columnas deja de ser clara.
- Móvil prioriza copy y CTA, compacta la superficie y retira el panel secundario.
- El producto reserva altura desde el primer render para evitar CLS.
- Ninguna capa puede generar scroll horizontal ni depender de hover.

### Mantenimiento

- Los datos de demostración viven en `hero-product-demo.tsx` y deben seguir siendo ficticios.
- Los estilos viven en `living-hero.module.css` y consumen tokens `--ec-*`.
- No deben añadirse nuevos intervalos, listeners globales o librerías de motion para ampliar la escena.

## Ecosistema conectado de módulos

La sección pública de módulos deja de usar una cuadrícula de productos independientes. La composición combina un selector accesible y una única superficie protagonista para explicar cómo la información avanza entre perfiles y áreas del centro.

### Fuente única de configuración

- `connected-modules-data.ts` contiene los seis módulos, su copy, beneficio, icono, acento, roles, métrica y flujo.
- Los módulos oficiales son Asistencia, Cuaderno de Calificaciones, Comunicaciones, Alumnado, Calendario y Supervisión.
- Añadir o modificar un módulo exige actualizar solo esa configuración. La vista, el selector y el resumen accesible consumen la misma fuente.
- Todos los datos son ficticios; esta superficie no consulta APIs, Supabase ni contenido de producción.

### Selector y panel

- `ConnectedModulesSection` conserva en servidor el encabezado, la estructura narrativa y la transición hacia Roles.
- `ConnectedModulesExperience` aísla selección, teclado, visibilidad, motion y microdemostraciones.
- El selector usa `tablist`, `tab`, `tabpanel`, `aria-selected` y navegación con flechas, Inicio y Fin.
- El panel reserva una altura estable y reutiliza el lenguaje de badges, métricas, barras de progreso, estados y flujos del producto.

### Microdemostraciones

- Asistencia muestra Docente, Dirección y Familia sobre un único registro.
- Comunicaciones muestra envío, recepción y confirmación de lectura.
- Cuaderno muestra actualización docente, supervisión y seguimiento visible para la familia.
- Cada demo ejecuta una sola secuencia al entrar en viewport o al ser seleccionada; no existe autoplay entre módulos.
- Alumnado, Calendario y Supervisión muestran estados finales compactos sin temporizadores adicionales.

### Corium y launcher

- Corium acompaña la escena con una única explicación breve y no cambia con cada módulo.
- El launcher público se oculta mientras el Hero o el ecosistema contienen una representación propia de Corium.
- Fuera de esas escenas reaparece el launcher contextual habitual.

### Motion, reduced motion y rendimiento

- La transición del panel usa `--ec-motion-medium`; cada flujo termina en un estado estable.
- Solo se crean dos temporizadores para el módulo animado seleccionado y se limpian al cambiar, salir o desmontar.
- Un único `IntersectionObserver` local evita ejecutar la demo fuera del viewport.
- Con reduced motion no se ejecutan ciclos: el panel muestra directamente su estado final y elimina desplazamientos y progreso animado.
- No se añaden dependencias, imágenes ni listeners continuos.

### Responsive y estabilidad

- Desktop muestra selector lateral y panel protagonista.
- Tablet coloca el selector sobre el panel en una cuadrícula compacta.
- Móvil usa seis opciones en dos columnas y un único flujo vertical; no requiere arrastre horizontal.
- La superficie mantiene dimensiones previsibles para evitar CLS al cambiar de módulo.
- El CTA secundario `Probar estos módulos` conduce a Experience y conserva un área táctil mínima de 44 px.

## Perspectivas por rol

La sección pública de roles utiliza una única superficie transformable. La Home explica las prioridades de cada perfil mediante una síntesis visual; la navegación, los módulos completos y el Guided Tour siguen perteneciendo exclusivamente a EducaCora Experience.

### Fuente única de configuración

- `role-perspectives-data.ts` contiene Dirección, Docente y Familia, junto con su copy, beneficio, métricas, prioridades, acciones, acento y destino de Experience.
- Administración no forma parte de la selección pública de perspectivas. Su experiencia sigue existiendo donde corresponde dentro del producto.
- Todos los valores mostrados son ficticios y seguros para una superficie pública. No se consultan APIs, Supabase ni contenido de producción.
- Para añadir o modificar un perfil se actualiza únicamente `rolePerspectives`; selector, panel, resumen accesible y CTA consumen esa misma fuente.

### Selector y superficie

- `RolePerspectivesSection` conserva en servidor el encabezado, el mensaje principal y el puente narrativo desde los módulos conectados.
- `RolePerspectivesExperience` es el único componente cliente y contiene solo el rol activo, el selector y la transición visual.
- El selector usa `tablist`, `tab`, `tabpanel`, `aria-selected`, `aria-controls` y navegación con flechas, Inicio y Fin.
- Dirección, Docente y Familia cambian cabecera, métricas, prioridades, acciones, beneficios, acento y CTA dentro de la misma estructura estable.
- La representación se inspira en cards, badges, progreso, prioridades y estados del producto real, pero no importa dashboards protegidos ni su lógica.

### Diferencias por perfil

- Dirección prioriza visión global, supervisión académica, asistencia y comunicaciones relevantes.
- Docente prioriza jornada, pasar lista, cuaderno, alumnado y comunicación contextual.
- Familia prioriza comunicaciones, seguimiento académico, asistencia y próximas fechas.
- Cada perfil muestra un beneficio principal y tres beneficios secundarios sin convertir la Home en un dashboard operativo.

### Entrada contextual a Experience

- Los CTAs se generan con `getExperienceModuleHref` y conducen a `/experience/director`, `/experience/docente` y `/experience/familia`.
- La entrada usa navegación normal, no abre modales ni activa automáticamente el Guided Tour.
- La Home no incluye sidebar, selector interno de Experience, formularios, acciones completas ni persistencia demo.
- Experience conserva la navegación, el cambio de rol, los módulos completos, Corium Guided Tour y el flujo de finalización.

### Corium, motion y reduced motion

- Corium aparece una sola vez como acompañamiento del CTA y el launcher se oculta mientras la escena integrada está visible.
- El cambio de perfil usa una transición breve de opacidad y desplazamiento, y las barras muestran su valor final dentro del contenedor reservado.
- No existe autoplay, temporizador, almacenamiento, observer adicional ni rotación automática de roles.
- Con reduced motion se eliminan desplazamientos, escalas, progresiones y transiciones; toda la información permanece visible en su estado final.

### Responsive, estabilidad y rendimiento

- Desktop mantiene selector y superficie protagonista con producto y beneficios en dos columnas.
- Tablet coloca el selector arriba y reorganiza el resumen sin comprimir las métricas.
- Móvil muestra tres controles compactos y un único perfil activo, sin sidebar ni scroll horizontal.
- La superficie reserva una altura común por breakpoint para que títulos, métricas y CTA no desplacen las secciones siguientes al cambiar de perfil.
- El componente cliente no añade dependencias, imágenes pesadas, timers, listeners globales ni llamadas de red.

## Interacción y accesibilidad

- Un único `h1`; cada sección usa `h2` y los bloques internos `h3`.
- Foco visible mediante `--ec-ring-brand`.
- Contraste mínimo WCAG AA para texto y acciones.
- Controles táctiles de al menos 44 por 44 px.
- Los menús se cierran con Escape, al seleccionar y mediante una acción explícita.
- El movimiento nunca puede ser el único indicador de estado o interacción.

## Evolución

Los siguientes sprints deben consumir estos tokens antes de añadir estilos locales. No se introducirán nuevas dependencias de motion mientras CSS, `IntersectionObserver` y los componentes existentes cubran la necesidad.

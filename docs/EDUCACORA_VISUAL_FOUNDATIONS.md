# EducaCora Visual Foundations

Version: 1.0
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

## Interacción y accesibilidad

- Un único `h1`; cada sección usa `h2` y los bloques internos `h3`.
- Foco visible mediante `--ec-ring-brand`.
- Contraste mínimo WCAG AA para texto y acciones.
- Controles táctiles de al menos 44 por 44 px.
- Los menús se cierran con Escape, al seleccionar y mediante una acción explícita.
- El movimiento nunca puede ser el único indicador de estado o interacción.

## Evolución

Los siguientes sprints deben consumir estos tokens antes de añadir estilos locales. No se introducirán nuevas dependencias de motion mientras CSS, `IntersectionObserver` y los componentes existentes cubran la necesidad.

# EDUCACORA_EXPERIENCE_ARCHITECTURE.md

Version: 1.0  
Estado: Documento maestro  
Prioridad: CRITICA

---

# EDUCACORA EXPERIENCE

## Arquitectura oficial

**EducaCora Experience** es la experiencia interactiva oficial de demostracion de EducaCora.

NO es una landing tradicional.

NO es un video.

NO es una maqueta.

NO es un prototipo.

NO es un producto independiente.

EducaCora Experience es simplemente el propio producto funcionando sobre un entorno completamente aislado, utilizando datos ficticios y la identidad corporativa de EducaCora.

Este documento define la arquitectura obligatoria que debera respetarse durante todo el desarrollo.

Todas las decisiones futuras deberan ser compatibles con estas reglas.

---

# OBJETIVOS

EducaCora Experience tiene cinco objetivos principales.

## 1. Mostrar el producto real

El visitante debe utilizar el mismo software que utilizaria un colegio.

No debe percibir que esta navegando por una demo.

La sensacion debe ser la de estar trabajando dentro de EducaCora.

---

## 2. No duplicar el producto

EducaCora Experience nunca tendra una arquitectura paralela.

Todo componente reutilizable debera compartirse con el producto principal.

---

## 3. Reducir el mantenimiento

Cada mejora realizada en EducaCora debe reflejarse automaticamente en la Experience.

Nunca deberan mantenerse dos versiones del mismo dashboard.

---

## 4. Mantener seguridad absoluta

La Experience nunca utilizara informacion real.

Nunca accedera a datos de produccion.

Nunca escribira sobre Supabase.

---

## 5. Convertir visitantes en reuniones

La Experience no vende.

Demuestra.

El objetivo final consiste en generar confianza suficiente para que un centro educativo quiera mantener una reunion personalizada.

---

# FILOSOFIA

EducaCora Experience se basa en una idea sencilla.

"No explicar el producto.

Permitir experimentarlo."

Siempre que una funcionalidad pueda demostrarse de forma interactiva, nunca debera sustituirse por texto, capturas o videos.

---

# ARQUITECTURA GENERAL

El ecosistema queda dividido en dos grandes recorridos.

## HOME

La Home publica tiene tres funciones.

### Navegacion libre

Permite descubrir:

- Plataforma
- Modulos
- Corium AI
- Funcionalidades
- Blog (futuro)
- Precios (futuro)
- Contacto

La navegacion nunca obliga al usuario a iniciar la Experience.

---

### Acceder a mi centro

Pensado para usuarios existentes.

Incluye:

- Login
- Acceso al centro educativo
- Instalacion de la PWA
- Apertura directa de la aplicacion cuando sea posible

---

### Probar EducaCora

Da acceso a EducaCora Experience.

Ruta principal:

`/experience`

---

# EXPERIENCE

La Experience comienza con Corium AI.

Corium recibe al visitante.

Presenta brevemente la plataforma.

Pregunta:

"Â¿Que papel desempeÃ±as en tu centro educativo?"

Las rutas iniciales son:

- `/experience/director`
- `/experience/docente`
- `/experience/familia`

No existira inicialmente una ruta especifica para alumnado.

El alumnado aparecera unicamente dentro de las demostraciones.

---

# PRINCIPIO FUNDAMENTAL

Existe un unico producto.

Nunca existiran dos plataformas.

La Experience utiliza exactamente:

- los mismos dashboards
- los mismos componentes
- la misma navegacion
- la misma estructura
- la misma arquitectura

La Experience unicamente modifica cuatro elementos.

## Branding

Colegio PeÃ±afort

â†“

EducaCora

---

## Datos

Datos reales

â†“

Datos completamente ficticios

---

## Autenticacion

Login obligatorio

â†“

Acceso directo

---

## Escritura

Persistencia real

â†“

Persistencia simulada

---

Todo lo demas debe permanecer identico.

---

# REUTILIZACION

Todos los dashboards deberan reutilizar los componentes existentes.

Esta prohibido recrearlos.

Se reutilizaran:

- Sidebar
- Cards
- Tablas
- Cuaderno
- Comunicaciones
- Agenda
- Calendario
- Estadisticas
- Barras
- Graficos
- Corium AI
- Componentes UI

---

# BRANDING

La Experience nunca utilizara la identidad visual del Colegio PeÃ±afort.

Todo el branding sera sustituido por:

- Logo EducaCora
- Colores EducaCora
- Nombre EducaCora
- Centro ficticio

No deberan existir referencias visibles al Colegio PeÃ±afort.

---

# DATOS

Todos los datos utilizados seran ficticios.

Nunca se utilizaran:

- alumnos reales
- familias reales
- notas reales
- comunicaciones reales
- documentos reales
- estadisticas reales
- usuarios reales

Los datos deberan ser completamente inventados pero realistas.

---

# DEMO MODE

La Experience funcionara en un modo especifico.

Este modo permitira:

- navegar libremente
- modificar filtros
- abrir modulos
- probar funcionalidades
- generar ejemplos
- utilizar Corium

Sin embargo:

No escribira nunca sobre produccion.

Los cambios podran mantenerse unicamente durante la sesion.

Opcionalmente podran almacenarse en memoria local.

Siempre debera existir un boton:

Restablecer Experience

---

# CORIUM AI

Corium es el guia oficial de la Experience.

No sustituye la navegacion.

No fuerza acciones.

No invade la interfaz.

Aparece unicamente:

- bienvenida
- seleccion de rol
- cierre de cada experiencia
- ayuda contextual

Su personalidad debe ser:

- cercana
- profesional
- elegante
- util

Nunca infantil.

Nunca excesivamente hablador.

---

# CAMBIO DE ROL

Desde cualquier dashboard demo debera existir un acceso permanente:

Explorar otro perfil

Permitira cambiar entre:

- Direccion
- Docente
- Familias

Sin abandonar la Experience.

---

# FINAL DE LA EXPERIENCE

Al finalizar cualquier recorrido aparecera Corium.

Nunca se utilizara lenguaje comercial agresivo.

El mensaje sera similar a:

"Ahora ya conoces como funciona EducaCora desde esta perspectiva."

"Cada centro educativo es diferente."

"Nos encantara enseÃ±arte como EducaCora puede adaptarse a vuestra realidad."

Botones:

- Estoy interesado
- Contactar

En futuras versiones:

Reserva automatica de reuniones.

---

# DECISIONES PROHIBIDAS

Queda terminantemente prohibido:

- Duplicar dashboards
- Copiar paginas completas
- Crear componentes paralelos
- Mantener dos versiones del mismo modulo
- Modificar Supabase
- Modificar Auth
- Modificar RLS
- Crear una demo independiente
- Crear un backend especifico para la Experience
- Utilizar datos reales
- Romper la reutilizacion
- Alterar el producto principal unicamente para beneficiar la demo

---

# PRINCIPIOS DE DESARROLLO

Todo desarrollo debera respetar:

## Principio 1

Un unico producto.

---

## Principio 2

Una unica arquitectura.

---

## Principio 3

Una unica coleccion de componentes.

---

## Principio 4

Una unica logica de negocio.

---

## Principio 5

La Experience reutiliza.

Nunca copia.

---

## Principio 6

Toda mejora realizada en EducaCora mejora automaticamente la Experience.

---

## Principio 7

El visitante debe olvidar que esta utilizando una demostracion.

---

## Principio 8

La Experience debe poder mantenerse durante aÃ±os con un coste minimo.

---

# ROADMAP

Fase 1

- Crear la arquitectura Experience.
- Crear Demo Mode.
- Separar branding.
- Crear datos ficticios.

Fase 2

- Director
- Docente
- Familias

Fase 3

- Selector de perfiles
- Restablecer demo
- Contacto

Fase 4

- Mejoras visuales
- Animaciones
- Microinteracciones
- Storytelling opcional

---

# REGLA DE ORO

EducaCora Experience NO ES un proyecto independiente.

Es exactamente el mismo producto ejecutandose en un entorno de demostracion.

Si en algun momento una decision arquitectonica obliga a mantener dos versiones distintas de un mismo dashboard, componente o funcionalidad, dicha decision debera considerarse incorrecta y debera replantearse antes de implementarse.

La reutilizacion, la simplicidad y la mantenibilidad tienen prioridad absoluta sobre cualquier solucion rapida basada en duplicar codigo.
---

# CORIUM GUIDED TOUR

## Objetivo

El Guided Tour convierte la accion "Guiarme" de Corium en un recorrido semiautomatico dentro de EducaCora Experience. Corium no ejecuta IA real, no llama a proveedores externos y no modifica datos: solo coordina navegacion, scroll, resaltado visual y explicacion contextual sobre las vistas existentes.

## Arquitectura

La configuracion vive en `src/lib/experience/guided-tour.ts` y define pasos por rol mediante una estructura declarativa:

- `GuidedTourStep`
- `GuidedTourState`
- `GuidedTourStatus`
- `GuidedTourTarget`

Cada paso declara:

- rol;
- modulo Experience existente;
- target visual;
- titulo;
- descripcion;
- beneficio;
- clave de progreso cuando procede.

La interfaz visual se renderiza con `GuidedTourOverlay`, mientras que `ExperienceShell` orquesta el estado, la navegacion y la persistencia.

## Estados

El tour utiliza los estados:

- `idle`: sin recorrido activo.
- `active`: Corium esta guiando el paso actual.
- `paused`: el visitante ha pausado o navegado manualmente.
- `completed`: se ha completado el recorrido del rol.
- `exited`: el visitante ha salido para explorar por su cuenta.

## Recorridos por rol

### Docente

1. Panel.
2. Pasar lista.
3. Cuaderno de Calificaciones.
4. Mis alumnos / ficha del alumno.
5. Comunicaciones.
6. Calendario.

### Direccion

1. Panel.
2. Centro de supervision.
3. Comunicaciones.
4. Alumnado.
5. Supervision academica.
6. Asistencia.
7. Calendario.

### Familia

1. Panel.
2. Comunicaciones.
3. Calificaciones.
4. Asistencia.
5. Perfil del alumno.
6. Calendario.

## Targets

Los pasos se apoyan en `data-experience-target` sobre elementos existentes. Los targets actuales son:

- `dashboard-summary`
- `director-supervision-summary`
- `attendance-primary-action`
- `attendance-family-summary`
- `gradebook-overview`
- `family-grades-summary`
- `student-profile-summary`
- `communications-overview`
- `calendar-overview`
- `demo-panel`

No se deben crear wrappers innecesarios ni duplicar vistas para anadir targets. Si un target no aparece, el tour usa el encabezado del modulo como fallback y permite continuar.

## Navegacion y progreso

El tour reutiliza `getExperienceModuleHref`, `getActiveExperienceModuleKey` y las rutas existentes de Experience. No existen rutas protegidas ni navegacion paralela. Al visitar un modulo mediante el tour se actualiza tambien el progreso general de Experience, sin duplicar conteos.

## Persistencia

El estado se guarda con `demo-storage.ts` usando `sessionStorage` y el scope `tour`. La persistencia es independiente por rol y no sobrevive fuera de la sesion del navegador.

## Comportamiento responsive

En escritorio se muestra un panel compacto de Corium en la esquina inferior derecha. En movil y tablet el mismo componente actua como una tarjeta inferior que respeta safe areas. Durante el tour se oculta el boton flotante normal de Corium para evitar duplicidad visual.

## Finalizar recorrido

Completar el tour no finaliza la Experience. El panel final ofrece:

- explorar por cuenta propia;
- probar otro perfil;
- contactar;
- volver a la web;
- repetir la guia.

El boton persistente "Finalizar recorrido" de Experience sigue funcionando y cierra el tour antes de abrir el panel final general.

## Seguridad

El Guided Tour no llama a Supabase, Auth, RLS, server actions, APIs de IA ni proveedores externos. Tampoco envia comunicaciones, guarda asistencia real, modifica calificaciones ni ejecuta acciones destructivas. Solo usa datos ficticios de Experience.

## Como anadir un paso

1. Anadir el paso en `guidedTourSteps` con un `module` ya existente.
2. Usar un target existente o anadir un `data-experience-target` minimo sobre un elemento real.
3. Definir `completionKey` si el paso debe contar para el progreso general.
4. Validar que el modulo abre con `getExperienceModuleHref`.
5. Probar escritorio, tablet y movil.


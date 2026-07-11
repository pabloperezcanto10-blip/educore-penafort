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

"¿Que papel desempeñas en tu centro educativo?"

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

Colegio Peñafort

↓

EducaCora

---

## Datos

Datos reales

↓

Datos completamente ficticios

---

## Autenticacion

Login obligatorio

↓

Acceso directo

---

## Escritura

Persistencia real

↓

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

La Experience nunca utilizara la identidad visual del Colegio Peñafort.

Todo el branding sera sustituido por:

- Logo EducaCora
- Colores EducaCora
- Nombre EducaCora
- Centro ficticio

No deberan existir referencias visibles al Colegio Peñafort.

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

"Nos encantara enseñarte como EducaCora puede adaptarse a vuestra realidad."

Botones:

- Solicitar una reunion
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

La Experience debe poder mantenerse durante años con un coste minimo.

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

# EduCore AI

## Estado actual

EduCore AI fase 1 está implementado como asistente flotante para usuarios internos autenticados.

Aparece en las rutas protegidas cuando:

```env
AI_ASSISTANT_ENABLED=true
```

Roles permitidos:

- tutor/profesor;
- director;
- superadmin/admin técnico.

No aparece para familias.

## Proveedor recomendado

Proveedor inicial recomendado:

```env
AI_PROVIDER=groq
```

Groq se usa para el MVP por su baja latencia y disponibilidad de planes gratuitos o de prueba según la cuenta.

Gemini queda preparado como alternativa:

```env
AI_PROVIDER=gemini
```

OpenAI queda preparado, pero no se usa salvo configuración explícita:

```env
AI_PROVIDER=openai
```

## Variables de entorno

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=groq
GROQ_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=
```

No usar `NEXT_PUBLIC_` para claves de IA.

## Comportamiento del widget

Componente:

`src/components/ai/educore-assistant-button.tsx`

Características:

- botón flotante inferior derecho `EduCore AI`;
- panel lateral con título `EduCore Assistant`;
- texto inicial `¿En qué te ayudo?`;
- historial local durante la sesión;
- textarea con límite de 2000 caracteres;
- bloqueo de mensajes vacíos;
- estado de carga;
- error amable;
- botón copiar en respuestas;
- sugerencias rápidas.

Sugerencias incluidas:

- Redactar mensaje a familia;
- Mejorar observación;
- Generar recomendación de refuerzo;
- Transformar incidencia en mensaje formal;
- Preparar actividad;
- Redactar comunicado.

## Endpoint

Ruta:

`/api/ai/chat`

Archivo:

`src/app/api/ai/chat/route.ts`

Validaciones:

- usuario autenticado;
- perfil activo;
- contraseña obligatoria ya cambiada;
- rol permitido;
- `AI_ASSISTANT_ENABLED=true`;
- mensaje no vacío;
- longitud máxima 2000 caracteres;
- clave del proveedor seleccionado configurada.

## Privacidad fase 1

El endpoint no envía automáticamente:

- datos de alumnos;
- notas;
- incidencias;
- asistencia;
- comunicaciones privadas;
- información médica;
- información familiar;
- historial académico;
- estadísticas internas.

Solo se envía al proveedor:

- rol del usuario;
- ruta actual;
- texto escrito manualmente por el usuario;
- historial local del chat de la sesión.

## Prompt del sistema

El asistente se comporta como asistente educativo profesional de EduCore. Ayuda a redactar, mejorar, resumir y estructurar textos escolares. Responde en español claro, formal y prudente. No inventa datos del alumno o del centro. Si falta información, la pide. Genera borradores revisables por un humano, no decisiones automáticas.

## Funcionalidades pospuestas

No incluidas en fase 1:

- contexto automático de alumno;
- consulta de notas, asistencia o incidencias;
- resumen automático de comunicaciones privadas;
- almacenamiento de conversaciones;
- trazabilidad completa del contenido;
- herramientas de acción directa;
- generación contextual de informes completos.

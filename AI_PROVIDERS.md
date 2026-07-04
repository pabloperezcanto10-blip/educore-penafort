# Proveedores de IA para EduCore AI

EduCore AI puede usar distintos proveedores sin exponer claves al navegador. Todas las claves deben configurarse solo en variables de entorno de servidor, nunca con `NEXT_PUBLIC_`.

## Configuración recomendada para MVP

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=groq
GROQ_API_KEY=tu_clave_groq
GEMINI_API_KEY=
OPENAI_API_KEY=
```

Proveedor recomendado para pruebas iniciales: **Groq**.

## Groq

1. Ir a https://console.groq.com/keys
2. Crear una API key.
3. Copiar la clave.
4. Pegarla en `.env.local`:

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=groq
GROQ_API_KEY=gsk_xxxxxx
```

En Vercel:

Project -> Settings -> Environment Variables

Añadir:

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=groq
GROQ_API_KEY=gsk_xxxxxx
```

Después hacer redeploy.

## Gemini

1. Ir a https://aistudio.google.com/app/apikey
2. Crear una API key.
3. Copiar la clave.
4. Pegarla en `.env.local`:

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=gemini
GEMINI_API_KEY=tu_clave_gemini
```

En Vercel añadir las mismas variables y redeploy.

## OpenAI preparado, no usado por defecto

OpenAI solo se usará si se configura explícitamente:

```env
AI_ASSISTANT_ENABLED=true
AI_PROVIDER=openai
OPENAI_API_KEY=sk-xxxxxx
```

Si `AI_PROVIDER` no es `openai`, EduCore AI no llama a OpenAI.

## Desactivar EduCore AI

Para evitar cualquier llamada externa:

```env
AI_ASSISTANT_ENABLED=false
```

Con este valor, el botón no aparece y `/api/ai/chat` devuelve:

"El asistente IA no está activado."

## Errores controlados

Si el proveedor seleccionado no tiene clave configurada, EduCore AI devuelve:

"El asistente todavía no está configurado."

## Límites gratuitos

Los límites gratuitos dependen del proveedor, la cuenta y sus políticas vigentes. Revisa el panel de Groq o Google AI Studio antes de usarlo con usuarios reales.

## Privacidad en Fase 1

EduCore AI no consulta automáticamente notas, asistencia, incidencias, expedientes, datos familiares ni comunicaciones completas. Solo envía al proveedor:

- rol del usuario
- ruta actual
- texto escrito manualmente por el usuario

No se deben pegar datos sensibles si no son necesarios para redactar el texto.

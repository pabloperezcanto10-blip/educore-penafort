# Configurar Corium AI

## PASO 1

Ir a:
https://platform.openai.com/api-keys

## PASO 2

Crear una nueva API key.

## PASO 3

Copiar la API key generada.

## PASO 4

Pegarla en `.env.local`:

```env
OPENAI_API_KEY=sk-xxxxxx
```

No uses `NEXT_PUBLIC_`: esta variable debe existir solo en servidor.

## PASO 5

En Vercel:

Project -> Settings -> Environment Variables

Añadir:

```env
OPENAI_API_KEY=sk-xxxxxx
```

## PASO 6

Hacer redeploy del proyecto en Vercel para que la variable quede cargada.

Si la variable no existe o esta vacia, Corium AI mostrara:

"El asistente todavía no está configurado."

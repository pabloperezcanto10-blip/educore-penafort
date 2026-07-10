# Corium AI Integration

## Auditoría de ubicaciones

Ubicaciones actuales relacionadas con el asistente:

- `src/components/ai/educore-assistant-button.tsx`
  - Widget flotante compartido.
  - Panel de chat.
  - Sugerencias rápidas.
  - Historial local de sesión.
- `src/components/layout/app-shell.tsx`
  - Monta el widget flotante en áreas internas cuando `AI_ASSISTANT_ENABLED=true`.
  - Roles actuales: tutor, director y superadmin.
- `src/app/api/ai/chat/route.ts`
  - Endpoint backend del asistente.
  - No se modifica en esta integración visual.
- `src/lib/ai/providers.ts`
  - Proveedores Groq, Gemini y OpenAI.
  - No se modifica en esta integración visual.
- `src/app/page.tsx`
  - Home pública de EducaCora.
  - Se añade una sección informativa `Conoce a Corium AI`.

## Assets oficiales utilizados

Todos los recursos visuales proceden de:

`public/brand/corium/`

No se generaron variantes nuevas ni se redibujó la mascota.

## Ruta futura

La futura landing específica queda reservada conceptualmente en:

`/corium-ai`

No se crea todavía una página pública. Solo existe documentación de arquitectura en:

`src/app/corium-ai/README.md`

## Alcance

Esta integración modifica únicamente identidad visual del asistente y presencia informativa en la Home. No cambia API, proveedores, permisos, datos, historial, streaming ni lógica de IA.

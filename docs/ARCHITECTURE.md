# Arquitectura EducaCora

## Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS
- Supabase Auth y Database
- Vercel como despliegue objetivo

## Layout protegido

Las rutas internas usan `src/app/(protected)/layout.tsx`.

Ese layout:

1. obtiene el perfil autenticado;
2. redirige a `/login` si no hay sesión;
3. bloquea usuarios inactivos;
4. redirige a `/change-password` si `must_change_password=true`;
5. carga el curso escolar activo;
6. renderiza `AppShell`.

`src/components/layout/app-shell.tsx` centraliza el header global y monta el widget flotante de Corium AI cuando:

- `AI_ASSISTANT_ENABLED === "true"`;
- el rol es `tutor`, `director` o `superadmin`.

## Corium AI

El cliente nunca llama directamente a proveedores externos.

Flujo:

1. El botón flotante de Corium AI mantiene historial local en memoria de sesión.
2. El widget envía peticiones a `/api/ai/chat`.
3. El endpoint valida sesión, rol y flag.
4. El endpoint selecciona proveedor mediante `src/lib/ai/providers.ts`.
5. Solo el backend lee `GROQ_API_KEY`, `GEMINI_API_KEY` u `OPENAI_API_KEY`.

## Proveedores AI

Proveedor inicial recomendado: Groq.

Variables principales:

- `AI_ASSISTANT_ENABLED`
- `AI_PROVIDER`
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`

OpenAI solo se usa si `AI_PROVIDER=openai`.

## Fundación multitenant

El Sprint 20.1 añade una base multitenant aditiva, todavía no conectada a los
dashboards ni a las tablas operativas. La fuente de verdad, estrategia de
compatibilidad, RLS, staging, backfill y rollback se documenta en
[`MULTITENANT_ARCHITECTURE.md`](./MULTITENANT_ARCHITECTURE.md).

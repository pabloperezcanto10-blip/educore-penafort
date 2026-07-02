# Colegio Peñafort Platform

Plataforma escolar profesional construida con Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase y preparada para Vercel.

## Estado actual

- Autenticación con Supabase Auth.
- Roles `director`, `tutor` y `family`.
- Protección de rutas por sesión y por rol.
- Dashboards base para cada rol.
- Migración SQL inicial para perfiles, roles, RLS y trigger de alta.

No incluye todavía asistencia, notas, mensajería ni documentos.

## Configuración local

1. Copia `.env.example` a `.env.local`.
2. Completa `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
3. Ejecuta la migración de `supabase/migrations/001_initial_auth_roles.sql` en Supabase.
4. Instala dependencias y levanta el entorno:

```bash
pnpm install
pnpm dev
```

## Variables para Vercel

Configura en Vercel:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_APP_URL`

## Primer acceso

El trigger crea automáticamente un perfil con rol `family` para cada nuevo usuario. Para cambiar el rol inicial de una cuenta, actualiza `public.profiles.role` desde Supabase.

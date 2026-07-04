# EduCore - Contexto del proyecto

EduCore es una plataforma SaaS educativa configurada actualmente para la instancia Colegio Peñafort.

## Estado funcional actual

La plataforma incluye módulos operativos para:

- autenticación con Supabase Auth;
- roles `tutor`, `family`, `director` y `superadmin`;
- dashboard tutor;
- dashboard familia;
- dashboard dirección;
- dashboard superadmin;
- alumnos y fichas individuales;
- comunicaciones internas;
- asistencia;
- incidencias;
- observaciones internas;
- calificaciones, criterios de evaluación y cierres;
- boletines PDF;
- calendario público del centro;
- importación masiva;
- horario docente;
- auditoría básica;
- EduCore AI fase 1.

## EduCore AI fase 1

EduCore AI está disponible como asistente flotante para roles internos cuando `AI_ASSISTANT_ENABLED=true`.

Roles con acceso:

- tutor/profesor;
- director;
- superadmin.

No está disponible para familias.

La fase 1 no usa contexto académico automático. Solo trabaja con el texto escrito manualmente por el usuario, el rol y la ruta actual.

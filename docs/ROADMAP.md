# Roadmap EducaCora

## Completado

- Autenticación y roles.
- Dashboards principales por rol.
- Fichas de alumno.
- Comunicaciones internas.
- Asistencia.
- Incidencias y observaciones internas.
- Calificaciones, criterios, cierres y boletines.
- Superadmin y mantenimiento.
- Importación masiva.
- Horario docente.
- Auditoría básica.
- Corium AI fase 1: asistente flotante sin contexto sensible automático.

## Próximas fases recomendadas

1. Corium AI contextual con permisos explícitos.
2. Panel de configuración AI para superadmin.
3. Plantillas institucionales para mensajes y boletines.
4. Mejoras de reporting académico.
5. Exportaciones oficiales y flujos administrativos avanzados.

## Fundación multitenant

- Completado en staging: fundación `schools`/`school_memberships`.
- Completado en staging: identidad tenant de Peñafort y memberships QA.
- Completado en staging: configuración académica tenant-aware
  (`academic_years`, `courses`, `subjects`, `course_subjects`) con RLS,
  unicidad por centro y relaciones compuestas.
- Pendiente: retirar el centro operativo por defecto cuando todas las rutas
  propaguen un contexto de centro seleccionado.
- Pendiente: rediseñar y validar la propuesta 037 de personas antes de
  aplicarla. No se ha iniciado ningún backfill de personas u operativa.
- Producción y `main` permanecen en el estado anterior a estas oleadas.

## Corium AI futuro

La futura versión contextual deberá:

- pedir confirmación antes de usar datos sensibles;
- aplicar permisos por rol;
- registrar auditoría ampliada;
- permitir seleccionar contexto concreto;
- evitar envío masivo de datos privados;
- mostrar siempre borradores revisables por humanos.

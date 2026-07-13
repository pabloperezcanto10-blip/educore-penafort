import type { ExperienceModuleKey, ExperienceRole } from "@/components/experience/experience-data";

export type GuidedTourStatus = "idle" | "active" | "paused" | "completed" | "exited";
export type GuidedTourPosition = "auto" | "right" | "bottom" | "left" | "center";
export type GuidedTourTarget = string;

export type GuidedTourStep = {
  id: string;
  role: ExperienceRole;
  order: number;
  module: ExperienceModuleKey;
  target: GuidedTourTarget;
  title: string;
  description: string;
  benefit: string;
  position?: GuidedTourPosition;
  optional?: boolean;
  completionKey?: ExperienceModuleKey;
};

export type GuidedTourState = {
  role: ExperienceRole;
  status: GuidedTourStatus;
  stepIndex: number;
  stepId?: string;
  startedAt?: string;
  completed?: boolean;
  paused?: boolean;
};

export const guidedTourSteps: Record<ExperienceRole, GuidedTourStep[]> = {
  docente: [
    { id: "teacher-panel", role: "docente", order: 1, module: "panel", target: "dashboard-summary", title: "Tu jornada de un vistazo", description: "Consulta clases, tareas pendientes, comunicaciones y proximos eventos desde un unico panel.", benefit: "Empiezas el dia sabiendo que necesita tu atencion." },
    { id: "teacher-attendance", role: "docente", order: 2, module: "attendance", target: "attendance-primary-action", title: "Asistencia rapida", description: "Registra la asistencia del grupo desde el horario o el modulo de asistencia.", benefit: "Reduce pasos y mantiene la informacion actualizada para el centro y las familias.", completionKey: "attendance" },
    { id: "teacher-gradebook", role: "docente", order: 3, module: "gradebook", target: "gradebook-overview", title: "Seguimiento academico", description: "Gestiona criterios, calificaciones, observaciones y recomendaciones.", benefit: "Todo el seguimiento del alumno queda organizado en una misma herramienta.", completionKey: "gradebook" },
    { id: "teacher-students", role: "docente", order: 4, module: "students", target: "student-profile-summary", title: "Cada alumno en contexto", description: "Consulta la ficha, evolucion, asistencia y comunicaciones relacionadas.", benefit: "Evita buscar informacion en aplicaciones y documentos separados.", completionKey: "students" },
    { id: "teacher-communications", role: "docente", order: 5, module: "communications", target: "communications-overview", title: "Comunicacion centralizada", description: "Envia avisos y conserva el seguimiento de las conversaciones con las familias.", benefit: "Cada comunicacion queda organizada y disponible para su consulta.", completionKey: "communications" },
    { id: "teacher-calendar", role: "docente", order: 6, module: "calendar", target: "calendar-overview", title: "Organiza el dia a dia", description: "Consulta reuniones, evaluaciones, tutorias y eventos del centro.", benefit: "Docencia y coordinacion comparten una misma referencia temporal.", completionKey: "calendar" }
  ],
  director: [
    { id: "director-panel", role: "director", order: 1, module: "panel", target: "dashboard-summary", title: "Una vision global del centro", description: "Consulta prioridades, incidencias, comunicaciones y actividad academica.", benefit: "Direccion identifica rapidamente que requiere seguimiento." },
    { id: "director-supervision", role: "director", order: 2, module: "panel", target: "director-supervision-summary", title: "Centro de supervision", description: "Revisa prioridades, alumnado, comunicaciones, evaluaciones y calendario.", benefit: "Centraliza la informacion clave sin entrar modulo por modulo." },
    { id: "director-communications", role: "director", order: 3, module: "communications", target: "communications-overview", title: "Comunicacion institucional", description: "Supervisa avisos, publicaciones y comunicaciones relevantes.", benefit: "Mejora la trazabilidad y reduce la dispersion de la informacion.", completionKey: "communications" },
    { id: "director-students", role: "director", order: 4, module: "students", target: "student-profile-summary", title: "Seguimiento del alumnado", description: "Consulta fichas, estados y contexto academico desde una vista centralizada.", benefit: "Facilita una supervision coherente entre direccion y docentes.", completionKey: "students" },
    { id: "director-gradebook", role: "director", order: 5, module: "gradebook", target: "gradebook-overview", title: "Estado academico del centro", description: "Revisa evaluaciones, cierres y progreso academico por grupos y materias.", benefit: "Permite detectar pendientes antes de que se conviertan en incidencias.", completionKey: "gradebook" },
    { id: "director-attendance", role: "director", order: 6, module: "attendance", target: "attendance-primary-action", title: "Control de asistencia", description: "Consulta ausencias, retrasos y evolucion de los registros.", benefit: "Direccion dispone de informacion actualizada para tomar decisiones.", completionKey: "attendance" },
    { id: "director-calendar", role: "director", order: 7, module: "calendar", target: "calendar-overview", title: "Agenda compartida", description: "Coordina reuniones, evaluaciones, eventos y fechas relevantes.", benefit: "Todo el centro trabaja con una planificacion comun.", completionKey: "calendar" }
  ],
  familia: [
    { id: "family-panel", role: "familia", order: 1, module: "panel", target: "dashboard-summary", title: "Todo lo importante en un vistazo", description: "Consulta avisos, novedades academicas, asistencia y proximos eventos.", benefit: "La familia sabe que necesita revisar sin buscar en varios canales." },
    { id: "family-communications", role: "familia", order: 2, module: "communications", target: "communications-overview", title: "Comunicacion con el centro", description: "Recibe avisos y consulta las comunicaciones relacionadas con tus hijos.", benefit: "Reduce perdidas de informacion y mantiene el historial organizado.", completionKey: "communications" },
    { id: "family-grades", role: "familia", order: 3, module: "gradebook", target: "family-grades-summary", title: "Seguimiento academico claro", description: "Consulta notas, observaciones y recomendaciones del profesorado.", benefit: "La informacion academica se presenta de forma comprensible y contextualizada.", completionKey: "gradebook" },
    { id: "family-attendance", role: "familia", order: 4, module: "attendance", target: "attendance-family-summary", title: "Asistencia actualizada", description: "Consulta ausencias y estados relacionados con la asistencia.", benefit: "La familia dispone de informacion directa y transparente.", completionKey: "attendance" },
    { id: "family-student", role: "familia", order: 5, module: "students", target: "student-profile-summary", title: "Una vision completa", description: "Accede a la informacion principal del alumno desde un unico espacio.", benefit: "Seguimiento academico y comunicacion quedan conectados.", completionKey: "students" },
    { id: "family-calendar", role: "familia", order: 6, module: "calendar", target: "calendar-overview", title: "Proximas fechas", description: "Consulta reuniones, eventos, evaluaciones y actividades relevantes.", benefit: "Ayuda a organizar la vida escolar de la familia.", completionKey: "calendar" }
  ]
};

export function getGuidedTourSteps(role: ExperienceRole) {
  return guidedTourSteps[role];
}

export function createGuidedTourState(role: ExperienceRole, status: GuidedTourStatus = "idle", stepIndex = 0): GuidedTourState {
  const step = getGuidedTourSteps(role)[stepIndex];
  return {
    role,
    status,
    stepIndex,
    stepId: step?.id,
    startedAt: status === "idle" ? undefined : new Date().toISOString(),
    completed: status === "completed",
    paused: status === "paused"
  };
}

export function getGuidedTourStep(role: ExperienceRole, stepIndex: number) {
  const steps = getGuidedTourSteps(role);
  return steps[Math.max(0, Math.min(stepIndex, steps.length - 1))];
}

export function normalizeGuidedTourState(role: ExperienceRole, state: GuidedTourState | null): GuidedTourState {
  if (!state || state.role !== role) {
    return createGuidedTourState(role);
  }

  const steps = getGuidedTourSteps(role);
  const safeIndex = Math.max(0, Math.min(state.stepIndex, steps.length - 1));
  const step = steps[safeIndex];

  return {
    ...state,
    role,
    stepIndex: safeIndex,
    stepId: step?.id,
    completed: state.status === "completed" || Boolean(state.completed),
    paused: state.status === "paused"
  };
}

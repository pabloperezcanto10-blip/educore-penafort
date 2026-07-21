export type ConnectedModuleId =
  | "attendance"
  | "gradebook"
  | "communications"
  | "students"
  | "calendar"
  | "supervision";

export type ConnectedModuleIcon =
  | "attendance"
  | "gradebook"
  | "communications"
  | "students"
  | "calendar"
  | "supervision";

export type ConnectedModuleAccent = "green" | "gold" | "blue" | "navy";
export type ConnectedModuleDemoType = "attendance" | "communication" | "academic" | "static";

export type ConnectedModuleStep = {
  role: string;
  title: string;
  detail: string;
  status: string;
};

export type ConnectedModule = {
  id: ConnectedModuleId;
  title: string;
  shortTitle: string;
  description: string;
  benefit: string;
  icon: ConnectedModuleIcon;
  accent: ConnectedModuleAccent;
  demoType: ConnectedModuleDemoType;
  relatedRoles: readonly string[];
  metric: {
    label: string;
    value: string;
    progress: number;
  };
  context: {
    eyebrow: string;
    title: string;
    detail: string;
  };
  steps: readonly [ConnectedModuleStep, ConnectedModuleStep, ConnectedModuleStep];
};

export const connectedModules: readonly ConnectedModule[] = [
  {
    id: "attendance",
    title: "Asistencia",
    shortTitle: "Asistencia",
    description: "Registra ausencias y retrasos desde el flujo diario del docente.",
    benefit: "La asistencia se registra una vez y queda disponible para quienes la necesitan.",
    icon: "attendance",
    accent: "green",
    demoType: "attendance",
    relatedRoles: ["Docente", "Dirección", "Familia"],
    metric: { label: "Asistencia del grupo", value: "96%", progress: 96 },
    context: {
      eyebrow: "6.º de Primaria",
      title: "Lucía Romero",
      detail: "Ausencia justificada"
    },
    steps: [
      { role: "Docente", title: "Ausencia registrada", detail: "Lucía Romero", status: "Registrada" },
      { role: "Dirección", title: "Resumen actualizado", detail: "Asistencia del grupo · 96%", status: "Actualizado" },
      { role: "Familia", title: "Estado disponible", detail: "Ausencia justificada", status: "Visible" }
    ]
  },
  {
    id: "gradebook",
    title: "Cuaderno de Calificaciones",
    shortTitle: "Cuaderno",
    description: "Criterios, notas y observaciones comparten un mismo seguimiento académico.",
    benefit: "El seguimiento conecta evaluación, supervisión y acompañamiento familiar.",
    icon: "gradebook",
    accent: "gold",
    demoType: "academic",
    relatedRoles: ["Docente", "Dirección", "Familia"],
    metric: { label: "Progreso trimestral", value: "78%", progress: 78 },
    context: {
      eyebrow: "Matemáticas",
      title: "Progreso académico",
      detail: "Observación y recomendación disponibles"
    },
    steps: [
      { role: "Docente", title: "Cuaderno actualizado", detail: "Matemáticas · 78%", status: "Guardado" },
      { role: "Dirección", title: "Progreso consultado", detail: "Vista de supervisión", status: "Revisado" },
      { role: "Familia", title: "Seguimiento visible", detail: "Observación y recomendación", status: "Visible" }
    ]
  },
  {
    id: "communications",
    title: "Comunicaciones",
    shortTitle: "Comunicación",
    description: "Cada conversación conserva contexto, estado y trazabilidad para el centro.",
    benefit: "Cada aviso conserva su estado y seguimiento.",
    icon: "communications",
    accent: "blue",
    demoType: "communication",
    relatedRoles: ["Centro", "Docente", "Familias"],
    metric: { label: "Familias informadas", value: "18/22", progress: 82 },
    context: {
      eyebrow: "Reunión de evaluación",
      title: "Comunicación a familias",
      detail: "Seguimiento de entrega y lectura"
    },
    steps: [
      { role: "Centro", title: "Comunicación enviada", detail: "Reunión de evaluación", status: "Enviada" },
      { role: "Familias", title: "Notificación recibida", detail: "18 de 22 familias", status: "Recibida" },
      { role: "Seguimiento", title: "Lectura confirmada", detail: "Estado trazable", status: "Leída" }
    ]
  },
  {
    id: "students",
    title: "Alumnado",
    shortTitle: "Alumnado",
    description: "La ficha reúne el contexto necesario para acompañar a cada alumno.",
    benefit: "La información académica y de seguimiento permanece ordenada en un solo espacio.",
    icon: "students",
    accent: "navy",
    demoType: "static",
    relatedRoles: ["Tutor", "Dirección", "Familia"],
    metric: { label: "Seguimiento reciente", value: "3 hitos", progress: 68 },
    context: {
      eyebrow: "6.º de Primaria",
      title: "Lucía Romero",
      detail: "Ficha académica y seguimiento"
    },
    steps: [
      { role: "Ficha", title: "Contexto académico", detail: "Curso y tutoría", status: "Activo" },
      { role: "Seguimiento", title: "Asistencia y progreso", detail: "Información relacionada", status: "Al día" },
      { role: "Comunicación", title: "Familia conectada", detail: "Historial contextual", status: "Disponible" }
    ]
  },
  {
    id: "calendar",
    title: "Calendario",
    shortTitle: "Calendario",
    description: "Fechas académicas, tutorías y eventos comparten una agenda coordinada.",
    benefit: "Cada perfil consulta las fechas relevantes sin perder el contexto del centro.",
    icon: "calendar",
    accent: "green",
    demoType: "static",
    relatedRoles: ["Dirección", "Docente", "Familia"],
    metric: { label: "Próximos eventos", value: "3", progress: 75 },
    context: {
      eyebrow: "Agenda compartida",
      title: "Semana del centro",
      detail: "Evaluación, tutoría y evento"
    },
    steps: [
      { role: "Evaluación", title: "Cierre trimestral", detail: "Lunes · 16:00", status: "Próximo" },
      { role: "Tutoría", title: "Reunión con familias", detail: "Miércoles · 17:30", status: "Confirmada" },
      { role: "Centro", title: "Actividad compartida", detail: "Viernes · 10:00", status: "Publicada" }
    ]
  },
  {
    id: "supervision",
    title: "Supervisión",
    shortTitle: "Supervisión",
    description: "Dirección consulta prioridades y actividad del colegio desde una visión global.",
    benefit: "La coordinación se apoya en información actualizada, no en procesos separados.",
    icon: "supervision",
    accent: "gold",
    demoType: "static",
    relatedRoles: ["Dirección", "Docentes", "Administración"],
    metric: { label: "Áreas coordinadas", value: "4/4", progress: 100 },
    context: {
      eyebrow: "Centro de control",
      title: "Actividad del colegio",
      detail: "Prioridades y seguimiento global"
    },
    steps: [
      { role: "Asistencia", title: "Grupos actualizados", detail: "Seguimiento diario", status: "Correcto" },
      { role: "Evaluación", title: "Cierres supervisados", detail: "Progreso trimestral", status: "En curso" },
      { role: "Comunicación", title: "Conversaciones trazables", detail: "Actividad del centro", status: "Visible" }
    ]
  }
] as const;

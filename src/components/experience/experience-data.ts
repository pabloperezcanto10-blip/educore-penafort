import {
  Bell,
  BookOpen,
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Home,
  MessageSquare,
  ShieldCheck,
  Users
} from "lucide-react";

export type ExperienceRole = "director" | "docente" | "familia";
export type ExperienceModuleKey = "panel" | "communications" | "students" | "gradebook" | "attendance" | "calendar" | "corium";

export type ExperienceModuleConfig = {
  key: ExperienceModuleKey;
  label: string;
  title: string;
  demo?: string;
  workTab?: string;
  icon: typeof Home;
  progress: boolean;
};

export const experienceRoles: Array<{
  id: ExperienceRole;
  label: string;
  description: string;
  href: string;
  icon: typeof Home;
}> = [
  {
    id: "director",
    label: "Dirección",
    description: "Supervisa actividad, prioridades, comunicaciones y evaluación del centro.",
    href: "/experience/director",
    icon: ShieldCheck
  },
  {
    id: "docente",
    label: "Docente",
    description: "Pasa lista, revisa alumnos, completa el cuaderno y responde comunicaciones.",
    href: "/experience/docente",
    icon: GraduationCap
  },
  {
    id: "familia",
    label: "Familia",
    description: "Consulta mensajes, asistencia, calificaciones visibles y boletines.",
    href: "/experience/familia",
    icon: Users
  }
];

export const experienceModulesByRole: Record<ExperienceRole, ExperienceModuleConfig[]> = {
  director: [
    { key: "panel", label: "Panel", title: "Panel de Dirección", icon: Home, progress: false },
    { key: "communications", label: "Comunicaciones", title: "Comunicaciones", demo: "communications", workTab: "comunicaciones", icon: MessageSquare, progress: true },
    { key: "students", label: "Alumnado", title: "Alumnado", demo: "students", workTab: "alumnos", icon: Users, progress: true },
    { key: "gradebook", label: "Supervisión académica", title: "Supervisión académica", demo: "gradebook", workTab: "evaluacion", icon: BookOpen, progress: true },
    { key: "attendance", label: "Asistencia", title: "Asistencia", demo: "attendance", workTab: "alumnos", icon: ClipboardList, progress: true },
    { key: "calendar", label: "Calendario", title: "Calendario", demo: "calendar", workTab: "calendario", icon: CalendarDays, progress: true },
    { key: "corium", label: "Corium AI", title: "Guía de Corium", icon: Bell, progress: false }
  ],
  docente: [
    { key: "panel", label: "Panel", title: "Panel docente", icon: Home, progress: false },
    { key: "attendance", label: "Pasar lista", title: "Pasar lista", demo: "attendance", workTab: "pendientes", icon: ClipboardList, progress: true },
    { key: "gradebook", label: "Cuaderno", title: "Cuaderno de Calificaciones", demo: "gradebook", workTab: "cuaderno", icon: BookOpen, progress: true },
    { key: "students", label: "Mis alumnos", title: "Mis alumnos", demo: "students", workTab: "alumnos", icon: Users, progress: true },
    { key: "communications", label: "Comunicaciones", title: "Comunicaciones", demo: "communications", workTab: "comunicaciones", icon: MessageSquare, progress: true },
    { key: "calendar", label: "Calendario", title: "Calendario", demo: "calendar", workTab: "calendario", icon: CalendarDays, progress: true },
    { key: "corium", label: "Corium AI", title: "Guía de Corium", icon: Bell, progress: false }
  ],
  familia: [
    { key: "panel", label: "Panel", title: "Panel familiar", icon: Home, progress: false },
    { key: "communications", label: "Comunicaciones", title: "Comunicaciones", demo: "communications", icon: MessageSquare, progress: true },
    { key: "students", label: "Alumno", title: "Alumno", demo: "student", icon: Users, progress: true },
    { key: "gradebook", label: "Calificaciones", title: "Calificaciones visibles", demo: "grades", icon: BookOpen, progress: true },
    { key: "attendance", label: "Asistencia", title: "Asistencia", demo: "attendance", icon: ClipboardList, progress: true },
    { key: "calendar", label: "Calendario", title: "Calendario", demo: "calendar", icon: CalendarDays, progress: true },
    { key: "corium", label: "Corium AI", title: "Guía de Corium", icon: Bell, progress: false }
  ]
};

export const experienceNavigation = experienceModulesByRole.docente;

const demoAliases: Record<string, ExperienceModuleKey> = {
  comunicaciones: "communications",
  communication: "communications",
  alumnos: "students",
  student: "students",
  "student-profile": "students",
  evaluacion: "gradebook",
  cuaderno: "gradebook",
  grades: "gradebook",
  asistencia: "attendance",
  pendientes: "attendance",
  calendario: "calendar",
  prioridades: "panel"
};

export function getExperienceModules(role: ExperienceRole) {
  return experienceModulesByRole[role];
}

export function getExperienceModule(role: ExperienceRole, key: ExperienceModuleKey) {
  return experienceModulesByRole[role].find((item) => item.key === key) ?? experienceModulesByRole[role][0];
}

export function getExperienceModuleHref(role: ExperienceRole, key: ExperienceModuleKey) {
  const targetModule = getExperienceModule(role, key);

  if (targetModule.key === "panel") {
    return `/experience/${role}`;
  }

  const params = new URLSearchParams();
  if (targetModule.workTab) {
    params.set("work_tab", targetModule.workTab);
  }
  if (targetModule.demo) {
    params.set("demo", targetModule.demo);
  }

  const query = params.toString();
  return `/experience/${role}${query ? `?${query}` : ""}`;
}

export function getActiveExperienceModuleKey(role: ExperienceRole, demo: string | null | undefined): ExperienceModuleKey {
  if (!demo) {
    return "panel";
  }

  const alias = demoAliases[demo] ?? (demo as ExperienceModuleKey);
  const exists = experienceModulesByRole[role].some((item) => item.key === alias);
  return exists ? alias : "panel";
}

export function getProgressExperienceModules(role: ExperienceRole) {
  return experienceModulesByRole[role].filter((item) => item.progress);
}

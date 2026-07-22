import {
  BellRing,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  MessageSquareText,
  ShieldCheck,
  Users,
  type LucideIcon
} from "lucide-react";
import { getExperienceModuleHref, type ExperienceRole } from "@/components/experience/experience-data";

export type RolePerspectiveAccent = "navy" | "green" | "gold";
export type RolePerspectiveTone = "blue" | "green" | "amber";

export type RolePerspectiveMetric = {
  label: string;
  value: string;
  detail: string;
  progress?: number;
  tone: RolePerspectiveTone;
};

export type RolePerspectivePriority = {
  title: string;
  detail: string;
  icon: LucideIcon;
  tone: RolePerspectiveTone;
};

export type RolePerspective = {
  id: ExperienceRole;
  slug: ExperienceRole;
  label: string;
  shortLabel: string;
  surfaceLabel: string;
  context: string;
  headline: string;
  description: string;
  primaryBenefit: string;
  secondaryBenefits: readonly string[];
  metrics: readonly RolePerspectiveMetric[];
  priorities: readonly RolePerspectivePriority[];
  actions: readonly string[];
  accent: RolePerspectiveAccent;
  icon: LucideIcon;
  experienceHref: string;
  previewType: "supervision" | "daily-work" | "family-summary";
};

export const rolePerspectives: readonly RolePerspective[] = [
  {
    id: "director",
    slug: "director",
    label: "Dirección",
    shortLabel: "Dirección",
    surfaceLabel: "Centro de supervisión",
    context: "Colegio EducaCora · Visión global",
    headline: "Visión global y seguimiento",
    description: "Prioridades, actividad académica y coordinación reunidas en una lectura clara del centro.",
    primaryBenefit: "Dirección obtiene una visión global sin recorrer herramientas separadas.",
    secondaryBenefits: ["Prioridades visibles", "Supervisión académica", "Coordinación del centro"],
    metrics: [
      { label: "Asistencia global", value: "96%", detail: "8 grupos supervisados", progress: 96, tone: "green" },
      { label: "Evaluaciones", value: "4", detail: "Pendientes de revisión", progress: 64, tone: "blue" },
      { label: "Comunicaciones", value: "3", detail: "Requieren seguimiento", progress: 38, tone: "amber" }
    ],
    priorities: [
      { title: "Revisar evaluaciones", detail: "4 cierres necesitan supervisión", icon: BookOpenCheck, tone: "blue" },
      { title: "Comunicaciones prioritarias", detail: "3 conversaciones esperan seguimiento", icon: MessageSquareText, tone: "amber" },
      { title: "Asistencia actualizada", detail: "Resumen disponible para 8 grupos", icon: ClipboardCheck, tone: "green" }
    ],
    actions: ["Revisar pendientes", "Supervisar evaluaciones", "Consultar asistencia"],
    accent: "navy",
    icon: ShieldCheck,
    experienceHref: getExperienceModuleHref("director", "panel"),
    previewType: "supervision"
  },
  {
    id: "docente",
    slug: "docente",
    label: "Docente",
    shortLabel: "Docente",
    surfaceLabel: "Jornada docente",
    context: "Hoy · 6.º de Primaria",
    headline: "Menos herramientas y más contexto",
    description: "Clases, asistencia, cuaderno y comunicación organizados alrededor del trabajo diario.",
    primaryBenefit: "El docente gestiona su jornada desde un único espacio.",
    secondaryBenefits: ["Jornada organizada", "Evaluación conectada", "Comunicación contextual"],
    metrics: [
      { label: "Próximas clases", value: "2", detail: "Matemáticas y tutoría", progress: 52, tone: "blue" },
      { label: "Asistencia", value: "96%", detail: "Grupo actualizado", progress: 96, tone: "green" },
      { label: "Progreso", value: "78%", detail: "Evaluación trimestral", progress: 78, tone: "amber" }
    ],
    priorities: [
      { title: "Pasar lista", detail: "Matemáticas · 09:30", icon: ClipboardCheck, tone: "amber" },
      { title: "Actualizar cuaderno", detail: "Evaluación trimestral en curso", icon: BookOpenCheck, tone: "blue" },
      { title: "Comunicación pendiente", detail: "Reunión de evaluación", icon: MessageSquareText, tone: "green" }
    ],
    actions: ["Pasar lista", "Abrir cuaderno", "Consultar alumnado"],
    accent: "green",
    icon: GraduationCap,
    experienceHref: getExperienceModuleHref("docente", "panel"),
    previewType: "daily-work"
  },
  {
    id: "familia",
    slug: "familia",
    label: "Familia",
    shortLabel: "Familia",
    surfaceLabel: "Resumen familiar",
    context: "Lucía Romero · 6.º de Primaria",
    headline: "Información clara y accesible",
    description: "El seguimiento escolar se presenta de forma comprensible, ordenada y siempre contextualizada.",
    primaryBenefit: "La familia recibe información clara y organizada sobre la vida escolar.",
    secondaryBenefits: ["Seguimiento comprensible", "Avisos organizados", "Calendario compartido"],
    metrics: [
      { label: "Comunicaciones", value: "2", detail: "Nuevas esta semana", progress: 44, tone: "amber" },
      { label: "Asistencia", value: "96%", detail: "Estado actualizado", progress: 96, tone: "green" },
      { label: "Progreso", value: "78%", detail: "Matemáticas", progress: 78, tone: "blue" }
    ],
    priorities: [
      { title: "Comunicación del centro", detail: "Reunión de evaluación", icon: BellRing, tone: "amber" },
      { title: "Seguimiento académico", detail: "Observación disponible en Matemáticas", icon: BookOpenCheck, tone: "blue" },
      { title: "Próxima reunión", detail: "Tutoría · Miércoles 17:30", icon: CalendarDays, tone: "green" }
    ],
    actions: ["Leer comunicación", "Consultar calificaciones", "Revisar calendario"],
    accent: "gold",
    icon: Users,
    experienceHref: getExperienceModuleHref("familia", "panel"),
    previewType: "family-summary"
  }
] as const;

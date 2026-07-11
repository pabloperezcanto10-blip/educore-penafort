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

export const experienceNavigation = [
  { id: "panel", label: "Panel", icon: Home },
  { id: "communications", label: "Comunicaciones", icon: MessageSquare },
  { id: "students", label: "Alumnado", icon: Users },
  { id: "gradebook", label: "Cuaderno", icon: BookOpen },
  { id: "attendance", label: "Asistencia", icon: ClipboardList },
  { id: "calendar", label: "Calendario", icon: CalendarDays },
  { id: "corium", label: "Corium AI", icon: Bell }
];

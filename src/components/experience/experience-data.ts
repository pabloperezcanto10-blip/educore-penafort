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
  { label: "Panel", icon: Home },
  { label: "Comunicaciones", icon: MessageSquare },
  { label: "Alumnado", icon: Users },
  { label: "Cuaderno", icon: BookOpen },
  { label: "Asistencia", icon: ClipboardList },
  { label: "Calendario", icon: CalendarDays },
  { label: "Corium AI", icon: Bell }
];

import type { CenterActivityItem } from "@/components/dashboard/center-activity-timeline";
import type {
  DirectorDashboardTab,
  DirectorDashboardViewProps
} from "@/components/dashboards/director/director-dashboard-view";
import type { CalendarEventSummary } from "@/lib/calendar/ical";
import type { DashboardNotification } from "@/lib/internal-notifications";
import { educacoraExperienceBrand } from "@/lib/branding/brand-config";
import { directorDashboardExperienceRoutes } from "@/lib/demo-actions/director/director-dashboard-demo-actions";
import { createExperienceMode } from "@/lib/experience/mode";

const baseDate = new Date("2026-07-11T09:00:00+02:00");

export function createDirectorDashboardDemoData(activeTab: DirectorDashboardTab = "prioridades"): DirectorDashboardViewProps {
  const notifications = createDemoNotifications();
  const todayEvents = createTodayEvents();
  const upcomingEvents = createUpcomingEvents();
  const calendarEvents = [...todayEvents, ...upcomingEvents].slice(0, 4);
  const mode = createExperienceMode("director");

  return {
    activeTab,
    activityItems: [
      ...createDemoActivityItems(),
      ...calendarEvents.map(toCalendarActivityItem)
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    brand: educacoraExperienceBrand,
    calendarError: null,
    calendarEvents,
    errorMessage: null,
    mode: mode.mode,
    notifications,
    routes: directorDashboardExperienceRoutes,
    signals: {
      communicationsPending: 4,
      directorCommunicationsPending: 2,
      activeIncidents: 2,
      openEvaluations: 5,
      pendingClosures: 1,
      pendingPublications: 2,
      studentsTotal: 428,
      recentFollowUps: 9,
      openConversations: 18,
      recentCommunicationActivity: 11,
      totalActionable: 7
    },
    subtitle: "Centro Demo EducaCora · Supervisión ficticia con datos aislados.",
    todayEvents,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    upcomingEvents
  };
}

function createDemoNotifications(): DashboardNotification[] {
  return [
    {
      id: "demo-notification-1",
      source: "communication",
      title: "Comunicación dirigida a Dirección",
      body: "Familia Vega · Solicitud de reunión de seguimiento.",
      href: directorDashboardExperienceRoutes.communications,
      read: false,
      created_at: isoMinutesAgo(18)
    },
    {
      id: "demo-notification-2",
      source: "internal",
      title: "Boletín pendiente de publicación",
      body: "2º ESO · Evaluación ordinaria lista para revisión.",
      href: directorDashboardExperienceRoutes.gradebook,
      read: false,
      created_at: isoMinutesAgo(42)
    },
    {
      id: "demo-notification-3",
      source: "internal",
      title: "Incidencia relevante registrada",
      body: "5º Primaria · Seguimiento recomendado por tutoría.",
      href: directorDashboardExperienceRoutes.students,
      read: true,
      created_at: isoMinutesAgo(95)
    }
  ];
}

function createTodayEvents(): CalendarEventSummary[] {
  return [
    {
      id: "demo-calendar-1",
      title: "Reunión de coordinación pedagógica",
      startsAt: addMinutes(baseDate, 150),
      allDay: false
    },
    {
      id: "demo-calendar-2",
      title: "Revisión de publicaciones trimestrales",
      startsAt: addMinutes(baseDate, 270),
      allDay: false
    }
  ];
}

function createUpcomingEvents(): CalendarEventSummary[] {
  return [
    {
      id: "demo-calendar-3",
      title: "Consejo escolar",
      startsAt: addDays(baseDate, 1),
      allDay: false
    },
    {
      id: "demo-calendar-4",
      title: "Fecha límite de boletines",
      startsAt: addDays(baseDate, 3),
      allDay: true
    }
  ];
}

function createDemoActivityItems(): CenterActivityItem[] {
  return [
    {
      id: "demo-activity-1",
      title: "La familia Vega envió una comunicación a Dirección.",
      meta: "Sofía Vega · 6º Primaria · Solicitud de reunión",
      date: isoMinutesAgo(12),
      href: directorDashboardExperienceRoutes.communications,
      actionLabel: "Ver conversación",
      tone: "blue",
      kind: "communication",
      category: "communications",
      priority: "attention",
      groupKey: "demo-communications"
    },
    {
      id: "demo-activity-2",
      title: "Daniela Ríos respondió a la familia Molina.",
      meta: "Mateo Molina · 1º ESO · Seguimiento académico",
      date: isoMinutesAgo(28),
      href: directorDashboardExperienceRoutes.communications,
      actionLabel: "Ver conversación",
      tone: "blue",
      kind: "reply",
      category: "communications",
      priority: "followup",
      groupKey: "demo-communications"
    },
    {
      id: "demo-activity-3",
      title: "Se registró una incidencia leve.",
      meta: "5º Primaria · Patio · Seguimiento tutorial",
      date: isoMinutesAgo(54),
      href: directorDashboardExperienceRoutes.students,
      actionLabel: "Abrir alumno",
      tone: "amber",
      kind: "incident",
      category: "incidents",
      priority: "followup",
      groupKey: "demo-incidents"
    },
    {
      id: "demo-activity-4",
      title: "Se cerró una evaluación.",
      meta: "3º ESO · Ciencias · Lista para publicación",
      date: isoMinutesAgo(86),
      href: directorDashboardExperienceRoutes.gradebook,
      actionLabel: "Abrir evaluación",
      tone: "green",
      kind: "grade",
      category: "academic",
      priority: "followup",
      groupKey: "demo-evaluation"
    },
    {
      id: "demo-activity-5",
      title: "Se registró la asistencia.",
      meta: "4º Primaria · Lengua · 24 alumnos",
      date: isoMinutesAgo(118),
      href: directorDashboardExperienceRoutes.students,
      actionLabel: "Abrir alumno",
      tone: "green",
      kind: "attendance",
      category: "academic",
      priority: "info",
      groupKey: "demo-attendance"
    }
  ];
}

function toCalendarActivityItem(event: CalendarEventSummary): CenterActivityItem {
  return {
    id: `demo-calendar-activity-${event.id}`,
    title: `Está programado: ${event.title}.`,
    meta: event.allDay ? "Evento de día completo" : "Agenda de dirección",
    date: event.startsAt.toISOString(),
    href: directorDashboardExperienceRoutes.calendar,
    actionLabel: "Abrir calendario",
    tone: "gray",
    kind: "calendar",
    category: "calendar",
    priority: "info",
    groupKey: "demo-calendar"
  };
}

function isoMinutesAgo(minutes: number) {
  return new Date(baseDate.getTime() - minutes * 60 * 1000).toISOString();
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

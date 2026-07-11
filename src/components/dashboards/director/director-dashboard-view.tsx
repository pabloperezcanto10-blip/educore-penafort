import Link from "next/link";
import {
  AlertCircle,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Inbox,
  MessageSquareText,
  Users
} from "lucide-react";

import { CenterActivityTimeline, type CenterActivityItem } from "@/components/dashboard/center-activity-timeline";
import { WorkCenterTabs } from "@/components/dashboard/work-center-tabs";
import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
import type { CalendarEventSummary } from "@/lib/calendar/ical";
import type { DashboardNotification } from "@/lib/internal-notifications";
import type { BrandConfig } from "@/lib/branding/brand-config";
import type { ExecutionMode } from "@/lib/experience/mode";

export type DirectorDashboardTab = "prioridades" | "alumnos" | "comunicaciones" | "evaluacion" | "calendario";

export type DirectorSignals = {
  communicationsPending: number;
  directorCommunicationsPending: number;
  activeIncidents: number;
  openEvaluations: number;
  pendingClosures: number;
  pendingPublications: number;
  studentsTotal: number;
  recentFollowUps: number;
  openConversations: number;
  recentCommunicationActivity: number;
  totalActionable: number;
};

export type DirectorDashboardRoutes = {
  root: string;
  calendar: string;
  communications: string;
  communicationsDirectorOnly: string;
  gradebook: string;
  students: string;
};

export type DirectorDashboardViewProps = {
  activeTab: DirectorDashboardTab;
  activityItems: CenterActivityItem[];
  brand: BrandConfig;
  calendarError: string | null;
  calendarEvents: CalendarEventSummary[];
  errorMessage: string | null;
  mode: ExecutionMode;
  notifications: DashboardNotification[];
  routes: DirectorDashboardRoutes;
  signals: DirectorSignals;
  subtitle: string;
  todayEvents: CalendarEventSummary[];
  unreadCount: number;
  upcomingEvents: CalendarEventSummary[];
};

export const directorDashboardTabs: Array<{ id: DirectorDashboardTab; label: string }> = [
  { id: "prioridades", label: "Prioridades" },
  { id: "alumnos", label: "Alumnos" },
  { id: "comunicaciones", label: "Comunicaciones" },
  { id: "evaluacion", label: "Evaluación" },
  { id: "calendario", label: "Calendario" }
];

export const productionDirectorDashboardRoutes: DirectorDashboardRoutes = {
  root: "/dashboard/director",
  calendar: "/dashboard/director/calendar",
  communications: "/dashboard/director/communications",
  communicationsDirectorOnly: "/dashboard/director/communications?director_only=1",
  gradebook: "/dashboard/director/gradebook",
  students: "/dashboard/director/students"
};

export function DirectorDashboardView({
  activeTab,
  activityItems,
  brand,
  calendarError,
  calendarEvents,
  errorMessage,
  mode,
  notifications,
  routes,
  signals,
  subtitle,
  todayEvents,
  unreadCount,
  upcomingEvents
}: DirectorDashboardViewProps) {
  return (
    <section className="space-y-5" data-brand={brand.id}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Buenos días</h1>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "experience" ? <GradebookBadge tone="blue">Experience</GradebookBadge> : null}
          {signals.communicationsPending > 0 ? <GradebookBadge tone="amber">{signals.communicationsPending} comunicaciones pendientes</GradebookBadge> : null}
          {signals.activeIncidents > 0 ? <GradebookBadge tone="amber">{signals.activeIncidents} incidencias activas</GradebookBadge> : null}
          {signals.openEvaluations > 0 ? <GradebookBadge tone="blue">{signals.openEvaluations} evaluaciones abiertas</GradebookBadge> : null}
          {signals.pendingClosures > 0 ? <GradebookBadge tone="amber">{signals.pendingClosures} cierres pendientes</GradebookBadge> : null}
          {signals.pendingPublications > 0 ? <GradebookBadge tone="red">{signals.pendingPublications} publicaciones pendientes</GradebookBadge> : null}
          {signals.totalActionable === 0 ? <GradebookBadge tone="green">Todo al día</GradebookBadge> : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar parte del panel: {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <CompactNotifications notifications={notifications} unreadCount={unreadCount} />
        <CompactCalendar routes={routes} todayEvents={todayEvents} upcomingEvents={upcomingEvents} errorMessage={calendarError} />
      </div>

      <GradebookCard>
        <GradebookCardHeader title="Centro de supervisión">
          <GradebookBadge tone={signals.totalActionable > 0 ? "amber" : "green"}>
            {signals.totalActionable > 0 ? `${signals.totalActionable} prioridades` : "Sin bloqueos"}
          </GradebookBadge>
        </GradebookCardHeader>
        <WorkCenterTabs
          initialTab={activeTab}
          tabs={directorDashboardTabs}
          basePath={routes.root}
          ariaLabel="Centro de supervisión de dirección"
          panels={[
            {
              id: "prioridades",
              content: <PrioritiesPanel routes={routes} signals={signals} />
            },
            {
              id: "alumnos",
              content: <StudentsPanel routes={routes} signals={signals} />
            },
            {
              id: "comunicaciones",
              content: <CommunicationsPanel routes={routes} signals={signals} />
            },
            {
              id: "evaluacion",
              content: <EvaluationPanel routes={routes} signals={signals} />
            },
            {
              id: "calendario",
              content: <CalendarPanel routes={routes} events={calendarEvents} errorMessage={calendarError} />
            }
          ]}
        />
      </GradebookCard>

      <CenterActivityTimeline
        items={activityItems}
        groupRoutes={{
          academic: routes.gradebook,
          calendar: routes.calendar,
          communications: routes.communications,
          incidents: routes.students
        }}
      />
    </section>
  );
}

function CompactNotifications({ notifications, unreadCount }: { notifications: DashboardNotification[]; unreadCount: number }) {
  return (
    <GradebookCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <Inbox className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Novedades</h2>
            <p className="mt-1 text-sm text-slate-500">
              {unreadCount > 0 ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} pendiente${unreadCount === 1 ? "" : "s"}.` : "Todo al día. No hay avisos pendientes."}
            </p>
          </div>
        </div>
        <GradebookBadge tone={unreadCount > 0 ? "amber" : "green"}>{unreadCount > 0 ? "Pendiente" : "Todo al día"}</GradebookBadge>
      </div>
      {notifications.length > 0 ? (
        <div className="mt-3 space-y-2">
          {notifications.slice(0, 2).map((notification) => (
            <Link key={`${notification.source}-${notification.id}`} href={notification.href} className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-white">
              <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{notification.body}</p>
            </Link>
          ))}
        </div>
      ) : null}
    </GradebookCard>
  );
}

function CompactCalendar({ todayEvents, upcomingEvents, errorMessage, routes }: { todayEvents: CalendarEventSummary[]; upcomingEvents: CalendarEventSummary[]; errorMessage: string | null; routes: DirectorDashboardRoutes }) {
  const events = [...todayEvents, ...upcomingEvents].slice(0, 3);

  return (
    <GradebookCard className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Hoy y próximos eventos</h2>
            <p className="mt-1 text-sm text-slate-500">
              {errorMessage ? "No se pudieron cargar los próximos eventos." : events.length > 0 ? "Agenda oficial del centro." : "No hay eventos programados para hoy ni los próximos días."}
            </p>
          </div>
        </div>
        <Link href={routes.calendar} className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-semibold text-white transition hover:bg-sky-800">
          Ver calendario
        </Link>
      </div>
      {events.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-3">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <p className="line-clamp-1 text-sm font-semibold text-slate-950">{event.title}</p>
              <p className="mt-1 text-xs text-slate-500">{formatCalendarEventDate(event)}</p>
            </article>
          ))}
        </div>
      ) : null}
    </GradebookCard>
  );
}

function PrioritiesPanel({ signals, routes }: { signals: DirectorSignals; routes: DirectorDashboardRoutes }) {
  const priorities = [
    signals.directorCommunicationsPending > 0
      ? { title: "Comunicación dirigida a Dirección", description: `${signals.directorCommunicationsPending} mensaje${signals.directorCommunicationsPending === 1 ? "" : "s"} requiere${signals.directorCommunicationsPending === 1 ? "" : "n"} respuesta o supervisión directa.`, href: routes.communicationsDirectorOnly, icon: MessageSquareText, tone: "amber" as const }
      : null,
    signals.pendingPublications > 0
      ? { title: "Publicaciones pendientes", description: `${signals.pendingPublications} boletín${signals.pendingPublications === 1 ? "" : "es"} o evaluación pendiente de publicación.`, href: routes.gradebook, icon: FileCheck2, tone: "amber" as const }
      : null,
    signals.activeIncidents > 0
      ? { title: "Incidencias activas", description: `${signals.activeIncidents} incidencia${signals.activeIncidents === 1 ? "" : "s"} requiere seguimiento.`, href: routes.students, icon: AlertCircle, tone: "amber" as const }
      : null,
    signals.pendingClosures > 0
      ? { title: "Cierres trimestrales", description: `${signals.pendingClosures} cierre${signals.pendingClosures === 1 ? "" : "s"} pendiente${signals.pendingClosures === 1 ? "" : "s"} de revisión.`, href: routes.gradebook, icon: ClipboardList, tone: "blue" as const }
      : null,
    signals.communicationsPending > 0
      ? { title: "Comunicaciones pendientes", description: `${signals.communicationsPending} comunicación${signals.communicationsPending === 1 ? "" : "es"} esperan revisión o respuesta.`, href: routes.communications, icon: MessageSquareText, tone: "amber" as const }
      : null
  ].filter(Boolean);

  if (priorities.length === 0) {
    return <EmptyPanel title="Centro funcionando con normalidad." description="No existen actuaciones pendientes." icon={CheckCircle2} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {priorities.map((priority) => priority ? <ActionRow key={priority.title} {...priority} /> : null)}
    </div>
  );
}

function StudentsPanel({ signals, routes }: { signals: DirectorSignals; routes: DirectorDashboardRoutes }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Alumnos" value={signals.studentsTotal} tone="blue" />
        <MetricBox label="Incidencias" value={signals.activeIncidents} tone={signals.activeIncidents > 0 ? "amber" : "green"} />
        <MetricBox label="Seguimientos recientes" value={signals.recentFollowUps} tone="blue" />
      </div>
      <ActionLink href={routes.students} icon={Users} label="Abrir supervisión de alumnos" />
    </div>
  );
}

function CommunicationsPanel({ signals, routes }: { signals: DirectorSignals; routes: DirectorDashboardRoutes }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Abiertas" value={signals.openConversations} tone="blue" />
        <MetricBox label="Pendientes" value={signals.communicationsPending} tone={signals.communicationsPending > 0 ? "amber" : "green"} />
        <MetricBox label="Respuestas recientes" value={signals.recentCommunicationActivity} tone="blue" />
      </div>
      <ActionLink href={routes.communications} icon={MessageSquareText} label="Abrir comunicaciones" />
    </div>
  );
}

function EvaluationPanel({ signals, routes }: { signals: DirectorSignals; routes: DirectorDashboardRoutes }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Materias abiertas" value={signals.openEvaluations} tone="blue" />
        <MetricBox label="Cierres" value={signals.pendingClosures} tone={signals.pendingClosures > 0 ? "amber" : "green"} />
        <MetricBox label="Publicaciones" value={signals.pendingPublications} tone={signals.pendingPublications > 0 ? "amber" : "green"} />
      </div>
      <ActionLink href={routes.gradebook} icon={BookOpenCheck} label="Abrir evaluación" />
    </div>
  );
}

function CalendarPanel({ events, errorMessage, routes }: { events: CalendarEventSummary[]; errorMessage: string | null; routes: DirectorDashboardRoutes }) {
  if (errorMessage) {
    return <EmptyPanel title="Calendario no disponible" description="Consulta el calendario completo para revisar fechas importantes." icon={CalendarDays} href={routes.calendar} />;
  }

  if (events.length === 0) {
    return <EmptyPanel title="Sin eventos próximos" description="No hay reuniones, evaluaciones o salidas próximas en el calendario." icon={CalendarDays} href={routes.calendar} />;
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-2 md:grid-cols-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="line-clamp-1 text-sm font-semibold text-slate-950">{event.title}</p>
            <p className="mt-1 text-xs text-slate-500">{formatCalendarEventDate(event)}</p>
          </article>
        ))}
      </div>
      <ActionLink href={routes.calendar} icon={CalendarDays} label="Abrir calendario" />
    </div>
  );
}

function ActionRow({
  title,
  description,
  href,
  icon: Icon,
  tone
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof AlertCircle;
  tone: "blue" | "amber";
}) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700";

  return (
    <Link href={href} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:bg-slate-50">
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-slate-950">{title}</span>
        <span className="mt-1 block text-xs text-slate-500">{description}</span>
      </span>
    </Link>
  );
}

function ActionLink({ href, icon: Icon, label }: { href: string; icon: typeof Users; label: string }) {
  return (
    <Link href={href} className="inline-flex h-full min-h-[92px] items-center justify-center gap-2 rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white transition hover:bg-sky-800">
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Link>
  );
}

function MetricBox({ label, value, tone }: { label: string; value: number; tone: "blue" | "green" | "amber" }) {
  const toneClass = {
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700"
  }[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <span className={`inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-sm font-bold ${toneClass}`}>{value}</span>
      <p className="mt-3 text-sm font-semibold text-slate-950">{label}</p>
    </div>
  );
}

function EmptyPanel({
  title,
  description,
  icon: Icon,
  href
}: {
  title: string;
  description: string;
  icon: typeof CheckCircle2;
  href?: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-500">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
      {href ? (
        <Link href={href} className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-100">
          Abrir módulo
        </Link>
      ) : null}
    </div>
  );
}

function formatCalendarEventDate(event: CalendarEventSummary) {
  const date = new Intl.DateTimeFormat("es-ES", {
    weekday: "short",
    day: "2-digit",
    month: "short"
  }).format(event.startsAt);

  if (event.allDay) {
    return `${date} · Todo el día`;
  }

  const time = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(event.startsAt);

  return `${date} · ${time}`;
}

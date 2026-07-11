import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, ClipboardList, Inbox, type LucideIcon } from "lucide-react";

import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
import type { CalendarEventSummary } from "@/lib/calendar/ical";
import type { FamilyAttendanceRow } from "@/lib/attendance/attendance";
import type { FamilyNotification } from "@/lib/communications/notifications";
import type { GradeWithLabels } from "@/lib/grades/grades";
import type { DashboardNotification } from "@/lib/internal-notifications";
import type { BrandConfig } from "@/lib/branding/brand-config";
import type { ExecutionMode } from "@/lib/experience/mode";

export type FamilyDashboardRoutes = {
  root: string;
  calendar: string;
  communications: string;
  grades: string;
  student: string;
};

export type FamilyDashboardData = {
  attendanceRows: FamilyAttendanceRow[];
  calendarError: string | null;
  dashboardNotifications: DashboardNotification[];
  errorMessage: string | null;
  familyName: string;
  grades: GradeWithLabels[];
  notifications: FamilyNotification[];
  todayEvents: CalendarEventSummary[];
  unreadCount: number;
  upcomingEvents: CalendarEventSummary[];
};

export type FamilyDashboardViewProps = {
  brand: BrandConfig;
  data: FamilyDashboardData;
  mode: ExecutionMode;
  routes: FamilyDashboardRoutes;
};

export const productionFamilyDashboardRoutes: FamilyDashboardRoutes = {
  root: "/dashboard/family",
  calendar: "/dashboard/family/calendar",
  communications: "/dashboard/family/communications",
  grades: "/dashboard/family/grades",
  student: "/dashboard/family/student"
};

export function FamilyDashboardView({ brand, data, mode, routes }: FamilyDashboardViewProps) {
  const unreadNotifications = data.notifications.filter((notification) => !notification.read).length;
  const attendanceIssues = data.attendanceRows.filter((row) => row.status !== "present").length;
  const pendingJustifications = data.attendanceRows.filter((row) => row.status !== "present" && !row.justified).length;

  return (
    <section className="space-y-5" data-brand={brand.id}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Panel familiar</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Bienvenido, {data.familyName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Seguimiento familiar claro de comunicaciones, calificaciones y evolución del alumno.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "experience" ? <GradebookBadge tone="blue">Experience</GradebookBadge> : null}
          <GradebookBadge tone={data.unreadCount > 0 ? "amber" : "green"}>{data.unreadCount} novedades pendientes</GradebookBadge>
          <GradebookBadge tone={pendingJustifications > 0 ? "amber" : "gray"}>{pendingJustifications} justificaciones pendientes</GradebookBadge>
        </div>
      </div>

      {data.errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte del panel: {data.errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <FamilyNotificationsSummary notifications={data.dashboardNotifications} unreadCount={data.unreadCount} />
        <FamilyCalendarSummary
          errorMessage={data.calendarError}
          href={routes.calendar}
          todayEvents={data.todayEvents}
          upcomingEvents={data.upcomingEvents}
        />
      </div>

      <GradebookCard>
        <GradebookCardHeader title="Resumen familiar">
          <GradebookBadge tone="blue">Modo consulta</GradebookBadge>
        </GradebookCardHeader>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2 xl:grid-cols-4">
          <FamilyModule
            title="Comunicaciones"
            description="Mensajes del centro, avisos, respuestas y justificaciones."
            icon={Inbox}
            href={routes.communications}
            primaryMetric={`${data.notifications.length} mensaje${data.notifications.length === 1 ? "" : "s"}`}
            secondaryMetric={`${unreadNotifications} sin leer`}
            tone={unreadNotifications > 0 ? "amber" : "blue"}
          />
          <FamilyModule
            title="Calificaciones"
            description="Notas por materia, observaciones, recomendaciones y boletines."
            icon={BookOpenCheck}
            href={routes.grades}
            primaryMetric={`${data.grades.length} visible${data.grades.length === 1 ? "" : "s"}`}
            secondaryMetric="Boletines según publicación"
            tone="blue"
          />
          <FamilyModule
            title="Alumno"
            description="Resumen diario de asistencia, retrasos, incidencias y seguimiento."
            icon={ClipboardList}
            href={routes.student}
            primaryMetric={`${attendanceIssues} falta${attendanceIssues === 1 ? "" : "s"} / retraso${attendanceIssues === 1 ? "" : "s"}`}
            secondaryMetric={`${pendingJustifications} pendiente${pendingJustifications === 1 ? "" : "s"}`}
            tone={attendanceIssues > 0 ? "amber" : "green"}
          />
          <FamilyModule
            title="Calendario"
            description="Exámenes, reuniones, salidas, evaluaciones y avisos importantes."
            icon={CalendarDays}
            href={routes.calendar}
            primaryMetric="Calendario oficial"
            secondaryMetric="Google Calendar"
            tone="green"
          />
        </div>
      </GradebookCard>
    </section>
  );
}

function FamilyNotificationsSummary({ notifications, unreadCount }: { notifications: DashboardNotification[]; unreadCount: number }) {
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
              {unreadCount > 0 ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} pendiente${unreadCount === 1 ? "" : "s"}.` : "No hay avisos pendientes."}
            </p>
          </div>
        </div>
        <GradebookBadge tone={unreadCount > 0 ? "amber" : "green"}>{unreadCount > 0 ? "Pendiente" : "Todo al día"}</GradebookBadge>
      </div>
      {notifications.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          <p className="font-semibold text-slate-950">Todo al día</p>
          <p className="mt-1">No hay avisos pendientes.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {notifications.slice(0, 3).map((notification) => (
            <Link key={`${notification.source}-${notification.id}`} href={notification.href} className="block rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-white">
              <p className="text-sm font-semibold text-slate-950">{notification.title}</p>
              <p className="mt-1 line-clamp-1 text-xs text-slate-500">{notification.body}</p>
            </Link>
          ))}
        </div>
      )}
    </GradebookCard>
  );
}

function FamilyCalendarSummary({
  errorMessage,
  href,
  todayEvents,
  upcomingEvents
}: {
  errorMessage: string | null;
  href: string;
  todayEvents: CalendarEventSummary[];
  upcomingEvents: CalendarEventSummary[];
}) {
  const hasEvents = todayEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <GradebookCard className="p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-slate-950">Hoy y próximos eventos</h2>
            <p className="mt-1 text-sm text-slate-500">
              {errorMessage
                ? "No se pudieron cargar los próximos eventos. Consulta el calendario."
                : hasEvents
                  ? "Agenda oficial del centro para hoy y los próximos días."
                  : "No hay eventos programados para hoy ni los próximos días."}
            </p>
          </div>
        </div>
        <Link href={href} className="inline-flex h-9 w-fit items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-semibold text-white transition hover:bg-sky-800">
          Ver calendario
        </Link>
      </div>

      {!errorMessage && hasEvents ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {todayEvents.length > 0 ? <EventGroup title="Eventos de hoy" events={todayEvents} /> : null}
          {upcomingEvents.length > 0 ? <EventGroup title="Próximos eventos" events={upcomingEvents} /> : null}
        </div>
      ) : null}
    </GradebookCard>
  );
}

function EventGroup({ title, events }: { title: string; events: CalendarEventSummary[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <h3 className="text-xs font-semibold text-slate-500">{title}</h3>
      <div className="mt-2 space-y-2">
        {events.map((event) => (
          <article key={event.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <p className="text-sm font-semibold text-slate-950">{event.title}</p>
            <span className="mt-2 inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500">
              {formatCalendarEventDate(event)}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}

function FamilyModule({
  title,
  description,
  icon: Icon,
  href,
  primaryMetric,
  secondaryMetric,
  tone
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  primaryMetric: string;
  secondaryMetric: string;
  tone: "blue" | "green" | "amber";
}) {
  const toneClass = {
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700"
  }[tone];

  return (
    <Link href={href} className="group block bg-white p-4 transition hover:bg-slate-50">
      <article className="flex h-full flex-col justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
            <Icon className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-slate-950">{title}</h2>
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{description}</p>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-950">{primaryMetric}</p>
            <p className="text-xs text-slate-500">{secondaryMetric}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
        </div>
      </article>
    </Link>
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

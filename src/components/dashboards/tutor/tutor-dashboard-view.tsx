import Link from "next/link";
import { CalendarDays, ClipboardList, Inbox, type LucideIcon } from "lucide-react";

import { WorkCenterTabs } from "@/components/dashboard/work-center-tabs";
import { GradebookBadge, GradebookCard, GradebookCardHeader, ProgressBar } from "@/components/grades/gradebook-design";
import { StudentActivityTimeline, type StudentActivityItem } from "@/components/students/student-profile";
import type { CalendarEventSummary } from "@/lib/calendar/ical";
import type { TeacherSubjectCourse } from "@/lib/grades/grades";
import type { DashboardNotification } from "@/lib/internal-notifications";
import type { TeacherScheduleSlot } from "@/lib/tutors/schedule";
import type { BrandConfig } from "@/lib/branding/brand-config";
import type { ExecutionMode } from "@/lib/experience/mode";

export type TutorDashboardTab = "pendientes" | "cuaderno" | "alumnos" | "comunicaciones" | "calendario";

export type TutorDashboardRoutes = {
  root: string;
  attendance: string;
  attendanceSlot: (slotId: string) => string;
  calendar: string;
  communications: string;
  gradebook: string;
  schedule: string;
  students: string;
};

export type TutorDashboardData = {
  activityItems: StudentActivityItem[];
  assignedCourseCount: number;
  calendarError: string | null;
  dashboardNotifications: DashboardNotification[];
  errorMessage: string | null;
  pendingAttendance: number;
  registeredScheduleIds: string[];
  subjectCourses: TeacherSubjectCourse[];
  teachingSlotsCount: number;
  todayEvents: CalendarEventSummary[];
  todaySchedule: TeacherScheduleSlot[];
  tutorName: string;
  unreadCommunications: number;
  unreadCount: number;
  upcomingEvents: CalendarEventSummary[];
  weekday: number | null;
};

export type TutorDashboardViewProps = {
  activeTab: TutorDashboardTab;
  brand: BrandConfig;
  data: TutorDashboardData;
  mode: ExecutionMode;
  routes: TutorDashboardRoutes;
};

export const tutorDashboardTabs: Array<{ id: TutorDashboardTab; label: string }> = [
  { id: "pendientes", label: "Pendientes" },
  { id: "cuaderno", label: "Cuaderno" },
  { id: "alumnos", label: "Mis alumnos" },
  { id: "comunicaciones", label: "Comunicaciones" },
  { id: "calendario", label: "Calendario" }
];

export const productionTutorDashboardRoutes: TutorDashboardRoutes = {
  root: "/dashboard/tutor",
  attendance: "/dashboard/tutor/attendance",
  attendanceSlot: (slotId) => `/dashboard/tutor/attendance/${slotId}`,
  calendar: "/dashboard/tutor/calendar",
  communications: "/dashboard/tutor/communications",
  gradebook: "/dashboard/tutor/gradebook",
  schedule: "/dashboard/tutor/schedule",
  students: "/dashboard/tutor/students"
};

export function TutorDashboardView({ activeTab, brand, data, mode, routes }: TutorDashboardViewProps) {
  return (
    <section className="space-y-5" data-brand={brand.id}>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Buenos días, {data.tutorName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Tutoría y docencia organizadas para decidir rápido qué toca hacer ahora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "experience" ? <GradebookBadge tone="blue">Experience</GradebookBadge> : null}
          <GradebookBadge tone={data.teachingSlotsCount > 0 ? "blue" : "gray"}>{data.teachingSlotsCount} clases hoy</GradebookBadge>
          {data.pendingAttendance > 0 ? <GradebookBadge tone="amber">{data.pendingAttendance} listas pendientes</GradebookBadge> : null}
          {data.unreadCommunications > 0 ? <GradebookBadge tone="amber">{data.unreadCommunications} comunicaciones pendientes</GradebookBadge> : null}
        </div>
      </div>

      {data.errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte del panel: {data.errorMessage}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-2">
        <CompactNotifications notifications={data.dashboardNotifications} unreadCount={data.unreadCount} />
        <CompactCalendar routes={routes} todayEvents={data.todayEvents} upcomingEvents={data.upcomingEvents} errorMessage={data.calendarError} />
      </div>

      <TodayScheduleCard
        routes={routes}
        weekday={data.weekday}
        slots={data.todaySchedule}
        registeredScheduleIds={new Set(data.registeredScheduleIds)}
      />

      <WorkCenter
        activeTab={activeTab}
        routes={routes}
        subjectCourses={data.subjectCourses}
        unreadCommunications={data.unreadCommunications}
        pendingAttendance={data.pendingAttendance}
        assignedCourseCount={data.assignedCourseCount}
        dashboardNotifications={data.dashboardNotifications}
        todayEvents={data.todayEvents}
        upcomingEvents={data.upcomingEvents}
      />

      <StudentActivityTimeline items={data.activityItems} empty="Sin movimientos recientes registrados." />
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
            <p className="mt-1 text-sm text-slate-500">{unreadCount > 0 ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} pendiente${unreadCount === 1 ? "" : "s"}.` : "Todo al día. No hay avisos pendientes."}</p>
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

function CompactCalendar({ todayEvents, upcomingEvents, errorMessage, routes }: { todayEvents: CalendarEventSummary[]; upcomingEvents: CalendarEventSummary[]; errorMessage: string | null; routes: TutorDashboardRoutes }) {
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
              {errorMessage ? "No se pudieron cargar los próximos eventos." : events.length > 0 ? "Fechas importantes del centro." : "No hay eventos programados para hoy ni los próximos días."}
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

function TodayScheduleCard({ weekday, slots, registeredScheduleIds, routes }: { weekday: number | null; slots: TeacherScheduleSlot[]; registeredScheduleIds: Set<string>; routes: TutorDashboardRoutes }) {
  return (
    <GradebookCard>
      <GradebookCardHeader title="Horario de hoy">
        <div className="flex items-center gap-2">
          <GradebookBadge tone="blue">{weekday ? getWeekdayLabel(weekday) : "Hoy"}</GradebookBadge>
          <Link href={routes.schedule} className="text-xs font-semibold text-sky-700 hover:text-sky-900">Ver horario completo</Link>
        </div>
      </GradebookCardHeader>
      <div className="p-3">
        {slots.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">No hay clases programadas para hoy.</div>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2 xl:grid-cols-3">
            {slots.map((slot) => <ScheduleSlotCard key={slot.id} routes={routes} slot={slot} registered={registeredScheduleIds.has(slot.id)} />)}
          </div>
        )}
      </div>
    </GradebookCard>
  );
}

function ScheduleSlotCard({ slot, registered, routes }: { slot: TeacherScheduleSlot; registered: boolean; routes: TutorDashboardRoutes }) {
  if (slot.is_break) {
    return (
      <article className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2.5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-500">{formatScheduleTime(slot.start_time)} - {formatScheduleTime(slot.end_time)}</p>
            <h3 className="mt-0.5 text-sm font-semibold text-slate-950">Patio / descanso</h3>
          </div>
          <GradebookBadge tone="gray">Descanso</GradebookBadge>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-sky-700">{formatScheduleTime(slot.start_time)} - {formatScheduleTime(slot.end_time)}</p>
          <h3 className="mt-0.5 truncate text-sm font-semibold text-slate-950">{slot.course_name}</h3>
          <p className="mt-0.5 truncate text-xs text-slate-500">{slot.subject_name ?? "Sin materia"}</p>
        </div>
        <GradebookBadge tone={registered ? "green" : "amber"}>{registered ? "Registrada" : "Pendiente"}</GradebookBadge>
      </div>
      <Link href={routes.attendanceSlot(slot.id)} className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-lg bg-sky-700 px-3 text-xs font-semibold text-white transition hover:bg-sky-800">
        Pasar lista
      </Link>
    </article>
  );
}

function WorkCenter({
  activeTab,
  subjectCourses,
  unreadCommunications,
  pendingAttendance,
  assignedCourseCount,
  dashboardNotifications,
  todayEvents,
  upcomingEvents,
  routes
}: {
  activeTab: TutorDashboardTab;
  subjectCourses: TeacherSubjectCourse[];
  unreadCommunications: number;
  pendingAttendance: number;
  assignedCourseCount: number;
  dashboardNotifications: DashboardNotification[];
  todayEvents: CalendarEventSummary[];
  upcomingEvents: CalendarEventSummary[];
  routes: TutorDashboardRoutes;
}) {
  return (
    <GradebookCard>
      <GradebookCardHeader title="Centro de trabajo">
        <GradebookBadge tone="blue">Prioridades</GradebookBadge>
      </GradebookCardHeader>
      <WorkCenterTabs
        initialTab={activeTab}
        tabs={tutorDashboardTabs}
        basePath={routes.root}
        panels={[
          {
            id: "pendientes",
            content: <PendingPanel routes={routes} unreadCommunications={unreadCommunications} pendingAttendance={pendingAttendance} />
          },
          {
            id: "cuaderno",
            content: <GradebookPanel routes={routes} subjectCourses={subjectCourses} assignedCourseCount={assignedCourseCount} />
          },
          {
            id: "alumnos",
            content: <StudentsPanel routes={routes} subjectCourses={subjectCourses} unreadCommunications={unreadCommunications} />
          },
          {
            id: "comunicaciones",
            content: <CommunicationsPanel routes={routes} unreadCommunications={unreadCommunications} notifications={dashboardNotifications} />
          },
          {
            id: "calendario",
            content: <CalendarPanel routes={routes} todayEvents={todayEvents} upcomingEvents={upcomingEvents} />
          }
        ]}
      />
    </GradebookCard>
  );
}

function PendingPanel({ unreadCommunications, pendingAttendance, routes }: { unreadCommunications: number; pendingAttendance: number; routes: TutorDashboardRoutes }) {
  const items = [
    pendingAttendance > 0 ? { title: "Pasar lista pendiente", description: `${pendingAttendance} clase${pendingAttendance === 1 ? "" : "s"} de hoy sin asistencia registrada.`, href: routes.attendance, icon: ClipboardList, tone: "amber" as const } : null,
    unreadCommunications > 0 ? { title: "Comunicaciones por leer", description: `${unreadCommunications} mensaje${unreadCommunications === 1 ? "" : "s"} pendiente${unreadCommunications === 1 ? "" : "s"}.`, href: routes.communications, icon: Inbox, tone: "amber" as const } : null
  ].filter((item): item is NonNullable<typeof item> => Boolean(item));

  if (items.length === 0) {
    return <EmptyWorkState title="✓ Todo al día" description="No tienes acciones pendientes." />;
  }

  return <div className="grid gap-3 lg:grid-cols-3">{items.map((item) => <WorkItem key={item.title} {...item} />)}</div>;
}

function GradebookPanel({ subjectCourses, assignedCourseCount, routes }: { subjectCourses: TeacherSubjectCourse[]; assignedCourseCount: number; routes: TutorDashboardRoutes }) {
  const maxCourses = Math.max(1, ...subjectCourses.map((item) => item.courses.length));
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">Resumen del cuaderno</p>
          <p className="mt-1 text-sm text-slate-500">Materias y cursos asignados al tutor. El detalle de notas vive en el cuaderno.</p>
        </div>
        <Link href={routes.gradebook} className="inline-flex h-10 w-fit items-center justify-center rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white transition hover:bg-sky-800">Abrir cuaderno</Link>
      </div>
      {subjectCourses.length === 0 ? <EmptyWorkState title="Sin materias asignadas" description="No hay materias disponibles para mostrar en el cuaderno." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {subjectCourses.slice(0, 6).map((item) => {
            const value = Math.round((item.courses.length / maxCourses) * 100);
            return (
              <div key={item.subject.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-950">{item.subject.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.courses.length} curso{item.courses.length === 1 ? "" : "s"} asignado{item.courses.length === 1 ? "" : "s"}</p>
                  </div>
                  <GradebookBadge tone="blue">{value}%</GradebookBadge>
                </div>
                <div className="mt-3"><ProgressBar value={value} /></div>
              </div>
            );
          })}
        </div>
      )}
      <p className="text-xs text-slate-500">Total: {assignedCourseCount} curso{assignedCourseCount === 1 ? "" : "s"} asignado{assignedCourseCount === 1 ? "" : "s"}.</p>
    </div>
  );
}

function StudentsPanel({ subjectCourses, unreadCommunications, routes }: { subjectCourses: TeacherSubjectCourse[]; unreadCommunications: number; routes: TutorDashboardRoutes }) {
  const courseCount = countAssignedCourses(subjectCourses);
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <SummaryTile label="Cursos" value={courseCount} />
      <SummaryTile label="Materias" value={subjectCourses.length} />
      <SummaryTile label="Comunicaciones" value={unreadCommunications} />
      <SummaryTile label="Incidencias" value="Ver ficha" />
      <div className="md:col-span-4">
        <Link href={routes.students} className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white transition hover:bg-sky-800">Abrir Mis alumnos</Link>
      </div>
    </div>
  );
}

function CommunicationsPanel({ unreadCommunications, notifications, routes }: { unreadCommunications: number; notifications: DashboardNotification[]; routes: TutorDashboardRoutes }) {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <SummaryTile label="Mensajes nuevos" value={unreadCommunications} />
        <SummaryTile label="Novedades" value={notifications.length} />
        <SummaryTile label="Pendientes" value={notifications.filter((notification) => !notification.read).length} />
      </div>
      <Link href={routes.communications} className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white transition hover:bg-sky-800">Abrir comunicaciones</Link>
    </div>
  );
}

function CalendarPanel({ todayEvents, upcomingEvents, routes }: { todayEvents: CalendarEventSummary[]; upcomingEvents: CalendarEventSummary[]; routes: TutorDashboardRoutes }) {
  const events = [...todayEvents, ...upcomingEvents].slice(0, 4);
  return (
    <div className="space-y-3">
      {events.length === 0 ? <EmptyWorkState title="Sin eventos próximos" description="No hay eventos programados para hoy ni los próximos días." /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {events.map((event) => (
            <article key={event.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm font-semibold text-slate-950">{event.title}</p>
              <p className="mt-1 text-xs text-slate-500">{formatCalendarEventDate(event)}</p>
            </article>
          ))}
        </div>
      )}
      <Link href={routes.calendar} className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-3 text-sm font-semibold text-white transition hover:bg-sky-800">Abrir calendario</Link>
    </div>
  );
}

function WorkItem({ title, description, href, icon: Icon, tone }: { title: string; description: string; href: string; icon: LucideIcon; tone: "blue" | "amber" }) {
  const toneClass = tone === "amber" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700";
  return (
    <Link href={href} className="rounded-lg border border-slate-200 bg-slate-50 p-3 transition hover:bg-white">
      <div className="flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${toneClass}`}><Icon className="h-4 w-4" /></span>
        <div>
          <p className="text-sm font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-xs text-slate-500">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function SummaryTile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-950">{value}</p>
    </div>
  );
}

function EmptyWorkState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4">
      <p className="text-sm font-semibold text-slate-950">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

export function buildTutorActivityItems(notifications: DashboardNotification[], schedule: TeacherScheduleSlot[], registeredScheduleIds: Set<string>): StudentActivityItem[] {
  const notificationItems: StudentActivityItem[] = notifications.slice(0, 4).map((notification) => ({
    id: `${notification.source}-${notification.id}`,
    title: notification.title,
    meta: notification.source === "communication" ? "Comunicación pendiente" : notification.body,
    date: notification.created_at,
    tone: notification.read ? "gray" : "blue",
    kind: notification.source === "communication" ? "communication" : "observation"
  }));
  const attendanceItems: StudentActivityItem[] = schedule
    .filter((slot) => !slot.is_break && registeredScheduleIds.has(slot.id))
    .slice(0, 2)
    .map((slot) => ({
      id: `attendance-${slot.id}`,
      title: "Asistencia registrada",
      meta: `${slot.course_name} · ${slot.subject_name ?? "Sin materia"}`,
      date: new Date().toISOString(),
      tone: "green" as const,
      kind: "attendance" as const
    }));

  return [...notificationItems, ...attendanceItems].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
}

export function countAssignedCourses(subjectCourses: TeacherSubjectCourse[]) {
  return new Set(subjectCourses.flatMap((item) => item.courses.map((course) => course.id))).size;
}

function formatCalendarEventDate(event: CalendarEventSummary) {
  const date = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "2-digit", month: "short" }).format(event.startsAt);
  if (event.allDay) return `${date} · Todo el día`;
  const time = new Intl.DateTimeFormat("es-ES", { hour: "2-digit", minute: "2-digit" }).format(event.startsAt);
  return `${date} · ${time}`;
}

function getWeekdayLabel(weekday: number | null) {
  const weekdayLabels = {
    1: "Lunes",
    2: "Martes",
    3: "Miércoles",
    4: "Jueves",
    5: "Viernes"
  } as const;

  if (!weekday || !(weekday in weekdayLabels)) {
    return "Hoy";
  }

  return weekdayLabels[weekday as keyof typeof weekdayLabels];
}

function formatScheduleTime(value: string) {
  return value.slice(0, 5);
}

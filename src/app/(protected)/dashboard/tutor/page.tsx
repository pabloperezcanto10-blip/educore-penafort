import Link from "next/link";
import {
  ArrowRight,
  Bell,
  BookOpenCheck,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  FileCheck2,
  Inbox,
  Layers3,
  Settings2,
  Users
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTutorUnreadCommunicationsCount } from "@/lib/communications/notifications";
import { getSubjectCoursesForTeacher } from "@/lib/grades/grades";
import { formatScheduleTime, getTeacherScheduleForToday, getWeekdayLabel, type TeacherScheduleSlot } from "@/lib/tutors/schedule";
import { getDashboardNotifications, type DashboardNotification } from "@/lib/internal-notifications";
import { getRegisteredScheduleIdsForDate } from "@/lib/attendance/session-attendance";
import { getDashboardCalendarEvents, type CalendarEventSummary } from "@/lib/calendar/ical";

type DashboardIcon = typeof Layers3;

export default async function TutorDashboardPage() {
  const profile = await requireRole("tutor");
  const [
    { items: subjectCourses, errorMessage: subjectsError },
    { count: unreadCommunications, errorMessage: communicationsError },
    { notifications: dashboardNotifications, unreadCount, errorMessage: dashboardNotificationsError },
    { slots: todaySchedule, weekday, errorMessage: scheduleError },
    { todayEvents, upcomingEvents, errorMessage: calendarError }
  ] = await Promise.all([
    getSubjectCoursesForTeacher(profile.id),
    getTutorUnreadCommunicationsCount(profile.id),
    getDashboardNotifications({
      userId: profile.id,
      role: "tutor",
      communicationHref: "/dashboard/tutor/communications"
    }),
    getTeacherScheduleForToday(profile.id),
    getDashboardCalendarEvents()
  ]);
  const { registeredScheduleIds, errorMessage: scheduleRegistrationError } = await getRegisteredScheduleIdsForDate({
    teacherId: profile.id,
    scheduleIds: todaySchedule.filter((slot) => !slot.is_break).map((slot) => slot.id)
  });
  const errorMessage = subjectsError ?? communicationsError ?? dashboardNotificationsError ?? scheduleError ?? scheduleRegistrationError;
  const tutorName = profile.full_name ?? profile.email ?? "tutor";
  const classCount = todaySchedule.filter((slot) => !slot.is_break).length;

  return (
    <section className="space-y-7">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Buenos d&iacute;as, {tutorName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tutor&iacute;a y docencia organizadas para materias, alumnos, evaluaci&oacute;n y comunicaciones.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte del panel: {errorMessage}
        </div>
      ) : null}

      <section className="space-y-3">
        <SectionHeading title="Hoy" description="Horario, eventos del centro y avisos que conviene revisar al entrar." />
        <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
          <TodayScheduleCard
            weekday={weekday}
            slots={todaySchedule}
            registeredScheduleIds={registeredScheduleIds}
          />
          <div className="grid gap-4">
            <TodayEventsCard todayEvents={todayEvents} upcomingEvents={upcomingEvents} errorMessage={calendarError} />
            <TodayNotificationsCard notifications={dashboardNotifications} unreadCount={unreadCount} />
          </div>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <SectionHeading title="Pendientes" description="Lo que requiere atencion con los datos disponibles ahora." />
          <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
            <PendingRow
              label="Comunicaciones"
              value={unreadCommunications}
              text={
                unreadCommunications === 0
                  ? "Sin comunicaciones pendientes."
                  : `${unreadCommunications} comunicacion${unreadCommunications === 1 ? "" : "es"} pendiente${unreadCommunications === 1 ? "" : "s"}.`
              }
              href="/dashboard/tutor/communications"
            />
          </div>
        </div>

        <div className="space-y-3">
          <SectionHeading title="Accesos rapidos" description="Las acciones mas habituales para el trabajo diario." />
          <div className="grid gap-3 sm:grid-cols-2">
            <QuickAccess
              title="Mis alumnos"
              description="Buscar y abrir fichas."
              href="/dashboard/tutor/students"
              icon={Users}
            />
            <QuickAccess
              title="Cuaderno"
              description="Notas, comentarios y cierres."
              href="/dashboard/tutor/gradebook"
              icon={BookOpenCheck}
            />
            <QuickAccess
              title="Comunicaciones"
              description="Abrir bandeja del tutor."
              href="/dashboard/tutor/communications"
              icon={Inbox}
              meta={unreadCommunications > 0 ? `${unreadCommunications} pendiente${unreadCommunications === 1 ? "" : "s"}` : "Todo al dia"}
            />
            <QuickAccess
              title="Horario / Pasar lista"
              description={classCount > 0 ? `${classCount} clase${classCount === 1 ? "" : "s"} hoy.` : "Sin clases hoy."}
              href="/dashboard/tutor/attendance"
              icon={ClipboardCheck}
            />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <SectionHeading title="Mas herramientas" description="Configuracion, materias y consultas menos frecuentes." />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ToolLink
            title="Mis materias"
            description={
              subjectCourses.length === 0
                ? "Sin materias asignadas."
                : `${subjectCourses.length} materia${subjectCourses.length === 1 ? "" : "s"} asignada${subjectCourses.length === 1 ? "" : "s"}.`
            }
            href="/dashboard/tutor/subjects"
            icon={Layers3}
          />
          <ToolLink
            title="Criterios de evaluacion"
            description="Pesos por curso, materia y trimestre."
            href="/dashboard/tutor/evaluation-settings"
            icon={Settings2}
          />
          <ToolLink
            title="Cierre final de curso"
            description="Nota final oficial por materia."
            href="/dashboard/tutor/final-grades"
            icon={FileCheck2}
          />
          <ToolLink
            title="Calendario / Fechas de interes"
            description="Agenda oficial del centro."
            href="/dashboard/tutor/calendar"
            icon={CalendarDays}
          />
        </div>
      </section>
    </section>
  );
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function TodayScheduleCard({
  weekday,
  slots,
  registeredScheduleIds
}: {
  weekday: number | null;
  slots: TeacherScheduleSlot[];
  registeredScheduleIds: Set<string>;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CalendarDays className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Horario de hoy</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {getWeekdayLabel(weekday)}. Accede a la clase para pasar lista.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/tutor/attendance"
            className="inline-flex h-9 w-fit items-center justify-center rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Pasar lista
          </Link>
          <Link
            href="/dashboard/tutor/schedule"
            className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Ver semana
          </Link>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border bg-[#f8fafc] px-4 py-3 text-sm text-muted-foreground">
          No hay clases programadas para hoy.
        </div>
      ) : (
        <div className="mt-4 grid gap-2 md:grid-cols-2">
          {slots.map((slot) => (
            <ScheduleSlotCard key={slot.id} slot={slot} registered={registeredScheduleIds.has(slot.id)} />
          ))}
        </div>
      )}
    </section>
  );
}

function TodayEventsCard({
  todayEvents,
  upcomingEvents,
  errorMessage
}: {
  todayEvents: CalendarEventSummary[];
  upcomingEvents: CalendarEventSummary[];
  errorMessage: string | null;
}) {
  const hasEvents = todayEvents.length > 0 || upcomingEvents.length > 0;

  return (
    <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
            <CalendarDays className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Eventos</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {errorMessage
                ? "Consulta el calendario para ver la agenda."
                : hasEvents
                  ? "Hoy y proximos dias."
                  : "Sin eventos programados proximos."}
            </p>
          </div>
        </div>
        <Link href="/dashboard/tutor/calendar" className="text-xs font-semibold text-primary hover:underline">
          Ver calendario
        </Link>
      </div>

      {!errorMessage && hasEvents ? (
        <div className="mt-3 space-y-2">
          {[...todayEvents, ...upcomingEvents].slice(0, 3).map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-3 rounded-md bg-[#f8fafc] px-3 py-2">
              <p className="line-clamp-2 text-sm font-medium text-foreground">{event.title}</p>
              <span className="shrink-0 rounded-full border border-border bg-white px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                {formatCalendarEventDate(event)}
              </span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TodayNotificationsCard({
  notifications,
  unreadCount
}: {
  notifications: DashboardNotification[];
  unreadCount: number;
}) {
  const visibleNotifications = notifications.slice(0, 3);

  return (
    <section className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
          <Bell className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Novedades</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0
              ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} pendiente${unreadCount === 1 ? "" : "s"}.`
              : "Todo al dia. No hay avisos pendientes."}
          </p>
        </div>
      </div>

      {visibleNotifications.length > 0 ? (
        <div className="mt-3 space-y-2">
          {visibleNotifications.map((notification) => (
            <Link
              key={`${notification.source}-${notification.id}`}
              href={notification.href}
              className={`block rounded-md px-3 py-2 text-sm transition hover:bg-muted ${
                notification.read ? "bg-[#f8fafc] text-muted-foreground" : "bg-primary/5 text-foreground"
              }`}
            >
              <span className="font-semibold">{notification.title}</span>
              <span className="mt-1 block line-clamp-1 text-muted-foreground">{notification.body}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function PendingRow({
  label,
  value,
  text,
  href
}: {
  label: string;
  value: number;
  text: string;
  href: string;
}) {
  const isClear = value === 0;

  return (
    <Link href={href} className="flex items-center justify-between gap-4 rounded-md px-3 py-2 transition hover:bg-muted">
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${isClear ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {isClear ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Inbox className="h-4 w-4" aria-hidden="true" />}
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{text}</p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function QuickAccess({
  title,
  description,
  href,
  icon: Icon,
  meta
}: {
  title: string;
  description: string;
  href: string;
  icon: DashboardIcon;
  meta?: string;
}) {
  return (
    <Link href={href} className="group rounded-lg border border-border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Icon className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
            {meta ? <p className="mt-2 text-xs font-semibold text-primary">{meta}</p> : null}
          </div>
        </div>
        <ArrowRight className="mt-2 h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5" aria-hidden="true" />
      </div>
    </Link>
  );
}

function ToolLink({
  title,
  description,
  href,
  icon: Icon
}: {
  title: string;
  description: string;
  href: string;
  icon: DashboardIcon;
}) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-white px-4 py-3 transition hover:bg-muted">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}

function ScheduleSlotCard({ slot, registered }: { slot: TeacherScheduleSlot; registered: boolean }) {
  const href = slot.is_break ? "/dashboard/tutor" : `/dashboard/tutor/attendance/${slot.id}`;

  const content = (
    <article
      className={`rounded-md border px-3 py-2.5 transition ${
        slot.is_break
          ? "border-dashed border-border bg-[#f8fafc]"
          : "border-border bg-white hover:-translate-y-0.5 hover:shadow-sm"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-primary">
            {formatScheduleTime(slot.start_time)} - {formatScheduleTime(slot.end_time)}
          </p>
          <h4 className="mt-1 truncate text-sm font-semibold text-foreground">{slot.course_name}</h4>
          <p className="mt-0.5 truncate text-sm text-muted-foreground">{slot.subject_name ?? "Sin materia"}</p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          {slot.is_break ? "Descanso" : registered ? "Registrada" : "Pendiente"}
        </span>
      </div>
    </article>
  );

  if (slot.is_break) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function formatCalendarEventDate(event: CalendarEventSummary) {
  const date = new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short"
  }).format(event.startsAt);

  if (event.allDay) {
    return date;
  }

  const time = new Intl.DateTimeFormat("es-ES", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(event.startsAt);

  return `${date} - ${time}`;
}

import Link from "next/link";
import { BookOpenCheck, CalendarDays, FileCheck2, Inbox, Layers3, Settings2, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTutorUnreadCommunicationsCount } from "@/lib/communications/notifications";
import { getSubjectCoursesForTeacher } from "@/lib/grades/grades";
import { formatScheduleTime, getTeacherScheduleForToday, getWeekdayLabel, type TeacherScheduleSlot } from "@/lib/tutors/schedule";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { CalendarSummaryCard } from "@/components/dashboard/calendar-summary-card";
import { getDashboardNotifications } from "@/lib/internal-notifications";
import { getRegisteredScheduleIdsForDate } from "@/lib/attendance/session-attendance";

type DashboardIcon = typeof Layers3;

export default async function TutorDashboardPage() {
  const profile = await requireRole("tutor");
  const [
    { items: subjectCourses, errorMessage: subjectsError },
    { count: unreadCommunications, errorMessage: communicationsError },
    { notifications: dashboardNotifications, unreadCount, errorMessage: dashboardNotificationsError },
    { slots: todaySchedule, weekday, errorMessage: scheduleError }
  ] = await Promise.all([
    getSubjectCoursesForTeacher(profile.id),
    getTutorUnreadCommunicationsCount(profile.id),
    getDashboardNotifications({
      userId: profile.id,
      role: "tutor",
      communicationHref: "/dashboard/tutor/communications"
    }),
    getTeacherScheduleForToday(profile.id)
  ]);
  const { registeredScheduleIds, errorMessage: scheduleRegistrationError } = await getRegisteredScheduleIdsForDate({
    teacherId: profile.id,
    scheduleIds: todaySchedule.filter((slot) => !slot.is_break).map((slot) => slot.id)
  });
  const errorMessage = subjectsError ?? communicationsError ?? dashboardNotificationsError ?? scheduleError ?? scheduleRegistrationError;
  const tutorName = profile.full_name ?? profile.email ?? "tutor";

  return (
    <section className="space-y-6">
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

      <NotificationsPanel notifications={dashboardNotifications} unreadCount={unreadCount} />
      <CalendarSummaryCard href="/dashboard/tutor/calendar" />

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Horario de hoy</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {getWeekdayLabel(weekday)}. Accede directamente a cada clase para pasar lista.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/tutor/attendance"
            className="inline-flex h-9 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            Abrir pasar lista
          </Link>
        </div>

        {todaySchedule.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-border bg-[#f8fafc] p-4 text-sm text-muted-foreground">
            <p>No hay clases programadas para hoy.</p>
            <Link
              href="/dashboard/tutor/schedule"
              className="mt-3 inline-flex h-9 items-center justify-center rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
            >
              Ver horario completo
            </Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {todaySchedule.map((slot) => (
              <ScheduleSlotCard key={slot.id} slot={slot} registered={registeredScheduleIds.has(slot.id)} />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardSection
          title="Mis materias"
          description={
            subjectCourses.length === 0
              ? "No hay materias asignadas."
              : `${subjectCourses.length} materia${subjectCourses.length === 1 ? "" : "s"} asignada${subjectCourses.length === 1 ? "" : "s"}.`
          }
          href="/dashboard/tutor/subjects"
          icon={Layers3}
          action="Ver materias"
        />
        <DashboardSection
          title="Mis alumnos"
          description="Busca alumnos, filtra por curso y accede a sus fichas."
          href="/dashboard/tutor/students"
          icon={Users}
          action="Abrir alumnos"
        />
        <DashboardSection
          title="Criterios de evaluacion"
          description="Configura pesos y criterios por curso, materia y trimestre antes de evaluar."
          href="/dashboard/tutor/evaluation-settings"
          icon={Settings2}
          action="Configurar criterios"
        />
        <DashboardSection
          title="Cuaderno de calificaciones"
          description="Introduce notas, comentarios, recomendaciones y cierres trimestrales."
          href="/dashboard/tutor/gradebook"
          icon={BookOpenCheck}
          action="Abrir cuaderno"
        />
        <DashboardSection
          title="Cierre final de curso"
          description="Configura pesos anuales y cierra la nota final oficial por materia."
          href="/dashboard/tutor/final-grades"
          icon={FileCheck2}
          action="Abrir cierre final"
        />
        <DashboardSection
          title="Comunicaciones"
          description={`${unreadCommunications} comunicacion${unreadCommunications === 1 ? "" : "es"} pendiente${unreadCommunications === 1 ? "" : "s"} de lectura por familias.`}
          href="/dashboard/tutor/communications"
          icon={Inbox}
          action="Abrir bandeja"
        />
        <DashboardSection
          title="Horario docente"
          description="Consulta tu horario semanal y accede a pasar lista por clase."
          href="/dashboard/tutor/schedule"
          icon={CalendarDays}
          action="Ver horario"
        />
        <DashboardSection
          title="Calendario / Fechas de interes"
          description="Consulta examenes, reuniones, salidas, evaluaciones y avisos importantes del centro."
          href="/dashboard/tutor/calendar"
          icon={CalendarDays}
          action="Abrir calendario"
        />
      </div>
    </section>
  );
}

function ScheduleSlotCard({ slot, registered }: { slot: TeacherScheduleSlot; registered: boolean }) {
  const href = slot.is_break ? "/dashboard/tutor" : `/dashboard/tutor/attendance/${slot.id}`;

  const content = (
    <article
      className={`rounded-md border p-4 transition ${
        slot.is_break
          ? "border-dashed border-border bg-[#f8fafc]"
          : "border-border bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-primary">
            {formatScheduleTime(slot.start_time)} - {formatScheduleTime(slot.end_time)}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{slot.course_name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{slot.subject_name ?? "Sin materia"}</p>
        </div>
        <span className="rounded-full border border-border bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          {slot.is_break ? "Descanso" : registered ? "Asistencia registrada" : "Pendiente"}
        </span>
      </div>
    </article>
  );

  if (slot.is_break) {
    return content;
  }

  return <Link href={href}>{content}</Link>;
}

function DashboardSection({
  title,
  description,
  href,
  icon: Icon,
  action
}: {
  title: string;
  description: string;
  href: string;
  icon: DashboardIcon;
  action: string;
}) {
  return (
    <Link href={href} className="rounded-lg border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:bg-muted hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          <p className="mt-3 text-xs font-semibold text-primary">{action}</p>
        </div>
      </div>
    </Link>
  );
}

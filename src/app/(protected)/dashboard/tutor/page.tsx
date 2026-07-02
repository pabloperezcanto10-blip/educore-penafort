import Link from "next/link";
import { BookOpenCheck, CalendarDays, FileCheck2, Inbox, Layers3, Settings2, Users } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTutorUnreadCommunicationsCount } from "@/lib/communications/notifications";
import { getSubjectCoursesForTeacher } from "@/lib/grades/grades";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { CalendarSummaryCard } from "@/components/dashboard/calendar-summary-card";
import { getDashboardNotifications } from "@/lib/internal-notifications";

type DashboardIcon = typeof Layers3;

export default async function TutorDashboardPage() {
  const profile = await requireRole("tutor");
  const [
    { items: subjectCourses, errorMessage: subjectsError },
    { count: unreadCommunications, errorMessage: communicationsError },
    { notifications: dashboardNotifications, unreadCount, errorMessage: dashboardNotificationsError }
  ] = await Promise.all([
    getSubjectCoursesForTeacher(profile.id),
    getTutorUnreadCommunicationsCount(profile.id),
    getDashboardNotifications({
      userId: profile.id,
      role: "tutor",
      communicationHref: "/dashboard/tutor/communications"
    })
  ]);
  const errorMessage = subjectsError ?? communicationsError ?? dashboardNotificationsError;
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

      <section className="rounded-lg border border-dashed border-border bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
              <CalendarDays className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Horario docente</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Consulta tus clases del dia y accede directamente a materia, grupo y asistencia.
              </p>
            </div>
          </div>
          <span className="w-fit rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-muted-foreground">
            Proximamente
          </span>
        </div>
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

import Link from "next/link";
import { BookOpenCheck, CalendarDays, ClipboardList, Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getFamilyNotifications } from "@/lib/communications/notifications";
import { getFamilyAttendance } from "@/lib/attendance/attendance";
import { getFamilyGrades } from "@/lib/grades/grades";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { CalendarSummaryCard } from "@/components/dashboard/calendar-summary-card";
import { getDashboardNotifications } from "@/lib/internal-notifications";

type ModuleIcon = typeof Inbox;

export default async function FamilyDashboardPage() {
  const profile = await requireRole("family");
  const [
    { notifications, errorMessage },
    { rows: attendanceRows, errorMessage: attendanceErrorMessage },
    { grades, errorMessage: gradesErrorMessage },
    { notifications: dashboardNotifications, unreadCount, errorMessage: dashboardNotificationsError }
  ] = await Promise.all([
    getFamilyNotifications(profile.id),
    getFamilyAttendance(profile.id),
    getFamilyGrades(profile.id),
    getDashboardNotifications({
      userId: profile.id,
      role: "family",
      communicationHref: "/dashboard/family/communications"
    })
  ]);
  const unreadNotifications = notifications.filter((notification) => !notification.read).length;
  const attendanceIssues = attendanceRows.filter((row) => row.status !== "present").length;
  const pendingJustifications = attendanceRows.filter((row) => row.status !== "present" && !row.justified).length;
  const pageError = errorMessage ?? attendanceErrorMessage ?? gradesErrorMessage ?? dashboardNotificationsError;
  const familyName = profile.full_name ?? profile.email ?? "familia";

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Bienvenido, {familyName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Seguimiento familiar claro de comunicaciones, calificaciones y evoluci&oacute;n del alumno.
        </p>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte del panel: {pageError}
        </div>
      ) : null}

      <NotificationsPanel notifications={dashboardNotifications} unreadCount={unreadCount} />
      <CalendarSummaryCard href="/dashboard/family/calendar" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <DashboardModule
          title="Comunicaciones"
          description="Mensajes del centro, avisos, respuestas y justificaciones."
          icon={Inbox}
          href="/dashboard/family/communications"
          metrics={[
            `${notifications.length} mensaje${notifications.length === 1 ? "" : "s"}`,
            `${unreadNotifications} sin leer`
          ]}
        />
        <DashboardModule
          title="Calificaciones"
          description="Consulta notas por materia, observaciones, recomendaciones y boletines."
          icon={BookOpenCheck}
          href="/dashboard/family/grades"
          metrics={[
            `${grades.length} calificacion${grades.length === 1 ? "" : "es"} visible${grades.length === 1 ? "" : "s"}`,
            "Boletines preparados para publicacion"
          ]}
        />
        <DashboardModule
          title="Alumno"
          description="Resumen diario de asistencia, retrasos, incidencias y seguimiento."
          icon={ClipboardList}
          href="/dashboard/family/student"
          metrics={[
            `${attendanceIssues} falta${attendanceIssues === 1 ? "" : "s"} / retraso${attendanceIssues === 1 ? "" : "s"}`,
            `${pendingJustifications} pendiente${pendingJustifications === 1 ? "" : "s"} de justificar`
          ]}
        />
        <DashboardModule
          title="Calendario / Fechas de interes"
          description="Consulta examenes, reuniones, salidas, evaluaciones y avisos importantes del centro."
          icon={CalendarDays}
          href="/dashboard/family/calendar"
          metrics={["Calendario oficial del centro", "Fuente: Google Calendar"]}
        />
      </div>
    </section>
  );
}

function DashboardModule({
  title,
  description,
  icon: Icon,
  href,
  metrics
}: {
  title: string;
  description: string;
  icon: ModuleIcon;
  href?: string;
  metrics: string[];
}) {
  const content = (
    <article className="rounded-lg border border-border bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {metrics.map((metric) => (
          <p key={metric} className="rounded-md border border-border bg-[#f8fafc] px-3 py-2 text-xs font-medium text-muted-foreground">
            {metric}
          </p>
        ))}
      </div>
    </article>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        {content}
      </Link>
    );
  }

  return content;
}

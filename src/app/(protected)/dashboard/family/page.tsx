import Link from "next/link";
import { ArrowRight, BookOpenCheck, CalendarDays, ClipboardList, Inbox } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getFamilyNotifications } from "@/lib/communications/notifications";
import { getFamilyAttendance } from "@/lib/attendance/attendance";
import { getFamilyGrades } from "@/lib/grades/grades";
import { NotificationsPanel } from "@/components/dashboard/notifications-panel";
import { CalendarSummaryCard } from "@/components/dashboard/calendar-summary-card";
import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
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
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">Panel familiar</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">Bienvenido, {familyName}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Seguimiento familiar claro de comunicaciones, calificaciones y evolución del alumno.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <GradebookBadge tone={unreadCount > 0 ? "amber" : "green"}>{unreadCount} novedades pendientes</GradebookBadge>
          <GradebookBadge tone={pendingJustifications > 0 ? "amber" : "gray"}>{pendingJustifications} justificaciones pendientes</GradebookBadge>
        </div>
      </div>

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar parte del panel: {pageError}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <NotificationsPanel notifications={dashboardNotifications} unreadCount={unreadCount} />
        <CalendarSummaryCard href="/dashboard/family/calendar" />
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
            href="/dashboard/family/communications"
            primaryMetric={`${notifications.length} mensaje${notifications.length === 1 ? "" : "s"}`}
            secondaryMetric={`${unreadNotifications} sin leer`}
            tone={unreadNotifications > 0 ? "amber" : "blue"}
          />
          <FamilyModule
            title="Calificaciones"
            description="Notas por materia, observaciones, recomendaciones y boletines."
            icon={BookOpenCheck}
            href="/dashboard/family/grades"
            primaryMetric={`${grades.length} visible${grades.length === 1 ? "" : "s"}`}
            secondaryMetric="Boletines según publicación"
            tone="blue"
          />
          <FamilyModule
            title="Alumno"
            description="Resumen diario de asistencia, retrasos, incidencias y seguimiento."
            icon={ClipboardList}
            href="/dashboard/family/student"
            primaryMetric={`${attendanceIssues} falta${attendanceIssues === 1 ? "" : "s"} / retraso${attendanceIssues === 1 ? "" : "s"}`}
            secondaryMetric={`${pendingJustifications} pendiente${pendingJustifications === 1 ? "" : "s"}`}
            tone={attendanceIssues > 0 ? "amber" : "green"}
          />
          <FamilyModule
            title="Calendario"
            description="Exámenes, reuniones, salidas, evaluaciones y avisos importantes."
            icon={CalendarDays}
            href="/dashboard/family/calendar"
            primaryMetric="Calendario oficial"
            secondaryMetric="Google Calendar"
            tone="green"
          />
        </div>
      </GradebookCard>
    </section>
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
  icon: ModuleIcon;
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
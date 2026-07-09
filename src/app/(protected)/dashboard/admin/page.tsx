import Link from "next/link";
import {
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  FileCheck2,
  FilePlus2,
  Inbox,
  ShieldCheck,
  Upload,
  Users,
  Wrench,
  type LucideIcon
} from "lucide-react";

import { CenterActivityTimeline, type CenterActivityItem } from "@/components/dashboard/center-activity-timeline";
import { WorkCenterTabs } from "@/components/dashboard/work-center-tabs";
import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
import { requireRole } from "@/lib/auth/session";
import { getDashboardCalendarEvents, type CalendarEventSummary } from "@/lib/calendar/ical";
import type { Database } from "@/lib/database.types";
import type { DashboardNotification } from "@/lib/internal-notifications";
import { getDashboardNotifications } from "@/lib/internal-notifications";
import { createClient } from "@/lib/supabase/server";

type AdminDashboardTab = "prioridades" | "estructura" | "importacion" | "evaluacion" | "seguridad" | "calendario";
type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
type InternalNotification = Database["public"]["Tables"]["internal_notifications"]["Row"];

type AdminDashboardPageProps = {
  searchParams?: {
    work_tab?: string;
  };
};

type AdminSignals = {
  activeAcademicYear: string | null;
  unreadNotifications: number;
  inactiveUsers: number;
  passwordPendingUsers: number;
  recentImports: number;
  importErrors: number;
  studentsTotal: number;
  familiesTotal: number;
  teachersTotal: number;
  coursesTotal: number;
  subjectsTotal: number;
  assignmentsTotal: number;
  pendingPublications: number;
  pendingClosures: number;
  recentSecurityEvents: number;
  sensitiveChanges: number;
  totalActionable: number;
};

const adminTabs: Array<{ id: AdminDashboardTab; label: string }> = [
  { id: "prioridades", label: "Prioridades" },
  { id: "estructura", label: "Estructura" },
  { id: "importacion", label: "Importación" },
  { id: "evaluacion", label: "Evaluación" },
  { id: "seguridad", label: "Seguridad" },
  { id: "calendario", label: "Calendario" }
];

export default async function AdminDashboardPage({ searchParams }: AdminDashboardPageProps) {
  const profile = await requireRole("superadmin");
  const activeTab = normalizeAdminTab(searchParams?.work_tab);
  const [
    { notifications, unreadCount, errorMessage: notificationsError },
    { todayEvents, upcomingEvents, errorMessage: calendarError },
    signalsResult,
    activityResult
  ] = await Promise.all([
    getDashboardNotifications({
      userId: profile.id,
      role: "superadmin",
      communicationHref: "/dashboard/admin/communications"
    }),
    getDashboardCalendarEvents(),
    getAdminSignals(),
    getAdminActivity()
  ]);
  const signals = {
    ...signalsResult.signals,
    unreadNotifications: unreadCount
  };
  const errorMessage = notificationsError ?? calendarError ?? signalsResult.errorMessage ?? activityResult.errorMessage;
  const calendarEvents = [...todayEvents, ...upcomingEvents].slice(0, 4);
  const activityItems = [
    ...(activityResult.items.length > 0 ? activityResult.items : buildNotificationActivity(notifications)),
    ...calendarEvents.map(toCalendarActivityItem)
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Panel de administración</h1>
          <p className="mt-1 text-sm text-slate-500">
            Centro de gestión técnica, mantenimiento y configuración estructural de EducaCora.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {signals.importErrors > 0 ? <GradebookBadge tone="red">{signals.importErrors} incidencias técnicas</GradebookBadge> : null}
          {signals.recentImports > 0 ? <GradebookBadge tone="blue">{signals.recentImports} importaciones recientes</GradebookBadge> : null}
          {signals.inactiveUsers + signals.passwordPendingUsers > 0 ? <GradebookBadge tone="amber">{signals.inactiveUsers + signals.passwordPendingUsers} usuarios/roles pendientes</GradebookBadge> : null}
          {signals.activeAcademicYear ? <GradebookBadge tone="green">Curso {signals.activeAcademicYear}</GradebookBadge> : <GradebookBadge tone="amber">Curso escolar pendiente</GradebookBadge>}
          {signals.recentSecurityEvents > 0 ? <GradebookBadge tone="blue">{signals.recentSecurityEvents} eventos de auditoría</GradebookBadge> : null}
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar parte del panel: {errorMessage}
        </div>
      ) : null}

      <CompactNotifications notifications={notifications} unreadCount={unreadCount} />

      <GradebookCard>
        <GradebookCardHeader title="Centro de gestión">
          <GradebookBadge tone={signals.totalActionable > 0 ? "amber" : "green"}>
            {signals.totalActionable > 0 ? `${signals.totalActionable} tareas` : "Sistema estable"}
          </GradebookBadge>
        </GradebookCardHeader>
        <WorkCenterTabs
          initialTab={activeTab}
          tabs={adminTabs}
          basePath="/dashboard/admin"
          ariaLabel="Centro de gestión administrativa"
          panels={[
            { id: "prioridades", content: <PrioritiesPanel signals={signals} /> },
            { id: "estructura", content: <StructurePanel signals={signals} /> },
            { id: "importacion", content: <ImportPanel signals={signals} /> },
            { id: "evaluacion", content: <EvaluationPanel signals={signals} /> },
            { id: "seguridad", content: <SecurityPanel signals={signals} /> },
            { id: "calendario", content: <CalendarPanel events={calendarEvents} errorMessage={calendarError} /> }
          ]}
        />
      </GradebookCard>

      <CenterActivityTimeline items={activityItems} />
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
            <h2 className="text-sm font-semibold text-slate-950">Novedades técnicas</h2>
            <p className="mt-1 text-sm text-slate-500">
              {unreadCount > 0 ? `${unreadCount} aviso${unreadCount === 1 ? "" : "s"} pendiente${unreadCount === 1 ? "" : "s"}.` : "Sistema funcionando con normalidad."}
            </p>
          </div>
        </div>
        <GradebookBadge tone={unreadCount > 0 ? "amber" : "green"}>{unreadCount > 0 ? "Revisar" : "Sin avisos"}</GradebookBadge>
      </div>

      {notifications.length > 0 ? (
        <div className="mt-3 grid gap-2 md:grid-cols-2">
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

function PrioritiesPanel({ signals }: { signals: AdminSignals }) {
  const priorities = [
    signals.importErrors > 0
      ? { title: "Importaciones con error", description: `${signals.importErrors} proceso${signals.importErrors === 1 ? "" : "s"} necesita${signals.importErrors === 1 ? "" : "n"} revisión.`, href: "/dashboard/admin/import?tab=cleanup", icon: Upload, tone: "amber" as const }
      : null,
    signals.inactiveUsers > 0 || signals.passwordPendingUsers > 0
      ? { title: "Usuarios pendientes", description: `${signals.inactiveUsers} inactivos · ${signals.passwordPendingUsers} con cambio de contraseña pendiente.`, href: "/dashboard/admin/users", icon: Users, tone: "amber" as const }
      : null,
    !signals.activeAcademicYear
      ? { title: "Curso escolar sin configurar", description: "No hay curso escolar activo configurado.", href: "/dashboard/admin/academic-years", icon: CalendarCheck, tone: "amber" as const }
      : null,
    signals.pendingClosures > 0 || signals.pendingPublications > 0
      ? { title: "Gestión académica pendiente", description: `${signals.pendingClosures} cierres · ${signals.pendingPublications} publicaciones pendientes.`, href: "/dashboard/admin/gradebook", icon: BookOpenCheck, tone: "blue" as const }
      : null,
    signals.sensitiveChanges > 0
      ? { title: "Cambios sensibles recientes", description: `${signals.sensitiveChanges} evento${signals.sensitiveChanges === 1 ? "" : "s"} de seguridad o auditoría.`, href: "/dashboard/admin/security", icon: ShieldCheck, tone: "blue" as const }
      : null
  ].filter(Boolean);

  if (priorities.length === 0) {
    return <EmptyPanel title="Sistema funcionando con normalidad." description="No existen tareas administrativas pendientes." icon={CheckCircle2} />;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {priorities.map((priority) => priority ? <ActionRow key={priority.title} {...priority} /> : null)}
    </div>
  );
}

function StructurePanel({ signals }: { signals: AdminSignals }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricBox label="Cursos" value={signals.coursesTotal} tone="blue" />
        <MetricBox label="Materias" value={signals.subjectsTotal} tone="blue" />
        <MetricBox label="Alumnos" value={signals.studentsTotal} tone="blue" />
        <MetricBox label="Familias" value={signals.familiesTotal} tone="blue" />
        <MetricBox label="Profesores" value={signals.teachersTotal} tone="blue" />
        <MetricBox label="Asignaciones" value={signals.assignmentsTotal} tone="blue" />
      </div>
      <div className="grid gap-2">
        <ActionLink href="/dashboard/admin/maintenance" icon={Wrench} label="Abrir mantenimiento" />
        <ActionLink href="/dashboard/admin/create" icon={FilePlus2} label="Crear estructura" secondary />
      </div>
    </div>
  );
}

function ImportPanel({ signals }: { signals: AdminSignals }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Importaciones recientes" value={signals.recentImports} tone="blue" />
        <MetricBox label="Alumnos actuales" value={signals.studentsTotal} tone="blue" />
        <MetricBox label="Errores" value={signals.importErrors} tone={signals.importErrors > 0 ? "amber" : "green"} />
      </div>
      <ActionLink href="/dashboard/admin/import" icon={Upload} label="Abrir importación" />
    </div>
  );
}

function EvaluationPanel({ signals }: { signals: AdminSignals }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Cuaderno" value={signals.subjectsTotal} tone="blue" />
        <MetricBox label="Cierres" value={signals.pendingClosures} tone={signals.pendingClosures > 0 ? "amber" : "green"} />
        <MetricBox label="Publicaciones" value={signals.pendingPublications} tone={signals.pendingPublications > 0 ? "amber" : "green"} />
      </div>
      <div className="grid gap-2">
        <ActionLink href="/dashboard/admin/gradebook" icon={BookOpenCheck} label="Abrir cuaderno" />
        <ActionLink href="/dashboard/admin/final-grades" icon={FileCheck2} label="Cierre final" secondary />
      </div>
    </div>
  );
}

function SecurityPanel({ signals }: { signals: AdminSignals }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Auditoría" value={signals.recentSecurityEvents} tone="blue" />
        <MetricBox label="Cambios sensibles" value={signals.sensitiveChanges} tone={signals.sensitiveChanges > 0 ? "amber" : "green"} />
        <MetricBox label="Usuarios pendientes" value={signals.inactiveUsers + signals.passwordPendingUsers} tone={signals.inactiveUsers + signals.passwordPendingUsers > 0 ? "amber" : "green"} />
      </div>
      <ActionLink href="/dashboard/admin/security" icon={ShieldCheck} label="Abrir seguridad" />
    </div>
  );
}

function CalendarPanel({ events, errorMessage }: { events: CalendarEventSummary[]; errorMessage: string | null }) {
  if (errorMessage) {
    return <EmptyPanel title="Calendario no disponible" description="Consulta el calendario completo para revisar fechas importantes." icon={CalendarDays} href="/dashboard/admin/calendar" />;
  }

  if (events.length === 0) {
    return <EmptyPanel title="Sin eventos próximos" description="No hay reuniones, evaluaciones o publicaciones próximas en el calendario." icon={CalendarDays} href="/dashboard/admin/calendar" />;
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
      <ActionLink href="/dashboard/admin/calendar" icon={CalendarDays} label="Abrir calendario" />
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
  icon: LucideIcon;
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

function ActionLink({ href, icon: Icon, label, secondary = false }: { href: string; icon: LucideIcon; label: string; secondary?: boolean }) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
        secondary
          ? "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          : "bg-sky-700 text-white hover:bg-sky-800"
      }`}
    >
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
  icon: LucideIcon;
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

async function getAdminSignals(): Promise<{ signals: AdminSignals; errorMessage: string | null }> {
  const supabase = await createClient();
  const recentCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const [
    academicYearResult,
    profilesResult,
    studentsResult,
    coursesResult,
    subjectsResult,
    assignmentsResult,
    notificationsResult,
    auditResult
  ] = await Promise.all([
    supabase.from("academic_years").select("id,name,active").eq("active", true).maybeSingle(),
    supabase.from("profiles").select("id,role,active,must_change_password").returns<Array<{ id: string; role: string; active: boolean; must_change_password: boolean }>>(),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("subjects").select("id", { count: "exact", head: true }),
    supabase.from("teacher_assignments").select("id", { count: "exact", head: true }),
    supabase
      .from("internal_notifications")
      .select("id,type,read,created_at")
      .eq("role", "superadmin")
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Pick<InternalNotification, "id" | "type" | "read" | "created_at">[]>(),
    supabase
      .from("audit_logs")
      .select("id,action,module,created_at")
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<Pick<AuditLog, "id" | "action" | "module" | "created_at">[]>()
  ]);
  const profiles = profilesResult.error ? [] : profilesResult.data ?? [];
  const notifications = notificationsResult.error ? [] : notificationsResult.data ?? [];
  const auditLogs = auditResult.error ? [] : auditResult.data ?? [];
  const countType = (type: InternalNotification["type"]) => notifications.filter((notification) => notification.type === type && !notification.read).length;
  const recentImports = auditLogs.filter((log) => ["student_imported", "family_created", "bulk_import_completed"].includes(log.action) && log.created_at >= recentCutoff).length;
  const importErrors = notifications.filter((notification) => notification.type === "administrative_incident" && !notification.read).length;
  const inactiveUsers = profiles.filter((profile) => profile.active === false).length;
  const passwordPendingUsers = profiles.filter((profile) => profile.must_change_password).length;
  const sensitiveChanges = auditLogs.filter((log) => ["user_created", "user_deleted", "user_deactivated", "user_reactivated", "password_changed"].includes(log.action) && log.created_at >= recentCutoff).length;
  const recentSecurityEvents = auditLogs.filter((log) => log.created_at >= recentCutoff).length;
  const pendingClosures = countType("evaluation_pending_close");
  const pendingPublications = countType("report_pending_publication");
  const activeAcademicYearName = (academicYearResult.data as { name: string } | null)?.name ?? null;
  const errorMessage =
    academicYearResult.error?.message ??
    profilesResult.error?.message ??
    studentsResult.error?.message ??
    coursesResult.error?.message ??
    subjectsResult.error?.message ??
    assignmentsResult.error?.message ??
    notificationsResult.error?.message ??
    auditResult.error?.message ??
    null;

  const signals: AdminSignals = {
    activeAcademicYear: activeAcademicYearName,
    unreadNotifications: 0,
    inactiveUsers,
    passwordPendingUsers,
    recentImports,
    importErrors,
    studentsTotal: studentsResult.count ?? 0,
    familiesTotal: profiles.filter((profile) => profile.role === "family").length,
    teachersTotal: profiles.filter((profile) => profile.role === "tutor").length,
    coursesTotal: coursesResult.count ?? 0,
    subjectsTotal: subjectsResult.count ?? 0,
    assignmentsTotal: assignmentsResult.count ?? 0,
    pendingPublications,
    pendingClosures,
    recentSecurityEvents,
    sensitiveChanges,
    totalActionable: importErrors + inactiveUsers + passwordPendingUsers + pendingClosures + pendingPublications + (activeAcademicYearName ? 0 : 1)
  };

  return { signals, errorMessage };
}

async function getAdminActivity(): Promise<{ items: CenterActivityItem[]; errorMessage: string | null }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,actor_user_id,actor_role,action,module,entity_type,entity_id,before_data,after_data,created_at")
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<AuditLog[]>();

  if (error) {
    return { items: [], errorMessage: error.message };
  }

  return {
    items: (data ?? []).map(toAdminActivityItem),
    errorMessage: null
  };
}

function toAdminActivityItem(log: AuditLog): CenterActivityItem {
  const label = adminAuditLabel(log.action);

  return {
    id: log.id,
    title: label.title,
    meta: label.meta,
    date: log.created_at,
    href: label.href,
    actionLabel: label.actionLabel,
    tone: label.tone,
    kind: label.kind,
    category: label.category,
    priority: label.priority,
    groupKey: label.groupKey
  };
}

function adminAuditLabel(action: string): {
  title: string;
  meta: string;
  href: string;
  actionLabel: string;
  tone: CenterActivityItem["tone"];
  kind: CenterActivityItem["kind"];
  category: CenterActivityItem["category"];
  priority: CenterActivityItem["priority"];
  groupKey: string;
} {
  const labels: Record<string, ReturnType<typeof adminAuditLabel>> = {
    student_imported: { title: "Se importó un alumno.", meta: "Importación masiva", href: "/dashboard/admin/import", actionLabel: "Abrir importación", tone: "blue", kind: "system", category: "academic", priority: "info", groupKey: "import" },
    family_created: { title: "Se creó una familia.", meta: "Estructura del centro", href: "/dashboard/admin/maintenance", actionLabel: "Abrir mantenimiento", tone: "blue", kind: "system", category: "academic", priority: "info", groupKey: "structure" },
    parent_student_linked: { title: "Se vinculó una familia con un alumno.", meta: "Relaciones familiares", href: "/dashboard/admin/maintenance", actionLabel: "Abrir relaciones", tone: "green", kind: "system", category: "academic", priority: "info", groupKey: "structure" },
    user_created: { title: "Se creó un usuario.", meta: "Gestión de accesos", href: "/dashboard/admin/users", actionLabel: "Abrir usuarios", tone: "blue", kind: "system", category: "academic", priority: "followup", groupKey: "users" },
    user_deleted: { title: "Se eliminó un usuario.", meta: "Cambio sensible", href: "/dashboard/admin/security", actionLabel: "Ver auditoría", tone: "amber", kind: "system", category: "academic", priority: "attention", groupKey: "security" },
    user_deactivated: { title: "Se desactivó un usuario.", meta: "Cambio sensible", href: "/dashboard/admin/security", actionLabel: "Ver auditoría", tone: "amber", kind: "system", category: "academic", priority: "followup", groupKey: "security" },
    user_reactivated: { title: "Se reactivó un usuario.", meta: "Gestión de accesos", href: "/dashboard/admin/users", actionLabel: "Abrir usuarios", tone: "green", kind: "system", category: "academic", priority: "followup", groupKey: "users" },
    evaluation_published: { title: "Se publicó una evaluación.", meta: "Publicación académica", href: "/dashboard/admin/gradebook", actionLabel: "Abrir cuaderno", tone: "green", kind: "report", category: "academic", priority: "followup", groupKey: "academic" },
    term_grade_closed: { title: "Se cerró una evaluación.", meta: "Cierre académico", href: "/dashboard/admin/gradebook", actionLabel: "Abrir cuaderno", tone: "green", kind: "grade", category: "academic", priority: "followup", groupKey: "academic" },
    term_grade_reopened: { title: "Se reabrió una evaluación.", meta: "Cierre académico", href: "/dashboard/admin/gradebook", actionLabel: "Abrir cuaderno", tone: "amber", kind: "grade", category: "academic", priority: "attention", groupKey: "academic" },
    communication_sent: { title: "Se registró una comunicación.", meta: "Comunicación del centro", href: "/dashboard/admin/communications", actionLabel: "Abrir comunicaciones", tone: "blue", kind: "communication", category: "communications", priority: "info", groupKey: "communication" }
  };

  return labels[action] ?? { title: "Se registró una acción administrativa.", meta: "Auditoría del sistema", href: "/dashboard/admin/security", actionLabel: "Ver auditoría", tone: "gray", kind: "system", category: "academic", priority: "info", groupKey: "audit" };
}

function buildNotificationActivity(notifications: DashboardNotification[]): CenterActivityItem[] {
  return notifications.slice(0, 8).map((notification) => ({
    id: `${notification.source}-${notification.id}`,
    title: notification.title,
    meta: notification.body,
    date: notification.created_at,
    href: notification.href,
    actionLabel: notification.source === "communication" ? "Abrir comunicaciones" : "Ver detalle",
    tone: notification.read ? "gray" : "blue",
    kind: notification.source === "communication" ? "communication" : "system",
    category: notification.source === "communication" ? "communications" : "academic",
    priority: notification.read ? "info" : "followup",
    groupKey: notification.source === "communication" ? "communication-notification" : "system-notification"
  }));
}

function toCalendarActivityItem(event: CalendarEventSummary): CenterActivityItem {
  return {
    id: `calendar-${event.id}`,
    title: `Está programado: ${event.title}.`,
    meta: formatCalendarEventDate(event),
    date: event.startsAt.toISOString(),
    href: "/dashboard/admin/calendar",
    actionLabel: "Abrir calendario",
    tone: "gray",
    kind: "calendar",
    category: "calendar",
    priority: "info",
    groupKey: "calendar"
  };
}

function normalizeAdminTab(value: string | undefined): AdminDashboardTab {
  return adminTabs.some((tab) => tab.id === value) ? (value as AdminDashboardTab) : "prioridades";
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







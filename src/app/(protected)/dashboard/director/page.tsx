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

import {
  CenterActivityTimeline,
  type CenterActivityItem,
  type CenterActivityKind,
  type CenterActivityPriority,
  type CenterActivityTone
} from "@/components/dashboard/center-activity-timeline";
import { WorkCenterTabs } from "@/components/dashboard/work-center-tabs";
import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
import { requireRole } from "@/lib/auth/session";
import { getDashboardCalendarEvents, type CalendarEventSummary } from "@/lib/calendar/ical";
import { getDirectorCommunications, type DirectorCommunication } from "@/lib/communications/notifications";
import type { Database } from "@/lib/database.types";
import type { DashboardNotification } from "@/lib/internal-notifications";
import { getDashboardNotifications } from "@/lib/internal-notifications";
import { createClient } from "@/lib/supabase/server";

type DirectorDashboardTab = "prioridades" | "alumnos" | "comunicaciones" | "evaluacion" | "calendario";
type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
type InternalNotification = Database["public"]["Tables"]["internal_notifications"]["Row"];
type CommunicationSignal = Pick<Database["public"]["Tables"]["notifications"]["Row"], "id" | "sender_id" | "receiver_id" | "read" | "created_at">;

type DirectorDashboardPageProps = {
  searchParams?: {
    work_tab?: string;
  };
};

const directorTabs: Array<{ id: DirectorDashboardTab; label: string }> = [
  { id: "prioridades", label: "Prioridades" },
  { id: "alumnos", label: "Alumnos" },
  { id: "comunicaciones", label: "Comunicaciones" },
  { id: "evaluacion", label: "Evaluación" },
  { id: "calendario", label: "Calendario" }
];

export default async function DirectorDashboardPage({ searchParams }: DirectorDashboardPageProps) {
  const profile = await requireRole("director");
  const activeTab = normalizeDirectorTab(searchParams?.work_tab);
  const [
    { notifications, unreadCount, errorMessage: notificationsError },
    { todayEvents, upcomingEvents, errorMessage: calendarError },
    signalsResult,
    activityResult
  ] = await Promise.all([
    getDashboardNotifications({
      userId: profile.id,
      role: "director",
      communicationHref: "/dashboard/director/communications"
    }),
    getDashboardCalendarEvents(),
    getDirectorSignals(profile.id),
    getCenterActivity()
  ]);
  const errorMessage = notificationsError ?? calendarError ?? signalsResult.errorMessage ?? activityResult.errorMessage;
  const signals = signalsResult.signals;
  const calendarEvents = [...todayEvents, ...upcomingEvents].slice(0, 4);
  const activityItems = [
    ...(activityResult.items.length > 0 ? activityResult.items : buildNotificationActivity(notifications)),
    ...calendarEvents.map(toCalendarActivityItem)
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Buenos días</h1>
          <p className="mt-1 text-sm text-slate-500">
            Centro de control para supervisar actividad, comunicaciones y cierres del colegio.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
        <CompactCalendar todayEvents={todayEvents} upcomingEvents={upcomingEvents} errorMessage={calendarError} />
      </div>

      <GradebookCard>
        <GradebookCardHeader title="Centro de supervisión">
          <GradebookBadge tone={signals.totalActionable > 0 ? "amber" : "green"}>
            {signals.totalActionable > 0 ? `${signals.totalActionable} prioridades` : "Sin bloqueos"}
          </GradebookBadge>
        </GradebookCardHeader>
        <WorkCenterTabs
          initialTab={activeTab}
          tabs={directorTabs}
          basePath="/dashboard/director"
          ariaLabel="Centro de supervisión de dirección"
          panels={[
            {
              id: "prioridades",
              content: <PrioritiesPanel signals={signals} />
            },
            {
              id: "alumnos",
              content: <StudentsPanel signals={signals} />
            },
            {
              id: "comunicaciones",
              content: <CommunicationsPanel signals={signals} />
            },
            {
              id: "evaluacion",
              content: <EvaluationPanel signals={signals} />
            },
            {
              id: "calendario",
              content: <CalendarPanel events={calendarEvents} errorMessage={calendarError} />
            }
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

function CompactCalendar({ todayEvents, upcomingEvents, errorMessage }: { todayEvents: CalendarEventSummary[]; upcomingEvents: CalendarEventSummary[]; errorMessage: string | null }) {
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
        <Link href="/dashboard/director/calendar" className="inline-flex h-9 shrink-0 items-center justify-center rounded-xl bg-sky-700 px-3 text-xs font-semibold text-white transition hover:bg-sky-800">
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

function PrioritiesPanel({ signals }: { signals: DirectorSignals }) {
  const priorities = [
    signals.directorCommunicationsPending > 0
      ? { title: "Comunicación dirigida a Dirección", description: `${signals.directorCommunicationsPending} mensaje${signals.directorCommunicationsPending === 1 ? "" : "s"} requiere${signals.directorCommunicationsPending === 1 ? "" : "n"} respuesta o supervisión directa.`, href: "/dashboard/director/communications?director_only=1", icon: MessageSquareText, tone: "amber" as const }
      : null,
    signals.pendingPublications > 0
      ? { title: "Publicaciones pendientes", description: `${signals.pendingPublications} boletín${signals.pendingPublications === 1 ? "" : "es"} o evaluación pendiente de publicación.`, href: "/dashboard/director/gradebook", icon: FileCheck2, tone: "amber" as const }
      : null,
    signals.activeIncidents > 0
      ? { title: "Incidencias activas", description: `${signals.activeIncidents} incidencia${signals.activeIncidents === 1 ? "" : "s"} requiere seguimiento.`, href: "/dashboard/director/students", icon: AlertCircle, tone: "amber" as const }
      : null,
    signals.pendingClosures > 0
      ? { title: "Cierres trimestrales", description: `${signals.pendingClosures} cierre${signals.pendingClosures === 1 ? "" : "s"} pendiente${signals.pendingClosures === 1 ? "" : "s"} de revisión.`, href: "/dashboard/director/gradebook", icon: ClipboardList, tone: "blue" as const }
      : null,
    signals.communicationsPending > 0
      ? { title: "Comunicaciones pendientes", description: `${signals.communicationsPending} comunicación${signals.communicationsPending === 1 ? "" : "es"} esperan revisión o respuesta.`, href: "/dashboard/director/communications", icon: MessageSquareText, tone: "amber" as const }
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

function StudentsPanel({ signals }: { signals: DirectorSignals }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Alumnos" value={signals.studentsTotal} tone="blue" />
        <MetricBox label="Incidencias" value={signals.activeIncidents} tone={signals.activeIncidents > 0 ? "amber" : "green"} />
        <MetricBox label="Seguimientos recientes" value={signals.recentFollowUps} tone="blue" />
      </div>
      <ActionLink href="/dashboard/director/students" icon={Users} label="Abrir supervisión de alumnos" />
    </div>
  );
}

function CommunicationsPanel({ signals }: { signals: DirectorSignals }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Abiertas" value={signals.openConversations} tone="blue" />
        <MetricBox label="Pendientes" value={signals.communicationsPending} tone={signals.communicationsPending > 0 ? "amber" : "green"} />
        <MetricBox label="Respuestas recientes" value={signals.recentCommunicationActivity} tone="blue" />
      </div>
      <ActionLink href="/dashboard/director/communications" icon={MessageSquareText} label="Abrir comunicaciones" />
    </div>
  );
}

function EvaluationPanel({ signals }: { signals: DirectorSignals }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
      <div className="grid gap-3 md:grid-cols-3">
        <MetricBox label="Materias abiertas" value={signals.openEvaluations} tone="blue" />
        <MetricBox label="Cierres" value={signals.pendingClosures} tone={signals.pendingClosures > 0 ? "amber" : "green"} />
        <MetricBox label="Publicaciones" value={signals.pendingPublications} tone={signals.pendingPublications > 0 ? "amber" : "green"} />
      </div>
      <ActionLink href="/dashboard/director/gradebook" icon={BookOpenCheck} label="Abrir evaluación" />
    </div>
  );
}

function CalendarPanel({ events, errorMessage }: { events: CalendarEventSummary[]; errorMessage: string | null }) {
  if (errorMessage) {
    return <EmptyPanel title="Calendario no disponible" description="Consulta el calendario completo para revisar fechas importantes." icon={CalendarDays} href="/dashboard/director/calendar" />;
  }

  if (events.length === 0) {
    return <EmptyPanel title="Sin eventos próximos" description="No hay reuniones, evaluaciones o salidas próximas en el calendario." icon={CalendarDays} href="/dashboard/director/calendar" />;
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
      <ActionLink href="/dashboard/director/calendar" icon={CalendarDays} label="Abrir calendario" />
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

type DirectorSignals = {
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

async function getDirectorSignals(userId: string): Promise<{ signals: DirectorSignals; errorMessage: string | null }> {
  const supabase = await createClient();
  const [notificationsResult, studentsResult, communicationsResult] = await Promise.all([
    supabase
      .from("internal_notifications")
      .select("id,type,read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<Pick<InternalNotification, "id" | "type" | "read" | "created_at">[]>(),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase
      .from("notifications")
      .select("id,sender_id,receiver_id,read,created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<CommunicationSignal[]>()
  ]);

  const notifications = notificationsResult.error ? [] : notificationsResult.data ?? [];
  const communications = communicationsResult.error ? [] : communicationsResult.data ?? [];
  const recentCutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const countType = (type: InternalNotification["type"]) => notifications.filter((notification) => notification.type === type && !notification.read).length;
  const communicationsPending = notifications.filter((notification) => ["new_communication", "unread_communication"].includes(notification.type) && !notification.read).length;
  const directorCommunicationsPending = communications.filter((communication) => communication.receiver_id === userId && !communication.read).length;
  const activeIncidents = countType("new_incident") + countType("administrative_incident");
  const pendingClosures = countType("evaluation_pending_close");
  const pendingPublications = countType("report_pending_publication");
  const openEvaluations = notifications.filter((notification) => notification.type === "evaluation_pending_close").length;
  const openConversations = communications.length;
  const recentCommunicationActivity = communications.filter((communication) => new Date(communication.created_at).getTime() >= recentCutoff).length;
  const recentFollowUps = notifications.filter((notification) => new Date(notification.created_at).getTime() >= recentCutoff).length;
  const errorMessage = notificationsResult.error?.message ?? studentsResult.error?.message ?? communicationsResult.error?.message ?? null;

  return {
    signals: {
      communicationsPending,
      directorCommunicationsPending,
      activeIncidents,
      openEvaluations,
      pendingClosures,
      pendingPublications,
      studentsTotal: studentsResult.count ?? 0,
      recentFollowUps,
      openConversations,
      recentCommunicationActivity,
      totalActionable: directorCommunicationsPending + activeIncidents + pendingClosures + pendingPublications
    },
    errorMessage
  };
}

async function getCenterActivity(): Promise<{ items: CenterActivityItem[]; errorMessage: string | null }> {
  const supabase = await createClient();
  const [{ communications, errorMessage: communicationsError }, auditResult] = await Promise.all([
    getDirectorCommunications(),
    supabase
    .from("audit_logs")
    .select("id,actor_user_id,actor_role,action,module,entity_type,entity_id,after_data,created_at")
    .in("action", [
      "communication_sent",
      "communication_read",
      "communication_closed",
      "communication_reopened",
      "attendance_created",
      "attendance_updated",
      "grade_updated",
      "term_grade_closed",
      "term_grade_reopened",
      "evaluation_published"
    ])
    .order("created_at", { ascending: false })
    .limit(10)
      .returns<AuditLog[]>()
  ]);

  const auditLogs = auditResult.error ? [] : auditResult.data ?? [];
  const communicationItems = communications.slice(0, 12).map(toCommunicationActivityItem);

  const actorIds = [...new Set(auditLogs.map((log) => log.actor_user_id).filter(Boolean) as string[])];
  const { data: profiles } = actorIds.length > 0
    ? await supabase.from("profiles").select("id,full_name,email").in("id", actorIds).returns<Array<{ id: string; full_name: string | null; email: string | null }>>()
    : { data: [] };
  const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name ?? profile.email ?? "Usuario"]));
  const auditItems = auditLogs
    .filter((log) => !log.action.startsWith("communication_"))
    .map((log) => toActivityItem(log, profileMap.get(log.actor_user_id ?? "") ?? labelRole(log.actor_role)));

  return {
    items: [...communicationItems, ...auditItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 12),
    errorMessage: communicationsError
  };
}

function toCommunicationActivityItem(communication: DirectorCommunication): CenterActivityItem {
  const closed = communication.status === "closed";
  const isReply = normalizeSubject(communication.title).toLowerCase() !== communication.title.trim().toLowerCase() || communication.title.trim().toLowerCase().startsWith("re:");
  const title = closed
    ? "La conversación fue cerrada."
    : isReply
      ? `${communication.senderName} respondió a ${communication.receiverName}.`
      : `${communication.senderName} envió una comunicación a ${communication.receiverName}.`;
  const conversationId = getDirectorConversationId(communication);
  const context = [
    communication.studentName !== "Sin alumno" ? communication.studentName : null,
    communication.courseName !== "Sin curso" ? communication.courseName : null
  ].filter(Boolean).join(" · ") || normalizeSubject(communication.title);

  return {
    id: `communication-${communication.id}`,
    title,
    meta: context,
    date: communication.created_at,
    href: `/dashboard/director/communications?c=${encodeURIComponent(conversationId)}`,
    actionLabel: "Ver conversación",
    tone: closed ? "green" : "blue",
    kind: isReply ? "reply" : "communication",
    category: "communications",
    priority: communication.receiverName.toLowerCase().includes("direcci") ? "attention" : isReply ? "followup" : "info",
    groupKey: isReply ? "communication-replies" : "communication-new"
  };
}
function toActivityItem(log: AuditLog, actorName: string): CenterActivityItem {
  const label = auditActionLabel(log.action);

  return {
    id: log.id,
    title: label.title,
    meta: `${actorName} · ${label.meta}`,
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

function auditActionLabel(action: string): {
  title: string;
  meta: string;
  href: string;
  actionLabel: string;
  tone: CenterActivityTone;
  kind: CenterActivityKind;
  category: CenterActivityItem["category"];
  priority: CenterActivityPriority;
  groupKey: string;
} {
  const labels: Record<string, ReturnType<typeof auditActionLabel>> = {
    attendance_created: { title: "Se registró una asistencia.", meta: "Registro de aula", href: "/dashboard/director/students", actionLabel: "Abrir alumno", tone: "green", kind: "attendance", category: "academic", priority: "info", groupKey: "attendance" },
    attendance_updated: { title: "Se actualizó una asistencia.", meta: "Registro de aula", href: "/dashboard/director/students", actionLabel: "Abrir alumno", tone: "green", kind: "attendance", category: "academic", priority: "followup", groupKey: "attendance" },
    grade_updated: { title: "Se registró una calificación.", meta: "Actividad académica", href: "/dashboard/director/gradebook", actionLabel: "Abrir evaluación", tone: "blue", kind: "grade", category: "academic", priority: "info", groupKey: "grades" },
    term_grade_closed: { title: "Se cerró una evaluación.", meta: "Cierre académico", href: "/dashboard/director/gradebook", actionLabel: "Abrir evaluación", tone: "green", kind: "grade", category: "academic", priority: "followup", groupKey: "evaluation" },
    term_grade_reopened: { title: "Se reabrió una evaluación.", meta: "Cierre académico", href: "/dashboard/director/gradebook", actionLabel: "Abrir evaluación", tone: "amber", kind: "grade", category: "academic", priority: "attention", groupKey: "evaluation" },
    evaluation_published: { title: "Se publicó un boletín.", meta: "Publicación académica", href: "/dashboard/director/gradebook", actionLabel: "Ver boletín", tone: "green", kind: "report", category: "academic", priority: "followup", groupKey: "reports" }
  };

  return labels[action] ?? { title: "Se registró una actividad del centro.", meta: "Movimiento del centro", href: "/dashboard/director", actionLabel: "Ver panel", tone: "gray", kind: "system", category: "academic", priority: "info", groupKey: "system" };
}

function buildNotificationActivity(notifications: DashboardNotification[]): CenterActivityItem[] {
  return notifications.slice(0, 8).map((notification) => ({
    id: `${notification.source}-${notification.id}`,
    title: notification.title,
    meta: notification.body,
    date: notification.created_at,
    href: notification.href,
    actionLabel: notification.source === "communication" ? "Ver conversación" : "Ver detalle",
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
    href: "/dashboard/director/calendar",
    actionLabel: "Abrir calendario",
    tone: "gray",
    kind: "calendar",
    category: "calendar",
    priority: "info",
    groupKey: "calendar"
  };
}

function normalizeDirectorTab(value: string | undefined): DirectorDashboardTab {
  return directorTabs.some((tab) => tab.id === value) ? (value as DirectorDashboardTab) : "prioridades";
}

function labelRole(role: string | null) {
  if (role === "director") return "Dirección";
  if (role === "tutor") return "Docente";
  if (role === "family") return "Familia";
  if (role === "superadmin") return "Administración";
  return "Usuario";
}

function getDirectorConversationId(communication: DirectorCommunication) {
  const participants = [communication.sender_id, communication.receiver_id].sort().join(":");
  const studentPart = communication.student_id ?? "no-student";
  const subjectPart = normalizeSubject(communication.title);
  const coursePart = communication.courseId ?? "no-course";
  return `${studentPart}:${participants}:${subjectPart}:${communication.category}:${coursePart}`;
}

function normalizeSubject(value: string) {
  return value.replace(/^re:\s*/i, "").replace(/^\[importante\]\s*/i, "").trim() || "Sin asunto";
}

function formatTimelineDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
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






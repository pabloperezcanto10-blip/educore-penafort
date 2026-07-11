import {
  DirectorDashboardView,
  directorDashboardTabs,
  productionDirectorDashboardRoutes,
  type DirectorDashboardTab,
  type DirectorSignals
} from "@/components/dashboards/director/director-dashboard-view";
import {
  type CenterActivityItem,
  type CenterActivityKind,
  type CenterActivityPriority,
  type CenterActivityTone
} from "@/components/dashboard/center-activity-timeline";
import { requireRole } from "@/lib/auth/session";
import { getDashboardCalendarEvents, type CalendarEventSummary } from "@/lib/calendar/ical";
import { getDirectorCommunications, type DirectorCommunication } from "@/lib/communications/notifications";
import type { Database } from "@/lib/database.types";
import type { DashboardNotification } from "@/lib/internal-notifications";
import { getDashboardNotifications } from "@/lib/internal-notifications";
import { penafortBrand } from "@/lib/branding/brand-config";
import { createClient } from "@/lib/supabase/server";

type AuditLog = Database["public"]["Tables"]["audit_logs"]["Row"];
type InternalNotification = Database["public"]["Tables"]["internal_notifications"]["Row"];
type CommunicationSignal = Pick<Database["public"]["Tables"]["notifications"]["Row"], "id" | "sender_id" | "receiver_id" | "read" | "created_at">;

type DirectorDashboardPageProps = {
  searchParams?: {
    work_tab?: string;
  };
};

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
      communicationHref: productionDirectorDashboardRoutes.communications
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
    <DirectorDashboardView
      activeTab={activeTab}
      activityItems={activityItems}
      brand={penafortBrand}
      calendarError={calendarError}
      calendarEvents={calendarEvents}
      errorMessage={errorMessage}
      mode="production"
      notifications={notifications}
      routes={productionDirectorDashboardRoutes}
      signals={signals}
      subtitle="Centro de control para supervisar actividad, comunicaciones y cierres del colegio."
      todayEvents={todayEvents}
      unreadCount={unreadCount}
      upcomingEvents={upcomingEvents}
    />
  );
}

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
  const context = getCommunicationTimelineContext(communication);

  return {
    id: `communication-${communication.id}`,
    title,
    meta: context,
    date: communication.created_at,
    href: `${productionDirectorDashboardRoutes.communications}?c=${encodeURIComponent(conversationId)}`,
    actionLabel: "Ver conversación",
    tone: closed ? "green" : "blue",
    kind: isReply ? "reply" : "communication",
    category: "communications",
    priority: communication.receiverName.toLowerCase().includes("direcci") ? "attention" : isReply ? "followup" : "info",
    groupKey: isReply ? "communication-replies" : "communication-new"
  };
}

function getCommunicationTimelineContext(communication: DirectorCommunication) {
  const subject = normalizeSubject(communication.title);
  const identity = getCommunicationIdentity(communication);

  if (subject && subject !== "Sin asunto") {
    return `${identity} · ${subject}`;
  }

  return identity;
}

function getCommunicationIdentity(communication: DirectorCommunication) {
  const studentName = cleanCommunicationValue(communication.studentName, "Sin alumno");
  const courseName = cleanCommunicationValue(communication.courseName, "Sin curso");

  if (studentName) {
    return [studentName, courseName].filter(Boolean).join(" · ");
  }

  const senderName = cleanCommunicationValue(communication.senderName);
  const receiverName = cleanCommunicationValue(communication.receiverName);
  const familyName = [senderName, receiverName].find((name) => name?.toLowerCase().includes("familia"));

  if (familyName) {
    return familyName;
  }

  if (senderName && receiverName) {
    return `${senderName} → ${receiverName}`;
  }

  return senderName ?? receiverName ?? "Comunicación del centro";
}

function cleanCommunicationValue(value: string | null | undefined, emptyValue?: string) {
  const cleaned = value?.trim();
  if (!cleaned || cleaned === emptyValue) return null;
  return cleaned;
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
    attendance_created: { title: "Se registró una asistencia.", meta: "Registro de aula", href: productionDirectorDashboardRoutes.students, actionLabel: "Abrir alumno", tone: "green", kind: "attendance", category: "academic", priority: "info", groupKey: "attendance" },
    attendance_updated: { title: "Se actualizó una asistencia.", meta: "Registro de aula", href: productionDirectorDashboardRoutes.students, actionLabel: "Abrir alumno", tone: "green", kind: "attendance", category: "academic", priority: "followup", groupKey: "attendance" },
    grade_updated: { title: "Se registró una calificación.", meta: "Actividad académica", href: productionDirectorDashboardRoutes.gradebook, actionLabel: "Abrir evaluación", tone: "blue", kind: "grade", category: "academic", priority: "info", groupKey: "grades" },
    term_grade_closed: { title: "Se cerró una evaluación.", meta: "Cierre académico", href: productionDirectorDashboardRoutes.gradebook, actionLabel: "Abrir evaluación", tone: "green", kind: "grade", category: "academic", priority: "followup", groupKey: "evaluation" },
    term_grade_reopened: { title: "Se reabrió una evaluación.", meta: "Cierre académico", href: productionDirectorDashboardRoutes.gradebook, actionLabel: "Abrir evaluación", tone: "amber", kind: "grade", category: "academic", priority: "attention", groupKey: "evaluation" },
    evaluation_published: { title: "Se publicó un boletín.", meta: "Publicación académica", href: productionDirectorDashboardRoutes.gradebook, actionLabel: "Ver boletín", tone: "green", kind: "report", category: "academic", priority: "followup", groupKey: "reports" }
  };

  return labels[action] ?? { title: "Se registró una actividad del centro.", meta: "Movimiento del centro", href: productionDirectorDashboardRoutes.root, actionLabel: "Ver panel", tone: "gray", kind: "system", category: "academic", priority: "info", groupKey: "system" };
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
    href: productionDirectorDashboardRoutes.calendar,
    actionLabel: "Abrir calendario",
    tone: "gray",
    kind: "calendar",
    category: "calendar",
    priority: "info",
    groupKey: "calendar"
  };
}

function normalizeDirectorTab(value: string | undefined): DirectorDashboardTab {
  return directorDashboardTabs.some((tab) => tab.id === value) ? (value as DirectorDashboardTab) : "prioridades";
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

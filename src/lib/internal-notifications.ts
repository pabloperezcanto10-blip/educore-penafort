import type { Role } from "@/lib/auth/roles";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";

export type DashboardNotification = {
  id: string;
  source: "internal" | "communication";
  title: string;
  body: string;
  href: string;
  read: boolean;
  created_at: string;
};

export type InternalNotificationInsert = Database["public"]["Tables"]["internal_notifications"]["Insert"];

type InternalNotificationRow = Database["public"]["Tables"]["internal_notifications"]["Row"];

type CommunicationNotificationRow = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

export async function getDashboardNotifications({
  userId,
  role,
  communicationHref
}: {
  userId: string;
  role: Role;
  communicationHref: string;
}): Promise<{
  notifications: DashboardNotification[];
  unreadCount: number;
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const [internalResult, communicationResult] = await Promise.all([
    supabase
      .from("internal_notifications")
      .select("id,user_id,role,type,title,body,related_entity_type,related_entity_id,related_href,read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(8)
      .returns<InternalNotificationRow[]>(),
    supabase
      .from("notifications")
      .select("id,title,message,read,created_at")
      .eq("receiver_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<CommunicationNotificationRow[]>()
  ]);

  const internalRows = internalResult.error ? [] : internalResult.data ?? [];
  const communicationRows = communicationResult.error ? [] : communicationResult.data ?? [];
  const errorMessage = communicationResult.error?.message ?? null;
  const internalNotifications = internalRows.map((notification) => ({
    id: notification.id,
    source: "internal" as const,
    title: notification.title,
    body: notification.body ?? notificationLabel(notification.type, role),
    href: notification.related_href ?? dashboardHrefForRole(role),
    read: notification.read,
    created_at: notification.created_at
  }));
  const communicationNotifications = communicationRows.map((notification) => ({
    id: notification.id,
    source: "communication" as const,
    title: notification.title || "Comunicación pendiente",
    body: notification.message,
    href: communicationHref,
    read: notification.read,
    created_at: notification.created_at
  }));
  const notifications = [...internalNotifications, ...communicationNotifications]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 8);

  return {
    notifications,
    unreadCount: notifications.filter((notification) => !notification.read).length,
    errorMessage
  };
}

export async function createInternalNotifications(rows: InternalNotificationInsert[]) {
  if (rows.length === 0) return;

  const supabase = await createClient();
  await supabase.from("internal_notifications").insert(rows as never);
}

function dashboardHrefForRole(role: Role) {
  if (role === "superadmin") return "/dashboard/admin";
  if (role === "director") return "/dashboard/director";
  return `/dashboard/${role}`;
}

function notificationLabel(type: InternalNotificationRow["type"], role: Role) {
  const labels: Record<InternalNotificationRow["type"], string> = {
    new_communication: "Tienes una nueva comunicación.",
    unread_communication: "Hay comunicaciones pendientes de lectura.",
    new_visible_grade: "Hay una nueva calificación visible.",
    new_incident: "Hay una incidencia reciente.",
    pending_attendance_justification: "Hay una falta o retraso pendiente de justificar.",
    report_published: "Hay un boletín publicado.",
    evaluation_pending_close: "Hay evaluaciones pendientes de cerrar.",
    report_pending_publication: "Hay boletines pendientes de publicar.",
    administrative_incident: "Hay una incidencia administrativa.",
    inactive_user: "Hay usuarios inactivos o pendientes."
  };

  return labels[type] ?? `Novedad para ${role}.`;
}

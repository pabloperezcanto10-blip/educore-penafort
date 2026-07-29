import type { Role } from "@/lib/auth/roles";
import type { Database } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { getAllowedCommunicationIds } from "@/lib/communications/actions";
import { requireSchoolContext } from "@/lib/schools/context";
import type { ActiveSchoolContext } from "@/lib/schools/types";

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

export type InternalNotificationRow = Database["public"]["Tables"]["internal_notifications"]["Row"];

type CommunicationNotificationRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  student_id: string | null;
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
  const schoolContext = await requireSchoolContext();
  const supabase = await createClient();
  const [internalResult, communicationResult] = await Promise.all([
    supabase
      .from("internal_notifications")
      .select("id,user_id,role,type,title,body,related_entity_type,related_entity_id,related_href,read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<InternalNotificationRow[]>(),
    supabase
      .from("notifications")
      .select("id,sender_id,receiver_id,student_id,title,message,read,created_at")
      .eq("receiver_id", userId)
      .eq("read", false)
      .order("created_at", { ascending: false })
      .limit(50)
      .returns<CommunicationNotificationRow[]>()
  ]);

  const rawInternalRows = internalResult.error ? [] : internalResult.data ?? [];
  const rawCommunicationRows = communicationResult.error
    ? []
    : communicationResult.data ?? [];
  const authorizedInternalIds = new Set(
    await getAuthorizedInternalNotificationIds({
      context: schoolContext,
      rows: rawInternalRows
    })
  );
  const authorizedCommunicationIds = new Set(
    await getAllowedCommunicationIds({
      actor: { id: userId, role: schoolContext.role, schoolContext },
      ids: rawCommunicationRows.map(({ id }) => id),
      ownOnly: true
    })
  );
  const internalRows = rawInternalRows.filter(({ id }) =>
    authorizedInternalIds.has(id)
  );
  const communicationRows = rawCommunicationRows.filter(({ id }) =>
    authorizedCommunicationIds.has(id)
  );
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

export async function getAuthorizedInternalNotificationIds({
  context,
  rows
}: {
  context: ActiveSchoolContext;
  rows: InternalNotificationRow[];
}) {
  if (context.isGlobalSuperadmin && !context.schoolId) {
    return rows.map(({ id }) => id);
  }

  if (!context.schoolId) return [];

  const supabase = await createClient();
  const resourceTables = {
    student: "students",
    course: "courses",
    subject: "subjects"
  } as const;
  const authorizedIds = new Set<string>();

  for (const [entityType, table] of Object.entries(resourceTables)) {
    const entityIds = Array.from(
      new Set(
        rows.flatMap((row) =>
          row.related_entity_type === entityType && row.related_entity_id
            ? [row.related_entity_id]
            : []
        )
      )
    );
    if (entityIds.length === 0) continue;

    const { data, error } = await supabase
      .from(table)
      .select("id")
      .eq("school_id", context.schoolId)
      .in("id", entityIds)
      .returns<{ id: string }[]>();

    if (error) {
      throw new Error(error.message);
    }

    const allowedEntities = new Set((data ?? []).map(({ id }) => id));
    rows.forEach((row) => {
      if (
        row.related_entity_type === entityType &&
        row.related_entity_id &&
        allowedEntities.has(row.related_entity_id)
      ) {
        authorizedIds.add(row.id);
      }
    });
  }

  return [...authorizedIds];
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

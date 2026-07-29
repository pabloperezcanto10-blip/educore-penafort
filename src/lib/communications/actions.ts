import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditAction, type AuditAction } from "@/lib/audit";
import type { Role } from "@/lib/auth/roles";
import type { ActiveSchoolContext } from "@/lib/schools/types";

export type CommunicationStatus = "open" | "closed";

type ActorProfile = {
  id: string;
  role: Role | string;
  schoolContext: ActiveSchoolContext;
};

type NotificationAccessRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
  student_id: string | null;
};

export function parseCommunicationIds(value: FormDataEntryValue | null) {
  return String(value ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
}

export async function markCommunicationsRead({
  actor,
  ids,
  ownOnly = true
}: {
  actor: ActorProfile;
  ids: string[];
  ownOnly?: boolean;
}) {
  const allowedIds = await getAllowedCommunicationIds({ actor, ids, ownOnly });

  if (allowedIds.length === 0) {
    return 0;
  }

  const { error } = await createAdminClient()
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() } as never)
    .in("id", allowedIds);

  if (error) {
    throw new Error(error.message);
  }

  await logCommunicationAudit({
    actor,
    action: "communication_read",
    ids: allowedIds,
    afterData: { read: true }
  });

  return allowedIds.length;
}

export async function setCommunicationsStatus({
  actor,
  ids,
  status,
  ownOnly = true
}: {
  actor: ActorProfile;
  ids: string[];
  status: CommunicationStatus;
  ownOnly?: boolean;
}) {
  const allowedIds = await getAllowedCommunicationIds({ actor, ids, ownOnly });

  if (allowedIds.length === 0) {
    return 0;
  }

  const { error } = await createAdminClient()
    .from("notifications")
    .update({ status } as never)
    .in("id", allowedIds);

  if (error) {
    throw new Error(error.message);
  }

  await logCommunicationAudit({
    actor,
    action: status === "closed" ? "communication_closed" : "communication_reopened",
    ids: allowedIds,
    afterData: { status }
  });

  return allowedIds.length;
}

export async function getAllowedCommunicationIds({
  actor,
  ids,
  ownOnly
}: {
  actor: ActorProfile;
  ids: string[];
  ownOnly: boolean;
}) {
  if (ids.length === 0) {
    return [];
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("notifications")
    .select("id,sender_id,receiver_id,student_id")
    .in("id", ids)
    .returns<NotificationAccessRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []).filter(
    (row) => !ownOnly || row.sender_id === actor.id || row.receiver_id === actor.id
  );

  if (actor.schoolContext.isGlobalSuperadmin && !actor.schoolContext.schoolId) {
    return rows.map((row) => row.id);
  }

  const schoolId = actor.schoolContext.schoolId;
  if (!schoolId) {
    return [];
  }

  const participantIds = Array.from(
    new Set(rows.flatMap((row) => [row.sender_id, row.receiver_id]))
  );
  const studentIds = Array.from(
    new Set(rows.flatMap((row) => (row.student_id ? [row.student_id] : [])))
  );

  const [{ data: memberships, error: membershipsError }, studentResult] =
    await Promise.all([
      participantIds.length > 0
        ? admin
            .from("school_memberships")
            .select("user_id")
            .eq("school_id", schoolId)
            .eq("active", true)
            .in("user_id", participantIds)
            .returns<{ user_id: string }[]>()
        : Promise.resolve({ data: [] as { user_id: string }[], error: null }),
      studentIds.length > 0
        ? admin
            .from("students")
            .select("id")
            .eq("school_id", schoolId)
            .in("id", studentIds)
            .returns<{ id: string }[]>()
        : Promise.resolve({ data: [] as { id: string }[], error: null })
    ]);

  if (membershipsError || studentResult.error) {
    throw new Error(
      membershipsError?.message ??
        studentResult.error?.message ??
        "No se pudo validar el centro de la comunicación."
    );
  }

  const authorizedParticipants = new Set(
    (memberships ?? []).map(({ user_id }) => user_id)
  );
  const authorizedStudents = new Set(
    (studentResult.data ?? []).map(({ id }) => id)
  );

  return rows
    .filter((row) => {
      const participantsBelongToSchool =
        authorizedParticipants.has(row.sender_id) &&
        authorizedParticipants.has(row.receiver_id);

      if (!participantsBelongToSchool) {
        return false;
      }

      return row.student_id
        ? authorizedStudents.has(row.student_id)
        : true;
    })
    .map((row) => row.id);
}

async function logCommunicationAudit({
  actor,
  action,
  ids,
  afterData
}: {
  actor: ActorProfile;
  action: AuditAction;
  ids: string[];
  afterData: Record<string, unknown>;
}) {
  await logAuditAction({
    actorUserId: actor.id,
    actorRole: actor.role,
    action,
    module: "communications",
    entityType: "notification",
    entityId: ids.length === 1 ? ids[0] : null,
    afterData: {
      ...afterData,
      notification_ids: ids,
      count: ids.length
    }
  });
}

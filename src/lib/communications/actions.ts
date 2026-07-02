import { createAdminClient } from "@/lib/supabase/admin";
import { logAuditAction, type AuditAction } from "@/lib/audit";
import type { Role } from "@/lib/auth/roles";

export type CommunicationStatus = "open" | "closed";

type ActorProfile = {
  id: string;
  role: Role | string;
};

type NotificationAccessRow = {
  id: string;
  sender_id: string;
  receiver_id: string;
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

async function getAllowedCommunicationIds({
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

  const { data, error } = await createAdminClient()
    .from("notifications")
    .select("id,sender_id,receiver_id")
    .in("id", ids)
    .returns<NotificationAccessRow[]>();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => !ownOnly || row.sender_id === actor.id || row.receiver_id === actor.id)
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

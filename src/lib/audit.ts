import { createAdminClient } from "@/lib/supabase/admin";
import type { Database, Json } from "@/lib/database.types";
import type { Role } from "@/lib/auth/roles";

type AuditLogInsert = Database["public"]["Tables"]["audit_logs"]["Insert"];

export type AuditAction =
  | "password_changed"
  | "user_created"
  | "user_deleted"
  | "user_deactivated"
  | "user_reactivated"
  | "grade_updated"
  | "term_grade_closed"
  | "term_grade_reopened"
  | "evaluation_published"
  | "communication_sent"
  | "communication_read"
  | "communication_closed"
  | "communication_reopened";

export async function logAuditAction({
  actorUserId,
  actorRole,
  action,
  module,
  entityType,
  entityId = null,
  beforeData = null,
  afterData = null
}: {
  actorUserId: string | null;
  actorRole: Role | string | null;
  action: AuditAction;
  module: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: Json | null;
  afterData?: Json | null;
}) {
  const row: AuditLogInsert = {
    actor_user_id: actorUserId,
    actor_role: actorRole,
    action,
    module,
    entity_type: entityType,
    entity_id: entityId,
    before_data: beforeData,
    after_data: afterData
  };

  try {
    const { error } = await createAdminClient().from("audit_logs").insert(row as never);

    if (error) {
      console.error("Audit log insert failed:", error.message);
    }
  } catch (error) {
    console.error("Audit log unavailable:", error);
  }
}

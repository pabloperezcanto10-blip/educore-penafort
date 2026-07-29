"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";
import { getAllowedCommunicationIds } from "@/lib/communications/actions";
import {
  getAuthorizedInternalNotificationIds,
  type InternalNotificationRow
} from "@/lib/internal-notifications";
import { createClient } from "@/lib/supabase/server";

const dashboardRoles = [
  "superadmin",
  "director",
  "tutor",
  "family"
] satisfies readonly Role[];

export async function markInternalNotificationRead(formData: FormData) {
  const profile = await requireRole(dashboardRoles);
  const id = String(formData.get("id") ?? "").trim();

  if (!id) return;

  const supabase = await createClient();
  const { data: notification } = await supabase
    .from("internal_notifications")
    .select("id,user_id,role,type,title,body,related_entity_type,related_entity_id,related_href,read,created_at")
    .eq("id", id)
    .eq("user_id", profile.id)
    .maybeSingle<InternalNotificationRow>();
  const allowedIds = notification
    ? await getAuthorizedInternalNotificationIds({
        context: profile.schoolContext,
        rows: [notification]
      })
    : [];
  if (allowedIds.length === 0) return;

  await supabase
    .from("internal_notifications")
    .update({ read: true } as never)
    .eq("id", id)
    .eq("user_id", profile.id);

  revalidateDashboard(profile.role);
}

export async function markAllInternalNotificationsRead() {
  const profile = await requireRole(dashboardRoles);
  const supabase = await createClient();

  const [{ data: internalRows }, { data: communicationRows }] =
    await Promise.all([
      supabase
        .from("internal_notifications")
        .select("id,user_id,role,type,title,body,related_entity_type,related_entity_id,related_href,read,created_at")
        .eq("user_id", profile.id)
        .eq("read", false)
        .returns<InternalNotificationRow[]>(),
      supabase
        .from("notifications")
        .select("id")
        .eq("receiver_id", profile.id)
        .eq("read", false)
        .returns<{ id: string }[]>()
    ]);
  const internalIds = await getAuthorizedInternalNotificationIds({
    context: profile.schoolContext,
    rows: internalRows ?? []
  });
  const communicationIds = await getAllowedCommunicationIds({
    actor: profile,
    ids: (communicationRows ?? []).map(({ id }) => id),
    ownOnly: true
  });

  if (internalIds.length > 0) {
    await supabase
      .from("internal_notifications")
      .update({ read: true } as never)
      .eq("user_id", profile.id)
      .in("id", internalIds);
  }

  if (communicationIds.length > 0) {
    await supabase
      .from("notifications")
      .update({ read: true, read_at: new Date().toISOString() } as never)
      .eq("receiver_id", profile.id)
      .in("id", communicationIds);
  }

  revalidateDashboard(profile.role);
}

function revalidateDashboard(role: string) {
  if (role === "superadmin") {
    revalidatePath("/dashboard/admin");
    return;
  }

  revalidatePath(`/dashboard/${role}`);
}

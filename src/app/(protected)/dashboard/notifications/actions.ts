"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";
import { getAllowedCommunicationIds } from "@/lib/communications/actions";
import {
  getDashboardNotificationReviewKey,
  getAuthorizedInternalNotificationIds,
  isReviewableInternalNotificationType,
  type InternalNotificationRow
} from "@/lib/internal-notifications";
import { createClient } from "@/lib/supabase/server";

const dashboardRoles = [
  "superadmin",
  "director",
  "tutor",
  "family"
] satisfies readonly Role[];

type DashboardPendingSource = "internal" | "communication";

type MarkDashboardPendingReviewedInput = {
  id: string;
  source: DashboardPendingSource;
  reviewKey: string;
  reviewVersion: string;
};

export async function markDashboardPendingReviewed(
  input: MarkDashboardPendingReviewedInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await requireRole(dashboardRoles);
  const schoolId = profile.schoolContext.schoolId;

  if (!schoolId) {
    return { ok: false, error: "Selecciona un centro antes de revisar el aviso." };
  }

  const expectedKey = getDashboardNotificationReviewKey(input.source, input.id);
  if (
    !input.id ||
    input.reviewKey !== expectedKey ||
    input.reviewVersion.length === 0 ||
    input.reviewVersion.length > 120
  ) {
    return { ok: false, error: "El aviso no es válido." };
  }

  const supabase = await createClient();
  let authorized = false;

  if (input.source === "internal") {
    const { data: notification } = await supabase
      .from("internal_notifications")
      .select("id,user_id,role,type,title,body,related_entity_type,related_entity_id,related_href,read,created_at")
      .eq("id", input.id)
      .eq("user_id", profile.id)
      .maybeSingle<InternalNotificationRow>();

    if (
      notification &&
      notification.created_at === input.reviewVersion &&
      isReviewableInternalNotificationType(notification.type)
    ) {
      const allowedIds = await getAuthorizedInternalNotificationIds({
        context: profile.schoolContext,
        rows: [notification]
      });
      authorized = allowedIds.includes(notification.id);
    }
  } else {
    const { data: notification } = await supabase
      .from("notifications")
      .select("id,created_at")
      .eq("id", input.id)
      .eq("receiver_id", profile.id)
      .maybeSingle<{ id: string; created_at: string }>();

    if (notification?.created_at === input.reviewVersion) {
      const allowedIds = await getAllowedCommunicationIds({
        actor: profile,
        ids: [notification.id],
        ownOnly: true
      });
      authorized = allowedIds.includes(notification.id);
    }
  }

  if (!authorized) {
    return { ok: false, error: "No tienes acceso a este aviso." };
  }

  const { error } = await supabase.from("dashboard_pending_reviews").insert({
    user_id: profile.id,
    school_id: schoolId,
    pending_key: input.reviewKey,
    source_version: input.reviewVersion
  } as never);

  if (error && error.code !== "23505") {
    return { ok: false, error: "No se pudo guardar el estado revisado." };
  }

  revalidateDashboard(profile.role);
  return { ok: true };
}

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

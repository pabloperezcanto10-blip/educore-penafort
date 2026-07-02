"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markInternalNotificationRead(formData: FormData) {
  const profile = await requireAnyDashboardRole();
  const id = String(formData.get("id") ?? "").trim();

  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("internal_notifications")
    .update({ read: true } as never)
    .eq("id", id)
    .eq("user_id", profile.id);

  revalidateDashboard(profile.role);
}

export async function markAllInternalNotificationsRead() {
  const profile = await requireAnyDashboardRole();
  const supabase = await createClient();

  await supabase
    .from("internal_notifications")
    .update({ read: true } as never)
    .eq("user_id", profile.id)
    .eq("read", false);

  await supabase
    .from("notifications")
    .update({ read: true, read_at: new Date().toISOString() } as never)
    .eq("receiver_id", profile.id)
    .eq("read", false);

  revalidateDashboard(profile.role);
}

async function requireAnyDashboardRole() {
  const profile = await getCurrentUserProfile();

  if (!profile || !profile.active) {
    throw new Error("No hay sesión activa.");
  }

  return profile;
}

function revalidateDashboard(role: string) {
  if (role === "superadmin") {
    revalidatePath("/dashboard/admin");
    return;
  }

  revalidatePath(`/dashboard/${role}`);
}

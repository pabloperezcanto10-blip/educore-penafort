"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { markCommunicationsRead, parseCommunicationIds, setCommunicationsStatus } from "@/lib/communications/actions";
import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { withToast } from "@/lib/toast";

export async function replyToTutorCommunication(formData: FormData) {
  const profile = await requireRole("tutor");
  const communicationId = String(formData.get("communication_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!communicationId || !message) {
    throw new Error("Falta la comunicacion o el mensaje de respuesta.");
  }

  const supabase = await createClient();
  const { data: original, error: originalError } = await supabase
    .from("notifications")
    .select("id,sender_id,receiver_id,student_id,title,category,status")
    .eq("id", communicationId)
    .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
    .maybeSingle<{
      id: string;
      sender_id: string;
      receiver_id: string;
      student_id: string | null;
      title: string;
      category: string;
      status: "open" | "closed";
    }>();

  if (originalError) {
    throw new Error(originalError.message);
  }

  if (!original) {
    throw new Error("No tienes acceso a esta conversacion.");
  }

  if (original.status === "closed") {
    throw new Error("La conversacion esta cerrada. Reabrela antes de responder.");
  }

  const receiverId = original.sender_id === profile.id ? original.receiver_id : original.sender_id;
  const row = {
    sender_id: profile.id,
    receiver_id: receiverId,
    student_id: original.student_id,
    title: original.title.startsWith("Re:") ? original.title : `Re: ${original.title}`,
    message,
    category: original.category,
    read: false,
    read_at: null
  };
  const { error } = hasSupabaseAdminClient()
    ? await createAdminClient().from("notifications").insert(row as never)
    : await supabase.from("notifications").insert(row as never);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditAction({
    actorUserId: profile.id,
    actorRole: profile.role,
    action: "communication_sent",
    module: "communications",
    entityType: "notification",
    entityId: null,
    afterData: {
      receiver_id: receiverId,
      student_id: original.student_id,
      category: original.category,
      reply_to: communicationId
    }
  });

  revalidatePath("/dashboard/tutor/communications");
  revalidatePath("/dashboard/director/communications");
  revalidatePath("/dashboard/family");
  redirect(withToast("/dashboard/tutor/communications", "success", "Respuesta enviada correctamente."));
}

export async function markTutorConversationRead(formData: FormData) {
  const profile = await requireRole("tutor");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await markCommunicationsRead({ actor: profile, ids, ownOnly: true });

  revalidateTutorCommunicationPaths();
  redirect(withToast("/dashboard/tutor/communications", "success", "Comunicacion marcada como leida."));
}

export async function closeTutorConversation(formData: FormData) {
  const profile = await requireRole("tutor");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await setCommunicationsStatus({ actor: profile, ids, status: "closed", ownOnly: true });

  revalidateTutorCommunicationPaths();
  redirect(withToast("/dashboard/tutor/communications", "success", "Conversacion cerrada."));
}

export async function reopenTutorConversation(formData: FormData) {
  const profile = await requireRole("tutor");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await setCommunicationsStatus({ actor: profile, ids, status: "open", ownOnly: true });

  revalidateTutorCommunicationPaths();
  redirect(withToast("/dashboard/tutor/communications", "success", "Conversacion reabierta."));
}

function revalidateTutorCommunicationPaths() {
  revalidatePath("/dashboard/tutor/communications");
  revalidatePath("/dashboard/director/communications");
  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
}

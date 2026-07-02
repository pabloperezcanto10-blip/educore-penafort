"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { markCommunicationsRead, parseCommunicationIds, setCommunicationsStatus } from "@/lib/communications/actions";
import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { withToast } from "@/lib/toast";

type CommunicationWriteClient = {
  from: (table: string) => any;
};

export async function replyToAdminCommunication(formData: FormData) {
  const profile = await requireRole("superadmin");
  const communicationId = String(formData.get("communication_id") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!communicationId || !message) {
    throw new Error("Falta la comunicacion o el mensaje de respuesta.");
  }

  const original = hasSupabaseAdminClient()
    ? await createAdminClient()
        .from("notifications")
        .select("id,sender_id,receiver_id,student_id,title,category,status")
        .eq("id", communicationId)
        .maybeSingle<{
          id: string;
          sender_id: string;
          receiver_id: string;
          student_id: string | null;
          title: string;
          category: string;
          status: "open" | "closed";
        }>()
    : await (await createClient())
        .from("notifications")
        .select("id,sender_id,receiver_id,student_id,title,category,status")
        .eq("id", communicationId)
        .maybeSingle<{
          id: string;
          sender_id: string;
          receiver_id: string;
          student_id: string | null;
          title: string;
          category: string;
          status: "open" | "closed";
        }>();

  if (original.error) {
    throw new Error(original.error.message);
  }

  if (!original.data) {
    throw new Error("No se encontro la comunicacion.");
  }

  if (original.data.status === "closed") {
    throw new Error("La conversacion esta cerrada. Reabrela antes de responder.");
  }

  const receiverId = original.data.sender_id === profile.id ? original.data.receiver_id : original.data.sender_id;
  const row = {
    sender_id: profile.id,
    receiver_id: receiverId,
    student_id: original.data.student_id,
    title: original.data.title.startsWith("Re:") ? original.data.title : `Re: ${original.data.title}`,
    message,
    category: original.data.category,
    read: false,
    read_at: null
  };
  const { error } = hasSupabaseAdminClient()
    ? await createAdminClient().from("notifications").insert(row as never)
    : await (await createClient()).from("notifications").insert(row as never);

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
      student_id: original.data.student_id,
      category: original.data.category,
      reply_to: communicationId
    }
  });

  revalidatePath("/dashboard/admin/communications");
  revalidatePath("/dashboard/director/communications");
  revalidatePath("/dashboard/tutor/communications");
  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
  redirect(withToast("/dashboard/admin/communications", "success", "Respuesta enviada correctamente."));
}

export async function forwardAdminCommunication(formData: FormData) {
  const profile = await requireRole("superadmin");
  const communicationId = String(formData.get("communication_id") ?? "").trim();
  const receiverId = String(formData.get("receiver_id") ?? "").trim();
  const extraMessage = String(formData.get("message") ?? "").trim();

  if (!communicationId || !receiverId) {
    throw new Error("Falta la comunicacion o el destinatario del reenvio.");
  }

  const client: CommunicationWriteClient = (hasSupabaseAdminClient() ? createAdminClient() : await createClient()) as CommunicationWriteClient;
  const { data: original, error: originalError } = await client
    .from("notifications")
    .select("id,student_id,title,message,category,status")
    .eq("id", communicationId)
    .maybeSingle();

  if (originalError) {
    throw new Error(originalError.message);
  }

  if (!original) {
    throw new Error("No se encontro la comunicacion original.");
  }

  if (original.status === "closed") {
    throw new Error("La conversacion esta cerrada. Reabrela antes de reenviar.");
  }

  const message = extraMessage
    ? `${extraMessage}\n\nMensaje reenviado:\n${original.message}`
    : `Mensaje reenviado:\n${original.message}`;

  const { error } = await client.from("notifications").insert({
    sender_id: profile.id,
    receiver_id: receiverId,
    student_id: original.student_id,
    title: original.title.startsWith("Fwd:") ? original.title : `Fwd: ${original.title}`,
    message,
    category: original.category,
    read: false,
    read_at: null
  } as never);

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
      forwarded_from: communicationId
    }
  });

  revalidateAdminCommunicationPaths();
  redirect(withToast("/dashboard/admin/communications", "success", "Comunicacion reenviada correctamente."));
}

export async function markAdminConversationRead(formData: FormData) {
  const profile = await requireRole("superadmin");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  if (ids.length === 0) {
    return;
  }

  await markCommunicationsRead({ actor: profile, ids, ownOnly: false });

  revalidateAdminCommunicationPaths();
  redirect(withToast("/dashboard/admin/communications", "success", "Comunicacion marcada como leida."));
}

export async function closeAdminConversation(formData: FormData) {
  const profile = await requireRole("superadmin");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await setCommunicationsStatus({ actor: profile, ids, status: "closed", ownOnly: false });

  revalidateAdminCommunicationPaths();
  redirect(withToast("/dashboard/admin/communications", "success", "Conversacion cerrada."));
}

export async function reopenAdminConversation(formData: FormData) {
  const profile = await requireRole("superadmin");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await setCommunicationsStatus({ actor: profile, ids, status: "open", ownOnly: false });

  revalidateAdminCommunicationPaths();
  redirect(withToast("/dashboard/admin/communications", "success", "Conversacion reabierta."));
}

export async function markAdminConversationImportant(formData: FormData) {
  await requireRole("superadmin");
  const ids = String(formData.get("communication_ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return;
  }

  const client: CommunicationWriteClient = (hasSupabaseAdminClient() ? createAdminClient() : await createClient()) as CommunicationWriteClient;
  const { data, error: readError } = await client
    .from("notifications")
    .select("id,title")
    .in("id", ids);

  if (readError) {
    throw new Error(readError.message);
  }

  const rows = ((data ?? []) as { id: string; title: string }[]).filter((row) => !row.title.startsWith("[Importante]"));

  await Promise.all(
    rows.map((row) =>
      client
        .from("notifications")
        .update({ title: `[Importante] ${row.title}` } as never)
        .eq("id", row.id)
    )
  );

  revalidateAdminCommunicationPaths();
  redirect(withToast("/dashboard/admin/communications", "success", "Conversacion marcada como importante."));
}

function revalidateAdminCommunicationPaths() {
  revalidatePath("/dashboard/admin/communications");
  revalidatePath("/dashboard/director/communications");
  revalidatePath("/dashboard/tutor/communications");
  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
}

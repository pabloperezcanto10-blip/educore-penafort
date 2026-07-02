"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { markCommunicationsRead, parseCommunicationIds, setCommunicationsStatus } from "@/lib/communications/actions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

export async function markNotificationAsRead(formData: FormData) {
  const profile = await requireRole("family");
  const notificationId = String(formData.get("notification_id") ?? "");

  if (!notificationId) {
    throw new Error("No se ha indicado la comunicación.");
  }

  await markCommunicationsRead({ actor: profile, ids: [notificationId], ownOnly: true });

  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
  redirect(withToast("/dashboard/family/communications", "success", "Comunicacion marcada como leida."));
}

export async function markFamilyConversationRead(formData: FormData) {
  const profile = await requireRole("family");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await markCommunicationsRead({ actor: profile, ids, ownOnly: true });

  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
  redirect(withToast("/dashboard/family/communications", "success", "Comunicacion marcada como leida."));
}

export async function sendFamilyCommunication(formData: FormData) {
  const profile = await requireRole("family");
  const studentIdValue = String(formData.get("student_id") ?? "").trim();
  const studentId = studentIdValue || null;
  const receiverId = String(formData.get("receiver_id") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const category = String(formData.get("category") ?? "general").trim() || "general";

  if (!receiverId || !title || !message) {
    throw new Error("Faltan datos para enviar la comunicacion.");
  }

  const supabase = await createClient();
  await assertFamilyCanMessageReceiver(supabase, profile.id, studentId, receiverId);
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("notifications").insert({
    sender_id: profile.id,
    receiver_id: receiverId,
    student_id: studentId,
    title,
    message,
    category,
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
      student_id: studentId,
      category
    }
  });

  revalidatePath("/dashboard/family/communications");
  revalidatePath("/dashboard/tutor/communications");
  revalidatePath("/dashboard/director/communications");
  redirect(withToast("/dashboard/family/communications", "success", "Comunicacion enviada correctamente."));
}

export async function replyToFamilyCommunication(formData: FormData) {
  const profile = await requireRole("family");
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
    throw new Error("No se encontro la comunicacion.");
  }

  if (original.status === "closed") {
    throw new Error("La conversacion esta cerrada. Reabrela antes de responder.");
  }

  const receiverId = original.sender_id === profile.id ? original.receiver_id : original.sender_id;
  await assertFamilyCanMessageReceiver(supabase, profile.id, original.student_id, receiverId);
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.from("notifications").insert({
    sender_id: profile.id,
    receiver_id: receiverId,
    student_id: original.student_id,
    title: original.title.startsWith("Re:") ? original.title : `Re: ${original.title}`,
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
      reply_to: communicationId
    }
  });

  revalidatePath("/dashboard/family/communications");
  revalidatePath("/dashboard/tutor/communications");
  revalidatePath("/dashboard/director/communications");
  redirect(withToast("/dashboard/family/communications", "success", "Respuesta enviada correctamente."));
}

export async function closeFamilyConversation(formData: FormData) {
  const profile = await requireRole("family");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await setCommunicationsStatus({ actor: profile, ids, status: "closed", ownOnly: true });

  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
  redirect(withToast("/dashboard/family/communications", "success", "Conversacion cerrada."));
}

export async function reopenFamilyConversation(formData: FormData) {
  const profile = await requireRole("family");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await setCommunicationsStatus({ actor: profile, ids, status: "open", ownOnly: true });

  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
  redirect(withToast("/dashboard/family/communications", "success", "Conversacion reabierta."));
}

export async function justifyAttendanceFromCommunication(formData: FormData) {
  const profile = await requireRole("family");
  const attendanceId = String(formData.get("attendance_id") ?? "").trim();
  const communicationId = String(formData.get("communication_id") ?? "").trim();
  const justificationText = String(formData.get("justification_text") ?? "").trim();

  if (!attendanceId || !justificationText) {
    throw new Error("Falta la asistencia o el texto de justificacion.");
  }

  const supabase = await createClient();
  const { data: attendance, error: attendanceError } = await supabase
    .from("student_attendance")
    .select("id,student_id")
    .eq("id", attendanceId)
    .maybeSingle<{ id: string; student_id: string }>();

  if (attendanceError) {
    throw new Error(attendanceError.message);
  }

  if (!attendance) {
    throw new Error("No se encontro el registro de asistencia.");
  }

  await assertFamilyStudent(supabase, profile.id, attendance.student_id);
  const update: Database["public"]["Tables"]["student_attendance"]["Update"] = {
    justified: true,
    justification_text: justificationText
  };
  const { error } = await supabase
    .from("student_attendance")
    .update(update as never)
    .eq("id", attendanceId);

  if (error) {
    throw new Error(error.message);
  }

  if (communicationId) {
    await setCommunicationsStatus({ actor: profile, ids: [communicationId], status: "closed", ownOnly: true });
  }

  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
  redirect(withToast("/dashboard/family/communications", "success", "Justificacion enviada correctamente."));
}

async function assertFamilyStudent(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string,
  studentId: string
) {
  const { data, error } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("parent_id", familyId)
    .eq("student_id", studentId)
    .maybeSingle<{ student_id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("No tienes acceso a este alumno.");
  }
}

async function assertFamilyCanMessageReceiver(
  supabase: Awaited<ReturnType<typeof createClient>>,
  familyId: string,
  studentId: string | null,
  receiverId: string
) {
  if (studentId) {
    await assertFamilyStudent(supabase, familyId, studentId);
  }

  const supabaseAdmin = createAdminClient();
  const { data: receiver, error: receiverError } = await supabaseAdmin
    .from("profiles")
    .select("id,role,active")
    .eq("id", receiverId)
    .maybeSingle<{ id: string; role: string; active: boolean }>();

  if (receiverError) {
    throw new Error(receiverError.message);
  }

  if (receiver?.active && (receiver.role === "director" || receiver.role === "tutor")) {
    return;
  }

  throw new Error("Solo puedes escribir a direccion o al profesorado del centro.");
}

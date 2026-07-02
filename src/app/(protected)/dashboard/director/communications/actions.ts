"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { markCommunicationsRead, parseCommunicationIds, setCommunicationsStatus } from "@/lib/communications/actions";
import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { withToast } from "@/lib/toast";

type NotificationInsert = {
  sender_id: string;
  receiver_id: string;
  student_id: string | null;
  title: string;
  message: string;
  category: string;
  read: boolean;
  read_at: null;
};

type CommunicationReadClient = {
  from: (table: string) => any;
};

export async function sendDirectorCommunication(formData: FormData) {
  const profile = await requireRole("director");
  const recipientMode = String(formData.get("recipient_mode") ?? "student_family").trim();
  const receiverId = String(formData.get("receiver_id") ?? "").trim();
  const courseId = String(formData.get("course_id") ?? "").trim();
  const studentIdValue = String(formData.get("student_id") ?? "").trim();
  const studentId = studentIdValue || null;
  const category = String(formData.get("category") ?? "general").trim();
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!title || !message) {
    throw new Error("Faltan el titulo o el mensaje.");
  }

  const supabase = await createClient();
  const readClient: CommunicationReadClient = (hasSupabaseAdminClient() ? createAdminClient() : supabase) as CommunicationReadClient;
  const baseRow = {
    sender_id: profile.id,
    student_id: studentId,
    title,
    message,
    category,
    read: false,
    read_at: null
  };
  let rows: NotificationInsert[] = [];

  if (recipientMode === "student_family") {
    if (!studentId) {
      throw new Error("Selecciona un alumno para enviar a su familia.");
    }

    const { data: relations, error: relationsError } = await readClient
      .from("parent_students")
      .select("parent_id,student_id")
      .eq("student_id", studentId);

    if (relationsError) {
      throw new Error(relationsError.message);
    }

    rows = ((relations ?? []) as { parent_id: string; student_id: string }[]).map((relation) => ({
      ...baseRow,
      receiver_id: relation.parent_id,
      student_id: relation.student_id
    }));
  }

  if (recipientMode === "teacher") {
    if (!receiverId) {
      throw new Error("Selecciona un docente.");
    }

    rows = [{
      ...baseRow,
      receiver_id: receiverId
    }];
  }

  if (recipientMode === "course_families" || recipientMode === "course_all") {
    rows = [...rows, ...(await getCourseFamilyRows({ readClient, baseRow, courseId }))];
  }

  if (recipientMode === "course_teachers" || recipientMode === "course_all") {
    rows = [...rows, ...(await getCourseTeacherRows({ readClient, baseRow, courseId, directorId: profile.id }))];
  }

  rows = dedupeNotificationRows(rows);

  if (rows.length === 0) {
    throw new Error("No se encontraron destinatarios para esta comunicacion.");
  }

  const { error } = await supabase.from("notifications").insert(rows as never);

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
      recipient_mode: recipientMode,
      course_id: courseId || null,
      student_id: studentId,
      category,
      recipients: rows.length
    }
  });

  revalidateCommunicationPaths();
  redirect(withToast("/dashboard/director/communications", "success", "Comunicacion enviada correctamente."));
}

export async function replyToDirectorCommunication(formData: FormData) {
  const profile = await requireRole("director");
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
    .eq("receiver_id", profile.id)
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
    throw new Error("Solo puedes responder comunicaciones dirigidas a direccion.");
  }

  if (original.status === "closed") {
    throw new Error("La conversacion esta cerrada. Reabrela antes de responder.");
  }

  const { error } = await supabase.from("notifications").insert({
    sender_id: profile.id,
    receiver_id: original.sender_id,
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
      receiver_id: original.sender_id,
      student_id: original.student_id,
      category: original.category,
      reply_to: communicationId
    }
  });

  revalidateCommunicationPaths();
  redirect(withToast("/dashboard/director/communications", "success", "Respuesta enviada correctamente."));
}

export async function forwardDirectorCommunication(formData: FormData) {
  const profile = await requireRole("director");
  const communicationId = String(formData.get("communication_id") ?? "").trim();
  const receiverId = String(formData.get("receiver_id") ?? "").trim();
  const extraMessage = String(formData.get("message") ?? "").trim();

  if (!communicationId || !receiverId) {
    throw new Error("Falta la comunicacion o el destinatario del reenvio.");
  }

  const supabase = await createClient();
  const readClient: CommunicationReadClient = (hasSupabaseAdminClient() ? createAdminClient() : supabase) as CommunicationReadClient;
  const { data: original, error: originalError } = await readClient
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

  const originalRow = original as { student_id: string | null; title: string; message: string; category: string; status: string };
  if (originalRow.status === "closed") {
    throw new Error("La conversacion esta cerrada. Reabrela antes de reenviar.");
  }

  const message = extraMessage
    ? `${extraMessage}\n\nMensaje reenviado:\n${originalRow.message}`
    : `Mensaje reenviado:\n${originalRow.message}`;
  const { error } = await supabase.from("notifications").insert({
    sender_id: profile.id,
    receiver_id: receiverId,
    student_id: originalRow.student_id,
    title: originalRow.title.startsWith("Fwd:") ? originalRow.title : `Fwd: ${originalRow.title}`,
    message,
    category: originalRow.category,
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
      student_id: originalRow.student_id,
      category: originalRow.category,
      forwarded_from: communicationId
    }
  });

  revalidateCommunicationPaths();
  redirect(withToast("/dashboard/director/communications", "success", "Comunicacion reenviada correctamente."));
}

export async function markDirectorConversationRead(formData: FormData) {
  const profile = await requireRole("director");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  if (ids.length === 0) {
    return;
  }

  await markCommunicationsRead({ actor: profile, ids, ownOnly: false });

  revalidateCommunicationPaths();
  redirect(withToast("/dashboard/director/communications", "success", "Comunicacion marcada como leida."));
}

export async function closeDirectorConversation(formData: FormData) {
  const profile = await requireRole("director");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await setCommunicationsStatus({ actor: profile, ids, status: "closed", ownOnly: false });

  revalidateCommunicationPaths();
  redirect(withToast("/dashboard/director/communications", "success", "Conversacion cerrada."));
}

export async function reopenDirectorConversation(formData: FormData) {
  const profile = await requireRole("director");
  const ids = parseCommunicationIds(formData.get("communication_ids"));

  await setCommunicationsStatus({ actor: profile, ids, status: "open", ownOnly: false });

  revalidateCommunicationPaths();
  redirect(withToast("/dashboard/director/communications", "success", "Conversacion reabierta."));
}

export async function markDirectorConversationImportant(formData: FormData) {
  await requireRole("director");
  const ids = String(formData.get("communication_ids") ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (ids.length === 0) {
    return;
  }

  const supabase = await createClient();
  const writeClient: CommunicationReadClient = (hasSupabaseAdminClient() ? createAdminClient() : supabase) as CommunicationReadClient;
  const { data, error: readError } = await writeClient
    .from("notifications")
    .select("id,title")
    .in("id", ids);

  if (readError) {
    throw new Error(readError.message);
  }

  const rows = ((data ?? []) as { id: string; title: string }[]).filter((row) => !row.title.startsWith("[Importante]"));

  await Promise.all(
    rows.map((row) =>
      writeClient
        .from("notifications")
        .update({ title: `[Importante] ${row.title}` })
        .eq("id", row.id)
    )
  );

  revalidateCommunicationPaths();
  redirect(withToast("/dashboard/director/communications", "success", "Conversacion marcada como importante."));
}

async function getCourseFamilyRows({
  readClient,
  baseRow,
  courseId
}: {
  readClient: CommunicationReadClient;
  baseRow: Omit<NotificationInsert, "receiver_id">;
  courseId: string;
}) {
  if (!courseId) {
    throw new Error("Selecciona un curso.");
  }

  const { data: students, error: studentsError } = await readClient
    .from("students")
    .select("id")
    .eq("course_id", courseId)
    .eq("active", true);

  if (studentsError) {
    throw new Error(studentsError.message);
  }

  const studentIds = ((students ?? []) as { id: string }[]).map((student) => student.id);

  if (studentIds.length === 0) {
    return [];
  }

  const { data: relations, error: relationsError } = await readClient
    .from("parent_students")
    .select("parent_id,student_id")
    .in("student_id", studentIds);

  if (relationsError) {
    throw new Error(relationsError.message);
  }

  return ((relations ?? []) as { parent_id: string; student_id: string }[]).map((relation) => ({
    ...baseRow,
    receiver_id: relation.parent_id,
    student_id: relation.student_id
  }));
}

async function getCourseTeacherRows({
  readClient,
  baseRow,
  courseId,
  directorId
}: {
  readClient: CommunicationReadClient;
  baseRow: Omit<NotificationInsert, "receiver_id">;
  courseId: string;
  directorId: string;
}) {
  if (!courseId) {
    throw new Error("Selecciona un curso.");
  }

  const { data: assignments, error } = await readClient
    .from("teacher_assignments")
    .select("teacher_id")
    .eq("course_id", courseId);

  if (error) {
    throw new Error(error.message);
  }

  const teacherIds = Array.from(new Set(((assignments ?? []) as { teacher_id: string }[]).map((assignment) => assignment.teacher_id))).filter(
    (teacherId) => teacherId !== directorId
  );

  return teacherIds.map((teacherId) => ({
    ...baseRow,
    receiver_id: teacherId,
    student_id: null
  }));
}

function dedupeNotificationRows(rows: NotificationInsert[]) {
  const seen = new Set<string>();

  return rows.filter((row) => {
    const key = `${row.receiver_id}:${row.student_id ?? "none"}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function revalidateCommunicationPaths() {
  revalidatePath("/dashboard/director/communications");
  revalidatePath("/dashboard/family");
  revalidatePath("/dashboard/family/communications");
  revalidatePath("/dashboard/tutor/communications");
}

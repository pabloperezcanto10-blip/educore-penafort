"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { createInternalNotifications, type InternalNotificationInsert } from "@/lib/internal-notifications";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

const validSeverities = ["leve", "media", "grave"] as const;
const validCategories = ["incidencia", "académico", "tutoría", "general"] as const;

const validObservationPriorities = ["baja", "media", "alta"] as const;
const validGradeTerms = ["1", "2", "3"] as const;
const validAssessmentTypes = ["parcial", "trimestral"] as const;

export async function createStudentIncident(formData: FormData) {
  const profile = await requireRole("tutor");
  const studentId = String(formData.get("student_id") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const severityValue = String(formData.get("severity") ?? "media");
  const severity = validSeverities.includes(severityValue as (typeof validSeverities)[number])
    ? (severityValue as (typeof validSeverities)[number])
    : "media";

  if (!studentId || !type || !description) {
    throw new Error("Faltan campos obligatorios para registrar la incidencia.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(authError?.message ?? "No hay sesión activa.");
  }

  const tutorId = user.id ?? profile.id;
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("tutor_teacher_id", tutorId)
    .maybeSingle<{ id: string }>();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    throw new Error("No tienes acceso a este alumno.");
  }

  const incident: Database["public"]["Tables"]["student_incidents"]["Insert"] = {
    student_id: studentId,
    tutor_id: tutorId,
    type,
    description,
    severity
  };

  const { error } = await supabase.from("student_incidents").insert(incident as never);

  if (error) {
    throw new Error(error.message);
  }

  const { data: directors } = await supabase
    .from("profiles")
    .select("id")
    .eq("role", "director")
    .eq("active", true)
    .returns<{ id: string }[]>();

  await createInternalNotifications(
    (directors ?? []).map((director) => ({
      user_id: director.id,
      role: "director",
      type: "new_incident",
      title: "Nueva incidencia registrada",
      body: `Se ha registrado una incidencia ${severity} para un alumno.`,
      related_entity_type: "student",
      related_entity_id: studentId,
      related_href: `/dashboard/director/students/${studentId}`
    }))
  );

  revalidatePath(`/dashboard/tutor/students/${studentId}`);
  revalidatePath("/dashboard/director");
  redirect(withToast(`/dashboard/tutor/students/${studentId}`, "success", "Incidencia registrada correctamente."));
}

export async function createFamilyNotification(formData: FormData) {
  const profile = await requireRole("tutor");
  const studentId = String(formData.get("student_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const categoryValue = String(formData.get("category") ?? "general");
  const category = validCategories.includes(categoryValue as (typeof validCategories)[number])
    ? (categoryValue as (typeof validCategories)[number])
    : "general";

  if (!studentId || !title || !message) {
    throw new Error("Faltan campos obligatorios para enviar el aviso.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(authError?.message ?? "No hay sesión activa.");
  }

  const tutorId = user.id ?? profile.id;
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("tutor_teacher_id", tutorId)
    .maybeSingle<{ id: string }>();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    throw new Error("No tienes acceso a este alumno.");
  }

  const { data: recipients, error: recipientsError } = await supabase
    .from("parent_students")
    .select("parent_id")
    .eq("student_id", studentId)
    .returns<{ parent_id: string }[]>();

  if (recipientsError) {
    throw new Error(recipientsError.message);
  }

  if (!recipients || recipients.length === 0) {
    throw new Error("Este alumno todavía no tiene familia asociada.");
  }

  const notifications: Database["public"]["Tables"]["notifications"]["Insert"][] = recipients.map(
    (recipient) => ({
      sender_id: tutorId,
      receiver_id: recipient.parent_id,
      student_id: studentId,
      title,
      message,
      category,
      read: false,
      read_at: null
    })
  );

  const { error } = await supabase.from("notifications").insert(notifications as never);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditAction({
    actorUserId: tutorId,
    actorRole: profile.role,
    action: "communication_sent",
    module: "communications",
    entityType: "notification",
    entityId: null,
    afterData: {
      student_id: studentId,
      category,
      recipients: recipients.length
    }
  });

  revalidatePath(`/dashboard/tutor/students/${studentId}`);
  redirect(withToast(`/dashboard/tutor/students/${studentId}`, "success", "Aviso enviado a la familia."));
}

export async function createStudentObservation(formData: FormData) {
  const profile = await requireRole("tutor");
  const studentId = String(formData.get("student_id") ?? "");
  const type = String(formData.get("type") ?? "").trim();
  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();
  const priorityValue = String(formData.get("priority") ?? "media");
  const priority = validObservationPriorities.includes(
    priorityValue as (typeof validObservationPriorities)[number]
  )
    ? (priorityValue as (typeof validObservationPriorities)[number])
    : "media";

  if (!studentId || !type || !title || !content) {
    throw new Error("Faltan campos obligatorios para guardar la observacion.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(authError?.message ?? "No hay sesion activa.");
  }

  const tutorId = user.id ?? profile.id;
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("tutor_teacher_id", tutorId)
    .maybeSingle<{ id: string }>();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    throw new Error("No tienes acceso a este alumno.");
  }

  const observation: Database["public"]["Tables"]["student_observations"]["Insert"] = {
    student_id: studentId,
    tutor_id: tutorId,
    type,
    title,
    content,
    priority
  };

  const { error } = await supabase.from("student_observations").insert(observation as never);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/dashboard/tutor/students/${studentId}`);
  redirect(withToast(`/dashboard/tutor/students/${studentId}`, "success", "Observacion guardada correctamente."));
}

export async function createStudentGrade(formData: FormData) {
  const profile = await requireRole("tutor");
  const studentId = String(formData.get("student_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const termValue = String(formData.get("term") ?? "1");
  const assessmentTypeValue = String(formData.get("assessment_type") ?? "parcial");
  const assessmentName = String(formData.get("assessment_name") ?? "").trim();
  const gradeValue = Number(String(formData.get("grade") ?? "").replace(",", "."));
  const assessmentDate = String(formData.get("assessment_date") ?? "").trim() || null;
  const comment = String(formData.get("comment") ?? "").trim() || null;
  const recommendation = String(formData.get("recommendation") ?? "").trim() || null;
  const visibleToFamily = formData.get("visible_to_family") === "on";
  const term = validGradeTerms.includes(termValue as (typeof validGradeTerms)[number])
    ? (termValue as (typeof validGradeTerms)[number])
    : "1";
  const assessmentType = validAssessmentTypes.includes(
    assessmentTypeValue as (typeof validAssessmentTypes)[number]
  )
    ? (assessmentTypeValue as (typeof validAssessmentTypes)[number])
    : "parcial";

  if (!studentId || !subjectId || !assessmentName || Number.isNaN(gradeValue)) {
    throw new Error("Faltan campos obligatorios para guardar la calificacion.");
  }

  if (gradeValue < 0 || gradeValue > 10) {
    throw new Error("La nota debe estar entre 0 y 10.");
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(authError?.message ?? "No hay sesion activa.");
  }

  const teacherId = user.id ?? profile.id;
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id,course_id")
    .eq("id", studentId)
    .maybeSingle<{ id: string; course_id: string }>();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    throw new Error("No tienes acceso a este alumno.");
  }

  const { data: assignment, error: assignmentError } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("course_id", student.course_id)
    .eq("subject_id", subjectId)
    .maybeSingle<{ id: string }>();

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  if (!assignment) {
    throw new Error("No tienes asignada esta materia para el curso del alumno.");
  }

  const partialGrade: Database["public"]["Tables"]["partial_grades"]["Insert"] = {
    student_id: studentId,
    teacher_id: teacherId,
    subject_id: subjectId,
    course_id: student.course_id,
    term,
    assessment_type: assessmentType,
    assessment_name: assessmentName,
    grade: gradeValue,
    assessment_date: assessmentDate,
    comment,
    recommendation,
    visible_to_family: visibleToFamily
  };

  const { error } = await supabase.from("partial_grades").insert(partialGrade as never);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditAction({
    actorUserId: teacherId,
    actorRole: profile.role,
    action: "grade_updated",
    module: "student_profile",
    entityType: "partial_grade",
    entityId: null,
    afterData: {
      student_id: studentId,
      subject_id: subjectId,
      course_id: student.course_id,
      term,
      assessment_type: assessmentType,
      assessment_name: assessmentName,
      grade: gradeValue
    }
  });

  if (visibleToFamily) {
    await notifyFamiliesAboutVisibleGrade(supabase, studentId, assessmentName);
  }

  revalidatePath(`/dashboard/tutor/students/${studentId}`);
  revalidatePath("/dashboard/family");
  redirect(withToast(`/dashboard/tutor/students/${studentId}`, "success", "Calificacion guardada correctamente."));
}

async function notifyFamiliesAboutVisibleGrade(
  supabase: Awaited<ReturnType<typeof createClient>>,
  studentId: string,
  assessmentName: string
) {
  const { data: families } = await supabase
    .from("parent_students")
    .select("parent_id")
    .eq("student_id", studentId)
    .returns<{ parent_id: string }[]>();

  const rows: InternalNotificationInsert[] = (families ?? []).map((family) => ({
    user_id: family.parent_id,
    role: "family",
    type: "new_visible_grade",
    title: "Nueva calificación disponible",
    body: `Ya puedes consultar la calificación de ${assessmentName}.`,
    related_entity_type: "student",
    related_entity_id: studentId,
    related_href: "/dashboard/family/grades"
  }));

  await createInternalNotifications(rows);
}

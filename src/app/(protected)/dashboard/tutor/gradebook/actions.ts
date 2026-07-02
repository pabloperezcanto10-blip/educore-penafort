"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { createInternalNotifications, type InternalNotificationInsert } from "@/lib/internal-notifications";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

const validTerms = ["1", "2", "3"] as const;
const validAssessmentTypes = ["parcial", "trimestral"] as const;
const validCriterionTypes = ["parcial", "trimestral", "comportamiento", "libreta", "oral", "proyecto", "actitud", "otro"] as const;

type PartialGradeInsert = Database["public"]["Tables"]["partial_grades"]["Insert"];
type EvaluationCriterion = Database["public"]["Tables"]["evaluation_criteria"]["Row"];
type EvaluationCriterionInsert = Database["public"]["Tables"]["evaluation_criteria"]["Insert"];
type EvaluationCriterionUpdate = Database["public"]["Tables"]["evaluation_criteria"]["Update"];
type QuarterFinalGradeInsert = Database["public"]["Tables"]["quarter_final_grades"]["Insert"];
type TermSubjectGradeInsert = Database["public"]["Tables"]["term_subject_grades"]["Insert"];

export async function saveGradebook(formData: FormData) {
  const profile = await requireRole("tutor");
  const courseId = String(formData.get("course_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const termValue = String(formData.get("term") ?? "1");
  const assessmentTypeValue = String(formData.get("assessment_type") ?? "parcial");
  const assessmentName = String(formData.get("assessment_name") ?? "").trim();
  const assessmentDate = String(formData.get("assessment_date") ?? "").trim() || null;
  const term = validTerms.includes(termValue as (typeof validTerms)[number])
    ? (termValue as (typeof validTerms)[number])
    : "1";
  const assessmentType = validAssessmentTypes.includes(
    assessmentTypeValue as (typeof validAssessmentTypes)[number]
  )
    ? (assessmentTypeValue as (typeof validAssessmentTypes)[number])
    : "parcial";

  if (!courseId || !subjectId || !assessmentName) {
    throw new Error("Faltan curso, materia o nombre de prueba.");
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
  const { data: assignment, error: assignmentError } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .maybeSingle<{ id: string }>();

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  if (!assignment) {
    throw new Error("No tienes asignada esta materia para este curso.");
  }

  const studentIds = formData.getAll("student_id").map((value) => String(value));
  const rows: PartialGradeInsert[] = [];

  studentIds.forEach((studentId) => {
    const gradeRaw = String(formData.get(`grade_${studentId}`) ?? "").trim();

    if (!gradeRaw) {
      return;
    }

    const grade = Number(gradeRaw.replace(",", "."));

    if (Number.isNaN(grade) || grade < 0 || grade > 10) {
      throw new Error("Todas las notas deben estar entre 0 y 10.");
    }

    rows.push({
      student_id: studentId,
      teacher_id: teacherId,
      subject_id: subjectId,
      course_id: courseId,
      term,
      assessment_type: assessmentType,
      assessment_name: assessmentName,
      grade,
      assessment_date: assessmentDate,
      comment: String(formData.get(`comment_${studentId}`) ?? "").trim() || null,
      recommendation: String(formData.get(`recommendation_${studentId}`) ?? "").trim() || null,
      visible_to_family: formData.get(`visible_${studentId}`) === "on"
    });
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("partial_grades")
      .upsert(rows as never, {
        onConflict: "academic_year_id,student_id,subject_id,term,assessment_type,assessment_name"
      });

    if (error) {
      throw new Error(error.message);
    }

    await logAuditAction({
      actorUserId: teacherId,
      actorRole: profile.role,
      action: "grade_updated",
      module: "gradebook",
      entityType: "partial_grades",
      entityId: null,
      afterData: {
        course_id: courseId,
        subject_id: subjectId,
        term,
        assessment_type: assessmentType,
        assessment_name: assessmentName,
        rows: rows.length
      }
    });

    await notifyFamiliesAboutGradebookRows(supabase, rows.filter((row) => row.visible_to_family));
  }

  revalidatePath("/dashboard/tutor/gradebook");
  revalidatePath("/dashboard/family");
  redirect(withToast(buildGradebookHref({ courseId, subjectId, term, assessmentType, assessmentName, assessmentDate }), "success", "Calificacion guardada."));
}

export async function saveEvaluationCriterion(formData: FormData) {
  const profile = await requireRole("tutor");
  const criterionId = String(formData.get("criterion_id") ?? "").trim();
  const courseId = String(formData.get("course_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const term = normalizeTermValue(String(formData.get("term") ?? "1"));
  const name = String(formData.get("name") ?? "").trim();
  const weight = Number(String(formData.get("weight") ?? "").replace(",", "."));
  const criterionTypeValue = String(formData.get("criterion_type") ?? "parcial");
  const criterionType = validCriterionTypes.includes(criterionTypeValue as (typeof validCriterionTypes)[number])
    ? (criterionTypeValue as (typeof validCriterionTypes)[number])
    : "otro";
  const visibleToFamily = formData.get("visible_to_family") === "on";
  const active = formData.get("active") === "on";

  if (!courseId || !subjectId || !name || Number.isNaN(weight)) {
    throw new Error("Faltan datos del criterio.");
  }

  if (weight <= 0 || weight > 100) {
    throw new Error("El peso debe estar entre 0 y 100.");
  }

  const supabase = await createClient();
  const teacherId = await getAuthenticatedTeacherId(supabase, profile.id);
  const activeAcademicYearId = await requireActiveAcademicYearId();
  await assertTeacherAssignment(supabase, teacherId, courseId, subjectId);

  const { data: currentCriteria, error: currentError } = await supabase
    .from("evaluation_criteria")
    .select("id,teacher_id,course_id,subject_id,term,name,weight,criterion_type,visible_to_family,active,created_at")
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("term", term)
    .eq("academic_year_id", activeAcademicYearId)
    .returns<EvaluationCriterion[]>();

  if (currentError) {
    throw new Error(currentError.message);
  }

  const proposedCriteria = buildProposedCriteria(currentCriteria ?? [], {
    id: criterionId || "new",
    teacher_id: teacherId,
    course_id: courseId,
    subject_id: subjectId,
    academic_year_id: activeAcademicYearId,
    term,
    name,
    weight,
    criterion_type: criterionType,
    visible_to_family: visibleToFamily,
    active,
    created_at: new Date().toISOString()
  });
  const total = proposedCriteria
    .filter((criterion) => criterion.active)
    .reduce((sum, criterion) => sum + Number(criterion.weight), 0);

  if (Math.round(total * 100) / 100 > 100) {
    throw new Error(`La suma de criterios activos no puede superar el 100%. Ahora suma ${Math.round(total * 100) / 100}%.`);
  }

  if (criterionId) {
    const update: EvaluationCriterionUpdate = {
      name,
      weight,
      criterion_type: criterionType,
      visible_to_family: visibleToFamily,
      active
    };
    const { error } = await supabase
      .from("evaluation_criteria")
      .update(update as never)
      .eq("id", criterionId)
      .eq("teacher_id", teacherId);

    if (error) {
      throw new Error(error.message);
    }
  } else {
    const insert: EvaluationCriterionInsert = {
      teacher_id: teacherId,
      course_id: courseId,
      subject_id: subjectId,
      term,
      name,
      weight,
      criterion_type: criterionType,
      visible_to_family: visibleToFamily,
      active
    };
    const { error } = await supabase.from("evaluation_criteria").insert(insert as never);

    if (error) {
      throw new Error(error.message);
    }

  }

  revalidatePath("/dashboard/tutor/gradebook");
  revalidatePath("/dashboard/tutor/evaluation-settings");
  revalidatePath("/dashboard/director/gradebook");
  revalidatePath("/dashboard/admin/gradebook");
  redirect(withToast(`/dashboard/tutor/evaluation-settings?course_id=${courseId}&subject_id=${subjectId}&term=${term}`, "success", "Criterio guardado correctamente."));
}

export async function deleteEvaluationCriterion(formData: FormData) {
  const profile = await requireRole("tutor");
  const criterionId = String(formData.get("criterion_id") ?? "").trim();

  if (!criterionId) {
    throw new Error("Falta el criterio a eliminar.");
  }

  const supabase = await createClient();
  const teacherId = await getAuthenticatedTeacherId(supabase, profile.id);
  const { error } = await supabase
    .from("evaluation_criteria")
    .delete()
    .eq("id", criterionId)
    .eq("teacher_id", teacherId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/dashboard/tutor/evaluation-settings");
  revalidatePath("/dashboard/tutor/gradebook");
  revalidatePath("/dashboard/director/gradebook");
  revalidatePath("/dashboard/admin/gradebook");
  redirect(withToast("/dashboard/tutor/evaluation-settings", "success", "Criterio eliminado correctamente."));
}

export async function saveQuarterFinalGrades(formData: FormData) {
  const profile = await requireRole("tutor");
  const courseId = String(formData.get("course_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const term = normalizeTermValue(String(formData.get("term") ?? "1"));

  if (!courseId || !subjectId) {
    throw new Error("Faltan curso o materia.");
  }

  const supabase = await createClient();
  const teacherId = await getAuthenticatedTeacherId(supabase, profile.id);
  await assertTeacherAssignment(supabase, teacherId, courseId, subjectId);
  await assertEvaluationIsNotPublished(supabase, courseId, term);
  await assertCriteriaTotalIsComplete(supabase, teacherId, courseId, subjectId, term);

  const rows: QuarterFinalGradeInsert[] = formData.getAll("student_id").map((value) => {
    const studentId = String(value);
    const calculatedGrade = Number(String(formData.get(`calculated_${studentId}`) ?? "").replace(",", "."));
    const finalGrade = Number(String(formData.get(`final_${studentId}`) ?? "").replace(",", "."));

    if (Number.isNaN(calculatedGrade) || Number.isNaN(finalGrade) || finalGrade < 0 || finalGrade > 10) {
      throw new Error("Las notas finales deben estar entre 0 y 10.");
    }

    return {
      student_id: studentId,
      subject_id: subjectId,
      teacher_id: teacherId,
      course_id: courseId,
      term,
      calculated_grade: calculatedGrade,
      final_grade: finalGrade,
      teacher_observation: String(formData.get(`observation_${studentId}`) ?? "").trim() || null
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("quarter_final_grades")
      .upsert(rows as never, {
        onConflict: "academic_year_id,student_id,subject_id,teacher_id,course_id,term"
      });

    if (error) {
      throw new Error(error.message);
    }

    await logAuditAction({
      actorUserId: teacherId,
      actorRole: profile.role,
      action: "grade_updated",
      module: "gradebook",
      entityType: "quarter_final_grades",
      entityId: null,
      afterData: {
        course_id: courseId,
        subject_id: subjectId,
        term,
        rows: rows.length
      }
    });
  }

  revalidatePath("/dashboard/tutor/gradebook");
  revalidatePath("/dashboard/tutor/evaluation-settings");
  revalidatePath("/dashboard/director/gradebook");
  revalidatePath("/dashboard/admin/gradebook");
  redirect(withToast(buildGradebookHref({ courseId, subjectId, term }), "success", "Notas finales guardadas."));
}

export async function saveTermSubjectGrades(formData: FormData) {
  const profile = await requireRole("tutor");
  const courseId = String(formData.get("course_id") ?? "");
  const subjectId = String(formData.get("subject_id") ?? "");
  const term = normalizeTermValue(String(formData.get("term") ?? "1"));
  const intent = String(formData.get("intent") ?? "draft");
  const status = intent === "closed" ? "closed" : "draft";

  if (!courseId || !subjectId) {
    throw new Error("Faltan curso o materia.");
  }

  const supabase = await createClient();
  const teacherId = await getAuthenticatedTeacherId(supabase, profile.id);
  await assertTeacherAssignment(supabase, teacherId, courseId, subjectId);
  await assertCriteriaTotalIsComplete(supabase, teacherId, courseId, subjectId, term);

  const rows: TermSubjectGradeInsert[] = formData.getAll("student_id").map((value) => {
    const studentId = String(value);
    const calculatedRaw = String(formData.get(`calculated_${studentId}`) ?? "").replace(",", ".");
    const finalRaw = String(formData.get(`final_${studentId}`) ?? "").replace(",", ".");
    const calculatedGrade = calculatedRaw ? Number(calculatedRaw) : null;
    const finalGrade = finalRaw ? Number(finalRaw) : null;

    if (calculatedGrade !== null && (Number.isNaN(calculatedGrade) || calculatedGrade < 0 || calculatedGrade > 10)) {
      throw new Error("Las notas calculadas deben estar entre 0 y 10.");
    }

    if (finalGrade !== null && (!Number.isInteger(finalGrade) || finalGrade < 0 || finalGrade > 10)) {
      throw new Error("La nota final oficial debe ser un entero entre 0 y 10.");
    }

    if (status === "closed" && (calculatedGrade === null || finalGrade === null)) {
      throw new Error("No se puede cerrar una materia con calificaciones pendientes.");
    }

    return {
      student_id: studentId,
      subject_id: subjectId,
      teacher_id: teacherId,
      course_id: courseId,
      term,
      calculated_grade: calculatedGrade,
      final_grade: finalGrade,
      final_observation: String(formData.get(`observation_${studentId}`) ?? "").trim() || null,
      status,
      closed_at: status === "closed" ? new Date().toISOString() : null
    };
  });

  if (rows.length > 0) {
    const { error } = await supabase
      .from("term_subject_grades")
      .upsert(rows as never, {
        onConflict: "academic_year_id,student_id,subject_id,term"
      });

    if (error) {
      throw new Error(error.message);
    }

    await logAuditAction({
      actorUserId: teacherId,
      actorRole: profile.role,
      action: status === "closed" ? "term_grade_closed" : "grade_updated",
      module: "gradebook",
      entityType: "term_subject_grades",
      entityId: null,
      afterData: {
        course_id: courseId,
        subject_id: subjectId,
        term,
        status,
        rows: rows.length
      }
    });

    if (status === "closed") {
      await notifyStaffAboutClosedEvaluation(supabase, courseId, subjectId, term);
    }
  }

  revalidatePath("/dashboard/tutor/gradebook");
  revalidatePath("/dashboard/director/gradebook");
  revalidatePath("/dashboard/admin/gradebook");
  redirect(withToast(buildGradebookHref({ courseId, subjectId, term }), "success", status === "closed" ? "Evaluacion cerrada correctamente." : "Borrador guardado correctamente."));
}

async function notifyFamiliesAboutGradebookRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  rows: PartialGradeInsert[]
) {
  if (rows.length === 0) return;

  const studentIds = Array.from(new Set(rows.map((row) => row.student_id)));
  const { data: families } = await supabase
    .from("parent_students")
    .select("parent_id,student_id")
    .in("student_id", studentIds)
    .returns<{ parent_id: string; student_id: string }[]>();

  const rowsByStudent = new Map(rows.map((row) => [row.student_id, row]));
  const notifications: InternalNotificationInsert[] = [];

  (families ?? []).forEach((family) => {
    const grade = rowsByStudent.get(family.student_id);

    if (!grade) return;

    notifications.push({
      user_id: family.parent_id,
      role: "family",
      type: "new_visible_grade",
      title: "Nueva calificación disponible",
      body: `Ya puedes consultar la calificación de ${grade.assessment_name}.`,
      related_entity_type: "student",
      related_entity_id: family.student_id,
      related_href: "/dashboard/family/grades"
    });
  });

  await createInternalNotifications(notifications);
}

async function notifyStaffAboutClosedEvaluation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  subjectId: string,
  term: string
) {
  const { data: staff } = await supabase
    .from("profiles")
    .select("id,role")
    .in("role", ["director", "superadmin"])
    .eq("active", true)
    .returns<{ id: string; role: "director" | "superadmin" }[]>();

  await createInternalNotifications(
    (staff ?? []).map((profile) => ({
      user_id: profile.id,
      role: profile.role,
      type: "report_pending_publication",
      title: "Materia cerrada para revisión",
      body: `Hay una materia cerrada en el trimestre ${term}, lista para supervisión o publicación.`,
      related_entity_type: "subject",
      related_entity_id: subjectId,
      related_href: profile.role === "director" ? "/dashboard/director/gradebook" : "/dashboard/admin/gradebook"
    }))
  );
}

export async function reopenTermSubjectGrade(formData: FormData) {
  const profile = await requireRole("tutor");
  const gradeId = String(formData.get("term_subject_grade_id") ?? "").trim();

  if (!gradeId) {
    throw new Error("Falta la nota trimestral a reabrir.");
  }

  const supabase = await createClient();
  const teacherId = await getAuthenticatedTeacherId(supabase, profile.id);
  const { data: currentGrade, error: currentGradeError } = await supabase
    .from("term_subject_grades")
    .select("id,course_id,subject_id,term,status,final_grade,calculated_grade,closed_at")
    .eq("id", gradeId)
    .eq("teacher_id", teacherId)
    .maybeSingle<{
      id: string;
      course_id: string;
      subject_id: string;
      term: (typeof validTerms)[number];
      status: string;
      final_grade: number | null;
      calculated_grade: number | null;
      closed_at: string | null;
    }>();

  if (currentGradeError) {
    throw new Error(currentGradeError.message);
  }

  if (!currentGrade) {
    throw new Error("No se encontro la nota trimestral.");
  }

  await assertEvaluationIsNotPublished(supabase, currentGrade.course_id, currentGrade.term);

  const { error } = await supabase
    .from("term_subject_grades")
    .update({
      status: "draft",
      closed_at: null
    } as never)
    .eq("id", gradeId)
    .eq("teacher_id", teacherId);

  if (error) {
    throw new Error(error.message);
  }

  await logAuditAction({
    actorUserId: teacherId,
    actorRole: profile.role,
    action: "term_grade_reopened",
    module: "gradebook",
    entityType: "term_subject_grade",
    entityId: gradeId,
    beforeData: currentGrade,
    afterData: {
      status: "draft",
      closed_at: null
    }
  });

  revalidatePath("/dashboard/tutor/gradebook");
  revalidatePath("/dashboard/director/reports");
  revalidatePath("/dashboard/admin/reports");
  redirect(withToast(`/dashboard/tutor/gradebook?course_id=${currentGrade.course_id}&subject_id=${currentGrade.subject_id}&term=${currentGrade.term}`, "success", "Evaluacion reabierta correctamente."));
}

async function assertEvaluationIsNotPublished(
  supabase: Awaited<ReturnType<typeof createClient>>,
  courseId: string,
  term: (typeof validTerms)[number]
) {
  const { data, error } = await supabase
    .from("evaluation_publications")
    .select("published")
    .eq("course_id", courseId)
    .eq("term", term)
    .eq("academic_year_id", await requireActiveAcademicYearId())
    .maybeSingle<{ published: boolean }>();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.published) {
    throw new Error("La evaluacion ya esta publicada. No se pueden modificar cierres desde el cuaderno.");
  }
}

async function assertCriteriaTotalIsComplete(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  courseId: string,
  subjectId: string,
  term: (typeof validTerms)[number]
) {
  const { data, error } = await supabase
    .from("evaluation_criteria")
    .select("weight")
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("term", term)
    .eq("active", true)
    .eq("academic_year_id", await requireActiveAcademicYearId())
    .returns<{ weight: number }[]>();

  if (error) {
    throw new Error(error.message);
  }

  const total = (data ?? []).reduce((sum, criterion) => sum + Number(criterion.weight), 0);

  if (Math.round(total * 100) / 100 !== 100) {
    throw new Error("La suma de criterios activos debe ser exactamente 100%.");
  }
}

async function getAuthenticatedTeacherId(supabase: Awaited<ReturnType<typeof createClient>>, fallbackId: string) {
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error(authError?.message ?? "No hay sesion activa.");
  }

  return user.id ?? fallbackId;
}

async function assertTeacherAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teacherId: string,
  courseId: string,
  subjectId: string
) {
  const { data: assignment, error } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("academic_year_id", await requireActiveAcademicYearId())
    .maybeSingle<{ id: string }>();

  if (error) {
    throw new Error(error.message);
  }

  if (!assignment) {
    throw new Error("No tienes asignada esta materia para este curso.");
  }
}

async function requireActiveAcademicYearId() {
  const { academicYear, errorMessage } = await getActiveAcademicYear();

  if (!academicYear) {
    throw new Error(errorMessage ?? "No hay curso escolar activo.");
  }

  return academicYear.id;
}

function normalizeTermValue(value: string) {
  return validTerms.includes(value as (typeof validTerms)[number]) ? (value as (typeof validTerms)[number]) : "1";
}

function buildProposedCriteria(currentCriteria: EvaluationCriterion[], candidate: EvaluationCriterion) {
  const withoutCandidate = currentCriteria.filter((criterion) => {
    if (candidate.id !== "new") {
      return criterion.id !== candidate.id;
    }

    return criterion.name.trim().toLocaleLowerCase("es") !== candidate.name.trim().toLocaleLowerCase("es");
  });

  return [...withoutCandidate, candidate];
}

function buildGradebookHref({
  courseId,
  subjectId,
  term,
  assessmentType,
  assessmentName,
  assessmentDate
}: {
  courseId: string;
  subjectId: string;
  term: string;
  assessmentType?: string;
  assessmentName?: string;
  assessmentDate?: string | null;
}) {
  const params = new URLSearchParams({
    course_id: courseId,
    subject_id: subjectId,
    term
  });

  if (assessmentType) params.set("assessment_type", assessmentType);
  if (assessmentName) params.set("assessment_name", assessmentName);
  if (assessmentDate) params.set("assessment_date", assessmentDate);

  return `/dashboard/tutor/gradebook?${params.toString()}`;
}

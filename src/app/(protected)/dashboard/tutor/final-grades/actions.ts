"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { calculateAnnualGrade, roundAnnualGrade } from "@/lib/grades/annual";
import { createClient } from "@/lib/supabase/server";
import { withToast } from "@/lib/toast";

export async function saveAnnualWeights(formData: FormData) {
  const profile = await requireRole("tutor");
  const courseId = stringValue(formData, "course_id");
  const subjectId = stringValue(formData, "subject_id");
  const term1 = numberValue(formData, "term1_weight");
  const term2 = numberValue(formData, "term2_weight");
  const term3 = numberValue(formData, "term3_weight");

  if (!courseId || !subjectId) {
    throw new Error("Faltan curso o materia.");
  }

  if (Number((term1 + term2 + term3).toFixed(2)) !== 100) {
    throw new Error("La suma de pesos debe ser 100%.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("annual_evaluation_weights").upsert(
    {
      teacher_id: profile.id,
      course_id: courseId,
      subject_id: subjectId,
      term1_weight: term1,
      term2_weight: term2,
      term3_weight: term3,
      active: true
    } as never,
    { onConflict: "academic_year_id,teacher_id,course_id,subject_id" }
  );

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard/tutor/final-grades");
  redirect(withToast(`/dashboard/tutor/final-grades?course_id=${courseId}&subject_id=${subjectId}`, "success", "Pesos anuales guardados correctamente."));
}

export async function saveFinalCourseGrade(formData: FormData) {
  const profile = await requireRole("tutor");
  const studentId = stringValue(formData, "student_id");
  const courseId = stringValue(formData, "course_id");
  const subjectId = stringValue(formData, "subject_id");
  const term1 = nullableNumberValue(formData, "term1_grade");
  const term2 = nullableNumberValue(formData, "term2_grade");
  const term3 = nullableNumberValue(formData, "term3_grade");
  const weight1 = numberValue(formData, "term1_weight");
  const weight2 = numberValue(formData, "term2_weight");
  const weight3 = numberValue(formData, "term3_weight");
  const manualFinal = nullableNumberValue(formData, "final_grade");
  const observation = stringValue(formData, "final_observation") || null;
  const close = stringValue(formData, "close") === "1";
  const calculated = calculateAnnualGrade({ term1, term2, term3, weight1, weight2, weight3 });
  const finalGrade = manualFinal ?? roundAnnualGrade(calculated);

  if (!studentId || !courseId || !subjectId) {
    throw new Error("Faltan datos del alumno o materia.");
  }

  if (close && (calculated === null || finalGrade === null)) {
    throw new Error("No se puede cerrar sin las tres notas trimestrales.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("final_course_grades").upsert(
    {
      student_id: studentId,
      subject_id: subjectId,
      teacher_id: profile.id,
      course_id: courseId,
      term1_grade: term1,
      term2_grade: term2,
      term3_grade: term3,
      term1_weight: weight1,
      term2_weight: weight2,
      term3_weight: weight3,
      calculated_grade: calculated,
      final_grade: finalGrade,
      final_observation: observation,
      status: close ? "closed" : "draft",
      closed_at: close ? new Date().toISOString() : null
    } as never,
    { onConflict: "academic_year_id,student_id,subject_id" }
  );

  if (error) throw new Error(error.message);

  await logAuditAction({
    actorUserId: profile.id,
    actorRole: profile.role,
    action: close ? "term_grade_closed" : "grade_updated",
    module: "final_grades",
    entityType: "final_course_grade",
    entityId: null,
    afterData: {
      student_id: studentId,
      course_id: courseId,
      subject_id: subjectId,
      calculated_grade: calculated,
      final_grade: finalGrade,
      status: close ? "closed" : "draft"
    }
  });

  revalidatePath("/dashboard/tutor/final-grades");
  revalidatePath("/dashboard/director/final-grades");
  revalidatePath("/dashboard/admin/final-grades");
  redirect(withToast(`/dashboard/tutor/final-grades?course_id=${courseId}&subject_id=${subjectId}`, "success", close ? "Evaluacion final cerrada correctamente." : "Nota final guardada correctamente."));
}

function stringValue(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function numberValue(formData: FormData, name: string) {
  return Number(stringValue(formData, name) || 0);
}

function nullableNumberValue(formData: FormData, name: string) {
  const value = stringValue(formData, name);
  return value ? Number(value) : null;
}

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { buildImportPreview, importTemporaryPassword, normalizeForEmail } from "@/lib/admin/import-preview";
import { createAdminClient } from "@/lib/supabase/admin";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ParentStudentInsert = Database["public"]["Tables"]["parent_students"]["Insert"];

type ImportResult = {
  importedStudents: number;
  createdFamilies: number;
  linkedRelations: number;
};

export async function previewAdminImport(formData: FormData) {
  await requireRole("superadmin");

  const courseId = String(formData.get("course_id") ?? "").trim();
  const rawList = String(formData.get("raw_list") ?? "").trim();
  const params = new URLSearchParams();

  if (courseId) {
    params.set("course_id", courseId);
  }

  if (rawList) {
    params.set("raw_list", rawList);
  }

  params.set("preview", "1");

  redirect(withToast(`/dashboard/admin/import?${params.toString()}`, "success", "Vista previa generada."));
}

export async function confirmAdminImport(formData: FormData) {
  const actor = await requireRole("superadmin");
  const courseId = String(formData.get("course_id") ?? "").trim();
  const rawList = String(formData.get("raw_list") ?? "").trim();

  if (!courseId || !rawList) {
    redirect(withToast("/dashboard/admin/import", "error", "Faltan datos para importar."));
  }

  try {
    await runImport({
      actorId: actor.id,
      actorRole: actor.role,
      courseId,
      rawList
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar la importacion.";
    redirect(withToast("/dashboard/admin/import", "error", message));
  }

  revalidatePath("/dashboard/admin/import");
  revalidatePath("/dashboard/admin/students");
  revalidatePath("/dashboard/admin/families");
  revalidatePath("/dashboard/family");
  redirect(withToast("/dashboard/admin/import", "success", "Importación completada correctamente."));
}

async function runImport({
  actorId,
  actorRole,
  courseId,
  rawList
}: {
  actorId: string;
  actorRole: string;
  courseId: string;
  rawList: string;
}): Promise<ImportResult> {
  const { academicYear } = await getActiveAcademicYear();

  if (!academicYear) {
    throw new Error("No hay curso escolar activo.");
  }

  const preview = await buildImportPreview({ courseId, rawList });

  if (preview.errorMessage) {
    throw new Error(preview.errorMessage);
  }

  const validRows = preview.rows.filter((row) => row.status === "nuevo");

  if (validRows.length === 0) {
    throw new Error("No hay alumnos nuevos para importar.");
  }

  const supabaseAdmin = createAdminClient();
  const tutorTeacherId = await resolveTutorTeacherIdForCourse({ courseId, fallbackUserId: actorId });
  let importedStudents = 0;
  let createdFamilies = 0;
  let linkedRelations = 0;

  for (const row of validRows) {
    const studentPayload: StudentInsert = {
      name: row.firstName,
      last_name: `${row.lastName1} ${row.lastName2}`.trim(),
      course_id: courseId,
      tutor_teacher_id: tutorTeacherId,
      academic_year_id: academicYear.id,
      active: true
    };

    const { data: student, error: studentError } = await supabaseAdmin
      .from("students")
      .insert(studentPayload as never)
      .select("id,name,last_name,course_id")
      .single<{ id: string; name: string; last_name: string; course_id: string }>();

    if (studentError || !student) {
      throw new Error(studentError?.message ?? `No se pudo crear el alumno ${row.studentName}.`);
    }

    importedStudents += 1;
    await logAuditAction({
      actorUserId: actorId,
      actorRole,
      action: "student_imported",
      module: "admin_import",
      entityType: "student",
      entityId: student.id,
      afterData: student
    });

    const familyName = `Familia ${row.lastName1} ${row.lastName2}`.trim();
    const { familyId, familyEmail } = await createFamilyUserWithAvailableEmail({
      baseEmail: row.familyEmail,
      familyName
    });

    createdFamilies += 1;
    await logAuditAction({
      actorUserId: actorId,
      actorRole,
      action: "family_created",
      module: "admin_import",
      entityType: "profile",
      entityId: familyId,
      afterData: {
        email: familyEmail,
        full_name: familyName,
        role: "family",
        must_change_password: true
      }
    });

    const relationPayload: ParentStudentInsert = {
      parent_id: familyId,
      student_id: student.id
    };
    const { error: relationError } = await supabaseAdmin.from("parent_students").insert(relationPayload as never);

    if (relationError) {
      throw new Error(relationError.message);
    }

    linkedRelations += 1;
    await logAuditAction({
      actorUserId: actorId,
      actorRole,
      action: "parent_student_linked",
      module: "admin_import",
      entityType: "parent_students",
      entityId: student.id,
      afterData: relationPayload
    });
  }

  await logAuditAction({
    actorUserId: actorId,
    actorRole,
    action: "bulk_import_completed",
    module: "admin_import",
    entityType: "bulk_import",
    afterData: {
      course_id: courseId,
      imported_students: importedStudents,
      created_families: createdFamilies,
      linked_relations: linkedRelations
    }
  });

  return { importedStudents, createdFamilies, linkedRelations };
}

async function createFamilyUserWithAvailableEmail({
  baseEmail,
  familyName
}: {
  baseEmail: string;
  familyName: string;
}) {
  const supabaseAdmin = createAdminClient();
  const [localPart, domain = "penafort.com"] = baseEmail.split("@");

  for (let index = 1; index <= 50; index += 1) {
    const familyEmail = index === 1 ? baseEmail : `${localPart}${index}@${domain}`;
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", familyEmail)
      .maybeSingle<{ id: string }>();

    if (existingProfile) {
      continue;
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: familyEmail,
      password: importTemporaryPassword,
      email_confirm: true,
      user_metadata: {
        full_name: familyName,
        role: "family"
      }
    });

    if (authError || !authData.user) {
      continue;
    }

    const familyId = authData.user.id;
    const profilePayload: ProfileInsert = {
      id: familyId,
      email: familyEmail,
      full_name: familyName,
      role: "family",
      active: true,
      must_change_password: true
    };
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(profilePayload as never);

    if (profileError) {
      throw new Error(profileError.message);
    }

    return { familyId, familyEmail };
  }

  const suffix = normalizeForEmail(String(Date.now()));
  throw new Error(`No se pudo generar un email disponible para ${localPart}.${suffix}@${domain}.`);
}

async function resolveTutorTeacherIdForCourse({
  courseId,
  fallbackUserId
}: {
  courseId: string;
  fallbackUserId: string;
}) {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("teacher_assignments")
    .select("teacher_id")
    .eq("course_id", courseId)
    .limit(1)
    .maybeSingle<{ teacher_id: string }>();

  return data?.teacher_id ?? fallbackUserId;
}

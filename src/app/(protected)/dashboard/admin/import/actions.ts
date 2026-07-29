"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { logAuditAction } from "@/lib/audit";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { buildImportPreview, importTemporaryPassword, normalizeForEmail } from "@/lib/admin/import-preview";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireOperationalSchoolContext } from "@/lib/schools/context";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ParentStudentInsert = Database["public"]["Tables"]["parent_students"]["Insert"];
type SchoolMembershipInsert = Database["public"]["Tables"]["school_memberships"]["Insert"];

type ImportResult = {
  importedStudents: number;
  createdFamilies: number;
  linkedRelations: number;
  errors: string[];
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
  const schoolContext = await requireOperationalSchoolContext(actor);
  const courseId = String(formData.get("course_id") ?? "").trim();
  const rawList = String(formData.get("raw_list") ?? "").trim();

  if (!courseId || !rawList) {
    redirect(withToast("/dashboard/admin/import", "error", "Faltan datos para importar."));
  }

  let result: ImportResult;

  try {
    result = await runImport({
      actorId: actor.id,
      actorRole: actor.role,
      schoolId: schoolContext.schoolId,
      courseId,
      rawList
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar la importacion.";
    redirect(withToast(buildImportHref({ courseId, rawList, preview: true }), "error", message));
  }

  revalidatePath("/dashboard/admin/import");
  revalidatePath("/dashboard/admin/students");
  revalidatePath("/dashboard/admin/families");
  revalidatePath("/dashboard/family");
  redirect(
    withToast(
      buildImportHref({
        result: {
          importedStudents: result.importedStudents,
          createdFamilies: result.createdFamilies,
          linkedRelations: result.linkedRelations,
          errors: result.errors.length
        }
      }),
      "success",
      "Importacion completada correctamente."
    )
  );
}

async function runImport({
  actorId,
  actorRole,
  schoolId,
  courseId,
  rawList
}: {
  actorId: string;
  actorRole: string;
  schoolId: string;
  courseId: string;
  rawList: string;
}): Promise<ImportResult> {
  const { academicYear } = await getActiveAcademicYear(schoolId);

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
  const { data: course } = await supabaseAdmin
    .from("courses")
    .select("id")
    .eq("id", courseId)
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYear.id)
    .maybeSingle();
  if (!course) {
    throw new Error("El curso no pertenece al centro activo.");
  }

  const tutorTeacherId = await resolveTutorTeacherIdForCourse({ courseId, schoolId });
  let importedStudents = 0;
  let createdFamilies = 0;
  let linkedRelations = 0;
  const errors: string[] = [];

  for (const row of validRows) {
    const studentPayload: StudentInsert = {
      school_id: schoolId,
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
      familyName,
      schoolId
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
      school_id: schoolId,
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

  return { importedStudents, createdFamilies, linkedRelations, errors };
}

function buildImportHref({
  courseId,
  rawList,
  preview,
  result
}: {
  courseId?: string;
  rawList?: string;
  preview?: boolean;
  result?: {
    importedStudents: number;
    createdFamilies: number;
    linkedRelations: number;
    errors: number;
  };
}) {
  const params = new URLSearchParams();

  if (courseId) params.set("course_id", courseId);
  if (rawList) params.set("raw_list", rawList);
  if (preview) params.set("preview", "1");

  if (result) {
    params.set("imported", "1");
    params.set("students", String(result.importedStudents));
    params.set("families", String(result.createdFamilies));
    params.set("relations", String(result.linkedRelations));
    params.set("errors", String(result.errors));
  }

  const query = params.toString();
  return query ? "/dashboard/admin/import?" + query : "/dashboard/admin/import";
}

async function createFamilyUserWithAvailableEmail({
  baseEmail,
  familyName,
  schoolId
}: {
  baseEmail: string;
  familyName: string;
  schoolId: string;
}) {
  const supabaseAdmin = createAdminClient();
  const [localPart, domain] = baseEmail.split("@");
  if (!localPart || !domain) {
    throw new Error("No se pudo resolver el dominio familiar del centro activo.");
  }

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

    const membershipPayload: SchoolMembershipInsert = {
      school_id: schoolId,
      user_id: familyId,
      role: "family",
      active: true
    };
    const { error: membershipError } = await supabaseAdmin
      .from("school_memberships")
      .insert(membershipPayload as never);
    if (membershipError) {
      await supabaseAdmin.auth.admin.deleteUser(familyId);
      throw new Error("No se pudo vincular la familia con el centro activo.");
    }

    return { familyId, familyEmail };
  }

  const suffix = normalizeForEmail(String(Date.now()));
  throw new Error(`No se pudo generar un email disponible para ${localPart}.${suffix}@${domain}.`);
}

async function resolveTutorTeacherIdForCourse({
  courseId,
  schoolId
}: {
  courseId: string;
  schoolId: string;
}) {
  const supabaseAdmin = createAdminClient();
  const { data } = await supabaseAdmin
    .from("teacher_assignments")
    .select("teacher_id")
    .eq("school_id", schoolId)
    .eq("course_id", courseId)
    .limit(1)
    .maybeSingle<{ teacher_id: string }>();

  if (!data?.teacher_id) {
    throw new Error("El curso no tiene un tutor asignado en el centro activo.");
  }

  return data.teacher_id;
}

type DeleteImportResult = {
  deletedStudents: number;
  deletedFamilies: number;
  deletedRelations: number;
  preservedFamilies: number;
};

export async function loadAdminImportCleanup(formData: FormData) {
  await requireRole("superadmin");
  const courseId = String(formData.get("cleanup_course_id") ?? "").trim();

  if (!courseId) {
    redirect(withToast("/dashboard/admin/import?tab=cleanup", "error", "Selecciona un curso para cargar alumnos."));
  }

  redirect(`/dashboard/admin/import?tab=cleanup&cleanup_course_id=${encodeURIComponent(courseId)}&cleanup=1`);
}

export async function deleteImportedStudent(formData: FormData) {
  const actor = await requireRole("superadmin");
  const schoolContext = await requireOperationalSchoolContext(actor);
  const studentId = String(formData.get("student_id") ?? "").trim();
  const courseId = String(formData.get("cleanup_course_id") ?? "").trim();

  if (!studentId || !courseId) {
    redirect(withToast(buildCleanupHref({ courseId }), "error", "Faltan datos para borrar el alumno."));
  }

  try {
    const result = await deleteStudentWithFamilies({
      actorId: actor.id,
      actorRole: actor.role,
      schoolId: schoolContext.schoolId,
      studentId
    });
    revalidateImportCleanup();
    redirect(withToast(buildCleanupHref({ courseId, result }), result.preservedFamilies > 0 ? "warning" : "success", result.preservedFamilies > 0 ? "Datos eliminados. Se mantuvieron familias con otros hijos vinculados." : "Datos eliminados correctamente."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo borrar el alumno.";
    redirect(withToast(buildCleanupHref({ courseId }), "error", message));
  }
}

export async function deleteImportedCourse(formData: FormData) {
  const actor = await requireRole("superadmin");
  const schoolContext = await requireOperationalSchoolContext(actor);
  const courseId = String(formData.get("cleanup_course_id") ?? "").trim();

  if (!courseId) {
    redirect(withToast("/dashboard/admin/import?tab=cleanup", "error", "Selecciona un curso para borrar datos."));
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("school_id", schoolContext.schoolId)
      .eq("course_id", courseId)
      .returns<{ id: string }[]>();

    if (error) {
      throw new Error(error.message);
    }

    const total: DeleteImportResult = { deletedStudents: 0, deletedFamilies: 0, deletedRelations: 0, preservedFamilies: 0 };

    for (const student of students ?? []) {
      const result = await deleteStudentWithFamilies({
        actorId: actor.id,
        actorRole: actor.role,
        schoolId: schoolContext.schoolId,
        studentId: student.id
      });
      total.deletedStudents += result.deletedStudents;
      total.deletedFamilies += result.deletedFamilies;
      total.deletedRelations += result.deletedRelations;
      total.preservedFamilies += result.preservedFamilies;
    }

    await logAuditAction({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "bulk_course_deleted",
      module: "admin_import_cleanup",
      entityType: "course",
      entityId: courseId,
      afterData: total
    });

    revalidateImportCleanup();
    redirect(withToast(buildCleanupHref({ courseId, result: total }), total.preservedFamilies > 0 ? "warning" : "success", total.preservedFamilies > 0 ? "Datos eliminados. Se mantuvieron familias con otros hijos vinculados." : "Datos eliminados correctamente."));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo borrar el curso.";
    redirect(withToast(buildCleanupHref({ courseId }), "error", message));
  }
}

async function deleteStudentWithFamilies({
  actorId,
  actorRole,
  schoolId,
  studentId
}: {
  actorId: string;
  actorRole: string;
  schoolId: string;
  studentId: string;
}): Promise<DeleteImportResult> {
  const supabaseAdmin = createAdminClient();
  const { data: student, error: studentError } = await supabaseAdmin
    .from("students")
    .select("id,name,last_name,course_id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .maybeSingle<{ id: string; name: string; last_name: string; course_id: string }>();

  if (studentError) {
    throw new Error(studentError.message);
  }

  if (!student) {
    throw new Error("No se encontro el alumno seleccionado.");
  }

  const { data: relations, error: relationsError } = await supabaseAdmin
    .from("parent_students")
    .select("parent_id,student_id")
    .eq("school_id", schoolId)
    .eq("student_id", studentId)
    .returns<{ parent_id: string; student_id: string }[]>();

  if (relationsError) {
    throw new Error(relationsError.message);
  }

  const result: DeleteImportResult = { deletedStudents: 0, deletedFamilies: 0, deletedRelations: 0, preservedFamilies: 0 };
  const parentIds = Array.from(new Set((relations ?? []).map((relation) => relation.parent_id)));

  if (parentIds.length > 0) {
    const { error: relationDeleteError } = await supabaseAdmin
      .from("parent_students")
      .delete()
      .eq("school_id", schoolId)
      .eq("student_id", studentId);

    if (relationDeleteError) {
      throw new Error(relationDeleteError.message);
    }

    result.deletedRelations += relations?.length ?? 0;
    await logAuditAction({
      actorUserId: actorId,
      actorRole,
      action: "parent_student_deleted",
      module: "admin_import_cleanup",
      entityType: "student",
      entityId: studentId,
      beforeData: relations ?? [],
      afterData: { deleted: true }
    });
  }

  for (const parentId of parentIds) {
    const { count, error: countError } = await supabaseAdmin
      .from("parent_students")
      .select("student_id", { count: "exact", head: true })
      .eq("parent_id", parentId);

    if (countError) {
      throw new Error(countError.message);
    }

    if ((count ?? 0) > 0) {
      result.preservedFamilies += 1;
      continue;
    }

    const { count: otherMemberships, error: membershipCountError } = await supabaseAdmin
      .from("school_memberships")
      .select("id", { count: "exact", head: true })
      .eq("user_id", parentId)
      .neq("school_id", schoolId);
    if (membershipCountError) {
      throw new Error(membershipCountError.message);
    }
    if ((otherMemberships ?? 0) > 0) {
      result.preservedFamilies += 1;
      continue;
    }

    const { data: beforeFamily } = await supabaseAdmin
      .from("profiles")
      .select("id,email,full_name,role,active")
      .eq("id", parentId)
      .maybeSingle();

    const { error: profileDeleteError } = await supabaseAdmin.from("profiles").delete().eq("id", parentId);

    if (profileDeleteError) {
      throw new Error(profileDeleteError.message);
    }

    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(parentId);

    if (authDeleteError) {
      throw new Error("Se borro el perfil familiar, pero no se pudo borrar el acceso Auth.");
    }

    result.deletedFamilies += 1;
    await logAuditAction({
      actorUserId: actorId,
      actorRole,
      action: "family_deleted",
      module: "admin_import_cleanup",
      entityType: "profile",
      entityId: parentId,
      beforeData: beforeFamily ?? null,
      afterData: { deleted: true }
    });
  }

  const { error: studentDeleteError } = await supabaseAdmin
    .from("students")
    .delete()
    .eq("school_id", schoolId)
    .eq("id", studentId);

  if (studentDeleteError) {
    throw new Error(studentDeleteError.message);
  }

  result.deletedStudents += 1;
  await logAuditAction({
    actorUserId: actorId,
    actorRole,
    action: "student_deleted",
    module: "admin_import_cleanup",
    entityType: "student",
    entityId: studentId,
    beforeData: student,
    afterData: { deleted: true }
  });

  return result;
}

function buildCleanupHref({ courseId, result }: { courseId?: string; result?: DeleteImportResult }) {
  const params = new URLSearchParams({ tab: "cleanup" });

  if (courseId) {
    params.set("cleanup_course_id", courseId);
    params.set("cleanup", "1");
  }

  if (result) {
    params.set("deleted", "1");
    params.set("students", String(result.deletedStudents));
    params.set("families", String(result.deletedFamilies));
    params.set("relations", String(result.deletedRelations));
    params.set("preserved", String(result.preservedFamilies));
  }

  return `/dashboard/admin/import?${params.toString()}`;
}

function revalidateImportCleanup() {
  revalidatePath("/dashboard/admin/import");
  revalidatePath("/dashboard/admin/students");
  revalidatePath("/dashboard/admin/families");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/maintenance");
  revalidatePath("/dashboard/family");
}

export type DeleteImportActionResponse = {
  success: boolean;
  message: string;
  result?: DeleteImportResult;
};

export async function deleteImportedStudentWithResult({ studentId }: { studentId: string }): Promise<DeleteImportActionResponse> {
  const actor = await requireRole("superadmin");
  const schoolContext = await requireOperationalSchoolContext(actor);

  if (!studentId) {
    return { success: false, message: "Faltan datos para borrar el alumno." };
  }

  try {
    const result = await deleteStudentWithFamilies({
      actorId: actor.id,
      actorRole: actor.role,
      schoolId: schoolContext.schoolId,
      studentId
    });
    revalidateImportCleanup();
    return {
      success: true,
      message: result.preservedFamilies > 0 ? "Alumno eliminado. Se mantuvieron familias con otros hijos vinculados." : "Alumno eliminado correctamente.",
      result
    };
  } catch {
    return { success: false, message: "No se pudo eliminar el alumno. Intentalo de nuevo." };
  }
}

export async function deleteImportedCourseWithResult({ courseId }: { courseId: string }): Promise<DeleteImportActionResponse> {
  const actor = await requireRole("superadmin");
  const schoolContext = await requireOperationalSchoolContext(actor);

  if (!courseId) {
    return { success: false, message: "Selecciona un curso para borrar datos." };
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data: students, error } = await supabaseAdmin
      .from("students")
      .select("id")
      .eq("school_id", schoolContext.schoolId)
      .eq("course_id", courseId)
      .returns<{ id: string }[]>();

    if (error) {
      return { success: false, message: "No se pudieron cargar los alumnos del curso." };
    }

    const total: DeleteImportResult = { deletedStudents: 0, deletedFamilies: 0, deletedRelations: 0, preservedFamilies: 0 };

    for (const student of students ?? []) {
      const result = await deleteStudentWithFamilies({
        actorId: actor.id,
        actorRole: actor.role,
        schoolId: schoolContext.schoolId,
        studentId: student.id
      });
      total.deletedStudents += result.deletedStudents;
      total.deletedFamilies += result.deletedFamilies;
      total.deletedRelations += result.deletedRelations;
      total.preservedFamilies += result.preservedFamilies;
    }

    await logAuditAction({
      actorUserId: actor.id,
      actorRole: actor.role,
      action: "bulk_course_deleted",
      module: "admin_import_cleanup",
      entityType: "course",
      entityId: courseId,
      afterData: total
    });

    revalidateImportCleanup();
    return {
      success: true,
      message: total.preservedFamilies > 0 ? "Datos eliminados. Se mantuvieron familias con otros hijos vinculados." : "Datos eliminados correctamente.",
      result: total
    };
  } catch {
    return { success: false, message: "No se pudo eliminar el curso. Intentalo de nuevo." };
  }
}

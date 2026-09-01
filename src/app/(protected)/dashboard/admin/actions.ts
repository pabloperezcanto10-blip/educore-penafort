"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth/session";
import { isRole, type Role } from "@/lib/auth/roles";
import { logAuditAction } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { requireOperationalSchoolContext } from "@/lib/schools/context";
import { withToast } from "@/lib/toast";
import type { Database } from "@/lib/database.types";

type StudentInsert = Database["public"]["Tables"]["students"]["Insert"];
type StudentUpdate = Database["public"]["Tables"]["students"]["Update"];
type CourseInsert = Database["public"]["Tables"]["courses"]["Insert"];
type CourseUpdate = Database["public"]["Tables"]["courses"]["Update"];
type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
type ParentStudentInsert = Database["public"]["Tables"]["parent_students"]["Insert"];
type SubjectInsert = Database["public"]["Tables"]["subjects"]["Insert"];
type SubjectUpdate = Database["public"]["Tables"]["subjects"]["Update"];
type CourseSubjectInsert = Database["public"]["Tables"]["course_subjects"]["Insert"];
type TeacherAssignmentInsert = Database["public"]["Tables"]["teacher_assignments"]["Insert"];
type AcademicYearInsert = Database["public"]["Tables"]["academic_years"]["Insert"];
type SchoolMembershipInsert = Database["public"]["Tables"]["school_memberships"]["Insert"];

const defaultTemporaryPassword = "Penafort2026!";

function requiredString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function optionalString(formData: FormData, key: string) {
  const value = requiredString(formData, key);
  return value.length > 0 ? value : null;
}

export async function createAdminStudent(formData: FormData) {
  await requireRole("superadmin");

  const name = requiredString(formData, "name");
  const lastName = requiredString(formData, "last_name");
  const birthDate = optionalString(formData, "birth_date");
  const courseId = requiredString(formData, "course_id");
  const tutorTeacherId = requiredString(formData, "tutor_teacher_id");

  if (!name || !lastName || !courseId || !tutorTeacherId) {
    return;
  }

  const supabase = await createClient();
  const academicYearId = await requireActiveAcademicYearId();
  const schoolId = await requireAdminSchoolId();
  const payload: StudentInsert = {
    school_id: schoolId,
    name,
    last_name: lastName,
    birth_date: birthDate,
    course_id: courseId,
    tutor_teacher_id: tutorTeacherId,
    active: true,
    academic_year_id: academicYearId
  };

  await supabase.from("students").insert(payload as never);

  revalidatePath("/dashboard/admin/students");
  redirect(withToast("/dashboard/admin/create?type=student", "success", "Alumno creado correctamente."));
}

export async function updateAdminStudent(formData: FormData) {
  await requireRole("superadmin");

  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");
  const lastName = requiredString(formData, "last_name");
  const birthDate = optionalString(formData, "birth_date");
  const courseId = requiredString(formData, "course_id");
  const tutorTeacherId = requiredString(formData, "tutor_teacher_id");

  if (!id || !name || !lastName || !courseId || !tutorTeacherId) {
    return;
  }

  const supabase = await createClient();
  const payload: StudentUpdate = {
    name,
    last_name: lastName,
    birth_date: birthDate,
    course_id: courseId,
    tutor_teacher_id: tutorTeacherId
  };

  await supabase
    .from("students")
    .update(payload as never)
    .eq("id", id)
    .eq("school_id", await requireAdminSchoolId());

  revalidatePath("/dashboard/admin/students");
  redirect(withToast("/dashboard/admin/students", "success", "Alumno actualizado correctamente."));
}

export async function toggleAdminStudentActive(formData: FormData) {
  await requireRole("superadmin");

  const id = requiredString(formData, "id");
  const active = requiredString(formData, "active") === "true";

  if (!id) {
    return;
  }

  const supabase = await createClient();
  const payload: StudentUpdate = { active: !active };
  await supabase
    .from("students")
    .update(payload as never)
    .eq("id", id)
    .eq("school_id", await requireAdminSchoolId());

  revalidatePath("/dashboard/admin/students");
  redirect(withToast("/dashboard/admin/students", "success", active ? "Alumno desactivado correctamente." : "Alumno reactivado correctamente."));
}

export async function updateAdminUserRole(formData: FormData) {
  const currentProfile = await requireRole("superadmin");
  const schoolId = await requireAdminSchoolId();

  const id = requiredString(formData, "id");
  const requestedRole = requiredString(formData, "role");
  const role: Role | null = isRole(requestedRole) ? requestedRole : null;

  if (!id || !role) {
    return;
  }

  if (id === currentProfile.id && role !== "superadmin") {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("school_memberships")
    .update({ role } as never)
    .eq("school_id", schoolId)
    .eq("user_id", id);

  revalidatePath("/dashboard/admin/users");
  redirect(withToast("/dashboard/admin/users", "success", "Rol actualizado correctamente."));
}

export async function toggleAdminUserActive(formData: FormData) {
  const currentProfile = await requireRole("superadmin");
  const schoolId = await requireAdminSchoolId();

  const id = requiredString(formData, "id");
  const active = requiredString(formData, "active") === "true";
  const role = requiredString(formData, "role");

  if (!id || (role !== "family" && role !== "tutor")) {
    return;
  }

  if (id === currentProfile.id) {
    return;
  }

  const supabase = await createClient();
  const { data: beforeMembership } = await supabase
    .from("school_memberships")
    .select("id,user_id,school_id,role,active")
    .eq("school_id", schoolId)
    .eq("user_id", id)
    .maybeSingle();
  await supabase
    .from("school_memberships")
    .update({ active: !active } as never)
    .eq("school_id", schoolId)
    .eq("user_id", id);
  await logAuditAction({
    actorUserId: currentProfile.id,
    actorRole: currentProfile.role,
    action: active ? "user_deactivated" : "user_reactivated",
    module: "admin_users",
    entityType: "profile",
    entityId: id,
    beforeData: beforeMembership ?? null,
    afterData: {
      active: !active,
      school_id: schoolId
    }
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/maintenance");
  revalidatePath("/dashboard/admin/create");
  redirect(withToast("/dashboard/admin/users", "success", active ? "Usuario desactivado correctamente." : "Usuario reactivado correctamente."));
}

export async function deleteAdminUser(formData: FormData) {
  const currentProfile = await requireRole("superadmin");
  const schoolId = await requireAdminSchoolId();

  const id = requiredString(formData, "id");
  const role = requiredString(formData, "role");

  if (!id || (role !== "family" && role !== "tutor")) {
    redirect(withToast("/dashboard/admin/users", "warning", "Solo se pueden eliminar familias y profesores desde este panel."));
  }

  if (id === currentProfile.id) {
    redirect(withToast("/dashboard/admin/users", "error", "No puedes eliminar tu propio usuario."));
  }

  const supabaseAdmin = createAdminClient();
  const { data: memberships, error: membershipsError } = await supabaseAdmin
    .from("school_memberships")
    .select("id,school_id,user_id,role,active")
    .eq("user_id", id)
    .returns<Array<{ id: string; school_id: string; user_id: string; role: Role; active: boolean }>>();

  const selectedMembership = (memberships ?? []).find(
    (membership) => membership.school_id === schoolId
  );
  if (membershipsError || !selectedMembership) {
    redirect(withToast("/dashboard/admin/users", "error", "El usuario no pertenece al centro activo."));
  }

  if (
    selectedMembership.role !== "family" &&
    selectedMembership.role !== "tutor"
  ) {
    redirect(withToast("/dashboard/admin/users", "warning", "Solo se pueden eliminar familias y profesores desde este panel."));
  }

  if ((memberships ?? []).some((membership) => membership.school_id !== schoolId)) {
    redirect(
      withToast(
        "/dashboard/admin/users",
        "warning",
        "El usuario pertenece a otros centros y no puede eliminarse desde este contexto."
      )
    );
  }

  const { data: beforeProfile, error: profileReadError } = await supabaseAdmin
    .from("profiles")
    .select("id,email,full_name,role,active")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      email: string | null;
      full_name: string | null;
      role: Role;
      active: boolean;
    }>();

  if (profileReadError) {
    redirect(withToast("/dashboard/admin/users", "error", "No se pudo localizar el usuario."));
  }

  if (!beforeProfile) {
    redirect(withToast("/dashboard/admin/users", "error", "No se pudo localizar el usuario."));
  }

  if (selectedMembership.role === "family") {
    const { error } = await supabaseAdmin
      .from("parent_students")
      .delete()
      .eq("school_id", schoolId)
      .eq("parent_id", id);

    if (error) {
      redirect(withToast("/dashboard/admin/users", "error", "No se pudieron eliminar las relaciones familiares."));
    }
  }

  if (selectedMembership.role === "tutor") {
    const { error } = await supabaseAdmin
      .from("teacher_assignments")
      .delete()
      .eq("school_id", schoolId)
      .eq("teacher_id", id);

    if (error) {
      redirect(withToast("/dashboard/admin/users", "error", "No se pudieron eliminar las asignaciones docentes."));
    }
  }

  const { error: profileDeleteError } = await supabaseAdmin.from("profiles").delete().eq("id", id);

  if (profileDeleteError) {
    redirect(withToast("/dashboard/admin/users", "error", "No se pudo eliminar el perfil del usuario."));
  }

  const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

  if (authDeleteError) {
    redirect(withToast("/dashboard/admin/users", "error", "Se elimino el perfil, pero no se pudo eliminar el acceso Auth."));
  }

  await logAuditAction({
    actorUserId: currentProfile.id,
    actorRole: currentProfile.role,
    action: "user_deleted",
    module: "admin_users",
    entityType: "profile",
    entityId: id,
    beforeData: beforeProfile,
    afterData: {
      deleted: true
    }
  });

  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/maintenance");
  revalidatePath("/dashboard/admin/create");
  revalidatePath("/dashboard/admin/families");
  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/admin/students");
  redirect(withToast("/dashboard/admin/users", "success", "Usuario eliminado completamente."));
}

export async function createAdminCourse(formData: FormData) {
  await requireRole("superadmin");

  const name = requiredString(formData, "name");

  if (!name) {
    return;
  }

  const supabase = await createClient();
  const academicYearId = await requireActiveAcademicYearId();
  const payload: CourseInsert = {
    school_id: await requireAdminSchoolId(),
    name,
    academic_year_id: academicYearId
  };
  await supabase.from("courses").insert(payload as never);

  revalidatePath("/dashboard/admin/courses");
  redirect(withToast("/dashboard/admin/courses", "success", "Curso creado correctamente."));
}

export async function updateAdminCourse(formData: FormData) {
  await requireRole("superadmin");

  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");

  if (!id || !name) {
    return;
  }

  const supabase = await createClient();
  const payload: CourseUpdate = { name };
  await supabase
    .from("courses")
    .update(payload as never)
    .eq("id", id)
    .eq("school_id", await requireAdminSchoolId());

  revalidatePath("/dashboard/admin/courses");
  redirect(withToast("/dashboard/admin/courses", "success", "Curso actualizado correctamente."));
}

export async function linkAdminFamilyStudent(formData: FormData) {
  await requireRole("superadmin");

  const parentId = requiredString(formData, "parent_id");
  const studentId = requiredString(formData, "student_id");

  if (!parentId || !studentId) {
    return;
  }

  const supabase = await createClient();
  const { data: existingRelation } = await supabase
    .from("parent_students")
    .select("parent_id,student_id")
    .eq("parent_id", parentId)
    .eq("student_id", studentId)
    .eq("school_id", await requireAdminSchoolId())
    .maybeSingle();

  if (!existingRelation) {
    const payload: ParentStudentInsert = {
      school_id: await requireAdminSchoolId(),
      parent_id: parentId,
      student_id: studentId
    };

    await supabase.from("parent_students").insert(payload as never);
  }

  revalidatePath("/dashboard/admin/families");
  redirect(withToast("/dashboard/admin/families", "success", "Familia vinculada correctamente."));
}

export async function unlinkAdminFamilyStudent(formData: FormData) {
  await requireRole("superadmin");

  const parentId = requiredString(formData, "parent_id");
  const studentId = requiredString(formData, "student_id");

  if (!parentId || !studentId) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("parent_students")
    .delete()
    .eq("school_id", await requireAdminSchoolId())
    .eq("parent_id", parentId)
    .eq("student_id", studentId);

  revalidatePath("/dashboard/admin/families");
  redirect(withToast("/dashboard/admin/families", "success", "Familia desvinculada correctamente."));
}

export async function createAdminSubject(formData: FormData) {
  await requireRole("superadmin");

  const name = requiredString(formData, "name");

  if (!name) {
    return;
  }

  const supabase = await createClient();
  const payload: SubjectInsert = {
    school_id: await requireAdminSchoolId(),
    name
  };
  await supabase.from("subjects").insert(payload as never);

  revalidatePath("/dashboard/admin/subjects");
  redirect(withToast("/dashboard/admin/subjects", "success", "Materia creada correctamente."));
}

export async function updateAdminSubject(formData: FormData) {
  await requireRole("superadmin");

  const id = requiredString(formData, "id");
  const name = requiredString(formData, "name");

  if (!id || !name) {
    return;
  }

  const supabase = await createClient();
  const payload: SubjectUpdate = { name };
  await supabase
    .from("subjects")
    .update(payload as never)
    .eq("id", id)
    .eq("school_id", await requireAdminSchoolId());

  revalidatePath("/dashboard/admin/subjects");
  redirect(withToast("/dashboard/admin/subjects", "success", "Materia actualizada correctamente."));
}

export async function createAdminTeacherAssignment(formData: FormData) {
  await requireRole("superadmin");

  const teacherId = requiredString(formData, "teacher_id");
  const courseId = requiredString(formData, "course_id");
  const subjectId = requiredString(formData, "subject_id");

  if (!teacherId || !courseId || !subjectId) {
    return;
  }

  const supabase = await createClient();
  const academicYearId = await requireActiveAcademicYearId();
  const schoolId = await requireAdminSchoolId();
  const { data: existingAssignment, error: existingAssignmentError } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle<{ id: string }>();

  if (existingAssignmentError) {
    throw new Error("No se pudo comprobar la asignacion docente.");
  }

  await ensureCourseSubject({ courseId, subjectId });

  if (!existingAssignment) {
    const payload: TeacherAssignmentInsert = {
      school_id: schoolId,
      teacher_id: teacherId,
      course_id: courseId,
      subject_id: subjectId,
      academic_year_id: academicYearId
    };

    const { error } = await supabase.from("teacher_assignments").insert(payload as never);
    if (error) {
      throw new Error("No se pudo crear la asignacion docente.");
    }
  }

  revalidatePath("/dashboard/admin/subjects");
  redirect(withToast("/dashboard/admin/subjects", "success", "Profesor asignado correctamente."));
}

export async function createAdminTeacherAssignmentsBulk(formData: FormData) {
  await requireRole("superadmin");

  const teacherId = requiredString(formData, "teacher_id");
  const subjectIds = formData.getAll("subject_id").map((value) => String(value)).filter(Boolean);
  const courseIds = formData.getAll("course_id").map((value) => String(value)).filter(Boolean);

  if (!teacherId || subjectIds.length === 0 || courseIds.length === 0) {
    redirect(withToast("/dashboard/admin/subjects", "error", "Faltan datos para crear asignaciones."));
  }

  let created = 0;
  let existing = 0;
  let errors = 0;

  for (const subjectId of subjectIds) {
    for (const courseId of courseIds) {
      try {
        const didCreate = await ensureTeacherAssignmentWithResult({ teacherId, courseId, subjectId });
        if (didCreate) {
          created += 1;
        } else {
          existing += 1;
        }
      } catch {
        errors += 1;
      }
    }
  }

  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/admin/maintenance");
  redirect(
    withToast(
      `/dashboard/admin/subjects?assigned=1&created=${created}&existing=${existing}&errors=${errors}`,
      errors > 0 ? "warning" : "success",
      errors > 0
        ? "Algunas asignaciones no se pudieron crear. Revisa que el docente, los cursos y las materias pertenezcan al centro activo."
        : created > 0 ? "Asignaciones creadas correctamente." : "No se crearon duplicados."
    )
  );
}

export async function deleteAdminTeacherAssignment(formData: FormData) {
  await requireRole("superadmin");

  const id = requiredString(formData, "id");

  if (!id) {
    redirect(withToast("/dashboard/admin/subjects", "error", "No se pudo eliminar la asignacion."));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teacher_assignments")
    .delete()
    .eq("school_id", await requireAdminSchoolId())
    .eq("id", id);

  if (error) {
    redirect(withToast("/dashboard/admin/subjects", "error", "No se pudo eliminar la asignacion."));
  }

  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/admin/maintenance");
  redirect(withToast("/dashboard/admin/subjects", "success", "Asignacion eliminada correctamente."));
}

export async function deleteAdminTeacherAssignmentGroup(formData: FormData) {
  await requireRole("superadmin");

  const teacherId = requiredString(formData, "teacher_id");
  const subjectId = requiredString(formData, "subject_id");

  if (!teacherId || !subjectId) {
    redirect(withToast("/dashboard/admin/subjects", "error", "No se pudo eliminar el grupo de asignaciones."));
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("teacher_assignments")
    .delete()
    .eq("school_id", await requireAdminSchoolId())
    .eq("teacher_id", teacherId)
    .eq("subject_id", subjectId);

  if (error) {
    redirect(withToast("/dashboard/admin/subjects", "error", "No se pudo eliminar el grupo de asignaciones."));
  }

  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/admin/maintenance");
  redirect(withToast("/dashboard/admin/subjects", "success", "Grupo de asignaciones eliminado correctamente."));
}

export async function createAdminFamilyQuick(formData: FormData) {
  const actor = await requireRole("superadmin");

  const fullName = requiredString(formData, "full_name");
  const email = requiredString(formData, "email").toLowerCase();
  const phone = optionalString(formData, "phone");
  const studentId = optionalString(formData, "student_id");
  const temporaryPassword = optionalString(formData, "temporary_password") ?? defaultTemporaryPassword;

  if (!fullName || !email) {
    return;
  }

  const { userId } = await createAdminAuthUser({
    fullName,
    email,
    role: "family",
    password: temporaryPassword,
    metadata: phone ? { phone } : undefined
  });
  await logAuditAction({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: "user_created",
    module: "admin_users",
    entityType: "profile",
    entityId: userId,
    afterData: {
      email,
      full_name: fullName,
      role: "family",
      must_change_password: true
    }
  });

  if (studentId) {
    const supabase = await createClient();
    const { data: existingRelation } = await supabase
      .from("parent_students")
      .select("parent_id,student_id")
      .eq("parent_id", userId)
      .eq("student_id", studentId)
      .eq("school_id", await requireAdminSchoolId())
      .maybeSingle();

    if (!existingRelation) {
      const payload: ParentStudentInsert = {
        school_id: await requireAdminSchoolId(),
        parent_id: userId,
        student_id: studentId
      };

      await supabase.from("parent_students").insert(payload as never);
    }
  }

  revalidateAdminCreatePaths();
  redirect(withToast(`/dashboard/admin/create?type=family&created=family&email=${encodeURIComponent(email)}`, "success", "Usuario creado correctamente."));
}

export async function createAdminTeacherQuick(formData: FormData) {
  const actor = await requireRole("superadmin");

  const fullName = requiredString(formData, "full_name");
  const email = requiredString(formData, "email").toLowerCase();
  const requestedRole = requiredString(formData, "role");
  const courseIds = formData.getAll("course_id").map((value) => String(value)).filter(Boolean);
  const subjectIds = formData.getAll("subject_id").map((value) => String(value)).filter(Boolean);
  const temporaryPassword = optionalString(formData, "temporary_password") ?? defaultTemporaryPassword;
  const role: Role = requestedRole === "director" || requestedRole === "superadmin" ? requestedRole : "tutor";

  if (!fullName || !email) {
    return;
  }

  let userId: string;
  let schoolId: string;
  try {
    ({ userId, schoolId } = await createAdminAuthUser({
      fullName,
      email,
      role,
      password: temporaryPassword
    }));
  } catch {
    redirect(withToast("/dashboard/admin/create?type=teacher", "error", "No se pudo completar el alta docente. No se ha dejado una cuenta parcial."));
  }

  let createdAssignments = 0;

  try {
    if (courseIds.length > 0 && subjectIds.length > 0) {
      for (const subjectId of subjectIds) {
        for (const courseId of courseIds) {
          const didCreate = await ensureTeacherAssignmentWithResult({
            teacherId: userId,
            courseId,
            subjectId
          });

          if (didCreate) {
            createdAssignments += 1;
          }
        }
      }
    }
  } catch {
    const cleanupComplete = await cleanupProvisionedAdminUser({ userId, schoolId });
    redirect(
      withToast(
        "/dashboard/admin/create?type=teacher",
        "error",
        cleanupComplete
          ? "No se pudieron crear las asignaciones. El alta docente se ha revertido por completo."
          : "No se pudo completar el alta docente y la compensacion requiere revision administrativa."
      )
    );
  }

  await logAuditAction({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: "user_created",
    module: "admin_users",
    entityType: "profile",
    entityId: userId,
    afterData: {
      email,
      full_name: fullName,
      role,
      school_id: schoolId,
      must_change_password: role !== "superadmin"
    }
  });

  revalidateAdminCreatePaths();
  redirect(
    withToast(
      `/dashboard/admin/create?type=teacher&created=teacher&email=${encodeURIComponent(email)}&assignments=${createdAssignments}`,
      "success",
      `Profesor creado correctamente. Se han creado ${createdAssignments} asignaciones.`
    )
  );
}

export async function createAdminSubjectQuick(formData: FormData) {
  await requireRole("superadmin");

  const name = requiredString(formData, "name");
  const courseId = optionalString(formData, "course_id");
  const teacherId = optionalString(formData, "teacher_id");

  if (!name) {
    return;
  }

  const supabase = await createClient();
  const payload: SubjectInsert = {
    school_id: await requireAdminSchoolId(),
    name
  };
  const { data: subject } = await supabase
    .from("subjects")
    .insert(payload as never)
    .select("id")
    .single<{ id: string }>();

  if (subject?.id && courseId) {
    await ensureCourseSubject({
      courseId,
      subjectId: subject.id
    });
  }

  if (subject?.id && courseId && teacherId) {
    await ensureTeacherAssignment({
      teacherId,
      courseId,
      subjectId: subject.id
    });
  }

  revalidateAdminCreatePaths();
  redirect(withToast("/dashboard/admin/create?type=subject", "success", "Materia creada correctamente."));
}

export async function createAdminCourseQuick(formData: FormData) {
  await requireRole("superadmin");

  const name = requiredString(formData, "name");

  if (!name) {
    return;
  }

  const supabase = await createClient();
  const academicYearId = await requireActiveAcademicYearId();
  const schoolId = await requireAdminSchoolId();
  const payload: CourseInsert = {
    school_id: await requireAdminSchoolId(),
    name,
    academic_year_id: academicYearId
  };
  await supabase.from("courses").insert(payload as never);

  revalidateAdminCreatePaths();
  redirect(withToast("/dashboard/admin/create?type=course", "success", "Curso creado correctamente."));
}

async function createAdminAuthUser({
  fullName,
  email,
  role,
  password,
  metadata
}: {
  fullName: string;
  email: string;
  role: Role;
  password: string;
  metadata?: Record<string, string>;
}) {
  const supabaseAdmin = createAdminClient();
  const schoolId = await requireAdminSchoolId();
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      ...metadata
    }
  });

  if (error) {
    throw new Error(`No se pudo crear el usuario: ${error.message}`);
  }

  const userId = data.user.id;
  const profile: ProfileInsert = {
    id: userId,
    email,
    full_name: fullName,
    role,
    active: true,
    must_change_password: role !== "superadmin"
  };

  const { error: profileError } = await supabaseAdmin
    .from("profiles")
    .upsert(profile as never, { onConflict: "id" });

  if (profileError) {
    const cleanupComplete = await cleanupProvisionedAdminUser({ userId, schoolId });
    throw new Error(cleanupComplete
      ? "No se pudo crear el perfil del usuario."
      : "No se pudo crear el perfil y la compensacion requiere revision administrativa.");
  }

  const membership: SchoolMembershipInsert = {
    school_id: schoolId,
    user_id: userId,
    role,
    active: true
  };
  const { error: membershipError } = await supabaseAdmin
    .from("school_memberships")
    .insert(membership as never);

  if (membershipError) {
    const cleanupComplete = await cleanupProvisionedAdminUser({ userId, schoolId });
    throw new Error(cleanupComplete
      ? "No se pudo asignar el usuario al centro activo."
      : "No se pudo asignar el usuario y la compensacion requiere revision administrativa.");
  }

  return { userId, schoolId };
}

async function cleanupProvisionedAdminUser({
  userId,
  schoolId
}: {
  userId: string;
  schoolId: string;
}) {
  const supabaseAdmin = createAdminClient();
  const cleanupErrors: unknown[] = [];
  const cleanupQueries = [
    supabaseAdmin
      .from("teacher_assignments")
      .delete()
      .eq("school_id", schoolId)
      .eq("teacher_id", userId),
    supabaseAdmin
      .from("school_memberships")
      .delete()
      .eq("school_id", schoolId)
      .eq("user_id", userId),
    supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId)
  ];

  for (const query of cleanupQueries) {
    const { error } = await query;
    if (error) cleanupErrors.push(error);
  }

  const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
  if (authError) cleanupErrors.push(authError);

  return cleanupErrors.length === 0;
}

async function ensureTeacherAssignment({
  teacherId,
  courseId,
  subjectId
}: {
  teacherId: string;
  courseId: string;
  subjectId: string;
}) {
  const supabase = await createClient();
  const academicYearId = await requireActiveAcademicYearId();
  const schoolId = await requireAdminSchoolId();
  const { data: existingAssignment, error: existingAssignmentError } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle<{ id: string }>();

  if (existingAssignmentError) {
    throw new Error("No se pudo comprobar la asignacion docente.");
  }

  await ensureCourseSubject({ courseId, subjectId });

  if (!existingAssignment) {
    const payload: TeacherAssignmentInsert = {
      school_id: schoolId,
      teacher_id: teacherId,
      course_id: courseId,
      subject_id: subjectId,
      academic_year_id: academicYearId
    };

    const { error } = await supabase.from("teacher_assignments").insert(payload as never);
    if (error) {
      throw new Error("No se pudo crear la asignacion docente.");
    }
  }
}

async function ensureTeacherAssignmentWithResult({
  teacherId,
  courseId,
  subjectId
}: {
  teacherId: string;
  courseId: string;
  subjectId: string;
}) {
  const supabase = await createClient();
  const academicYearId = await requireActiveAcademicYearId();
  const schoolId = await requireAdminSchoolId();
  const { data: existingAssignment, error: existingAssignmentError } = await supabase
    .from("teacher_assignments")
    .select("id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle<{ id: string }>();

  if (existingAssignmentError) {
    throw new Error("No se pudo comprobar la asignacion docente.");
  }

  await ensureCourseSubject({ courseId, subjectId });

  if (existingAssignment) {
    return false;
  }

  const payload: TeacherAssignmentInsert = {
    school_id: schoolId,
    teacher_id: teacherId,
    course_id: courseId,
    subject_id: subjectId,
    academic_year_id: academicYearId
  };

  const { error } = await supabase.from("teacher_assignments").insert(payload as never);
  if (error) {
    throw new Error("No se pudo crear la asignacion docente.");
  }

  return true;
}

async function ensureCourseSubject({
  courseId,
  subjectId
}: {
  courseId: string;
  subjectId: string;
}) {
  const supabase = await createClient();
  const academicYearId = await requireActiveAcademicYearId();
  const { data: existingCourseSubject, error: existingCourseSubjectError } = await supabase
    .from("course_subjects")
    .select("id")
    .eq("school_id", await requireAdminSchoolId())
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle<{ id: string }>();

  if (existingCourseSubjectError) {
    throw new Error("No se pudo comprobar la relacion entre curso y materia.");
  }

  if (!existingCourseSubject) {
    const payload: CourseSubjectInsert = {
      school_id: await requireAdminSchoolId(),
      course_id: courseId,
      subject_id: subjectId,
      academic_year_id: academicYearId,
      optional: false,
      track: null
    };

    const { error } = await supabase.from("course_subjects").insert(payload as never);
    if (error) {
      throw new Error("No se pudo relacionar el curso con la materia.");
    }
  }
}

export async function createAcademicYear(formData: FormData) {
  await requireRole("superadmin");

  const name = requiredString(formData, "name");
  const startDate = optionalString(formData, "start_date");
  const endDate = optionalString(formData, "end_date");

  if (!name) {
    return;
  }

  const supabase = await createClient();
  const payload: AcademicYearInsert = {
    school_id: await requireAdminSchoolId(),
    name,
    start_date: startDate,
    end_date: endDate,
    active: false
  };

  await supabase.from("academic_years").insert(payload as never);

  revalidateAcademicYearPaths();
  redirect(withToast("/dashboard/admin/academic-years", "success", "Curso escolar creado correctamente."));
}

export async function activateAcademicYear(formData: FormData) {
  await requireRole("superadmin");

  const id = requiredString(formData, "id");

  if (!id) {
    return;
  }

  const supabase = await createClient();
  await supabase
    .from("academic_years")
    .update({ active: false } as never)
    .eq("school_id", await requireAdminSchoolId())
    .neq("id", id);
  await supabase
    .from("academic_years")
    .update({ active: true } as never)
    .eq("school_id", await requireAdminSchoolId())
    .eq("id", id);

  revalidateAcademicYearPaths();
  redirect(withToast("/dashboard/admin/academic-years", "success", "Curso escolar activado correctamente."));
}

async function requireActiveAcademicYearId() {
  const { academicYear, errorMessage } = await getActiveAcademicYear(
    await requireAdminSchoolId()
  );

  if (!academicYear) {
    throw new Error(errorMessage ?? "No hay curso escolar activo.");
  }

  return academicYear.id;
}

async function requireAdminSchoolId() {
  const context = await requireOperationalSchoolContext();
  return context.schoolId;
}

function revalidateAdminCreatePaths() {
  revalidatePath("/dashboard/admin/create");
  revalidatePath("/dashboard/admin/maintenance");
  revalidatePath("/dashboard/admin/users");
  revalidatePath("/dashboard/admin/families");
  revalidatePath("/dashboard/admin/students");
  revalidatePath("/dashboard/admin/subjects");
  revalidatePath("/dashboard/admin/courses");
}

function revalidateAcademicYearPaths() {
  revalidatePath("/dashboard/admin");
  revalidatePath("/dashboard/admin/academic-years");
  revalidatePath("/dashboard/admin/create");
  revalidatePath("/dashboard/admin/maintenance");
}

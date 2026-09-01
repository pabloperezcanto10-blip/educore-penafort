import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth/session";
import type { Role } from "@/lib/auth/roles";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { getActiveCourses } from "@/lib/courses";
import { requireOperationalSchoolContext } from "@/lib/schools/context";

export type AdminProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  active: boolean;
  must_change_password: boolean;
};

export type AdminCourse = {
  id: string;
  name: string;
  academic_year_id: string | null;
};

export type AdminSubject = {
  id: string;
  name: string;
};

export type AdminTeacherAssignment = {
  id: string;
  school_id: string;
  teacher_id: string;
  course_id: string;
  subject_id: string | null;
  created_at: string;
  academic_year_id: string | null;
};

export type AdminStudent = {
  id: string;
  school_id: string;
  name: string;
  last_name: string;
  birth_date: string | null;
  course_id: string;
  tutor_teacher_id: string;
  active: boolean;
  academic_year_id: string | null;
  created_at: string;
};

export type AdminParentStudent = {
  school_id: string;
  parent_id: string;
  student_id: string;
};

export async function getAdminProfiles(): Promise<{
  profiles: AdminProfile[];
  errorMessage: string | null;
}> {
  await requireRole(["superadmin", "director"]);
  const schoolContext = await requireOperationalSchoolContext();
  const supabase = createAdminClient();
  const { data: memberships, error: membershipsError } = await supabase
    .from("school_memberships")
    .select("user_id,role,active")
    .eq("school_id", schoolContext.schoolId)
    .returns<Array<{ user_id: string; role: Role; active: boolean }>>();

  if (membershipsError) {
    return { profiles: [], errorMessage: membershipsError.message };
  }

  const userIds = [...new Set((memberships ?? []).map(({ user_id }) => user_id))];
  if (userIds.length === 0) {
    return { profiles: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id,email,full_name,role,active,must_change_password")
    .in("id", userIds)
    .order("role", { ascending: true })
    .order("full_name", { ascending: true })
    .returns<AdminProfile[]>();

  if (
    error &&
    (error.message.includes("active") ||
      error.message.includes("must_change_password"))
  ) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("profiles")
      .select("id,email,full_name,role")
      .in("id", userIds)
      .order("role", { ascending: true })
      .order("full_name", { ascending: true })
      .returns<Omit<AdminProfile, "active" | "must_change_password">[]>();

    if (fallbackError) {
      return { profiles: [], errorMessage: fallbackError.message };
    }

    const fallbackById = new Map(
      (fallbackData ?? []).map((profile) => [profile.id, profile])
    );
    return {
      profiles: (memberships ?? []).flatMap((membership) => {
        const profile = fallbackById.get(membership.user_id);
        return profile
          ? [{
              ...profile,
              role: membership.role,
              active: membership.active,
              must_change_password: false
            }]
          : [];
      }),
      errorMessage: null
    };
  }

  if (error) {
    return { profiles: [], errorMessage: error.message };
  }

  const profilesById = new Map((data ?? []).map((profile) => [profile.id, profile]));
  return {
    profiles: (memberships ?? []).flatMap((membership) => {
      const profile = profilesById.get(membership.user_id);
      return profile
        ? [
            {
              ...profile,
              role: membership.role,
              active: profile.active && membership.active
            }
          ]
        : [];
    }),
    errorMessage: null
  };
}

export async function getAdminCourses(): Promise<{
  courses: AdminCourse[];
  errorMessage: string | null;
}> {
  return getActiveCourses();
}

export async function getAdminSubjects(): Promise<{
  subjects: AdminSubject[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireOperationalSchoolContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("subjects")
    .select("id,name")
    .eq("school_id", schoolContext.schoolId)
    .order("name", { ascending: true })
    .returns<AdminSubject[]>();

  if (error) {
    return { subjects: [], errorMessage: error.message };
  }

  return { subjects: data ?? [], errorMessage: null };
}

export async function getAdminTeacherAssignments(): Promise<{
  assignments: AdminTeacherAssignment[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireOperationalSchoolContext();
  const supabase = await createClient();
  const { academicYear } = await getActiveAcademicYear(schoolContext.schoolId);
  let query = supabase
    .from("teacher_assignments")
    .select("id,school_id,teacher_id,course_id,subject_id,academic_year_id,created_at")
    .eq("school_id", schoolContext.schoolId)
    .order("created_at", { ascending: false });

  if (academicYear) {
    query = query.or(`academic_year_id.eq.${academicYear.id},academic_year_id.is.null`);
  }

  const { data, error } = await query.returns<AdminTeacherAssignment[]>();

  if (error) {
    return { assignments: [], errorMessage: error.message };
  }

  return { assignments: data ?? [], errorMessage: null };
}

export async function getAdminStudents(): Promise<{
  students: AdminStudent[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireOperationalSchoolContext();
  const supabase = await createClient();
  const { academicYear } = await getActiveAcademicYear(schoolContext.schoolId);
  let query = supabase
    .from("students")
    .select("id,school_id,name,last_name,birth_date,course_id,tutor_teacher_id,active,academic_year_id,created_at")
    .eq("school_id", schoolContext.schoolId)
    .order("last_name", { ascending: true })
    .order("name", { ascending: true });

  if (academicYear) {
    query = query.or(`academic_year_id.eq.${academicYear.id},academic_year_id.is.null`);
  }

  const { data, error } = await query.returns<AdminStudent[]>();

  if (error) {
    return { students: [], errorMessage: error.message };
  }

  return { students: data ?? [], errorMessage: null };
}

export async function getAdminFamilyRelations(): Promise<{
  relations: AdminParentStudent[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireOperationalSchoolContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("parent_students")
    .select("school_id,parent_id,student_id")
    .eq("school_id", schoolContext.schoolId)
    .returns<AdminParentStudent[]>();

  if (error) {
    return { relations: [], errorMessage: error.message };
  }

  return { relations: data ?? [], errorMessage: null };
}

export function getProfileDisplayName(profile: AdminProfile) {
  return profile.full_name || profile.email || profile.id;
}

export function getStudentDisplayName(student: Pick<AdminStudent, "name" | "last_name">) {
  return `${student.name} ${student.last_name}`;
}

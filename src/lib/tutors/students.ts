import { createClient } from "@/lib/supabase/server";
import { getActiveAcademicYear } from "@/lib/academic-years";

export type TutorStudent = {
  id: string;
  name: string;
  last_name: string;
};

export type TutorStudentWithCourse = TutorStudent & {
  course_id: string;
  courses: {
    name: string;
  } | null;
};

export type TutorStudentsResult = {
  students: TutorStudent[];
  errorMessage: string | null;
  authUserId: string | null;
};

export type TutorStudentDetail = {
  id: string;
  name: string;
  last_name: string;
  birth_date: string | null;
  course_id: string;
  active: boolean;
  courses: {
    name: string;
  } | null;
};

export type StudentIncident = {
  id: string;
  type: string;
  description: string;
  severity: "leve" | "media" | "grave";
  created_at: string;
};

export type StudentObservation = {
  id: string;
  student_id: string;
  tutor_id: string;
  type: string;
  title: string;
  content: string;
  priority: "baja" | "media" | "alta";
  created_at: string;
};

export async function getStudentsForTutor(tutorId: string): Promise<{
  students: TutorStudent[];
  errorMessage: string | null;
  authUserId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    return {
      students: [],
      errorMessage: authError.message,
      authUserId: null
    };
  }

  const effectiveTutorId = user?.id ?? tutorId;
  const { academicYear } = await getActiveAcademicYear();
  if (!academicYear) {
    return { students: [], errorMessage: "No hay curso escolar activo.", authUserId: user?.id ?? null };
  }
  const { data, error } = await supabase
    .from("students")
    .select("id,name,last_name")
    .eq("tutor_teacher_id", effectiveTutorId)
    .eq("academic_year_id", academicYear.id)
    .order("last_name", { ascending: true })
    .order("name", { ascending: true })
    .returns<TutorStudent[]>();

  if (error) {
    return {
      students: [],
      errorMessage: error.message,
      authUserId: user?.id ?? null
    };
  }

  return {
    students: data ?? [],
    errorMessage: null,
    authUserId: user?.id ?? null
  };
}

export async function getStudentsForCourseName(courseName: string): Promise<{
  students: TutorStudent[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { academicYear } = await getActiveAcademicYear();

  if (!academicYear) {
    return { students: [], errorMessage: "No hay curso escolar activo." };
  }

  const { data: course, error: courseError } = await supabase
    .from("courses")
    .select("id,name")
    .eq("name", courseName)
    .eq("academic_year_id", academicYear.id)
    .maybeSingle<{ id: string; name: string }>();

  if (courseError) {
    return { students: [], errorMessage: courseError.message };
  }

  if (!course) {
    return { students: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("students")
    .select("id,name,last_name")
    .eq("course_id", course.id)
    .eq("academic_year_id", academicYear.id)
    .eq("active", true)
    .order("last_name", { ascending: true })
    .order("name", { ascending: true })
    .returns<TutorStudent[]>();

  if (error) {
    return { students: [], errorMessage: error.message };
  }

  return { students: data ?? [], errorMessage: null };
}

export async function getStudentsWithCourseForTutor(tutorId: string): Promise<{
  students: TutorStudentWithCourse[];
  errorMessage: string | null;
  authUserId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    return {
      students: [],
      errorMessage: authError.message,
      authUserId: null
    };
  }

  const effectiveTutorId = user?.id ?? tutorId;
  const { academicYear } = await getActiveAcademicYear();
  if (!academicYear) {
    return { students: [], errorMessage: "No hay curso escolar activo.", authUserId: user?.id ?? null };
  }
  const { data, error } = await supabase
    .from("students")
    .select("id,name,last_name,course_id,courses(name)")
    .eq("tutor_teacher_id", effectiveTutorId)
    .eq("academic_year_id", academicYear.id)
    .order("last_name", { ascending: true })
    .order("name", { ascending: true })
    .returns<TutorStudentWithCourse[]>();

  if (error) {
    return {
      students: [],
      errorMessage: error.message,
      authUserId: user?.id ?? null
    };
  }

  return {
    students: data ?? [],
    errorMessage: null,
    authUserId: user?.id ?? null
  };
}

export async function getStudentForTutor(
  studentId: string,
  tutorId: string
): Promise<{
  student: TutorStudentDetail | null;
  errorMessage: string | null;
  authUserId: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    return {
      student: null,
      errorMessage: authError.message,
      authUserId: null
    };
  }

  const effectiveTutorId = user?.id ?? tutorId;
  const { academicYear } = await getActiveAcademicYear();
  if (!academicYear) {
    return { student: null, errorMessage: "No hay curso escolar activo.", authUserId: user?.id ?? null };
  }
  const { data, error } = await supabase
    .from("students")
    .select("id,name,last_name,birth_date,course_id,active,courses(name)")
    .eq("id", studentId)
    .eq("tutor_teacher_id", effectiveTutorId)
    .eq("academic_year_id", academicYear.id)
    .maybeSingle<TutorStudentDetail>();

  if (error) {
    return {
      student: null,
      errorMessage: error.message,
      authUserId: user?.id ?? null
    };
  }

  return {
    student: data,
    errorMessage: null,
    authUserId: user?.id ?? null
  };
}

export async function getIncidentsForTutorStudent(
  studentId: string,
  tutorId: string
): Promise<{
  incidents: StudentIncident[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError
  } = await supabase.auth.getUser();

  if (authError) {
    return {
      incidents: [],
      errorMessage: authError.message
    };
  }

  const effectiveTutorId = user?.id ?? tutorId;
  const { data, error } = await supabase
    .from("student_incidents")
    .select("id,type,description,severity,created_at")
    .eq("student_id", studentId)
    .eq("tutor_id", effectiveTutorId)
    .order("created_at", { ascending: false })
    .returns<StudentIncident[]>();

  if (error) {
    return {
      incidents: [],
      errorMessage: error.message
    };
  }

  return {
    incidents: data ?? [],
    errorMessage: null
  };
}

export async function getObservationsForStudent(studentId: string): Promise<{
  observations: StudentObservation[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("student_observations")
    .select("id,student_id,tutor_id,type,title,content,priority,created_at")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .returns<StudentObservation[]>();

  if (error) {
    return {
      observations: [],
      errorMessage: error.message
    };
  }

  return {
    observations: data ?? [],
    errorMessage: null
  };
}

export async function getStudentById(studentId: string): Promise<{
  student: TutorStudentDetail | null;
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { academicYear } = await getActiveAcademicYear();
  if (!academicYear) {
    return { student: null, errorMessage: "No hay curso escolar activo." };
  }
  const { data, error } = await supabase
    .from("students")
    .select("id,name,last_name,birth_date,course_id,active,courses(name)")
    .eq("id", studentId)
    .eq("academic_year_id", academicYear.id)
    .maybeSingle<TutorStudentDetail>();

  if (error) {
    return {
      student: null,
      errorMessage: error.message
    };
  }

  return {
    student: data,
    errorMessage: null
  };
}

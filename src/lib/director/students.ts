import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { getActiveAcademicYear } from "@/lib/academic-years";
import { getActiveCourses } from "@/lib/courses";
import type { AttendanceRecord } from "@/lib/attendance/attendance";
import type { DirectorCommunication } from "@/lib/communications/notifications";
import type { PartialGrade } from "@/lib/grades/grades";
import type { StudentIncident, StudentObservation, TutorStudentDetail } from "@/lib/tutors/students";

type SupervisionClient = ReturnType<typeof createAdminClient>;

export type DirectorStudentListItem = {
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

export type DirectorCourse = {
  id: string;
  name: string;
};

export async function getDirectorCourses(): Promise<{
  courses: DirectorCourse[];
  errorMessage: string | null;
}> {
  return getActiveCourses();
}

export async function getDirectorStudents(): Promise<{
  students: DirectorStudentListItem[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { academicYear } = await getActiveAcademicYear();
  if (!academicYear) {
    return { students: [], errorMessage: "No hay curso escolar activo." };
  }
  const { data, error } = await supabase
    .from("students")
    .select("id,name,last_name,birth_date,course_id,active,courses(name)")
    .eq("academic_year_id", academicYear.id)
    .order("last_name", { ascending: true })
    .order("name", { ascending: true })
    .returns<DirectorStudentListItem[]>();

  if (error) {
    return { students: [], errorMessage: error.message };
  }

  return { students: data ?? [], errorMessage: null };
}

export async function getDirectorStudentDetail(studentId: string): Promise<{
  student: TutorStudentDetail | null;
  attendance: AttendanceRecord[];
  incidents: StudentIncident[];
  observations: StudentObservation[];
  grades: PartialGrade[];
  communications: DirectorCommunication[];
  errorMessage: string | null;
}> {
  const supabase = await createSupervisionClient();
  const { academicYear } = await getActiveAcademicYear();
  if (!academicYear) {
    return emptyDirectorStudentDetail("No hay curso escolar activo.");
  }
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id,name,last_name,birth_date,course_id,active,courses(name)")
    .eq("id", studentId)
    .eq("academic_year_id", academicYear.id)
    .maybeSingle<TutorStudentDetail>();

  if (studentError) {
    return emptyDirectorStudentDetail(studentError.message);
  }

  if (!student) {
    return {
      student: null,
      attendance: [],
      incidents: [],
      observations: [],
      grades: [],
      communications: [],
      errorMessage: null
    };
  }

  const [
    { data: attendance, error: attendanceError },
    { data: incidents, error: incidentsError },
    { data: observations, error: observationsError },
    { data: grades, error: gradesError },
    { data: communications, error: communicationsError }
  ] = await Promise.all([
    supabase
      .from("student_attendance")
      .select("id,student_id,tutor_id,status,date,notes,justified,justification_text,justification_file_url,created_at")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .returns<AttendanceRecord[]>(),
    supabase
      .from("student_incidents")
      .select("id,type,description,severity,created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .returns<StudentIncident[]>(),
    supabase
      .from("student_observations")
      .select("id,student_id,tutor_id,type,title,content,priority,created_at")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .returns<StudentObservation[]>(),
    supabase
      .from("partial_grades")
      .select(
        "id,student_id,teacher_id,subject_id,course_id,term,assessment_type,assessment_name,grade,assessment_date,comment,recommendation,visible_to_family,created_at"
      )
      .eq("student_id", studentId)
      .order("term", { ascending: true })
      .order("assessment_date", { ascending: false })
      .returns<PartialGrade[]>(),
    supabase
      .from("notifications")
      .select("id,sender_id,receiver_id,student_id,title,message,category,read,read_at,status,created_at,students(name,last_name)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false })
      .returns<DirectorCommunication[]>()
  ]);

  const errorMessage =
    attendanceError?.message ??
    incidentsError?.message ??
    observationsError?.message ??
    gradesError?.message ??
    communicationsError?.message ??
    null;

  return {
    student,
    attendance: attendance ?? [],
    incidents: incidents ?? [],
    observations: observations ?? [],
    grades: grades ?? [],
    communications: communications ?? [],
    errorMessage
  };
}

async function createSupervisionClient(): Promise<SupervisionClient> {
  if (hasSupabaseAdminClient()) {
    return createAdminClient();
  }

  return (await createClient()) as unknown as SupervisionClient;
}

function emptyDirectorStudentDetail(errorMessage: string) {
  return {
    student: null,
    attendance: [],
    incidents: [],
    observations: [],
    grades: [],
    communications: [],
    errorMessage
  };
}

import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/auth/session";
import type { GradeTerm } from "@/lib/grades/grades";

type ReportClient = Awaited<ReturnType<typeof createClient>>;

export type TermReportData = {
  academicYearName: string;
  studentName: string;
  courseName: string;
  term: GradeTerm;
  publishedAt: string | null;
  rows: {
    subjectName: string;
    finalGrade: number;
    finalObservation: string | null;
  }[];
};

type StudentRow = {
  id: string;
  name: string;
  last_name: string;
  course_id: string;
  academic_year_id: string;
};

type CourseRow = {
  id: string;
  name: string;
};

type AcademicYearRow = {
  id: string;
  name: string;
};

type PublicationRow = {
  published: boolean;
  published_at: string | null;
};

type TermSubjectGradeRow = {
  subject_id: string;
  final_grade: number | null;
  final_observation: string | null;
  status: "draft" | "closed";
};

type SubjectRow = {
  id: string;
  name: string;
};

export async function getTermReportForProfile({
  profile,
  studentId,
  term
}: {
  profile: Profile;
  studentId: string;
  term: GradeTerm;
}): Promise<{ report: TermReportData | null; errorMessage: string | null; status: number }> {
  const supabase = (hasSupabaseAdminClient() ? createAdminClient() : await createClient()) as unknown as ReportClient;
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("id,name,last_name,course_id,academic_year_id")
    .eq("id", studentId)
    .maybeSingle<StudentRow>();

  if (studentError) return { report: null, errorMessage: studentError.message, status: 500 };
  if (!student) return { report: null, errorMessage: "Alumno no encontrado.", status: 404 };

  if (profile.role === "family") {
    const client = await createClient();
    const { data: relation, error: relationError } = await client
      .from("parent_students")
      .select("student_id")
      .eq("parent_id", profile.id)
      .eq("student_id", studentId)
      .maybeSingle<{ student_id: string }>();

    if (relationError) return { report: null, errorMessage: relationError.message, status: 500 };
    if (!relation) return { report: null, errorMessage: "No tienes acceso a este alumno.", status: 403 };
  }

  if (profile.role !== "family" && profile.role !== "director" && profile.role !== "superadmin") {
    return { report: null, errorMessage: "No tienes permisos para consultar este boletín.", status: 403 };
  }

  const [
    { data: course, error: courseError },
    { data: academicYear, error: academicYearError },
    { data: publication, error: publicationError },
    { data: grades, error: gradesError }
  ] = await Promise.all([
    supabase.from("courses").select("id,name").eq("id", student.course_id).maybeSingle<CourseRow>(),
    supabase.from("academic_years").select("id,name").eq("id", student.academic_year_id).maybeSingle<AcademicYearRow>(),
    supabase
      .from("evaluation_publications")
      .select("published,published_at")
      .eq("course_id", student.course_id)
      .eq("academic_year_id", student.academic_year_id)
      .eq("term", term)
      .maybeSingle<PublicationRow>(),
    supabase
      .from("term_subject_grades")
      .select("subject_id,final_grade,final_observation,status")
      .eq("student_id", studentId)
      .eq("course_id", student.course_id)
      .eq("academic_year_id", student.academic_year_id)
      .eq("term", term)
      .eq("status", "closed")
      .returns<TermSubjectGradeRow[]>()
  ]);

  const queryError = courseError?.message ?? academicYearError?.message ?? publicationError?.message ?? gradesError?.message ?? null;
  if (queryError) return { report: null, errorMessage: queryError, status: 500 };

  if (profile.role === "family" && !publication?.published) {
    return { report: null, errorMessage: "El boletín de esta evaluación todavía no está disponible.", status: 403 };
  }

  const validGrades: TermSubjectGradeRow[] = (grades ?? []).filter((grade: TermSubjectGradeRow) => grade.final_grade !== null);
  const subjectIds = Array.from(new Set(validGrades.map((grade: TermSubjectGradeRow) => grade.subject_id)));
  const { data: subjects, error: subjectsError } = subjectIds.length
    ? await supabase.from("subjects").select("id,name").in("id", subjectIds).returns<SubjectRow[]>()
    : { data: [], error: null };

  if (subjectsError) return { report: null, errorMessage: subjectsError.message, status: 500 };

  const subjectsById = new Map((subjects ?? []).map((subject: SubjectRow) => [subject.id, subject.name]));
  const rows = validGrades
    .map((grade: TermSubjectGradeRow) => ({
      subjectName: subjectsById.get(grade.subject_id) ?? grade.subject_id,
      finalGrade: Number(grade.final_grade),
      finalObservation: grade.final_observation
    }))
    .sort((a: TermReportData["rows"][number], b: TermReportData["rows"][number]) => a.subjectName.localeCompare(b.subjectName, "es"));

  return {
    report: {
      academicYearName: academicYear?.name ?? "2026-2027",
      studentName: `${student.name} ${student.last_name}`,
      courseName: course?.name ?? student.course_id,
      term,
      publishedAt: publication?.published_at ?? null,
      rows
    },
    errorMessage: null,
    status: 200
  };
}

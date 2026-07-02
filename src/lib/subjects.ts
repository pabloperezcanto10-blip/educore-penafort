import { getActiveAcademicYear } from "@/lib/academic-years";
import { createClient } from "@/lib/supabase/server";

export type Subject = {
  id: string;
  name: string;
};

export type CourseSubject = {
  id: string;
  course_id: string;
  subject_id: string;
  academic_year_id: string | null;
  optional: boolean;
  track: string | null;
  courseName: string;
  subjectName: string;
};

type CourseSubjectRow = {
  id: string;
  course_id: string;
  subject_id: string;
  academic_year_id: string | null;
  optional: boolean;
  track: string | null;
};

type CourseRow = {
  id: string;
  name: string;
};

export async function getActiveCourseSubjects(): Promise<{
  courseSubjects: CourseSubject[];
  errorMessage: string | null;
}> {
  const supabase = await createClient();
  const { academicYear, errorMessage: academicYearError } = await getActiveAcademicYear();

  if (!academicYear) {
    return { courseSubjects: [], errorMessage: academicYearError ?? "No hay curso escolar activo." };
  }

  const { data: rows, error } = await supabase
    .from("course_subjects")
    .select("id,course_id,subject_id,academic_year_id,optional,track")
    .eq("academic_year_id", academicYear.id)
    .returns<CourseSubjectRow[]>();

  if (error) {
    return { courseSubjects: [], errorMessage: error.message };
  }

  return hydrateCourseSubjects(rows ?? []);
}

export async function getSubjectsForCourse(courseId: string): Promise<{
  subjects: Subject[];
  courseSubjects: CourseSubject[];
  errorMessage: string | null;
}> {
  if (!courseId) {
    return { subjects: [], courseSubjects: [], errorMessage: null };
  }

  const supabase = await createClient();
  const { academicYear, errorMessage: academicYearError } = await getActiveAcademicYear();

  if (!academicYear) {
    return { subjects: [], courseSubjects: [], errorMessage: academicYearError ?? "No hay curso escolar activo." };
  }

  const { data: rows, error } = await supabase
    .from("course_subjects")
    .select("id,course_id,subject_id,academic_year_id,optional,track")
    .eq("academic_year_id", academicYear.id)
    .eq("course_id", courseId)
    .returns<CourseSubjectRow[]>();

  if (error) {
    return { subjects: [], courseSubjects: [], errorMessage: error.message };
  }

  const hydrated = await hydrateCourseSubjects(rows ?? []);

  return {
    subjects: hydrated.courseSubjects.map((item) => ({
      id: item.subject_id,
      name: item.subjectName
    })),
    courseSubjects: hydrated.courseSubjects,
    errorMessage: hydrated.errorMessage
  };
}

async function hydrateCourseSubjects(rows: CourseSubjectRow[]): Promise<{
  courseSubjects: CourseSubject[];
  errorMessage: string | null;
}> {
  if (rows.length === 0) {
    return { courseSubjects: [], errorMessage: null };
  }

  const supabase = await createClient();
  const courseIds = Array.from(new Set(rows.map((row) => row.course_id)));
  const subjectIds = Array.from(new Set(rows.map((row) => row.subject_id)));

  const [{ data: courses, error: coursesError }, { data: subjects, error: subjectsError }] = await Promise.all([
    supabase.from("courses").select("id,name").in("id", courseIds).returns<CourseRow[]>(),
    supabase.from("subjects").select("id,name").in("id", subjectIds).returns<Subject[]>()
  ]);

  const errorMessage = coursesError?.message ?? subjectsError?.message ?? null;

  if (errorMessage) {
    return { courseSubjects: [], errorMessage };
  }

  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const subjectsById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));

  return {
    courseSubjects: rows
      .map((row) => ({
        ...row,
        courseName: coursesById.get(row.course_id)?.name ?? row.course_id,
        subjectName: subjectsById.get(row.subject_id)?.name ?? row.subject_id
      }))
      .sort((a, b) => {
        const courseOrder = a.courseName.localeCompare(b.courseName, "es");
        return courseOrder === 0 ? a.subjectName.localeCompare(b.subjectName, "es") : courseOrder;
      }),
    errorMessage: null
  };
}

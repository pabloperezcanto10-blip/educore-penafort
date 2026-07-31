import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  academicReadError,
  requireAcademicOperationContext
} from "@/lib/grades/context";
import {
  requireOperationalSchoolContext,
  requireSchoolRole
} from "@/lib/schools/context";

type AnnualClient = ReturnType<typeof createAdminClient>;

export type AnnualWeight = {
  id: string;
  school_id: string;
  academic_year_id: string;
  teacher_id: string;
  course_id: string;
  subject_id: string;
  term1_weight: number;
  term2_weight: number;
  term3_weight: number;
  active: boolean;
};

export type FinalCourseGrade = {
  id: string;
  school_id: string;
  academic_year_id: string;
  student_id: string;
  subject_id: string;
  teacher_id: string;
  course_id: string;
  term1_grade: number | null;
  term2_grade: number | null;
  term3_grade: number | null;
  term1_weight: number;
  term2_weight: number;
  term3_weight: number;
  calculated_grade: number | null;
  final_grade: number | null;
  final_observation: string | null;
  status: "pending" | "draft" | "closed";
  closed_at: string | null;
};

export type FinalPublication = {
  id: string;
  school_id: string;
  academic_year_id: string;
  course_id: string;
  published: boolean;
  published_at: string | null;
  published_by: string | null;
};

export type FinalCourseRow = {
  student_id: string;
  studentName: string;
  subject_id: string;
  subjectName: string;
  teacher_id: string;
  teacherName: string;
  course_id: string;
  courseName: string;
  term1_grade: number | null;
  term2_grade: number | null;
  term3_grade: number | null;
  term1_weight: number;
  term2_weight: number;
  term3_weight: number;
  calculated_grade: number | null;
  final_grade: number | null;
  final_observation: string | null;
  status: "pending" | "draft" | "closed";
  closed_at: string | null;
  existingId: string | null;
};

const weightSelect = "id,school_id,academic_year_id,teacher_id,course_id,subject_id,term1_weight,term2_weight,term3_weight,active";
const finalGradeSelect =
  "id,school_id,academic_year_id,student_id,subject_id,teacher_id,course_id,term1_grade,term2_grade,term3_grade,term1_weight,term2_weight,term3_weight,calculated_grade,final_grade,final_observation,status,closed_at";

export function calculateAnnualGrade({
  term1,
  term2,
  term3,
  weight1,
  weight2,
  weight3
}: {
  term1: number | null;
  term2: number | null;
  term3: number | null;
  weight1: number;
  weight2: number;
  weight3: number;
}) {
  if (term1 === null || term2 === null || term3 === null) {
    return null;
  }

  return Number(((term1 * weight1 + term2 * weight2 + term3 * weight3) / 100).toFixed(2));
}

export function roundAnnualGrade(value: number | null) {
  return value === null ? null : Math.round(value);
}

export async function getAnnualWeight(params: {
  teacherId: string;
  courseId: string;
  subjectId: string;
}): Promise<{ weight: AnnualWeight | null; errorMessage: string | null }> {
  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("annual_evaluation_weights")
    .select(weightSelect)
    .eq("school_id", schoolId)
    .eq("teacher_id", params.teacherId)
    .eq("course_id", params.courseId)
    .eq("subject_id", params.subjectId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle<AnnualWeight>();

  if (error) {
    return {
      weight: null,
      errorMessage: academicReadError(error, "No se pudieron consultar los pesos anuales.")
    };
  }

  return { weight: data, errorMessage: null };
}

export async function getFinalRowsForTeacher(params: {
  teacherId: string;
  courseId: string;
  subjectId: string;
}): Promise<{ rows: FinalCourseRow[]; errorMessage: string | null }> {
  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createAnnualClient();
  const [{ data: students, error: studentsError }, { weight, errorMessage: weightError }, { data: termGrades, error: termsError }, { data: finals, error: finalsError }] =
    await Promise.all([
      supabase
        .from("students")
        .select("id,name,last_name,course_id")
        .eq("school_id", schoolId)
        .eq("course_id", params.courseId)
        .eq("active", true)
        .eq("academic_year_id", academicYearId)
        .returns<{ id: string; name: string; last_name: string; course_id: string }[]>(),
      getAnnualWeight(params),
      supabase
        .from("term_subject_grades")
        .select("student_id,subject_id,teacher_id,course_id,term,final_grade,status")
        .eq("school_id", schoolId)
        .eq("teacher_id", params.teacherId)
        .eq("course_id", params.courseId)
        .eq("subject_id", params.subjectId)
        .eq("academic_year_id", academicYearId)
        .returns<{ student_id: string; term: "1" | "2" | "3"; final_grade: number | null; status: string }[]>(),
      supabase
        .from("final_course_grades")
        .select(finalGradeSelect)
        .eq("school_id", schoolId)
        .eq("teacher_id", params.teacherId)
        .eq("course_id", params.courseId)
        .eq("subject_id", params.subjectId)
        .eq("academic_year_id", academicYearId)
        .returns<FinalCourseGrade[]>()
    ]);

  const firstError =
    weightError ??
    (studentsError || termsError || finalsError
      ? "No se pudieron consultar las calificaciones finales del curso."
      : null);

  if (firstError) {
    return { rows: [], errorMessage: firstError };
  }

  const labels = await getLabels({
    courseIds: [params.courseId],
    subjectIds: [params.subjectId],
    teacherIds: [params.teacherId],
    studentIds: (students ?? []).map(({ id }) => id)
  });
  const termMap = new Map<string, number | null>();
  (termGrades ?? []).forEach((grade) => termMap.set(`${grade.student_id}:${grade.term}`, grade.final_grade));
  const finalMap = new Map((finals ?? []).map((row) => [row.student_id, row]));
  const activeWeight = weight ?? defaultWeight(params);

  return {
    errorMessage: labels.errorMessage,
    rows: (students ?? []).map((student) => {
      const existing = finalMap.get(student.id) ?? null;
      const term1 = existing?.term1_grade ?? termMap.get(`${student.id}:1`) ?? null;
      const term2 = existing?.term2_grade ?? termMap.get(`${student.id}:2`) ?? null;
      const term3 = existing?.term3_grade ?? termMap.get(`${student.id}:3`) ?? null;
      const calculated =
        existing?.calculated_grade ??
        calculateAnnualGrade({
          term1,
          term2,
          term3,
          weight1: activeWeight.term1_weight,
          weight2: activeWeight.term2_weight,
          weight3: activeWeight.term3_weight
        });

      return {
        student_id: student.id,
        studentName: `${student.name} ${student.last_name}`,
        subject_id: params.subjectId,
        subjectName: labels.subjects.get(params.subjectId) ?? params.subjectId,
        teacher_id: params.teacherId,
        teacherName: labels.teachers.get(params.teacherId) ?? params.teacherId,
        course_id: params.courseId,
        courseName: labels.courses.get(params.courseId) ?? params.courseId,
        term1_grade: term1,
        term2_grade: term2,
        term3_grade: term3,
        term1_weight: existing?.term1_weight ?? activeWeight.term1_weight,
        term2_weight: existing?.term2_weight ?? activeWeight.term2_weight,
        term3_weight: existing?.term3_weight ?? activeWeight.term3_weight,
        calculated_grade: calculated,
        final_grade: existing?.final_grade ?? roundAnnualGrade(calculated),
        final_observation: existing?.final_observation ?? null,
        status: existing?.status ?? "pending",
        closed_at: existing?.closed_at ?? null,
        existingId: existing?.id ?? null
      };
    })
  };
}

export async function getFinalRowsForSupervision(courseId?: string): Promise<{
  rows: FinalCourseRow[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["director", "superadmin"]);
  if (!schoolContext.schoolId) {
    return { rows: [], errorMessage: "No hay un centro activo seleccionado." };
  }

  const { academicYearId } = await requireAcademicOperationContext();
  const supabase = await createAnnualClient();
  const { data, error } = courseId
    ? await supabase
        .from("final_course_grades")
        .select(finalGradeSelect)
        .eq("school_id", schoolContext.schoolId)
        .eq("course_id", courseId)
        .eq("academic_year_id", academicYearId)
        .returns<FinalCourseGrade[]>()
    : await supabase
        .from("final_course_grades")
        .select(finalGradeSelect)
        .eq("school_id", schoolContext.schoolId)
        .eq("academic_year_id", academicYearId)
        .returns<FinalCourseGrade[]>();

  if (error) {
    return {
      rows: [],
      errorMessage: academicReadError(error, "No se pudieron supervisar las calificaciones finales.")
    };
  }

  return attachFinalLabels(data ?? []);
}

export async function getFinalPublication(courseId: string): Promise<{
  publication: FinalPublication | null;
  errorMessage: string | null;
}> {
  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("final_evaluation_publications")
    .select("id,school_id,academic_year_id,course_id,published,published_at,published_by")
    .eq("school_id", schoolId)
    .eq("course_id", courseId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle<FinalPublication>();

  if (error) {
    return {
      publication: null,
      errorMessage: academicReadError(error, "No se pudo consultar la publicación final.")
    };
  }

  return { publication: data, errorMessage: null };
}

export async function getFamilyFinalRows(familyId: string): Promise<{
  rows: FinalCourseRow[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["family"]);
  if (!schoolContext.schoolId) {
    return { rows: [], errorMessage: "No hay un centro activo seleccionado." };
  }

  const { academicYearId } = await requireAcademicOperationContext();
  const supabase = await createAnnualClient();
  const { data: relations, error: relationsError } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("school_id", schoolContext.schoolId)
    .eq("parent_id", familyId)
    .returns<{ student_id: string }[]>();

  if (relationsError) {
    return {
      rows: [],
      errorMessage: academicReadError(relationsError, "No se pudo validar la relación familiar.")
    };
  }

  const studentIds = (relations ?? []).map((relation) => relation.student_id);

  if (studentIds.length === 0) {
    return { rows: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("final_course_grades")
    .select(finalGradeSelect)
    .eq("school_id", schoolContext.schoolId)
    .in("student_id", studentIds)
    .eq("status", "closed")
    .eq("academic_year_id", academicYearId)
    .returns<FinalCourseGrade[]>();

  if (error) {
    return {
      rows: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las calificaciones finales publicadas.")
    };
  }

  const published = await getPublishedCourseIds(
    schoolContext.schoolId,
    academicYearId
  );
  return attachFinalLabels((data ?? []).filter((row) => published.has(row.course_id)));
}

function defaultWeight(params: { teacherId: string; courseId: string; subjectId: string }): AnnualWeight {
  return {
    id: "",
    school_id: "",
    academic_year_id: "",
    teacher_id: params.teacherId,
    course_id: params.courseId,
    subject_id: params.subjectId,
    term1_weight: 33,
    term2_weight: 33,
    term3_weight: 34,
    active: true
  };
}

async function attachFinalLabels(rows: FinalCourseGrade[]): Promise<{ rows: FinalCourseRow[]; errorMessage: string | null }> {
  const labels = await getLabels({
    courseIds: rows.map((row) => row.course_id),
    subjectIds: rows.map((row) => row.subject_id),
    teacherIds: rows.map((row) => row.teacher_id),
    studentIds: rows.map((row) => row.student_id)
  });

  return {
    errorMessage: labels.errorMessage,
    rows: rows.map((row) => ({
      student_id: row.student_id,
      studentName: labels.students.get(row.student_id) ?? row.student_id,
      subject_id: row.subject_id,
      subjectName: labels.subjects.get(row.subject_id) ?? row.subject_id,
      teacher_id: row.teacher_id,
      teacherName: labels.teachers.get(row.teacher_id) ?? row.teacher_id,
      course_id: row.course_id,
      courseName: labels.courses.get(row.course_id) ?? row.course_id,
      term1_grade: row.term1_grade,
      term2_grade: row.term2_grade,
      term3_grade: row.term3_grade,
      term1_weight: row.term1_weight,
      term2_weight: row.term2_weight,
      term3_weight: row.term3_weight,
      calculated_grade: row.calculated_grade,
      final_grade: row.final_grade,
      final_observation: row.final_observation,
      status: row.status,
      closed_at: row.closed_at,
      existingId: row.id
    }))
  };
}

async function getLabels({
  courseIds,
  subjectIds,
  teacherIds,
  studentIds
}: {
  courseIds: string[];
  subjectIds: string[];
  teacherIds: string[];
  studentIds: string[];
}) {
  const schoolContext = await requireOperationalSchoolContext();
  const supabase = await createAnnualClient();
  const uniqueCourseIds = Array.from(new Set(courseIds.filter(Boolean)));
  const uniqueSubjectIds = Array.from(new Set(subjectIds.filter(Boolean)));
  const uniqueTeacherIds = Array.from(new Set(teacherIds.filter(Boolean)));
  const uniqueStudentIds = Array.from(new Set(studentIds.filter(Boolean)));

  const [{ data: courses, error: coursesError }, { data: subjects, error: subjectsError }, { data: teachers, error: teachersError }, { data: students, error: studentsError }] =
    await Promise.all([
      uniqueCourseIds.length > 0
        ? supabase.from("courses").select("id,name").eq("school_id", schoolContext.schoolId).in("id", uniqueCourseIds).returns<{ id: string; name: string }[]>()
        : Promise.resolve({ data: [], error: null }),
      uniqueSubjectIds.length > 0
        ? supabase.from("subjects").select("id,name").eq("school_id", schoolContext.schoolId).in("id", uniqueSubjectIds).returns<{ id: string; name: string }[]>()
        : Promise.resolve({ data: [], error: null }),
      uniqueTeacherIds.length > 0
        ? supabase.from("profiles").select("id,email,full_name").in("id", uniqueTeacherIds).returns<{ id: string; email: string | null; full_name: string | null }[]>()
        : Promise.resolve({ data: [], error: null }),
      uniqueStudentIds.length > 0
        ? supabase.from("students").select("id,name,last_name").eq("school_id", schoolContext.schoolId).in("id", uniqueStudentIds).returns<{ id: string; name: string; last_name: string }[]>()
        : Promise.resolve({ data: [], error: null })
    ]);

  return {
    errorMessage:
      coursesError || subjectsError || teachersError || studentsError
        ? "No se pudieron resolver las etiquetas de calificaciones finales."
        : null,
    courses: new Map((courses ?? []).map((course) => [course.id, course.name])),
    subjects: new Map((subjects ?? []).map((subject) => [subject.id, subject.name])),
    teachers: new Map((teachers ?? []).map((teacher) => [teacher.id, teacher.full_name ?? teacher.email ?? teacher.id])),
    students: new Map((students ?? []).map((student) => [student.id, `${student.name} ${student.last_name}`]))
  };
}

async function getPublishedCourseIds(
  schoolId: string,
  academicYearId: string
) {
  const supabase = await createAnnualClient();
  const { data } = await supabase
    .from("final_evaluation_publications")
    .select("course_id")
    .eq("school_id", schoolId)
    .eq("published", true)
    .eq("academic_year_id", academicYearId)
    .returns<{ course_id: string }[]>();

  return new Set((data ?? []).map((row) => row.course_id));
}

async function createAnnualClient(): Promise<AnnualClient> {
  if (hasSupabaseAdminClient()) {
    return createAdminClient();
  }

  return (await createClient()) as unknown as AnnualClient;
}

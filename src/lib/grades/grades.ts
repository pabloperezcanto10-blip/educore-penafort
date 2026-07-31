import { createClient } from "@/lib/supabase/server";
import { createAdminClient, hasSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  academicReadError,
  requireAcademicOperationContext
} from "@/lib/grades/context";
import {
  requireOperationalSchoolContext,
  requireSchoolRole
} from "@/lib/schools/context";

type GradeLabelClient = ReturnType<typeof createAdminClient>;

export type GradeTerm = "1" | "2" | "3";
export type AssessmentType = "parcial" | "trimestral";
export type CriterionType =
  | "parcial"
  | "trimestral"
  | "comportamiento"
  | "libreta"
  | "oral"
  | "proyecto"
  | "actitud"
  | "otro";

export type Subject = {
  id: string;
  name: string;
};

export type PartialGrade = {
  id: string;
  school_id?: string;
  academic_year_id?: string;
  student_id: string;
  teacher_id: string;
  subject_id: string;
  course_id: string;
  term: GradeTerm;
  assessment_type: AssessmentType;
  assessment_name: string;
  grade: number;
  assessment_date: string | null;
  comment: string | null;
  recommendation: string | null;
  visible_to_family: boolean;
  created_at: string;
};

export type EvaluationCriterion = {
  id: string;
  school_id?: string;
  academic_year_id?: string;
  teacher_id: string;
  course_id: string;
  subject_id: string;
  term: GradeTerm;
  name: string;
  weight: number;
  criterion_type: CriterionType;
  visible_to_family: boolean;
  active: boolean;
  created_at: string;
};

export type QuarterFinalGrade = {
  id: string;
  school_id?: string;
  academic_year_id?: string;
  student_id: string;
  subject_id: string;
  teacher_id: string;
  course_id: string;
  term: GradeTerm;
  calculated_grade: number;
  final_grade: number;
  teacher_observation: string | null;
  created_at: string;
};

export type TermSubjectGradeStatus = "draft" | "closed";

export type TermSubjectGrade = {
  id: string;
  school_id?: string;
  academic_year_id?: string;
  student_id: string;
  subject_id: string;
  teacher_id: string;
  course_id: string;
  term: GradeTerm;
  calculated_grade: number | null;
  final_grade: number | null;
  final_observation: string | null;
  status: TermSubjectGradeStatus;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type EvaluationPublication = {
  id: string;
  school_id?: string;
  academic_year_id?: string;
  course_id: string;
  term: GradeTerm;
  published: boolean;
  published_at: string | null;
  published_by: string | null;
  created_at: string;
  updated_at: string;
};

export type TermSubjectReportRow = {
  key: string;
  student_id: string;
  studentName: string;
  subject_id: string;
  subjectName: string;
  teacher_id: string;
  teacherName: string;
  course_id: string;
  courseName: string;
  term: GradeTerm;
  status: "pending" | TermSubjectGradeStatus;
  calculated_grade: number | null;
  final_grade: number | null;
  final_observation: string | null;
  closed_at: string | null;
};

export type TermPublicationSummary = {
  closedSubjects: number;
  pendingSubjects: number;
  completeStudents: number;
  incompleteStudents: number;
};

export type GradeWithLabels = PartialGrade & {
  studentName: string;
  subjectName: string;
  teacherName: string;
};

export type EvaluationCriterionWithLabels = EvaluationCriterion & {
  subjectName: string;
  courseName: string;
  teacherName: string;
};

export type QuarterFinalGradeWithLabels = QuarterFinalGrade & {
  studentName: string;
  subjectName: string;
  courseName: string;
  teacherName: string;
};

export type TermSubjectGradeWithLabels = TermSubjectGrade & {
  studentName: string;
  subjectName: string;
  courseName: string;
  teacherName: string;
};

export type GradebookCourse = {
  id: string;
  name: string;
};

export type GradebookStudent = {
  id: string;
  name: string;
  last_name: string;
};

export type TeacherSubjectCourse = {
  subject: Subject;
  courses: GradebookCourse[];
};

type StudentLabel = {
  id: string;
  name: string;
  last_name: string;
};

type ProfileLabel = {
  id: string;
  email: string | null;
  full_name: string | null;
};

type CourseLabel = {
  id: string;
  name: string;
};

type AssignmentLabel = {
  teacher_id: string;
  course_id: string;
  subject_id: string | null;
};

type ReportStudentLabel = StudentLabel & {
  course_id: string;
};

const gradeSelect =
  "id,school_id,academic_year_id,student_id,teacher_id,subject_id,course_id,term,assessment_type,assessment_name,grade,assessment_date,comment,recommendation,visible_to_family,created_at";
const criteriaSelect =
  "id,school_id,academic_year_id,teacher_id,course_id,subject_id,term,name,weight,criterion_type,visible_to_family,active,created_at";
const finalGradeSelect =
  "id,school_id,academic_year_id,student_id,subject_id,teacher_id,course_id,term,calculated_grade,final_grade,teacher_observation,created_at";
const termSubjectGradeSelect =
  "id,school_id,academic_year_id,student_id,subject_id,teacher_id,course_id,term,calculated_grade,final_grade,final_observation,status,closed_at,created_at,updated_at";
const evaluationPublicationSelect =
  "id,school_id,academic_year_id,course_id,term,published,published_at,published_by,created_at,updated_at";

export async function getAssignedSubjectsForTeacherCourse(
  teacherId: string,
  courseId: string
): Promise<{ subjects: Subject[]; errorMessage: string | null }> {
  if (!teacherId || !courseId) {
    return { subjects: [], errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createGradeLabelClient();
  const { data: assignments, error } = await supabase
    .from("teacher_assignments")
    .select("subject_id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("academic_year_id", academicYearId)
    .returns<{ subject_id: string | null }[]>();

  if (error) {
    return {
      subjects: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las asignaciones docentes.")
    };
  }

  const subjectIds = Array.from(
    new Set((assignments ?? []).map((assignment) => assignment.subject_id).filter((id): id is string => Boolean(id)))
  );

  if (subjectIds.length === 0) {
    return { subjects: [], errorMessage: null };
  }

  const { data: subjects, error: subjectsError } = await supabase
    .from("subjects")
    .select("id,name")
    .eq("school_id", schoolId)
    .in("id", subjectIds)
    .order("name", { ascending: true })
    .returns<Subject[]>();

  if (subjectsError) {
    return {
      subjects: [],
      errorMessage: academicReadError(subjectsError, "No se pudieron consultar las materias.")
    };
  }

  return { subjects: subjects ?? [], errorMessage: null };
}

export async function getAssignedCoursesForTeacher(teacherId: string): Promise<{
  courses: GradebookCourse[];
  errorMessage: string | null;
}> {
  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createGradeLabelClient();
  const { data: assignments, error } = await supabase
    .from("teacher_assignments")
    .select("course_id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("academic_year_id", academicYearId)
    .returns<{ course_id: string }[]>();

  if (error) {
    return {
      courses: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las asignaciones docentes.")
    };
  }

  const courseIds = Array.from(new Set((assignments ?? []).map((assignment) => assignment.course_id)));

  if (courseIds.length === 0) {
    return { courses: [], errorMessage: null };
  }

  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id,name")
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .in("id", courseIds)
    .order("name", { ascending: true })
    .returns<GradebookCourse[]>();

  if (coursesError) {
    return {
      courses: [],
      errorMessage: academicReadError(coursesError, "No se pudieron consultar los cursos.")
    };
  }

  return { courses: courses ?? [], errorMessage: null };
}

export async function getStudentsForCourse(courseId: string): Promise<{
  students: GradebookStudent[];
  errorMessage: string | null;
}> {
  if (!courseId) {
    return { students: [], errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("students")
    .select("id,name,last_name")
    .eq("school_id", schoolId)
    .eq("course_id", courseId)
    .eq("active", true)
    .eq("academic_year_id", academicYearId)
    .order("last_name", { ascending: true })
    .order("name", { ascending: true })
    .returns<GradebookStudent[]>();

  if (error) {
    return {
      students: [],
      errorMessage: academicReadError(error, "No se pudieron consultar los alumnos del curso.")
    };
  }

  return { students: data ?? [], errorMessage: null };
}

export async function getSubjectCoursesForTeacher(teacherId: string): Promise<{
  items: TeacherSubjectCourse[];
  errorMessage: string | null;
}> {
  if (!teacherId) {
    return { items: [], errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createGradeLabelClient();
  const { data: assignments, error } = await supabase
    .from("teacher_assignments")
    .select("course_id,subject_id")
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("academic_year_id", academicYearId)
    .returns<{ course_id: string; subject_id: string | null }[]>();

  if (error) {
    return {
      items: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las asignaciones docentes.")
    };
  }

  const validAssignments = (assignments ?? []).filter(
    (assignment): assignment is { course_id: string; subject_id: string } => Boolean(assignment.subject_id)
  );

  if (validAssignments.length === 0) {
    return { items: [], errorMessage: null };
  }

  const courseIds = Array.from(new Set(validAssignments.map((assignment) => assignment.course_id)));
  const subjectIds = Array.from(new Set(validAssignments.map((assignment) => assignment.subject_id)));
  const [
    { data: courses, error: coursesError },
    { data: subjects, error: subjectsError }
  ] = await Promise.all([
    supabase.from("courses").select("id,name").eq("school_id", schoolId).eq("academic_year_id", academicYearId).in("id", courseIds).returns<GradebookCourse[]>(),
    supabase.from("subjects").select("id,name").eq("school_id", schoolId).in("id", subjectIds).returns<Subject[]>()
  ]);

  const errorMessage =
    coursesError || subjectsError
      ? "No se pudieron consultar los cursos y materias asignados."
      : null;

  if (errorMessage) {
    return { items: [], errorMessage };
  }

  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const subjectsById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));
  const grouped = new Map<string, TeacherSubjectCourse>();

  validAssignments.forEach((assignment) => {
    const subject = subjectsById.get(assignment.subject_id);
    const course = coursesById.get(assignment.course_id);

    if (!subject || !course) {
      return;
    }

    const current = grouped.get(subject.id) ?? { subject, courses: [] };
    current.courses.push(course);
    grouped.set(subject.id, current);
  });

  return {
    items: Array.from(grouped.values())
      .map((item) => ({
        ...item,
        courses: Array.from(new Map(item.courses.map((course) => [course.id, course])).values()).sort((a, b) =>
          a.name.localeCompare(b.name, "es")
        )
      }))
      .sort((a, b) => a.subject.name.localeCompare(b.subject.name, "es")),
    errorMessage: null
  };
}

export async function getGradebookGrades({
  courseId,
  subjectId,
  term,
  assessmentType,
  assessmentName
}: {
  courseId: string;
  subjectId: string;
  term: GradeTerm;
  assessmentType: AssessmentType;
  assessmentName: string;
}): Promise<{ grades: PartialGrade[]; errorMessage: string | null }> {
  if (!courseId || !subjectId || !assessmentName) {
    return { grades: [], errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partial_grades")
    .select(gradeSelect)
    .eq("school_id", schoolId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("term", term)
    .eq("assessment_type", assessmentType)
    .eq("assessment_name", assessmentName)
    .eq("academic_year_id", academicYearId)
    .returns<PartialGrade[]>();

  if (error) {
    return {
      grades: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las calificaciones.")
    };
  }

  return { grades: data ?? [], errorMessage: null };
}

export async function getEvaluationCriteria({
  teacherId,
  courseId,
  subjectId,
  term
}: {
  teacherId: string;
  courseId: string;
  subjectId: string;
  term: GradeTerm;
}): Promise<{ criteria: EvaluationCriterion[]; errorMessage: string | null }> {
  if (!teacherId || !courseId || !subjectId) {
    return { criteria: [], errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_criteria")
    .select(criteriaSelect)
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("term", term)
    .eq("academic_year_id", academicYearId)
    .order("created_at", { ascending: true })
    .returns<EvaluationCriterion[]>();

  if (error) {
    return {
      criteria: [],
      errorMessage: academicReadError(error, "No se pudieron consultar los criterios de evaluación.")
    };
  }

  return { criteria: data ?? [], errorMessage: null };
}

export async function getGradebookGradesForTerm({
  teacherId,
  courseId,
  subjectId,
  term
}: {
  teacherId: string;
  courseId: string;
  subjectId: string;
  term: GradeTerm;
}): Promise<{ grades: PartialGrade[]; errorMessage: string | null }> {
  if (!teacherId || !courseId || !subjectId) {
    return { grades: [], errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("partial_grades")
    .select(gradeSelect)
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("term", term)
    .eq("academic_year_id", academicYearId)
    .returns<PartialGrade[]>();

  if (error) {
    return {
      grades: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las calificaciones.")
    };
  }

  return { grades: data ?? [], errorMessage: null };
}

export async function getQuarterFinalGrades({
  teacherId,
  courseId,
  subjectId,
  term
}: {
  teacherId: string;
  courseId: string;
  subjectId: string;
  term: GradeTerm;
}): Promise<{ finalGrades: QuarterFinalGrade[]; errorMessage: string | null }> {
  if (!teacherId || !courseId || !subjectId) {
    return { finalGrades: [], errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quarter_final_grades")
    .select(finalGradeSelect)
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("term", term)
    .eq("academic_year_id", academicYearId)
    .returns<QuarterFinalGrade[]>();

  if (error) {
    return {
      finalGrades: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las notas finales.")
    };
  }

  return { finalGrades: data ?? [], errorMessage: null };
}

export async function getTermSubjectGrades({
  teacherId,
  courseId,
  subjectId,
  term
}: {
  teacherId: string;
  courseId: string;
  subjectId: string;
  term: GradeTerm;
}): Promise<{ termGrades: TermSubjectGrade[]; errorMessage: string | null }> {
  if (!teacherId || !courseId || !subjectId) {
    return { termGrades: [], errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("term_subject_grades")
    .select(termSubjectGradeSelect)
    .eq("school_id", schoolId)
    .eq("teacher_id", teacherId)
    .eq("course_id", courseId)
    .eq("subject_id", subjectId)
    .eq("term", term)
    .eq("academic_year_id", academicYearId)
    .returns<TermSubjectGrade[]>();

  if (error) {
    return {
      termGrades: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las notas trimestrales.")
    };
  }

  return { termGrades: data ?? [], errorMessage: null };
}

export async function getEvaluationPublication({
  courseId,
  term
}: {
  courseId: string;
  term: GradeTerm;
}): Promise<{ publication: EvaluationPublication | null; errorMessage: string | null }> {
  if (!courseId) {
    return { publication: null, errorMessage: null };
  }

  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("evaluation_publications")
    .select(evaluationPublicationSelect)
    .eq("school_id", schoolId)
    .eq("course_id", courseId)
    .eq("term", term)
    .eq("academic_year_id", academicYearId)
    .maybeSingle<EvaluationPublication>();

  if (error) {
    return {
      publication: null,
      errorMessage: academicReadError(error, "No se pudo consultar el estado de publicación.")
    };
  }

  return { publication: data ?? null, errorMessage: null };
}

export type CalculatedStudentGrade = {
  studentId: string;
  calculatedGrade: number | null;
  reportGrade: number | null;
  completedWeight: number;
  missingCriteria: string[];
};

export function calculateStudentFinalGrades({
  students,
  criteria,
  grades
}: {
  students: GradebookStudent[];
  criteria: EvaluationCriterion[];
  grades: PartialGrade[];
}) {
  const activeCriteria = criteria.filter((criterion) => criterion.active);
  const gradesByStudent = new Map<string, PartialGrade[]>();

  grades.forEach((grade) => {
    const current = gradesByStudent.get(grade.student_id) ?? [];
    current.push(grade);
    gradesByStudent.set(grade.student_id, current);
  });

  return students.map((student): CalculatedStudentGrade => {
    const studentGrades = gradesByStudent.get(student.id) ?? [];
    let weightedTotal = 0;
    let completedWeight = 0;
    const missingCriteria: string[] = [];

    activeCriteria.forEach((criterion) => {
      const grade = findGradeForCriterion(studentGrades, criterion);

      if (!grade) {
        missingCriteria.push(criterion.name);
        return;
      }

      weightedTotal += Number(grade.grade) * (Number(criterion.weight) / 100);
      completedWeight += Number(criterion.weight);
    });

    const calculatedGrade = completedWeight > 0 ? roundToTwo(weightedTotal) : null;

    return {
      studentId: student.id,
      calculatedGrade,
      reportGrade: calculatedGrade === null ? null : roundForReport(calculatedGrade),
      completedWeight: roundToTwo(completedWeight),
      missingCriteria
    };
  });
}

export function getCriteriaWeightTotal(criteria: EvaluationCriterion[]) {
  return roundToTwo(criteria.filter((criterion) => criterion.active).reduce((sum, criterion) => sum + Number(criterion.weight), 0));
}

export function roundForReport(value: number) {
  return Math.floor(value + 0.5);
}

export function buildTermPublicationSummary(reports: TermSubjectReportRow[]): TermPublicationSummary {
  const subjects = new Map<string, TermSubjectReportRow[]>();
  const students = new Map<string, TermSubjectReportRow[]>();

  reports.forEach((report) => {
    const subjectKey = `${report.course_id}:${report.subject_id}:${report.teacher_id}`;
    subjects.set(subjectKey, [...(subjects.get(subjectKey) ?? []), report]);
    students.set(report.student_id, [...(students.get(report.student_id) ?? []), report]);
  });

  const subjectGroups = Array.from(subjects.values());
  const studentGroups = Array.from(students.values());

  return {
    closedSubjects: subjectGroups.filter((group) => group.length > 0 && group.every((report) => report.status === "closed")).length,
    pendingSubjects: subjectGroups.filter((group) => group.some((report) => report.status !== "closed")).length,
    completeStudents: studentGroups.filter((group) => group.length > 0 && group.every((report) => report.status === "closed")).length,
    incompleteStudents: studentGroups.filter((group) => group.some((report) => report.status !== "closed")).length
  };
}

export async function getGradesForStudent(studentId: string): Promise<{
  grades: GradeWithLabels[];
  errorMessage: string | null;
}> {
  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const supabase = await createClient();
  const { data: student } = await supabase
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();
  if (!student) {
    return { grades: [], errorMessage: "El alumno no pertenece al centro activo." };
  }

  const { data, error } = await supabase
    .from("partial_grades")
    .select(gradeSelect)
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("student_id", studentId)
    .order("term", { ascending: true })
    .order("assessment_date", { ascending: false })
    .order("created_at", { ascending: false })
    .returns<PartialGrade[]>();

  if (error) {
    return {
      grades: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las calificaciones.")
    };
  }

  return attachGradeLabels(data ?? []);
}

export async function getTermSubjectGradesForStudent(studentId: string): Promise<{
  termGrades: TermSubjectGradeWithLabels[];
  errorMessage: string | null;
}> {
  const { schoolId, academicYearId } =
    await requireAcademicOperationContext();
  const validationClient = await createClient();
  const { data: student } = await validationClient
    .from("students")
    .select("id")
    .eq("id", studentId)
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .maybeSingle();
  if (!student) {
    return { termGrades: [], errorMessage: "El alumno no pertenece al centro activo." };
  }

  const supabase = await createGradeLabelClient();
  const { data, error } = await supabase
    .from("term_subject_grades")
    .select(termSubjectGradeSelect)
    .eq("school_id", schoolId)
    .eq("academic_year_id", academicYearId)
    .eq("student_id", studentId)
    .order("term", { ascending: true })
    .order("updated_at", { ascending: false })
    .returns<TermSubjectGrade[]>();

  if (error) {
    return {
      termGrades: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las notas trimestrales.")
    };
  }

  return attachTermSubjectGradeLabels(data ?? []);
}

export async function getFamilyGrades(familyId: string): Promise<{
  grades: GradeWithLabels[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["family"]);
  if (!schoolContext.schoolId) {
    return { grades: [], errorMessage: "No hay un centro activo seleccionado." };
  }
  const { academicYearId } = await requireAcademicOperationContext();

  const supabase = await createClient();
  const { data: relations, error: relationsError } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("school_id", schoolContext.schoolId)
    .eq("parent_id", familyId)
    .returns<{ student_id: string }[]>();

  if (relationsError) {
    return {
      grades: [],
      errorMessage: academicReadError(relationsError, "No se pudo validar la relación familiar.")
    };
  }

  const studentIds = (relations ?? []).map((relation) => relation.student_id);

  if (studentIds.length === 0) {
    return { grades: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("partial_grades")
    .select(gradeSelect)
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .in("student_id", studentIds)
    .eq("visible_to_family", true)
    .order("term", { ascending: true })
    .order("assessment_date", { ascending: false })
    .returns<PartialGrade[]>();

  if (error) {
    return {
      grades: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las calificaciones visibles.")
    };
  }

  return attachGradeLabels(data ?? []);
}

export async function getFamilyTermSubjectGrades(familyId: string): Promise<{
  termGrades: TermSubjectGradeWithLabels[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["family"]);
  if (!schoolContext.schoolId) {
    return { termGrades: [], errorMessage: "No hay un centro activo seleccionado." };
  }
  const { academicYearId } = await requireAcademicOperationContext();

  const supabase = await createClient();
  const { data: relations, error: relationsError } = await supabase
    .from("parent_students")
    .select("student_id")
    .eq("school_id", schoolContext.schoolId)
    .eq("parent_id", familyId)
    .returns<{ student_id: string }[]>();

  if (relationsError) {
    return {
      termGrades: [],
      errorMessage: academicReadError(relationsError, "No se pudo validar la relación familiar.")
    };
  }

  const studentIds = (relations ?? []).map((relation) => relation.student_id);

  if (studentIds.length === 0) {
    return { termGrades: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("term_subject_grades")
    .select(termSubjectGradeSelect)
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .in("student_id", studentIds)
    .eq("status", "closed")
    .order("term", { ascending: true })
    .returns<TermSubjectGrade[]>();

  if (error) {
    return {
      termGrades: [],
      errorMessage: academicReadError(error, "No se pudieron consultar las notas publicadas.")
    };
  }

  return attachTermSubjectGradeLabels(data ?? []);
}

export async function getAllGradesForSupervision(): Promise<{
  grades: GradeWithLabels[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["director", "superadmin"]);
  if (!schoolContext.schoolId) {
    return { grades: [], errorMessage: "Selecciona un centro para supervisar calificaciones." };
  }
  const { academicYearId } = await requireAcademicOperationContext();

  const supabase = await createGradeLabelClient();
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .returns<Array<{ id: string }>>();
  if (studentsError) {
    return {
      grades: [],
      errorMessage: academicReadError(studentsError, "No se pudieron resolver los alumnos del centro.")
    };
  }
  const studentIds = (students ?? []).map(({ id }) => id);
  if (studentIds.length === 0) {
    return { grades: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("partial_grades")
    .select(gradeSelect)
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .in("student_id", studentIds)
    .order("created_at", { ascending: false })
    .returns<PartialGrade[]>();

  if (error) {
    return {
      grades: [],
      errorMessage: academicReadError(error, "No se pudieron supervisar las calificaciones.")
    };
  }

  return attachGradeLabels(data ?? []);
}

export async function getAllEvaluationCriteriaForSupervision(): Promise<{
  criteria: EvaluationCriterionWithLabels[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["director", "superadmin"]);
  if (!schoolContext.schoolId) {
    return { criteria: [], errorMessage: "Selecciona un centro para supervisar criterios." };
  }
  const { academicYearId } = await requireAcademicOperationContext();

  const supabase = await createGradeLabelClient();
  const { data: courses, error: coursesError } = await supabase
    .from("courses")
    .select("id")
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .returns<Array<{ id: string }>>();
  if (coursesError) {
    return {
      criteria: [],
      errorMessage: academicReadError(coursesError, "No se pudieron resolver los cursos del centro.")
    };
  }
  const courseIds = (courses ?? []).map(({ id }) => id);
  if (courseIds.length === 0) {
    return { criteria: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("evaluation_criteria")
    .select(criteriaSelect)
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .in("course_id", courseIds)
    .order("created_at", { ascending: false })
    .returns<EvaluationCriterion[]>();

  if (error) {
    return {
      criteria: [],
      errorMessage: academicReadError(error, "No se pudieron supervisar los criterios.")
    };
  }

  return attachCriteriaLabels(data ?? []);
}

export async function getAllQuarterFinalGradesForSupervision(): Promise<{
  finalGrades: QuarterFinalGradeWithLabels[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["director", "superadmin"]);
  if (!schoolContext.schoolId) {
    return { finalGrades: [], errorMessage: "Selecciona un centro para supervisar cierres." };
  }
  const { academicYearId } = await requireAcademicOperationContext();

  const supabase = await createGradeLabelClient();
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .returns<Array<{ id: string }>>();
  if (studentsError) {
    return {
      finalGrades: [],
      errorMessage: academicReadError(studentsError, "No se pudieron resolver los alumnos del centro.")
    };
  }
  const studentIds = (students ?? []).map(({ id }) => id);
  if (studentIds.length === 0) {
    return { finalGrades: [], errorMessage: null };
  }

  const { data, error } = await supabase
    .from("quarter_final_grades")
    .select(finalGradeSelect)
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .in("student_id", studentIds)
    .order("created_at", { ascending: false })
    .returns<QuarterFinalGrade[]>();

  if (error) {
    return {
      finalGrades: [],
      errorMessage: academicReadError(error, "No se pudieron supervisar los cierres.")
    };
  }

  return attachFinalGradeLabels(data ?? []);
}

export async function getTermSubjectReportsForSupervision(term: GradeTerm): Promise<{
  reports: TermSubjectReportRow[];
  errorMessage: string | null;
}> {
  const schoolContext = await requireSchoolRole(["director", "superadmin"]);
  if (!schoolContext.schoolId) {
    return { reports: [], errorMessage: "Selecciona un centro para supervisar boletines." };
  }
  const { academicYearId } = await requireAcademicOperationContext();

  const supabase = await createGradeLabelClient();
  const { data: scopedStudents, error: scopedStudentsError } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolContext.schoolId)
    .eq("academic_year_id", academicYearId)
    .returns<Array<{ id: string }>>();
  const studentIds = (scopedStudents ?? []).map(({ id }) => id);
  if (scopedStudentsError) {
    return {
      reports: [],
      errorMessage: academicReadError(scopedStudentsError, "No se pudieron resolver los alumnos del centro.")
    };
  }
  if (studentIds.length === 0) {
    return { reports: [], errorMessage: null };
  }

  const [
    { data: students, error: studentsError },
    { data: assignments, error: assignmentsError },
    { data: subjects, error: subjectsError },
    { data: courses, error: coursesError },
    { data: profiles, error: profilesError },
    { data: termGrades, error: termGradesError }
  ] = await Promise.all([
    supabase.from("students").select("id,name,last_name,course_id").eq("school_id", schoolContext.schoolId).eq("academic_year_id", academicYearId).eq("active", true).returns<ReportStudentLabel[]>(),
    supabase.from("teacher_assignments").select("teacher_id,course_id,subject_id").eq("school_id", schoolContext.schoolId).eq("academic_year_id", academicYearId).returns<AssignmentLabel[]>(),
    supabase.from("subjects").select("id,name").eq("school_id", schoolContext.schoolId).returns<Subject[]>(),
    supabase.from("courses").select("id,name").eq("school_id", schoolContext.schoolId).eq("academic_year_id", academicYearId).returns<CourseLabel[]>(),
    supabase.from("profiles").select("id,email,full_name").returns<ProfileLabel[]>(),
    supabase.from("term_subject_grades").select(termSubjectGradeSelect).eq("school_id", schoolContext.schoolId).eq("academic_year_id", academicYearId).in("student_id", studentIds).eq("term", term).returns<TermSubjectGrade[]>()
  ]);
  const errorMessage =
    studentsError ||
    assignmentsError ||
    subjectsError ||
    coursesError ||
    profilesError ||
    termGradesError
      ? "No se pudo construir la supervisión de boletines."
      : null;

  if (errorMessage) {
    return { reports: [], errorMessage };
  }

  const subjectsById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
  const gradesByKey = new Map(
    (termGrades ?? []).map((grade) => [
      `${grade.student_id}:${grade.subject_id}:${grade.teacher_id}:${grade.course_id}:${grade.term}`,
      grade
    ])
  );
  const validAssignments = (assignments ?? []).filter(
    (assignment): assignment is { teacher_id: string; course_id: string; subject_id: string } =>
      Boolean(assignment.subject_id)
  );
  const rows: TermSubjectReportRow[] = [];

  (students ?? []).forEach((student) => {
    validAssignments
      .filter((assignment) => assignment.course_id === student.course_id)
      .forEach((assignment) => {
        const key = `${student.id}:${assignment.subject_id}:${assignment.teacher_id}:${assignment.course_id}:${term}`;
        const grade = gradesByKey.get(key);
        const teacher = profilesById.get(assignment.teacher_id);

        rows.push({
          key,
          student_id: student.id,
          studentName: `${student.name} ${student.last_name}`,
          subject_id: assignment.subject_id,
          subjectName: subjectsById.get(assignment.subject_id)?.name ?? assignment.subject_id,
          teacher_id: assignment.teacher_id,
          teacherName: teacher?.full_name ?? teacher?.email ?? assignment.teacher_id,
          course_id: assignment.course_id,
          courseName: coursesById.get(assignment.course_id)?.name ?? assignment.course_id,
          term,
          status: grade?.status ?? "pending",
          calculated_grade: grade?.calculated_grade ?? null,
          final_grade: grade?.final_grade ?? null,
          final_observation: grade?.final_observation ?? null,
          closed_at: grade?.closed_at ?? null
        });
      });
  });

  return {
    reports: rows.sort((a, b) => {
      const courseCompare = a.courseName.localeCompare(b.courseName, "es");
      if (courseCompare !== 0) return courseCompare;
      const studentCompare = a.studentName.localeCompare(b.studentName, "es");
      if (studentCompare !== 0) return studentCompare;
      return a.subjectName.localeCompare(b.subjectName, "es");
    }),
    errorMessage: null
  };
}

async function attachGradeLabels(grades: PartialGrade[]): Promise<{
  grades: GradeWithLabels[];
  errorMessage: string | null;
}> {
  if (grades.length === 0) {
    return { grades: [], errorMessage: null };
  }

  const { schoolId } = await requireOperationalSchoolContext();
  const supabase = await createGradeLabelClient();
  const studentIds = Array.from(new Set(grades.map((grade) => grade.student_id)));
  const subjectIds = Array.from(new Set(grades.map((grade) => grade.subject_id)));
  const teacherIds = Array.from(new Set(grades.map((grade) => grade.teacher_id)));

  const [
    { data: students, error: studentsError },
    { data: subjects, error: subjectsError },
    { data: profiles, error: profilesError }
  ] = await Promise.all([
    supabase.from("students").select("id,name,last_name").eq("school_id", schoolId).in("id", studentIds).returns<StudentLabel[]>(),
    supabase.from("subjects").select("id,name").eq("school_id", schoolId).in("id", subjectIds).returns<Subject[]>(),
    supabase.from("profiles").select("id,email,full_name").in("id", teacherIds).returns<ProfileLabel[]>()
  ]);

  const errorMessage =
    studentsError || subjectsError || profilesError
      ? "No se pudieron resolver las etiquetas de calificaciones."
      : null;

  if (errorMessage) {
    return { grades: [], errorMessage };
  }

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const subjectsById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return {
    errorMessage: null,
    grades: grades.map((grade) => {
      const student = studentsById.get(grade.student_id);
      const subject = subjectsById.get(grade.subject_id);
      const teacher = profilesById.get(grade.teacher_id);

      return {
        ...grade,
        studentName: student ? `${student.name} ${student.last_name}` : grade.student_id,
        subjectName: subject?.name ?? grade.subject_id,
        teacherName: teacher?.full_name ?? teacher?.email ?? grade.teacher_id
      };
    })
  };
}

async function attachCriteriaLabels(criteria: EvaluationCriterion[]): Promise<{
  criteria: EvaluationCriterionWithLabels[];
  errorMessage: string | null;
}> {
  if (criteria.length === 0) {
    return { criteria: [], errorMessage: null };
  }

  const { schoolId } = await requireOperationalSchoolContext();
  const supabase = await createGradeLabelClient();
  const subjectIds = Array.from(new Set(criteria.map((criterion) => criterion.subject_id)));
  const courseIds = Array.from(new Set(criteria.map((criterion) => criterion.course_id)));
  const teacherIds = Array.from(new Set(criteria.map((criterion) => criterion.teacher_id)));
  const [
    { data: subjects, error: subjectsError },
    { data: courses, error: coursesError },
    { data: profiles, error: profilesError }
  ] = await Promise.all([
    supabase.from("subjects").select("id,name").eq("school_id", schoolId).in("id", subjectIds).returns<Subject[]>(),
    supabase.from("courses").select("id,name").eq("school_id", schoolId).in("id", courseIds).returns<CourseLabel[]>(),
    supabase.from("profiles").select("id,email,full_name").in("id", teacherIds).returns<ProfileLabel[]>()
  ]);
  const errorMessage =
    subjectsError || coursesError || profilesError
      ? "No se pudieron resolver las etiquetas de criterios."
      : null;

  if (errorMessage) {
    return { criteria: [], errorMessage };
  }

  const subjectsById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return {
    errorMessage: null,
    criteria: criteria.map((criterion) => {
      const teacher = profilesById.get(criterion.teacher_id);

      return {
        ...criterion,
        subjectName: subjectsById.get(criterion.subject_id)?.name ?? criterion.subject_id,
        courseName: coursesById.get(criterion.course_id)?.name ?? criterion.course_id,
        teacherName: teacher?.full_name ?? teacher?.email ?? criterion.teacher_id
      };
    })
  };
}

async function attachFinalGradeLabels(finalGrades: QuarterFinalGrade[]): Promise<{
  finalGrades: QuarterFinalGradeWithLabels[];
  errorMessage: string | null;
}> {
  if (finalGrades.length === 0) {
    return { finalGrades: [], errorMessage: null };
  }

  const { schoolId } = await requireOperationalSchoolContext();
  const supabase = await createGradeLabelClient();
  const studentIds = Array.from(new Set(finalGrades.map((grade) => grade.student_id)));
  const subjectIds = Array.from(new Set(finalGrades.map((grade) => grade.subject_id)));
  const courseIds = Array.from(new Set(finalGrades.map((grade) => grade.course_id)));
  const teacherIds = Array.from(new Set(finalGrades.map((grade) => grade.teacher_id)));
  const [
    { data: students, error: studentsError },
    { data: subjects, error: subjectsError },
    { data: courses, error: coursesError },
    { data: profiles, error: profilesError }
  ] = await Promise.all([
    supabase.from("students").select("id,name,last_name").eq("school_id", schoolId).in("id", studentIds).returns<StudentLabel[]>(),
    supabase.from("subjects").select("id,name").eq("school_id", schoolId).in("id", subjectIds).returns<Subject[]>(),
    supabase.from("courses").select("id,name").eq("school_id", schoolId).in("id", courseIds).returns<CourseLabel[]>(),
    supabase.from("profiles").select("id,email,full_name").in("id", teacherIds).returns<ProfileLabel[]>()
  ]);
  const errorMessage =
    studentsError || subjectsError || coursesError || profilesError
      ? "No se pudieron resolver las etiquetas de notas finales."
      : null;

  if (errorMessage) {
    return { finalGrades: [], errorMessage };
  }

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const subjectsById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return {
    errorMessage: null,
    finalGrades: finalGrades.map((grade) => {
      const student = studentsById.get(grade.student_id);
      const teacher = profilesById.get(grade.teacher_id);

      return {
        ...grade,
        studentName: student ? `${student.name} ${student.last_name}` : grade.student_id,
        subjectName: subjectsById.get(grade.subject_id)?.name ?? grade.subject_id,
        courseName: coursesById.get(grade.course_id)?.name ?? grade.course_id,
        teacherName: teacher?.full_name ?? teacher?.email ?? grade.teacher_id
      };
    })
  };
}

async function attachTermSubjectGradeLabels(termGrades: TermSubjectGrade[]): Promise<{
  termGrades: TermSubjectGradeWithLabels[];
  errorMessage: string | null;
}> {
  if (termGrades.length === 0) {
    return { termGrades: [], errorMessage: null };
  }

  const { schoolId } = await requireOperationalSchoolContext();
  const supabase = await createGradeLabelClient();
  const studentIds = Array.from(new Set(termGrades.map((grade) => grade.student_id)));
  const subjectIds = Array.from(new Set(termGrades.map((grade) => grade.subject_id)));
  const courseIds = Array.from(new Set(termGrades.map((grade) => grade.course_id)));
  const teacherIds = Array.from(new Set(termGrades.map((grade) => grade.teacher_id)));
  const [
    { data: students, error: studentsError },
    { data: subjects, error: subjectsError },
    { data: courses, error: coursesError },
    { data: profiles, error: profilesError }
  ] = await Promise.all([
    supabase.from("students").select("id,name,last_name").eq("school_id", schoolId).in("id", studentIds).returns<StudentLabel[]>(),
    supabase.from("subjects").select("id,name").eq("school_id", schoolId).in("id", subjectIds).returns<Subject[]>(),
    supabase.from("courses").select("id,name").eq("school_id", schoolId).in("id", courseIds).returns<CourseLabel[]>(),
    supabase.from("profiles").select("id,email,full_name").in("id", teacherIds).returns<ProfileLabel[]>()
  ]);
  const errorMessage =
    studentsError || subjectsError || coursesError || profilesError
      ? "No se pudieron resolver las etiquetas de notas trimestrales."
      : null;

  if (errorMessage) {
    return { termGrades: [], errorMessage };
  }

  const studentsById = new Map((students ?? []).map((student) => [student.id, student]));
  const subjectsById = new Map((subjects ?? []).map((subject) => [subject.id, subject]));
  const coursesById = new Map((courses ?? []).map((course) => [course.id, course]));
  const profilesById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  return {
    errorMessage: null,
    termGrades: termGrades.map((grade) => {
      const student = studentsById.get(grade.student_id);
      const teacher = profilesById.get(grade.teacher_id);

      return {
        ...grade,
        studentName: student ? `${student.name} ${student.last_name}` : grade.student_id,
        subjectName: subjectsById.get(grade.subject_id)?.name ?? grade.subject_id,
        courseName: coursesById.get(grade.course_id)?.name ?? grade.course_id,
        teacherName: teacher?.full_name ?? teacher?.email ?? grade.teacher_id
      };
    })
  };
}

function findGradeForCriterion(grades: PartialGrade[], criterion: EvaluationCriterion) {
  return grades.find((grade) => {
    const sameName = normalizeGradeName(grade.assessment_name) === normalizeGradeName(criterion.name);

    if (!sameName) {
      return false;
    }

    if (criterion.criterion_type === "parcial" || criterion.criterion_type === "trimestral") {
      return grade.assessment_type === criterion.criterion_type;
    }

    return true;
  });
}

function normalizeGradeName(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function roundToTwo(value: number) {
  return Math.round(value * 100) / 100;
}

async function createGradeLabelClient(): Promise<GradeLabelClient> {
  if (hasSupabaseAdminClient()) {
    return createAdminClient();
  }

  return (await createClient()) as unknown as GradeLabelClient;
}

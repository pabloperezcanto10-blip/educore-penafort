import Link from "next/link";
import {
  BookOpenCheck,
  CheckCircle2,
  Copy,
  Eye,
  Search,
  Upload,
  Users
} from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getActiveCourses } from "@/lib/courses";
import {
  GradebookBadge,
  GradebookCard,
  GradebookCardHeader,
  IconStat,
  ProgressBar,
  ProgressRing,
  StudentAvatar,
  ToggleSwitch
} from "@/components/grades/gradebook-design";
import {
  getAssignedCoursesForTeacher,
  getAssignedSubjectsForTeacherCourse,
  calculateStudentFinalGrades,
  getCriteriaWeightTotal,
  getEvaluationCriteria,
  getEvaluationPublication,
  getGradebookGrades,
  getGradebookGradesForTerm,
  getTermSubjectGrades,
  getStudentsForCourse,
  type AssessmentType,
  type CalculatedStudentGrade,
  type EvaluationCriterion,
  type GradeTerm,
  type GradebookStudent,
  type PartialGrade,
  type TermSubjectGrade
} from "@/lib/grades/grades";
import { GradebookSubmitButton } from "@/components/grades/gradebook-submit-button";
import {
  formatGradeValue,
  getCompletedCriteriaCount,
  getGradebookStatusLabel,
  getGradebookStatusTone,
  getGradebookStudentStatus,
  getStudentProgressLabel,
  getStudentProgressPercent
} from "@/components/grades/gradebook-status";
import { GradebookFilters } from "./filters";
import { reopenTermSubjectGrade, saveGradebook, saveTermSubjectGrades } from "./actions";

type TutorGradebookPageProps = {
  searchParams: {
    course_id?: string;
    subject_id?: string;
    term?: string;
    criterion_id?: string;
    assessment_type?: string;
    assessment_name?: string;
    assessment_date?: string;
  };
};

export default async function TutorGradebookPage({ searchParams }: TutorGradebookPageProps) {
  const profile = await requireRole("tutor");
  const term = normalizeTerm(searchParams.term);
  const assessmentDate = searchParams.assessment_date?.trim() || getTodayDateValue();
  const [
    { courses: assignedCourses, errorMessage: assignedCoursesError },
    { courses, errorMessage: coursesError }
  ] = await Promise.all([
    getAssignedCoursesForTeacher(profile.id),
    getActiveCourses()
  ]);
  const requestedCourseId = searchParams.course_id ?? "";
  const courseId = courses.some((course) => course.id === requestedCourseId)
    ? requestedCourseId
    : assignedCourses[0]?.id ?? courses[0]?.id ?? "";
  const { subjects, errorMessage: subjectsError } = await getAssignedSubjectsForTeacherCourse(profile.id, courseId);
  const requestedSubjectId = searchParams.subject_id ?? "";
  const subjectId = subjects.some((subject) => subject.id === requestedSubjectId)
    ? requestedSubjectId
    : subjects.length === 1
      ? subjects[0].id
      : "";
  const [
    { criteria, errorMessage: criteriaError },
    { grades: termGrades, errorMessage: termGradesError },
    { termGrades: officialTermGrades, errorMessage: officialTermGradesError },
    { publication, errorMessage: publicationError }
  ] = await Promise.all([
    courseId && subjectId
      ? getEvaluationCriteria({ teacherId: profile.id, courseId, subjectId, term })
      : Promise.resolve({ criteria: [], errorMessage: null }),
    courseId && subjectId
      ? getGradebookGradesForTerm({ teacherId: profile.id, courseId, subjectId, term })
      : Promise.resolve({ grades: [], errorMessage: null }),
    courseId && subjectId
      ? getTermSubjectGrades({ teacherId: profile.id, courseId, subjectId, term })
      : Promise.resolve({ termGrades: [], errorMessage: null }),
    courseId ? getEvaluationPublication({ courseId, term }) : Promise.resolve({ publication: null, errorMessage: null })
  ]);
  const activeCriteria = criteria.filter((criterion) => criterion.active);
  const requestedCriterionId = searchParams.criterion_id ?? "";
  const selectedCriterion =
    activeCriteria.find((criterion) => criterion.id === requestedCriterionId) ??
    (activeCriteria.length === 1 ? activeCriteria[0] : null);
  const assessmentName = selectedCriterion?.name ?? "";
  const assessmentType = getAssessmentTypeForCriterion(selectedCriterion);
  const canLoadGradebook = Boolean(courseId && subjectId && selectedCriterion);
  const [
    { students, errorMessage: studentsError },
    { grades, errorMessage: gradesError }
  ] = await Promise.all([
    canLoadGradebook ? getStudentsForCourse(courseId) : Promise.resolve({ students: [], errorMessage: null }),
    canLoadGradebook
      ? getGradebookGrades({
          courseId,
          subjectId,
          term,
          assessmentType,
          assessmentName
        })
      : Promise.resolve({ grades: [], errorMessage: null })
  ]);
  const gradesByStudent = new Map(grades.map((grade) => [grade.student_id, grade]));
  const calculatedGrades = calculateStudentFinalGrades({ students, criteria, grades: termGrades });
  const calculatedByStudent = new Map(calculatedGrades.map((grade) => [grade.studentId, grade]));
  const termGradeByStudent = new Map(officialTermGrades.map((grade) => [grade.student_id, grade]));
  const criteriaWeightTotal = getCriteriaWeightTotal(criteria);
  const criteriaCount = activeCriteria.length;
  const totalExpectedCriteria = students.length * criteriaCount;
  const totalCompletedCriteria = students.reduce((total, student) => {
    const calculated = calculatedByStudent.get(student.id);
    return total + getCompletedCriteriaCount(criteriaCount, calculated);
  }, 0);
  const evaluationProgress =
    totalExpectedCriteria > 0 ? Math.round((totalCompletedCriteria / totalExpectedCriteria) * 100) : 0;
  const missingCriteriaCount = Math.max(totalExpectedCriteria - totalCompletedCriteria, 0);
  const errorMessage =
    coursesError ??
    assignedCoursesError ??
    subjectsError ??
    studentsError ??
    gradesError ??
    criteriaError ??
    termGradesError ??
    officialTermGradesError ??
    publicationError;

  return (
    <section className="space-y-4">
      <div className="mb-1">
        <h1 className="text-[28px] font-bold tracking-normal text-slate-900">Cuaderno de calificaciones</h1>
        <p className="mt-1 text-[13px] text-slate-500">Calificación rápida de una prueba para todo el curso.</p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar el cuaderno: {errorMessage}
        </div>
      ) : null}

      <GradebookFilters
        courses={courses}
        subjects={subjects}
        courseId={courseId}
        subjectId={subjectId}
        term={term}
        criteria={activeCriteria}
        criterionId={selectedCriterion?.id ?? ""}
        assessmentDate={assessmentDate}
      />

      {courseId && subjectId ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <EvaluationStatusCard
            progress={evaluationProgress}
            completed={totalCompletedCriteria}
            total={totalExpectedCriteria}
          />
          <EvaluationCriteriaSummary
            criteria={criteria}
            weightTotal={criteriaWeightTotal}
            completed={totalCompletedCriteria}
            pending={missingCriteriaCount}
          />
        </section>
      ) : null}

      {courseId && subjectId && students.length > 0 ? (
        <FinalGradesSection
          courseId={courseId}
          subjectId={subjectId}
          term={term}
          students={students}
          calculatedGrades={calculatedGrades}
          termGrades={officialTermGrades}
          criteriaReady={criteriaWeightTotal === 100}
          criteriaCount={criteria.filter((criterion) => criterion.active).length}
          isPublished={publication?.published ?? false}
          publishedAt={publication?.published_at ?? null}
        />
      ) : null}
      {!courseId ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          Selecciona un curso para cargar las materias asignadas.
        </div>
      ) : subjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay materias asignadas para este curso.
        </div>
      ) : !subjectId ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          Selecciona una materia para cargar el cuaderno.
        </div>
      ) : activeCriteria.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay criterios configurados para esta materia y trimestre.
        </div>
      ) : !selectedCriterion ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          Selecciona un criterio para cargar el cuaderno.
        </div>
      ) : students.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay alumnos activos en este curso.
        </div>
      ) : (
        <form action={saveGradebook} className="space-y-4">
          <input type="hidden" name="course_id" value={courseId} />
          <input type="hidden" name="subject_id" value={subjectId} />
          <input type="hidden" name="term" value={term} />
          <input type="hidden" name="assessment_type" value={assessmentType} />
          <input type="hidden" name="assessment_name" value={assessmentName} />
          <input type="hidden" name="assessment_date" value={assessmentDate} />

          <GradebookEditableTable
            students={students}
            gradesByStudent={gradesByStudent}
            calculatedByStudent={calculatedByStudent}
            termGradeByStudent={termGradeByStudent}
            criteriaCount={criteriaCount}
            selectedCriterionName={assessmentName}
          />
          <SaveFooter />
        </form>
      )}


      <Link href="/dashboard/tutor" className="inline-flex text-sm font-medium text-primary hover:underline">
        Volver al dashboard
      </Link>
    </section>
  );
}

function EvaluationStatusCard({
  progress,
  completed,
  total
}: {
  progress: number;
  completed: number;
  total: number;
}) {
  return (
    <GradebookCard className="p-6">
      <p className="text-lg font-semibold text-slate-900">Estado de la evaluación</p>
      <div className="mt-3 flex items-center gap-6">
        <ProgressRing value={progress} />
        <div>
          <div className="text-[28px] font-bold leading-none text-slate-900">{completed} / {total}</div>
          <div className="mt-1 text-[13px] text-slate-500">criterios completados</div>
          <div className="mt-2 flex items-center gap-1 text-[13px] font-medium text-emerald-600">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            {progress === 100 ? "Evaluación lista para cerrar" : "Evaluación en progreso"}
          </div>
        </div>
      </div>
    </GradebookCard>
  );
}

function EvaluationCriteriaSummary({
  criteria,
  weightTotal,
  completed,
  pending
}: {
  criteria: EvaluationCriterion[];
  weightTotal: number;
  completed: number;
  pending: number;
}) {
  const activeCriteria = criteria.filter((criterion) => criterion.active);
  const isComplete = activeCriteria.length > 0 && weightTotal === 100;
  const inactiveCriteria = Math.max(criteria.length - activeCriteria.length, 0);

  return (
    <GradebookCard className="p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-[15px] font-semibold text-slate-900">Criterios aplicados</p>
        <GradebookBadge tone={isComplete ? "green" : "amber"}>{isComplete ? "Completo" : "Incompleto"}</GradebookBadge>
      </div>
      <div className="flex flex-wrap gap-6">
        <IconStat icon={Users} value={completed} label="Completados" tone="green" />
        <IconStat icon={Copy} value={inactiveCriteria} label="Inactivos" tone="slate" />
        <IconStat icon={Upload} value={pending} label="Sin calificar" tone="amber" />
      </div>
      <div className="mt-4 flex justify-end">
        <Link
          href="/dashboard/tutor/evaluation-settings"
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <Eye className="h-3.5 w-3.5" aria-hidden="true" />
          Ver criterios
        </Link>
      </div>
    </GradebookCard>
  );
}

function GradebookEditableTable({
  students,
  gradesByStudent,
  calculatedByStudent,
  termGradeByStudent,
  criteriaCount,
  selectedCriterionName
}: {
  students: GradebookStudent[];
  gradesByStudent: Map<string, PartialGrade>;
  calculatedByStudent: Map<string, CalculatedStudentGrade>;
  termGradeByStudent: Map<string, TermSubjectGrade>;
  criteriaCount: number;
  selectedCriterionName: string;
}) {
  return (
    <GradebookCard>
      <GradebookCardHeader title={`Alumnos (${students.length})`}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            className="h-9 w-[220px] rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[13px] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
            placeholder="Buscar alumno..."
            type="search"
          />
        </div>
      </GradebookCardHeader>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Alumno</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Nota</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Observación</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Recomendación</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Visible familia</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <GradebookStudentRow
                key={student.id}
                student={student}
                grade={gradesByStudent.get(student.id)}
                calculated={calculatedByStudent.get(student.id)}
                termGrade={termGradeByStudent.get(student.id)}
                criteriaCount={criteriaCount}
                selectedCriterionName={selectedCriterionName}
              />
            ))}
          </tbody>
        </table>
      </div>
    </GradebookCard>
  );
}
function GradebookStudentRow({
  student,
  grade,
  calculated,
  termGrade,
  criteriaCount,
  selectedCriterionName
}: {
  student: GradebookStudent;
  grade?: PartialGrade;
  calculated?: CalculatedStudentGrade;
  termGrade?: TermSubjectGrade;
  criteriaCount: number;
  selectedCriterionName: string;
}) {
  const fullName = `${student.name} ${student.last_name}`;
  const status = getGradebookStudentStatus({ criteriaCount, calculated, termGrade, selectedGrade: grade });
  const progressPercent = getStudentProgressPercent(criteriaCount, calculated);
  const completedCriteria = getCompletedCriteriaCount(criteriaCount, calculated);

  return (
    <tr className="border-b border-slate-200 transition last:border-b-0 hover:bg-slate-50">
      <td className="px-4 py-3 align-top">
        <input type="hidden" name="student_id" value={student.id} />
        <div className="flex items-center gap-2.5">
          <StudentAvatar name={fullName} />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-[13px] font-semibold text-slate-900">{fullName}</p>
              <GradebookBadge tone={getGradebookStatusTone(status)}>{getGradebookStatusLabel(status)}</GradebookBadge>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">Criterio: {selectedCriterionName || "Sin criterio seleccionado"}</p>
            <div className="mt-2 flex items-center gap-2">
              <div className="w-24">
                <ProgressBar value={progressPercent} />
              </div>
              <span className="text-[11px] text-slate-500">{completedCriteria}/{criteriaCount}</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              Calculada {formatGradeValue(calculated?.calculatedGrade)} · Boletín {formatGradeValue(calculated?.reportGrade)} · Final {formatGradeValue(termGrade?.final_grade)}
            </p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center">
          <input
            name={`grade_${student.id}`}
            type="number"
            min="0"
            max="10"
            step="0.01"
            defaultValue={grade?.grade ?? ""}
            className={`h-9 w-20 rounded-md border px-2 text-center text-[13px] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10 ${getGradeColor(grade?.grade)}`}
          />
          <span className="ml-1 text-[12px] text-slate-400">/10</span>
        </div>
      </td>
      <td className="min-w-[220px] px-4 py-3 align-top">
        <textarea
          name={`comment_${student.id}`}
          rows={2}
          defaultValue={grade?.comment ?? ""}
          placeholder="Observación..."
          className="min-h-[58px] w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
        />
      </td>
      <td className="min-w-[220px] px-4 py-3 align-top">
        <textarea
          name={`recommendation_${student.id}`}
          rows={2}
          defaultValue={grade?.recommendation ?? ""}
          placeholder="Recomendación..."
          className="min-h-[58px] w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] outline-none transition focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
        />
      </td>
      <td className="px-4 py-3 align-top">
        <ToggleSwitch name={`visible_${student.id}`} defaultChecked={grade?.visible_to_family ?? true} />
      </td>
    </tr>
  );
}
function SaveFooter() {
  return (
    <GradebookCard>
      <div className="flex flex-col gap-3 bg-white px-5 py-4 sm:flex-row sm:items-center">
        <GradebookSubmitButton
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          pendingChildren="Guardando..."
        >
          <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Guardar borrador
        </GradebookSubmitButton>
        <div className="flex items-center gap-2 text-[13px] text-emerald-600">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          Listo para guardar cambios
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <Link
            href="/dashboard/tutor"
            className="inline-flex h-10 items-center justify-center rounded-md border border-slate-200 bg-white px-4 text-[13px] font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            Cancelar
          </Link>
          <GradebookSubmitButton
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-800 px-4 text-[13px] font-semibold text-white shadow-sm transition hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
            pendingChildren="Guardando..."
          >
            <BookOpenCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Guardar calificaciones
          </GradebookSubmitButton>
        </div>
      </div>
    </GradebookCard>
  );
}

function FinalGradesSection({
  courseId,
  subjectId,
  term,
  students,
  calculatedGrades,
  termGrades,
  criteriaReady,
  criteriaCount,
  isPublished,
  publishedAt
}: {
  courseId: string;
  subjectId: string;
  term: GradeTerm;
  students: { id: string; name: string; last_name: string }[];
  calculatedGrades: CalculatedStudentGrade[];
  termGrades: TermSubjectGrade[];
  criteriaReady: boolean;
  criteriaCount: number;
  isPublished: boolean;
  publishedAt: string | null;
}) {
  const calculatedByStudent = new Map(calculatedGrades.map((grade) => [grade.studentId, grade]));
  const termGradeByStudent = new Map(termGrades.map((grade) => [grade.student_id, grade]));
  const hasMissingGrades = students.some((student) => {
    const calculated = calculatedByStudent.get(student.id);

    return !calculated || calculated.calculatedGrade === null || calculated.missingCriteria.length > 0;
  });
  const closedStudents = students.filter((student) => termGradeByStudent.get(student.id)?.status === "closed");
  const editableStudents = students.filter((student) => termGradeByStudent.get(student.id)?.status !== "closed");
  const totalExpectedCriteria = students.length * criteriaCount;
  const totalCompletedCriteria = students.reduce((total, student) => {
    const calculated = calculatedByStudent.get(student.id);
    return total + getCompletedCriteriaCount(criteriaCount, calculated);
  }, 0);
  const progressLabel =
    totalExpectedCriteria > 0 && totalCompletedCriteria === totalExpectedCriteria
      ? "100% completado"
      : `${totalCompletedCriteria}/${totalExpectedCriteria} criterios completados`;

  return (
    <GradebookCard>
      <details className="group">
        <summary className="flex cursor-pointer list-none flex-col gap-3 p-5 outline-none transition hover:bg-slate-50 sm:flex-row sm:items-start sm:justify-between [&::-webkit-details-marker]:hidden">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-800">Acción final</p>
            <h2 className="mt-1 text-[15px] font-semibold text-slate-900">Cierre de evaluación</h2>
            <p className="mt-1 text-[13px] text-slate-500">
              Revisa la nota propuesta, ajusta si hace falta y cierra la evaluación trimestral.
            </p>
          </div>
          <div className="flex min-w-[220px] items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
            <div>
              <p className="text-xs font-medium text-slate-500">Progreso de evaluación</p>
              <p className="mt-1 font-semibold text-slate-900">{progressLabel}</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 group-open:hidden">
              Abrir
            </span>
            <span className="hidden rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 group-open:inline-flex">
              Ocultar
            </span>
          </div>
        </summary>

        <div className="space-y-4 border-t border-slate-200 p-5">
      {isPublished ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Evaluación publicada{publishedAt ? ` el ${formatDateTime(publishedAt)}` : ""}. Las notas finales quedan bloqueadas hasta una reapertura administrativa.
        </div>
      ) : null}

      {!criteriaReady ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          Completa los criterios hasta sumar exactamente 100% para guardar notas trimestrales.
        </div>
      ) : (
        <div className="space-y-3">
          {hasMissingGrades ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
              Faltan calificaciones para calcular la nota completa. Puedes guardar borrador, pero no cerrar la materia.
            </div>
          ) : null}
          {closedStudents.map((student) => {
            const calculated = calculatedByStudent.get(student.id);
            const saved = termGradeByStudent.get(student.id)!;
            const proposed =
              calculated && calculated.missingCriteria.length === 0 ? calculated.calculatedGrade : null;
            const report = proposed === null ? null : calculated?.reportGrade;

            return (
              <ClosedTermGradeCard
                key={student.id}
                student={student}
                saved={saved}
                proposed={proposed}
                report={report}
                progressLabel={getStudentProgressLabel(criteriaCount, calculated)}
                missingCriteria={calculated?.missingCriteria ?? []}
                isPublished={isPublished}
              />
            );
          })}

          {editableStudents.length === 0 ? null : (
          <form action={saveTermSubjectGrades} className="space-y-3">
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="subject_id" value={subjectId} />
            <input type="hidden" name="term" value={term} />
            {editableStudents.map((student) => {
              const calculated = calculatedByStudent.get(student.id);
              const saved = termGradeByStudent.get(student.id);
              const proposed =
                calculated && calculated.missingCriteria.length === 0 ? calculated.calculatedGrade : null;
              const report = proposed === null ? null : calculated?.reportGrade;

              return (
                <article key={student.id} className="rounded-md border border-border bg-white p-4">
                  <input type="hidden" name="student_id" value={student.id} />
                  <input type="hidden" name={`calculated_${student.id}`} value={proposed ?? ""} />
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {student.name} {student.last_name}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Progreso de evaluación: {getStudentProgressLabel(criteriaCount, calculated)}
                      </p>
                    </div>
                    <span className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ${saved ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                      Estado actual: {saved ? "Borrador" : "Pendiente"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[110px_110px_120px_1fr] md:items-start">
                    <SummaryBox label="Nota calculada" value={proposed === null || proposed === undefined ? "-" : String(proposed)} />
                    <SummaryBox label="Nota boletín" value={report === null || report === undefined ? "-" : String(report)} />
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Ajuste manual</span>
                      <input
                        name={`final_${student.id}`}
                        type="number"
                        min="0"
                        max="10"
                        step="1"
                        defaultValue={saved?.final_grade ?? report ?? ""}
                        disabled={isPublished}
                        className="h-10 w-full rounded-md border border-border px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">Observación final</span>
                      <textarea
                        name={`observation_${student.id}`}
                        rows={1}
                        defaultValue={saved?.final_observation ?? ""}
                        disabled={isPublished}
                        className="w-full rounded-md border border-border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                      />
                    </label>
                  </div>
                  {calculated && calculated.missingCriteria.length > 0 ? (
                    <MissingCriteriaList missingCriteria={calculated.missingCriteria} />
                  ) : null}
                </article>
              );
            })}
            <div className="flex flex-wrap gap-2">
              <GradebookSubmitButton
                name="intent"
                value="draft"
                disabled={isPublished}
                className="h-11 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                pendingChildren="Guardando borrador..."
              >
                Guardar borrador
              </GradebookSubmitButton>
              <GradebookSubmitButton
                name="intent"
                value="closed"
                disabled={hasMissingGrades || isPublished}
                className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                pendingChildren="Cerrando..."
              >
                Cerrar evaluación
              </GradebookSubmitButton>
            </div>
          </form>
          )}
        </div>
      )}
        </div>
      </details>
    </GradebookCard>
  );
}

function ClosedTermGradeCard({
  student,
  saved,
  proposed,
  report,
  progressLabel,
  missingCriteria,
  isPublished
}: {
  student: { id: string; name: string; last_name: string };
  saved: TermSubjectGrade;
  proposed: number | null;
  report: number | null | undefined;
  progressLabel: string;
  missingCriteria: string[];
  isPublished: boolean;
}) {
  return (
    <article className="rounded-md border border-emerald-200 bg-emerald-50/40 p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {student.name} {student.last_name}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Progreso de evaluación: {progressLabel}</p>
        </div>
        <span className="w-fit rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          Estado actual: Cerrada
        </span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[110px_110px_110px_1fr_auto] md:items-start">
        <SummaryBox label="Nota calculada" value={proposed === null || proposed === undefined ? "-" : String(proposed)} />
        <SummaryBox label="Nota boletín" value={report === null || report === undefined ? "-" : String(report)} />
        <SummaryBox label="Nota final" value={saved.final_grade === null ? "-" : String(saved.final_grade)} />
        <div>
          <p className="text-xs font-medium text-muted-foreground">Observación final</p>
          <p className="mt-2 text-sm text-muted-foreground">{saved.final_observation || "Sin observación"}</p>
        </div>
        <ReopenButton gradeId={saved.id} disabled={isPublished} />
      </div>
      {missingCriteria.length > 0 ? <MissingCriteriaList missingCriteria={missingCriteria} /> : null}
    </article>
  );
}

function ReopenButton({ gradeId, disabled }: { gradeId: string; disabled: boolean }) {
  return (
    <form action={reopenTermSubjectGrade}>
      <input type="hidden" name="term_subject_grade_id" value={gradeId} />
      <button
        disabled={disabled}
        className="h-10 rounded-md border border-border bg-white px-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
      >
        Reabrir
      </button>
    </form>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function MissingCriteriaList({ missingCriteria }: { missingCriteria: string[] }) {
  return (
    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3">
      <p className="text-xs font-semibold text-amber-800">Faltan notas en:</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {missingCriteria.map((criterion) => (
          <span key={criterion} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-amber-800">
            {criterion}
          </span>
        ))}
      </div>
    </div>
  );
}


function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function normalizeTerm(value: unknown): GradeTerm {
  return value === "2" || value === "3" ? value : "1";
}

function getAssessmentTypeForCriterion(criterion: EvaluationCriterion | null): AssessmentType {
  if (criterion?.criterion_type === "trimestral") {
    return "trimestral";
  }

  return "parcial";
}

function getTodayDateValue() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

function getGradeColor(grade?: number) {
  if (grade === undefined || grade === null) {
    return "border-border bg-white";
  }

  if (grade < 5) {
    return "border-red-200 bg-red-50 text-red-800";
  }

  if (grade < 7) {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }

  if (grade < 9) {
    return "border-sky-200 bg-sky-50 text-sky-900";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-900";
}













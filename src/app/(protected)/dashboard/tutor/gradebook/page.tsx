import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getActiveCourses } from "@/lib/courses";
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
  type PartialGrade,
  type TermSubjectGrade
} from "@/lib/grades/grades";
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
  const criteriaWeightTotal = getCriteriaWeightTotal(criteria);
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
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Cuaderno de notas</h1>
        <p className="mt-1 text-sm text-muted-foreground">Calificación rápida de una prueba para todo el curso.</p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
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
        <EvaluationCriteriaSummary
          criteria={criteria}
          weightTotal={criteriaWeightTotal}
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

          <div className="space-y-3">
            {students.map((student) => (
              <GradebookStudentCard key={student.id} student={student} grade={gradesByStudent.get(student.id)} />
            ))}
          </div>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            Guardar calificaciones
          </button>
        </form>
      )}

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

      <Link href="/dashboard/tutor" className="inline-flex text-sm font-medium text-primary hover:underline">
        Volver al dashboard
      </Link>
    </section>
  );
}

function EvaluationCriteriaSummary({
  criteria,
  weightTotal
}: {
  criteria: EvaluationCriterion[];
  weightTotal: number;
}) {
  const activeCriteria = criteria.filter((criterion) => criterion.active);
  const isComplete = activeCriteria.length > 0 && weightTotal === 100;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Criterios aplicados</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Visualizacion en modo lectura de la configuracion usada para calcular la evaluacion.
          </p>
        </div>
        <span className={`w-fit rounded-md px-3 py-2 text-sm font-semibold ${isComplete ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {isComplete ? "Completo" : "Incompleto"} · Total: {weightTotal}%
        </span>
      </div>

      {criteria.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background p-4">
          <p className="text-sm font-medium text-foreground">No hay criterios configurados para esta materia y trimestre.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            El cuaderno puede guardar pruebas, pero el cierre necesita criterios activos que sumen 100%.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="hidden grid-cols-[1fr_110px_130px] bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
            <span>Criterio</span>
            <span>Peso</span>
            <span>Estado</span>
          </div>
          {criteria.map((criterion) => (
            <article key={criterion.id} className="grid gap-2 border-t border-border px-4 py-3 text-sm first:border-t-0 sm:grid-cols-[1fr_110px_130px] sm:items-center">
              <div>
                <p className="font-semibold text-foreground">{criterion.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{criterion.criterion_type}</p>
              </div>
              <p className="font-medium text-foreground">{criterion.weight}%</p>
              <span className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ${criterion.active ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
                {criterion.active ? "Completo" : "Incompleto"}
              </span>
              <div className="hidden">
              <p className="mt-2 text-sm text-muted-foreground">{criterion.weight}% · {criterion.criterion_type}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {criterion.active ? "Activo" : "Inactivo"} · {criterion.visible_to_family ? "Visible familia" : "Privado"}
              </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
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
    <section className="space-y-4 rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Cierre de evaluacion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa la nota propuesta, ajusta si hace falta y cierra la evaluacion trimestral.
          </p>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Progreso de evaluacion</p>
          <p className="mt-1 font-semibold text-foreground">{progressLabel}</p>
        </div>
      </div>

      {isPublished ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          Evaluacion publicada{publishedAt ? ` el ${formatDateTime(publishedAt)}` : ""}. Las notas finales quedan bloqueadas hasta una reapertura administrativa.
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
                        Progreso de evaluacion: {getStudentProgressLabel(criteriaCount, calculated)}
                      </p>
                    </div>
                    <span className={`w-fit rounded-md px-2 py-1 text-xs font-semibold ${saved ? "bg-amber-50 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                      Estado actual: {saved ? "Borrador" : "Pendiente"}
                    </span>
                  </div>

                  <div className="mt-3 grid gap-3 md:grid-cols-[110px_110px_120px_1fr] md:items-start">
                    <SummaryBox label="Nota calculada" value={proposed === null || proposed === undefined ? "-" : String(proposed)} />
                    <SummaryBox label="Nota boletin" value={report === null || report === undefined ? "-" : String(report)} />
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
                      <span className="text-xs font-medium text-muted-foreground">Observacion final</span>
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
              <button
                name="intent"
                value="draft"
                disabled={isPublished}
                className="h-11 rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              >
                Guardar borrador
              </button>
              <button
                name="intent"
                value="closed"
                disabled={hasMissingGrades || isPublished}
                className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cerrar evaluacion
              </button>
            </div>
          </form>
          )}
        </div>
      )}
    </section>
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
          <p className="mt-1 text-xs text-muted-foreground">Progreso de evaluacion: {progressLabel}</p>
        </div>
        <span className="w-fit rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700">
          Estado actual: Cerrada
        </span>
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[110px_110px_110px_1fr_auto] md:items-start">
        <SummaryBox label="Nota calculada" value={proposed === null || proposed === undefined ? "-" : String(proposed)} />
        <SummaryBox label="Nota boletin" value={report === null || report === undefined ? "-" : String(report)} />
        <SummaryBox label="Nota final" value={saved.final_grade === null ? "-" : String(saved.final_grade)} />
        <div>
          <p className="text-xs font-medium text-muted-foreground">Observacion final</p>
          <p className="mt-2 text-sm text-muted-foreground">{saved.final_observation || "Sin observacion"}</p>
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

function GradebookStudentCard({
  student,
  grade
}: {
  student: { id: string; name: string; last_name: string };
  grade?: PartialGrade;
}) {
  return (
    <article className="rounded-lg border border-border bg-white p-4">
      <input type="hidden" name="student_id" value={student.id} />
      <div className="grid gap-3 lg:grid-cols-[1fr_110px_1fr_1fr_140px] lg:items-start">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {student.name} {student.last_name}
          </p>
          {grade ? <p className="mt-1 text-xs text-muted-foreground">Nota existente cargada</p> : null}
        </div>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Nota</span>
          <input
            name={`grade_${student.id}`}
            type="number"
            min="0"
            max="10"
            step="0.01"
            defaultValue={grade?.grade ?? ""}
            className={`h-10 w-full rounded-md border px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15 ${getGradeColor(grade?.grade)}`}
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Comentario</span>
          <textarea
            name={`comment_${student.id}`}
            rows={2}
            defaultValue={grade?.comment ?? ""}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Recomendación</span>
          <textarea
            name={`recommendation_${student.id}`}
            rows={2}
            defaultValue={grade?.recommendation ?? ""}
            className="w-full rounded-md border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <label className="flex items-center gap-2 pt-6 text-sm font-medium text-foreground lg:justify-end">
          <input name={`visible_${student.id}`} type="checkbox" defaultChecked={grade?.visible_to_family ?? true} />
          Visible familia
        </label>
      </div>
    </article>
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

function getCompletedCriteriaCount(criteriaCount: number, calculated?: CalculatedStudentGrade) {
  if (criteriaCount === 0 || !calculated) {
    return 0;
  }

  return Math.max(criteriaCount - calculated.missingCriteria.length, 0);
}

function getStudentProgressLabel(criteriaCount: number, calculated?: CalculatedStudentGrade) {
  const completed = getCompletedCriteriaCount(criteriaCount, calculated);

  if (criteriaCount > 0 && completed === criteriaCount) {
    return "100% completado";
  }

  return `${completed}/${criteriaCount} criterios completados`;
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

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getDirectorCourses } from "@/lib/director/students";
import {
  buildTermPublicationSummary,
  getAllGradesForSupervision,
  getEvaluationPublication,
  getTermSubjectReportsForSupervision,
  type GradeTerm,
  type GradeWithLabels,
  type TermSubjectReportRow
} from "@/lib/grades/grades";
import { DirectorPublicationPanel } from "@/components/grades/director-publication-panel";
import {
  GradebookSupervisionItacaBlock,
  GradebookSupervisionStudentTable,
  GradebookSupervisionSummary,
  type GradebookSupervisionStudentGroup
} from "@/components/grades/gradebook-supervision";
import { publishEvaluation } from "../../reports/actions";

type PageProps = {
  searchParams: {
    course_id?: string;
    term?: string;
  };
};

export default async function DirectorGradebookPage({ searchParams }: PageProps) {
  await requireRole("director");

  const term = normalizeTerm(searchParams.term);
  const [{ reports, errorMessage: reportsError }, { grades, errorMessage: gradesError }, { courses, errorMessage: coursesError }] =
    await Promise.all([getTermSubjectReportsForSupervision(term), getAllGradesForSupervision(), getDirectorCourses()]);

  const selectedCourseId = courses.some((course) => course.id === searchParams.course_id)
    ? searchParams.course_id!
    : courses[0]?.id ?? "";
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const { publication, errorMessage: publicationError } = selectedCourseId
    ? await getEvaluationPublication({ courseId: selectedCourseId, term })
    : { publication: null, errorMessage: null };
  const courseReports = reports.filter((report) => report.course_id === selectedCourseId);
  const courseGrades = grades.filter((grade) => grade.course_id === selectedCourseId && grade.term === term);
  const groups = buildStudentClosureGroups(courseReports, courseGrades);
  const summary = buildTermPublicationSummary(courseReports);
  const pageError = reportsError ?? gradesError ?? coursesError ?? publicationError;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Asistente de cierre académico</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground">Cuaderno de calificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sigue el flujo: curso, trimestre, estado general, pendientes y publicación de boletines.
          </p>
        </div>
        <Link
          href="/dashboard/director"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </header>

      <MainFilters courses={courses} selectedCourseId={selectedCourseId} term={term} />

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar el cierre académico: {pageError}
        </div>
      ) : null}

      {selectedCourse ? (
        <>
          <GradebookSupervisionSummary summary={summary} publicationPublished={Boolean(publication?.published)} />
          <PendingReview summary={summary} />
          <DirectorPublicationPanel
            courseId={selectedCourse.id}
            term={term}
            courseName={selectedCourse.name}
            publication={publication}
            summary={summary}
            action={publishEvaluation}
          />
          <GradebookSupervisionStudentTable
            courseName={selectedCourse.name}
            groups={groups}
            term={term}
            emptyText={`No hay cierres académicos registrados para ${selectedCourse.name}.`}
          />
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          Selecciona un curso para comenzar el cierre académico.
        </div>
      )}

      <GradebookSupervisionItacaBlock />
    </section>
  );
}

function MainFilters({
  courses,
  selectedCourseId,
  term
}: {
  courses: { id: string; name: string }[];
  selectedCourseId: string;
  term: GradeTerm;
}) {
  return (
    <form className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">1. Selecciona curso y trimestre</h2>
          <p className="mt-1 text-sm text-muted-foreground">No hay filtros técnicos: el cierre se revisa por curso y evaluación.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Select
          label="Curso"
          name="course_id"
          value={selectedCourseId}
          options={courses.map((course) => ({ value: course.id, label: course.name }))}
          emptyLabel={courses.length === 0 ? "No hay cursos creados" : null}
        />
        <Select
          label="Trimestre"
          name="term"
          value={term}
          options={[
            { value: "1", label: "Trimestre 1" },
            { value: "2", label: "Trimestre 2" },
            { value: "3", label: "Trimestre 3" }
          ]}
          emptyLabel={null}
        />
        <button className="h-11 self-end rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
          Cargar cierre
        </button>
      </div>
    </form>
  );
}

function PendingReview({ summary }: { summary: ReturnType<typeof buildTermPublicationSummary> }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <h2 className="text-base font-semibold text-foreground">Pendientes antes de publicar</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ReviewItem
          title="Materias pendientes"
          value={summary.pendingSubjects}
          text={summary.pendingSubjects > 0 ? "Revisar cierres de materia antes de publicar boletines." : "Todas las materias revisadas están cerradas."}
        />
        <ReviewItem
          title="Alumnos incompletos"
          value={summary.incompleteStudents}
          text={summary.incompleteStudents > 0 ? "Hay alumnos que todavía no tienen el cierre completo." : "Todos los alumnos revisados constan completos."}
        />
      </div>
    </section>
  );
}

function ReviewItem({ title, value, text }: { title: string; value: number; text: string }) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="text-2xl font-semibold text-foreground">{value}</div>
      <h3 className="mt-1 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </article>
  );
}

function Select({
  label,
  name,
  value,
  options,
  emptyLabel
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string }[];
  emptyLabel: string | null;
}) {
  return (
    <label className="text-sm font-medium text-foreground">
      {label}
      <select
        name={name}
        defaultValue={value}
        className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
      >
        {emptyLabel ? <option value="">{emptyLabel}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function buildStudentClosureGroups(reports: TermSubjectReportRow[], grades: GradeWithLabels[]) {
  const groups = new Map<string, GradebookSupervisionStudentGroup>();

  reports.forEach((report) => {
    let group = groups.get(report.student_id);

    if (!group) {
      group = { studentId: report.student_id, studentName: report.studentName, reports: [], grades: [] };
      groups.set(report.student_id, group);
    }

    group.reports.push(report);
  });

  grades.forEach((grade) => {
    const group = groups.get(grade.student_id);

    if (group) {
      group.grades.push(grade);
    }
  });

  return Array.from(groups.values()).sort((a, b) => a.studentName.localeCompare(b.studentName, "es"));
}

function normalizeTerm(value: unknown): GradeTerm {
  return value === "2" || value === "3" ? value : "1";
}

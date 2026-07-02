import Link from "next/link";
import { Archive, ClipboardCheck, Download, FileSpreadsheet, FolderOpen, GraduationCap, Landmark } from "lucide-react";
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
import { publishEvaluation } from "../../reports/actions";

type PageProps = {
  searchParams: {
    course_id?: string;
    term?: string;
  };
};

type StudentClosureGroup = {
  studentId: string;
  studentName: string;
  reports: TermSubjectReportRow[];
  grades: GradeWithLabels[];
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
          <p className="text-xs font-semibold uppercase text-primary">Asistente de cierre academico</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground">Cuaderno de calificaciones</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sigue el flujo: curso, trimestre, estado general, pendientes y publicacion de boletines.
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
          No se pudo cargar el cierre academico: {pageError}
        </div>
      ) : null}

      {selectedCourse ? (
        <>
          <SummaryPanel summary={summary} publicationPublished={Boolean(publication?.published)} />
          <PendingReview summary={summary} />
          <DirectorPublicationPanel
            courseId={selectedCourse.id}
            term={term}
            courseName={selectedCourse.name}
            publication={publication}
            summary={summary}
            action={publishEvaluation}
          />
          <StudentClosureTable courseName={selectedCourse.name} groups={groups} term={term} />
        </>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          Selecciona un curso para comenzar el cierre academico.
        </div>
      )}

      <ItacaBlock />
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
          <p className="mt-1 text-sm text-muted-foreground">No hay filtros tecnicos: el cierre se revisa por curso y evaluacion.</p>
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

function SummaryPanel({
  summary,
  publicationPublished
}: {
  summary: ReturnType<typeof buildTermPublicationSummary>;
  publicationPublished: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground">2. Estado general</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Materias cerradas" value={summary.closedSubjects} tone="success" />
        <Metric label="Materias pendientes" value={summary.pendingSubjects} tone={summary.pendingSubjects > 0 ? "warning" : "neutral"} />
        <Metric label="Alumnos completos" value={summary.completeStudents} tone="success" />
        <Metric label="Alumnos incompletos" value={summary.incompleteStudents} tone={summary.incompleteStudents > 0 ? "warning" : "neutral"} />
        <div className={`rounded-lg border p-4 ${publicationPublished ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          <p className="text-xs font-medium">Publicacion</p>
          <p className="mt-1 text-2xl font-semibold">{publicationPublished ? "Publicada" : "Pendiente"}</p>
        </div>
      </div>
    </section>
  );
}

function PendingReview({ summary }: { summary: ReturnType<typeof buildTermPublicationSummary> }) {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <h2 className="text-base font-semibold text-foreground">3. Pendientes antes de publicar</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <ReviewItem
          title="Materias pendientes"
          value={summary.pendingSubjects}
          text={summary.pendingSubjects > 0 ? "Revisar cierres de materia antes de publicar boletines." : "Todas las materias revisadas estan cerradas."}
        />
        <ReviewItem
          title="Alumnos incompletos"
          value={summary.incompleteStudents}
          text={summary.incompleteStudents > 0 ? "Hay alumnos que todavia no tienen el cierre completo." : "Todos los alumnos revisados constan completos."}
        />
      </div>
    </section>
  );
}

function StudentClosureTable({ courseName, groups, term }: { courseName: string; groups: StudentClosureGroup[]; term: GradeTerm }) {
  if (groups.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        No hay cierres academicos registrados para {courseName}.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">4. Revision por alumno</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tabla principal de cierre: alumno, materias cerradas, pendientes y estado.</p>
        </div>
        <span className="w-fit rounded-md border border-border px-3 py-2 text-sm font-medium text-muted-foreground">
          {courseName}
        </span>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2 text-left text-sm">
          <thead className="text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Alumno</th>
              <th className="px-3 py-2">Materias cerradas</th>
              <th className="px-3 py-2">Pendientes</th>
              <th className="px-3 py-2">Estado</th>
              <th className="px-3 py-2">Accion</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <StudentClosureRow key={group.studentId} group={group} term={term} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StudentClosureRow({ group, term }: { group: StudentClosureGroup; term: GradeTerm }) {
  const closed = group.reports.filter((report) => report.status === "closed").length;
  const pending = group.reports.length - closed;
  const isComplete = group.reports.length > 0 && pending === 0;

  return (
    <tr className="align-top">
      <td className="rounded-l-md border-y border-l border-border bg-white px-3 py-3 font-semibold text-foreground">
        {group.studentName}
      </td>
      <td className="border-y border-border bg-white px-3 py-3">{closed}</td>
      <td className="border-y border-border bg-white px-3 py-3">{pending}</td>
      <td className="border-y border-border bg-white px-3 py-3">
        <span className={`rounded-md border px-2 py-1 text-xs font-semibold ${isComplete ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
          {isComplete ? "Completo" : "Pendiente"}
        </span>
      </td>
      <td className="rounded-r-md border-y border-r border-border bg-white px-3 py-3">
        <div className="flex flex-col gap-3">
          <Link
            href={`/dashboard/reports/term-pdf?student_id=${group.studentId}&term=${term}`}
            className="inline-flex h-8 w-fit items-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            PDF
          </Link>
          <details>
          <summary className="cursor-pointer text-sm font-semibold text-primary">Ver materias</summary>
          <div className="mt-3 grid gap-3 xl:grid-cols-2">
            {group.reports.map((report) => (
              <SubjectClosureCard
                key={`${report.student_id}-${report.subject_id}-${report.term}`}
                report={report}
                grades={group.grades.filter((grade) => grade.subject_id === report.subject_id)}
              />
            ))}
          </div>
          </details>
        </div>
      </td>
    </tr>
  );
}

function SubjectClosureCard({ report, grades }: { report: TermSubjectReportRow; grades: GradeWithLabels[] }) {
  return (
    <article className="rounded-md border border-border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground">{report.subjectName}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{report.teacherName}</p>
        </div>
        <StatusBadge status={report.status} />
      </div>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <SmallStat label="Nota final" value={report.final_grade?.toString() ?? "-"} />
        <SmallStat label="Calculada" value={formatGrade(report.calculated_grade)} />
      </dl>
      <p className="mt-3 rounded-md border border-border bg-white p-3 text-xs text-muted-foreground">
        {report.final_observation ?? "Sin observacion final"}
      </p>
      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-primary">Ver calificaciones parciales ({grades.length})</summary>
        <div className="mt-2 space-y-2">
          {grades.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin parciales registrados.</p>
          ) : (
            grades.map((grade) => (
              <div key={grade.id} className="rounded-md border border-border bg-white p-2 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <span className="font-medium text-foreground">{grade.assessment_name}</span>
                  <span className="font-semibold text-foreground">{grade.grade}</span>
                </div>
                {grade.comment ? <p className="mt-1 text-muted-foreground">Comentario: {grade.comment}</p> : null}
                {grade.recommendation ? <p className="mt-1 text-muted-foreground">Recomendacion: {grade.recommendation}</p> : null}
              </div>
            ))
          )}
        </div>
      </details>
    </article>
  );
}

function ItacaBlock() {
  const items = [
    { icon: FileSpreadsheet, title: "Plantilla ITACA", text: "Preparar datos para volcar notas en ITACA." },
    { icon: ClipboardCheck, title: "Actas de evaluacion", text: "Generar acta de evaluacion del curso." },
    { icon: FolderOpen, title: "Expedientes academicos", text: "Preparar expediente individual del alumnado." },
    { icon: Archive, title: "Cierre de curso", text: "Consolidar notas finales y preparar documentacion." }
  ];

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-secondary text-primary">
          <Landmark className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">5. ITACA / Actas / Expedientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Bloque separado para documentacion oficial y exportaciones futuras.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <article key={item.title} className="rounded-lg border border-border bg-background p-4">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 text-sm font-semibold text-foreground">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.text}</p>
              <span className="mt-4 inline-flex rounded-md border border-border bg-white px-2 py-1 text-xs font-semibold text-muted-foreground">
                Proximamente
              </span>
            </article>
          );
        })}
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

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white p-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-foreground">{value}</dd>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "success" | "warning" | "neutral" }) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-border bg-white text-muted-foreground";

  return (
    <div className={`rounded-lg border p-4 ${className}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: TermSubjectReportRow["status"] }) {
  const label = status === "closed" ? "Cerrada" : status === "draft" ? "Borrador" : "Pendiente";
  const className =
    status === "closed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "draft"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-border bg-white text-muted-foreground";

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
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
  const groups = new Map<string, StudentClosureGroup>();

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

function formatGrade(value: number | null) {
  return value === null ? "-" : Number(value).toFixed(2);
}

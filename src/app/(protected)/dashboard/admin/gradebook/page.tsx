import Link from "next/link";
import { Archive, ClipboardCheck, Download, FileSpreadsheet, FolderOpen, GraduationCap, Landmark } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAdminCourses, getAdminStudents, getAdminSubjects } from "@/lib/admin/admin";
import { getSubjectsForCourse } from "@/lib/subjects";
import {
  buildTermPublicationSummary,
  getAllEvaluationCriteriaForSupervision,
  getAllGradesForSupervision,
  getEvaluationPublication,
  getTermSubjectReportsForSupervision,
  type EvaluationCriterionWithLabels,
  type EvaluationPublication,
  type GradeTerm,
  type GradeWithLabels,
  type TermPublicationSummary,
  type TermSubjectReportRow
} from "@/lib/grades/grades";
import { AdminPublicationPanel } from "@/components/grades/admin-publication-panel";
import { publishEvaluation } from "../../reports/actions";

type PageProps = {
  searchParams: {
    course_id?: string;
    student_id?: string;
    subject_id?: string;
    status?: string;
    term?: string;
  };
};

type StudentClosureGroup = {
  studentId: string;
  studentName: string;
  reports: TermSubjectReportRow[];
  grades: GradeWithLabels[];
};

type GradebookStatusFilter = "" | "pending" | "draft" | "closed" | "published";

export default async function AdminGradebookPage({ searchParams }: PageProps) {
  await requireRole("superadmin");

  const [{ courses, errorMessage: coursesError }, { students, errorMessage: studentsError }] =
    await Promise.all([getAdminCourses(), getAdminStudents()]);

  const selectedCourseId = courses.some((course) => course.id === searchParams.course_id) ? searchParams.course_id! : "";
  const { subjects, errorMessage: subjectsError } = selectedCourseId
    ? await getSubjectsForCourse(selectedCourseId)
    : await getAdminSubjects();
  const term = normalizeOptionalTerm(searchParams.term);
  const selectedTerm: GradeTerm | null = term || null;
  const status = normalizeStatus(searchParams.status);
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
  const hasMainFilters = Boolean(selectedCourseId && selectedTerm);

  let reports: TermSubjectReportRow[] = [];
  let grades: GradeWithLabels[] = [];
  let criteria: EvaluationCriterionWithLabels[] = [];
  let publication: EvaluationPublication | null = null;
  let dataError: string | null = null;

  if (hasMainFilters) {
    const [
      { reports: reportRows, errorMessage: reportsError },
      { grades: gradeRows, errorMessage: gradesError },
      { criteria: criteriaRows, errorMessage: criteriaError },
      { publication: publicationRow, errorMessage: publicationError }
    ] = await Promise.all([
      getTermSubjectReportsForSupervision(selectedTerm!),
      getAllGradesForSupervision(),
      getAllEvaluationCriteriaForSupervision(),
      getEvaluationPublication({ courseId: selectedCourseId, term: selectedTerm! })
    ]);

    reports = reportRows;
    grades = gradeRows;
    criteria = criteriaRows;
    publication = publicationRow;
    dataError = reportsError ?? gradesError ?? criteriaError ?? publicationError;
  }

  const courseStudents = students.filter((student) => !selectedCourseId || student.course_id === selectedCourseId);
  const courseReports = reports.filter((report) => report.course_id === selectedCourseId);
  const courseGrades = selectedTerm
    ? grades.filter((grade) => grade.course_id === selectedCourseId && grade.term === selectedTerm)
    : [];
  const courseCriteria = selectedTerm
    ? criteria.filter((criterion) => criterion.course_id === selectedCourseId && criterion.term === selectedTerm)
    : [];
  const filteredReports = courseReports.filter((report) => {
    const matchesStudent = !searchParams.student_id || report.student_id === searchParams.student_id;
    const matchesSubject = !searchParams.subject_id || report.subject_id === searchParams.subject_id;
    const matchesStatus =
      !status ||
      (status === "published" ? Boolean(publication?.published) : report.status === status);

    return matchesStudent && matchesSubject && matchesStatus;
  });
  const filteredGrades = courseGrades.filter((grade) => {
    return (
      (!searchParams.student_id || grade.student_id === searchParams.student_id) &&
      (!searchParams.subject_id || grade.subject_id === searchParams.subject_id)
    );
  });
  const filteredCriteria = courseCriteria.filter((criterion) => !searchParams.subject_id || criterion.subject_id === searchParams.subject_id);
  const groups = buildStudentClosureGroups(filteredReports, filteredGrades);
  const summary = buildTermPublicationSummary(courseReports);
  const pageError = coursesError ?? subjectsError ?? studentsError ?? dataError;

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Panel de cierre academico</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground">Cuaderno de notas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Supervision tecnica agrupada por curso, trimestre, alumno y materia.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </header>

      <MainFilters courses={courses} selectedCourseId={selectedCourseId} term={term} />

      {selectedCourseId ? (
        <SecondaryFilters
          students={courseStudents}
          subjects={subjects}
          searchParams={searchParams}
          term={term}
          selectedCourseId={selectedCourseId}
          status={status}
        />
      ) : null}

      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar el cuaderno de superadmin: {pageError}
        </div>
      ) : null}

      {!hasMainFilters ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          Selecciona un curso y un trimestre para cargar el cierre. No se muestran criterios ni notas parciales hasta tener esos filtros.
        </div>
      ) : selectedCourse ? (
        <>
          <SummaryPanel summary={summary} publicationPublished={Boolean(publication?.published)} />
          <AdminPublicationPanel
            courseId={selectedCourse.id}
            courseName={selectedCourse.name}
            term={selectedTerm as GradeTerm}
            publication={publication}
            summary={summary}
            action={publishEvaluation}
          />
          <StudentClosureTable courseName={selectedCourse.name} groups={groups} criteria={filteredCriteria} term={selectedTerm as GradeTerm} />
        </>
      ) : null}

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
  term: GradeTerm | "";
}) {
  return (
    <form className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <GraduationCap className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <h2 className="text-base font-semibold text-foreground">1. Selecciona curso y trimestre</h2>
          <p className="mt-1 text-sm text-muted-foreground">Estos filtros son obligatorios para evitar listados largos.</p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-[1fr_220px_auto]">
        <Select
          label="Curso"
          name="course_id"
          value={selectedCourseId}
          options={courses.map((course) => ({ value: course.id, label: course.name }))}
          emptyLabel={courses.length === 0 ? "No hay cursos creados" : "Selecciona curso"}
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
          emptyLabel="Selecciona trimestre"
        />
        <button className="h-11 self-end rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
          Cargar cierre
        </button>
      </div>
    </form>
  );
}

function SecondaryFilters({
  students,
  subjects,
  searchParams,
  selectedCourseId,
  term,
  status
}: {
  students: { id: string; name: string; last_name: string; course_id: string }[];
  subjects: { id: string; name: string }[];
  searchParams: PageProps["searchParams"];
  selectedCourseId: string;
  term: GradeTerm | "";
  status: GradebookStatusFilter;
}) {
  return (
    <form className="rounded-lg border border-border bg-white p-5">
      <input type="hidden" name="course_id" value={selectedCourseId} />
      <input type="hidden" name="term" value={term} />
      <h2 className="text-base font-semibold text-foreground">2. Filtros secundarios</h2>
      <p className="mt-1 text-sm text-muted-foreground">Acota la revision por alumno, materia o estado.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_220px_auto]">
        <Select
          label="Alumno"
          name="student_id"
          value={searchParams.student_id ?? ""}
          options={students.map((student) => ({ value: student.id, label: `${student.name} ${student.last_name}` }))}
          emptyLabel="Todos los alumnos"
        />
        <Select
          label="Materia"
          name="subject_id"
          value={searchParams.subject_id ?? ""}
          options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))}
          emptyLabel="Todas las materias"
        />
        <Select
          label="Estado"
          name="status"
          value={status}
          options={[
            { value: "pending", label: "Pendiente" },
            { value: "draft", label: "Borrador" },
            { value: "closed", label: "Cerrada" },
            { value: "published", label: "Publicada" }
          ]}
          emptyLabel="Todos los estados"
        />
        <button className="h-11 self-end rounded-md border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:bg-muted">
          Aplicar
        </button>
      </div>
    </form>
  );
}

function SummaryPanel({
  summary,
  publicationPublished
}: {
  summary: TermPublicationSummary;
  publicationPublished: boolean;
}) {
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-foreground">3. Estado global</h2>
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

function StudentClosureTable({
  courseName,
  groups,
  criteria,
  term
}: {
  courseName: string;
  groups: StudentClosureGroup[];
  criteria: EvaluationCriterionWithLabels[];
  term: GradeTerm;
}) {
  if (groups.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        No hay datos de cierre para {courseName} con los filtros seleccionados.
      </section>
    );
  }

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">5. Tabla agrupada por alumno</h2>
          <p className="mt-1 text-sm text-muted-foreground">Alumno, materias cerradas, pendientes, estado y detalle desplegable.</p>
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
              <StudentClosureRow key={group.studentId} group={group} criteria={criteria} term={term} />
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function StudentClosureRow({
  group,
  criteria,
  term
}: {
  group: StudentClosureGroup;
  criteria: EvaluationCriterionWithLabels[];
  term: GradeTerm;
}) {
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
                  criteria={criteria.filter((criterion) => criterion.subject_id === report.subject_id)}
                />
              ))}
            </div>
          </details>
        </div>
      </td>
    </tr>
  );
}

function SubjectClosureCard({
  report,
  grades,
  criteria
}: {
  report: TermSubjectReportRow;
  grades: GradeWithLabels[];
  criteria: EvaluationCriterionWithLabels[];
}) {
  const criteriaByName = new Map(criteria.map((criterion) => [criterion.name, criterion]));

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
        <summary className="cursor-pointer text-xs font-semibold text-primary">
          Ver criterios y pruebas ({Math.max(criteria.length, grades.length)})
        </summary>
        <div className="mt-2 space-y-2">
          {grades.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin parciales registrados.</p>
          ) : (
            grades.map((grade) => {
              const criterion = criteriaByName.get(grade.assessment_name);

              return (
                <div key={grade.id} className="rounded-md border border-border bg-white p-2 text-xs">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium text-foreground">{grade.assessment_name}</span>
                    <span className="font-semibold text-foreground">{grade.grade}</span>
                  </div>
                  <p className="mt-1 text-muted-foreground">Peso: {criterion ? `${criterion.weight}%` : "No configurado"}</p>
                  {grade.comment ? <p className="mt-1 text-muted-foreground">Comentario: {grade.comment}</p> : null}
                  {grade.recommendation ? <p className="mt-1 text-muted-foreground">Recomendacion: {grade.recommendation}</p> : null}
                </div>
              );
            })
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
          <h2 className="text-base font-semibold text-foreground">ITACA / Actas / Expedientes</h2>
          <p className="mt-1 text-sm text-muted-foreground">Preparado para documentacion oficial y exportaciones futuras.</p>
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

function normalizeOptionalTerm(value: unknown): GradeTerm | "" {
  return value === "1" || value === "2" || value === "3" ? value : "";
}

function normalizeStatus(value: unknown): GradebookStatusFilter {
  return value === "pending" || value === "draft" || value === "closed" || value === "published" ? value : "";
}

function formatGrade(value: number | null) {
  return value === null ? "-" : Number(value).toFixed(2);
}

import Link from "next/link";
import { GraduationCap } from "lucide-react";
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
    student_id?: string;
    subject_id?: string;
    status?: string;
    term?: string;
  };
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
          <p className="text-xs font-semibold uppercase text-primary">Panel de cierre académico</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-normal text-foreground">Cuaderno de notas</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Supervisión técnica agrupada por curso, trimestre, alumno y materia.
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
          <GradebookSupervisionSummary summary={summary} publicationPublished={Boolean(publication?.published)} />
          <AdminPublicationPanel
            courseId={selectedCourse.id}
            courseName={selectedCourse.name}
            term={selectedTerm as GradeTerm}
            publication={publication}
            summary={summary}
            action={publishEvaluation}
          />
          <GradebookSupervisionStudentTable
            courseName={selectedCourse.name}
            groups={groups}
            criteria={filteredCriteria}
            term={selectedTerm as GradeTerm}
            emptyText={`No hay datos de cierre para ${selectedCourse.name} con los filtros seleccionados.`}
          />
        </>
      ) : null}

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
      <p className="mt-1 text-sm text-muted-foreground">Acota la revisión por alumno, materia o estado.</p>
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

function normalizeOptionalTerm(value: unknown): GradeTerm | "" {
  return value === "1" || value === "2" || value === "3" ? value : "";
}

function normalizeStatus(value: unknown): GradebookStatusFilter {
  return value === "pending" || value === "draft" || value === "closed" || value === "published" ? value : "";
}

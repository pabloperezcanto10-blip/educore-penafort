import { requireRole } from "@/lib/auth/session";
import { getAdminCourses } from "@/lib/admin/admin";
import {
  buildTermPublicationSummary,
  getEvaluationPublication,
  getTermSubjectReportsForSupervision,
  type GradeTerm
} from "@/lib/grades/grades";
import { TermReportsTable } from "@/components/grades/term-reports";
import { EvaluationPublicationPanel } from "@/components/grades/evaluation-publication-panel";
import { publishEvaluation } from "../../reports/actions";

type PageProps = {
  searchParams: {
    course_id?: string;
    term?: string;
    status?: string;
  };
};

export default async function AdminReportsPage({ searchParams }: PageProps) {
  await requireRole("superadmin");
  const term = normalizeTerm(searchParams.term);
  const [{ reports, errorMessage }, { courses }] = await Promise.all([
    getTermSubjectReportsForSupervision(term),
    getAdminCourses()
  ]);
  const selectedCourseId = courses.some((course) => course.id === searchParams.course_id)
    ? searchParams.course_id!
    : courses[0]?.id ?? "";
  const selectedCourse = courses.find((course) => course.id === selectedCourseId);
  const { publication, errorMessage: publicationError } = selectedCourseId
    ? await getEvaluationPublication({ courseId: selectedCourseId, term })
    : { publication: null, errorMessage: null };
  const courseReports = reports.filter((report) => !selectedCourseId || report.course_id === selectedCourseId);
  const filteredReports = courseReports.filter((report) => !searchParams.status || report.status === searchParams.status);
  const summary = buildTermPublicationSummary(courseReports);
  const pageError = errorMessage ?? publicationError;

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Informes trimestrales</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Revision tecnica del cierre de materias y notas oficiales.
        </p>
      </div>
      <FilterForm courses={courses} searchParams={searchParams} selectedCourseId={selectedCourseId} />
      {selectedCourse ? (
        <EvaluationPublicationPanel
          courseId={selectedCourse.id}
          term={term}
          courseName={selectedCourse.name}
          publication={publication}
          summary={summary}
          action={publishEvaluation}
        />
      ) : null}
      {pageError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los informes: {pageError}
        </div>
      ) : (
        <TermReportsTable reports={filteredReports} />
      )}
    </section>
  );
}

function FilterForm({
  courses,
  searchParams,
  selectedCourseId
}: {
  courses: { id: string; name: string }[];
  searchParams: PageProps["searchParams"];
  selectedCourseId: string;
}) {
  return (
    <form className="grid gap-3 rounded-lg border border-border bg-white p-5 md:grid-cols-4">
      <Select name="course_id" value={selectedCourseId} options={courses.map((course) => ({ value: course.id, label: course.name }))} />
      <Select name="term" value={searchParams.term ?? "1"} options={[
        { value: "1", label: "Trimestre 1" },
        { value: "2", label: "Trimestre 2" },
        { value: "3", label: "Trimestre 3" }
      ]} />
      <Select name="status" value={searchParams.status ?? ""} options={[
        { value: "pending", label: "Pendiente" },
        { value: "draft", label: "Borrador" },
        { value: "closed", label: "Cerrada" }
      ]} />
      <button className="h-11 self-end rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
        Filtrar
      </button>
    </form>
  );
}

function Select({ name, value, options }: { name: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <select name={name} defaultValue={value} className="h-11 rounded-md border border-border bg-white px-3 text-sm">
      <option value="">Todos</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function normalizeTerm(value: unknown): GradeTerm {
  return value === "2" || value === "3" ? value : "1";
}

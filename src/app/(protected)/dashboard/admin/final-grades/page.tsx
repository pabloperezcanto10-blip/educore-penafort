import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getDirectorCourses } from "@/lib/director/students";
import { getFinalPublication, getFinalRowsForSupervision } from "@/lib/grades/annual";
import { FinalGradesSupervision } from "@/components/grades/final-grades-supervision";
import { publishFinalEvaluation } from "../../final-grades/actions";

type PageProps = { searchParams: { course_id?: string } };

export default async function AdminFinalGradesPage({ searchParams }: PageProps) {
  await requireRole("superadmin");
  const { courses, errorMessage: coursesError } = await getDirectorCourses();
  const courseId = courses.some((course) => course.id === searchParams.course_id) ? searchParams.course_id! : courses[0]?.id ?? "";
  const course = courses.find((item) => item.id === courseId);
  const [{ rows, errorMessage: rowsError }, { publication, errorMessage: publicationError }] = courseId
    ? await Promise.all([getFinalRowsForSupervision(courseId), getFinalPublication(courseId)])
    : [{ rows: [], errorMessage: null }, { publication: null, errorMessage: null }];
  const errorMessage = coursesError ?? rowsError ?? publicationError;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Cierre final de curso</h1>
          <p className="mt-1 text-sm text-muted-foreground">Supervision tecnica de boletines finales anuales.</p>
        </div>
        <Link href="/dashboard/admin" className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">Volver</Link>
      </div>
      {errorMessage ? <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{errorMessage}</div> : null}
      <form className="rounded-lg border border-border bg-white p-5 md:flex md:items-end md:gap-3">
        <label className="block flex-1 text-sm font-medium text-foreground">
          Curso
          <select name="course_id" defaultValue={courseId} className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-sm">
            {courses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <button className="mt-3 h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground md:mt-0">Cargar</button>
      </form>
      {course ? <FinalGradesSupervision courseId={course.id} courseName={course.name} rows={rows} publication={publication} action={publishFinalEvaluation} /> : null}
    </section>
  );
}

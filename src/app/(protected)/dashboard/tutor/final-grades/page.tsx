import Link from "next/link";
import { requireRole } from "@/lib/auth/session";
import { getAssignedCoursesForTeacher, getAssignedSubjectsForTeacherCourse } from "@/lib/grades/grades";
import { getAnnualWeight, getFinalRowsForTeacher } from "@/lib/grades/annual";
import { saveAnnualWeights, saveFinalCourseGrade } from "./actions";

type PageProps = {
  searchParams: {
    course_id?: string;
    subject_id?: string;
  };
};

export default async function TutorFinalGradesPage({ searchParams }: PageProps) {
  const profile = await requireRole("tutor");
  const { courses, errorMessage: coursesError } = await getAssignedCoursesForTeacher(profile.id);
  const courseId = courses.some((course) => course.id === searchParams.course_id) ? searchParams.course_id! : courses[0]?.id ?? "";
  const { subjects, errorMessage: subjectsError } = await getAssignedSubjectsForTeacherCourse(profile.id, courseId);
  const subjectId = subjects.some((subject) => subject.id === searchParams.subject_id) ? searchParams.subject_id! : subjects[0]?.id ?? "";
  const [{ weight, errorMessage: weightError }, { rows, errorMessage: rowsError }] =
    courseId && subjectId
      ? await Promise.all([
          getAnnualWeight({ teacherId: profile.id, courseId, subjectId }),
          getFinalRowsForTeacher({ teacherId: profile.id, courseId, subjectId })
        ])
      : [{ weight: null, errorMessage: null }, { rows: [], errorMessage: null }];
  const errorMessage = coursesError ?? subjectsError ?? weightError ?? rowsError;
  const activeWeight = weight ?? {
    term1_weight: 33.33,
    term2_weight: 33.33,
    term3_weight: 33.34
  };

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Cierre final de curso</h1>
          <p className="mt-1 text-sm text-muted-foreground">Configura pesos anuales y cierra la nota final por materia.</p>
        </div>
        <Link href="/dashboard/tutor" className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">
          Volver al dashboard
        </Link>
      </header>

      {errorMessage ? <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">{errorMessage}</div> : null}

      <form className="grid gap-3 rounded-lg border border-border bg-white p-5 md:grid-cols-[1fr_1fr_auto]">
        <Select label="Curso" name="course_id" value={courseId} options={courses.map((course) => ({ value: course.id, label: course.name }))} />
        <Select label="Materia" name="subject_id" value={subjectId} options={subjects.map((subject) => ({ value: subject.id, label: subject.name }))} />
        <button className="h-11 self-end rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Cargar</button>
      </form>

      {courseId && subjectId ? (
        <>
          <form action={saveAnnualWeights} className="rounded-lg border border-border bg-white p-5">
            <input type="hidden" name="course_id" value={courseId} />
            <input type="hidden" name="subject_id" value={subjectId} />
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">Pesos del boletin final</h2>
                <p className="mt-1 text-sm text-muted-foreground">La suma de evaluacion 1, 2 y 3 debe ser 100%.</p>
              </div>
              <span className="rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold">
                Total: {Number(activeWeight.term1_weight) + Number(activeWeight.term2_weight) + Number(activeWeight.term3_weight)}%
              </span>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              <NumberInput name="term1_weight" label="Peso evaluacion 1" defaultValue={String(activeWeight.term1_weight)} />
              <NumberInput name="term2_weight" label="Peso evaluacion 2" defaultValue={String(activeWeight.term2_weight)} />
              <NumberInput name="term3_weight" label="Peso evaluacion 3" defaultValue={String(activeWeight.term3_weight)} />
              <button className="h-11 self-end rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">Guardar pesos</button>
            </div>
          </form>

          <section className="rounded-lg border border-border bg-white p-5">
            <h2 className="text-base font-semibold text-foreground">Alumnos</h2>
            <div className="mt-4 space-y-3">
              {rows.length === 0 ? (
                <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">No hay alumnos para esta materia.</p>
              ) : (
                rows.map((row) => (
                  <form key={row.student_id} action={saveFinalCourseGrade} className="rounded-lg border border-border bg-background p-4">
                    <input type="hidden" name="student_id" value={row.student_id} />
                    <input type="hidden" name="course_id" value={row.course_id} />
                    <input type="hidden" name="subject_id" value={row.subject_id} />
                    <input type="hidden" name="term1_grade" value={row.term1_grade ?? ""} />
                    <input type="hidden" name="term2_grade" value={row.term2_grade ?? ""} />
                    <input type="hidden" name="term3_grade" value={row.term3_grade ?? ""} />
                    <input type="hidden" name="term1_weight" value={activeWeight.term1_weight} />
                    <input type="hidden" name="term2_weight" value={activeWeight.term2_weight} />
                    <input type="hidden" name="term3_weight" value={activeWeight.term3_weight} />
                    <div className="grid gap-3 lg:grid-cols-[1fr_90px_90px_90px_110px_110px] lg:items-end">
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{row.studentName}</h3>
                        <p className="text-xs text-muted-foreground">{row.subjectName}</p>
                      </div>
                      <SmallStat label="T1" value={row.term1_grade?.toString() ?? "-"} />
                      <SmallStat label="T2" value={row.term2_grade?.toString() ?? "-"} />
                      <SmallStat label="T3" value={row.term3_grade?.toString() ?? "-"} />
                      <SmallStat label="Calculada" value={row.calculated_grade?.toString() ?? "-"} />
                      <NumberInput name="final_grade" label="Final" defaultValue={row.final_grade?.toString() ?? ""} min="0" max="10" step="1" />
                    </div>
                    <textarea name="final_observation" defaultValue={row.final_observation ?? ""} placeholder="Observacion final de curso" className="mt-3 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" />
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button name="close" value="0" className="h-10 rounded-md border border-border bg-white px-3 text-sm font-semibold">Guardar borrador</button>
                      <button name="close" value="1" className="h-10 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground">Cerrar final</button>
                      <span className="rounded-md border border-border bg-white px-3 py-2 text-xs font-semibold">Estado: {row.status}</span>
                    </div>
                  </form>
                ))
              )}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}

function Select({ label, name, value, options }: { label: string; name: string; value: string; options: { value: string; label: string }[] }) {
  return (
    <label className="text-sm font-medium text-foreground">
      {label}
      <select name={name} defaultValue={value} className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-sm">
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function NumberInput({ name, label, defaultValue, min, max, step = "0.01" }: { name: string; label: string; defaultValue: string; min?: string; max?: string; step?: string }) {
  return (
    <label className="text-sm font-medium text-foreground">
      {label}
      <input name={name} type="number" min={min} max={max} step={step} defaultValue={defaultValue} className="mt-2 h-11 w-full rounded-md border border-border bg-white px-3 text-sm" />
    </label>
  );
}

function SmallStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-white px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-semibold text-foreground">{value}</p>
    </div>
  );
}

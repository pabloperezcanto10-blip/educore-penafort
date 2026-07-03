import Link from "next/link";
import { CalendarDays, Filter, UserRound } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getTutorAttendanceHistory } from "@/lib/attendance/history";
import { getSessionAttendanceLabel, type SessionAttendanceStatus } from "@/lib/attendance/session-attendance";
import { getSubjectCoursesForTeacher } from "@/lib/grades/grades";

type AttendanceHistoryPageProps = {
  searchParams?: {
    course_id?: string;
    subject_id?: string;
    date_from?: string;
    date_to?: string;
    student_id?: string;
    status?: string;
  };
};

const statusOptions: Array<{ value: "" | SessionAttendanceStatus; label: string }> = [
  { value: "", label: "Todos" },
  { value: "present", label: "Presente" },
  { value: "absent", label: "Falta" },
  { value: "late", label: "Retraso" },
  { value: "justified", label: "Justificado" }
];

export default async function TutorAttendanceHistoryPage({ searchParams }: AttendanceHistoryPageProps) {
  const profile = await requireRole("tutor");
  const { items, errorMessage: subjectsError } = await getSubjectCoursesForTeacher(profile.id);
  const selectedSubjectId = searchParams?.subject_id ?? items[0]?.subject.id ?? "";
  const selectedSubject = items.find((item) => item.subject.id === selectedSubjectId) ?? items[0] ?? null;
  const selectedCourseId = searchParams?.course_id ?? selectedSubject?.courses[0]?.id ?? "";
  const history = selectedSubject && selectedCourseId
    ? await getTutorAttendanceHistory({
        teacherId: profile.id,
        courseId: selectedCourseId,
        subjectId: selectedSubject.subject.id,
        dateFrom: searchParams?.date_from,
        dateTo: searchParams?.date_to,
        studentId: searchParams?.student_id,
        status: searchParams?.status
      })
    : null;
  const errorMessage = subjectsError ?? history?.errorMessage ?? null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Historial de asistencia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta asistencia por curso, materia, alumno, fechas y estado.
          </p>
        </div>
        <Link href="/dashboard/tutor/subjects" className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted">
          Volver a Mis materias
        </Link>
      </div>

      <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Filter className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Filtros</h2>
            <p className="mt-1 text-sm text-muted-foreground">Ajusta el rango y revisa el detalle sin listas infinitas.</p>
          </div>
        </div>

        <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <Select name="subject_id" label="Materia" defaultValue={selectedSubject?.subject.id ?? ""}>
            {items.map((item) => <option key={item.subject.id} value={item.subject.id}>{item.subject.name}</option>)}
          </Select>
          <Select name="course_id" label="Curso" defaultValue={selectedCourseId}>
            {(selectedSubject?.courses ?? []).map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
          </Select>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">Desde</span>
            <input name="date_from" type="date" defaultValue={searchParams?.date_from ?? ""} className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold text-foreground">Hasta</span>
            <input name="date_to" type="date" defaultValue={searchParams?.date_to ?? ""} className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
          </label>
          <Select name="student_id" label="Alumno" defaultValue={searchParams?.student_id ?? ""}>
            <option value="">Todos</option>
            {(history?.students ?? []).map((student) => <option key={student.id} value={student.id}>{student.name} {student.last_name}</option>)}
          </Select>
          <Select name="status" label="Estado" defaultValue={searchParams?.status ?? ""}>
            {statusOptions.map((status) => <option key={status.value} value={status.value}>{status.label}</option>)}
          </Select>
          <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95 md:col-span-2 xl:col-span-6 xl:w-fit">
            Aplicar filtros
          </button>
        </form>
      </section>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar el historial: {errorMessage}
        </div>
      ) : !history ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          Selecciona una materia y un curso para consultar el historial.
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Presentes" value={history.summary.present} />
            <Metric label="Faltas" value={history.summary.absent} tone="warning" />
            <Metric label="Retrasos" value={history.summary.late} tone="warning" />
            <Metric label="Justificadas" value={history.summary.justified} tone="success" />
          </div>

          <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                <CalendarDays className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {history.courseName ?? "Curso"} · {history.subjectName ?? "Materia"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{history.rows.length} registro(s) encontrados.</p>
              </div>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-border">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead className="bg-[#f8fafc] text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3">Fecha</th>
                      <th className="px-4 py-3">Alumno</th>
                      <th className="px-4 py-3">Estado</th>
                      <th className="px-4 py-3">Notas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {history.rows.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                          No hay registros para los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      history.rows.map((row) => (
                        <tr key={row.id}>
                          <td className="px-4 py-3 text-muted-foreground">{formatDate(row.attendance_date)}</td>
                          <td className="px-4 py-3">
                            <span className="inline-flex items-center gap-2 font-medium text-foreground">
                              <UserRound className="h-4 w-4 text-primary" aria-hidden="true" />
                              {row.students ? `${row.students.name} ${row.students.last_name}` : row.student_id}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{row.notes || "-"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </section>
  );
}

function Select({ name, label, defaultValue, children }: { name: string; label: string; defaultValue: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2">
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <select name={name} defaultValue={defaultValue} className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15">
        {children}
      </select>
    </label>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "warning" | "success" }) {
  const toneClass = tone === "success" ? "text-emerald-700" : tone === "warning" ? "text-amber-700" : "text-foreground";

  return <div className="rounded-lg border border-border bg-white p-4 shadow-sm"><p className={`text-2xl font-semibold ${toneClass}`}>{value}</p><p className="mt-1 text-sm text-muted-foreground">{label}</p></div>;
}

function StatusBadge({ status }: { status: SessionAttendanceStatus }) {
  const className = status === "present"
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : status === "justified"
      ? "border-sky-200 bg-sky-50 text-sky-700"
      : "border-amber-200 bg-amber-50 text-amber-700";

  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${className}`}>{getSessionAttendanceLabel(status)}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

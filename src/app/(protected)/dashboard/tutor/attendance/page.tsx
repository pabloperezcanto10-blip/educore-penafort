import Link from "next/link";
import { CalendarCheck, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAttendanceLabel, getTutorAttendanceForDate } from "@/lib/attendance/attendance";
import { saveDailyAttendance } from "./actions";

type TutorAttendancePageProps = {
  searchParams?: {
    saved?: string;
  };
};

const statusOptions = ["present", "absent", "late"] as const;

export default async function TutorAttendancePage({ searchParams }: TutorAttendancePageProps) {
  const profile = await requireRole("tutor");
  const { rows, date, errorMessage } = await getTutorAttendanceForDate(profile.id);
  const saved = searchParams?.saved === "1";

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Pasar lista</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Asistencia diaria de tus alumnos. Por defecto todos figuran como Presente.
          </p>
        </div>
        <Link
          href="/dashboard/tutor"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al dashboard
        </Link>
      </div>

      {saved ? (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
          Asistencia guardada correctamente.
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar la asistencia: {errorMessage}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay alumnos asignados.
        </div>
      ) : (
        <form action={saveDailyAttendance} className="space-y-4">
          <input type="hidden" name="date" value={date} />

          <div className="rounded-lg border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <CalendarCheck className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <h2 className="text-sm font-semibold text-foreground">Fecha</h2>
                <p className="text-sm text-muted-foreground">{date}</p>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-white">
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <div key={row.student.id} className="grid gap-4 p-4 lg:grid-cols-[1fr_220px_1fr] lg:items-center">
                  <input type="hidden" name="student_id" value={row.student.id} />
                  <div>
                    <p className="font-medium text-foreground">
                      {row.student.name} {row.student.last_name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estado actual: {getAttendanceLabel(row.status)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((status) => (
                      <label
                        key={status}
                        className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm"
                      >
                        <input
                          type="radio"
                          name={`status_${row.student.id}`}
                          value={status}
                          defaultChecked={row.status === status}
                        />
                        {getAttendanceLabel(status)}
                      </label>
                    ))}
                  </div>

                  <input
                    name={`notes_${row.student.id}`}
                    defaultValue={row.notes}
                    placeholder="Notas opcionales"
                    className="h-10 w-full rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </div>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            <CalendarCheck className="h-4 w-4" aria-hidden="true" />
            Guardar asistencia del día
          </button>
        </form>
      )}
    </section>
  );
}

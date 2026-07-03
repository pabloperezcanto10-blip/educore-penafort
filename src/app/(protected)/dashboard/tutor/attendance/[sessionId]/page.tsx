import Link from "next/link";
import { CalendarCheck } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getSessionAttendanceContext,
  getSessionAttendanceLabel,
  type SessionAttendanceStatus
} from "@/lib/attendance/session-attendance";
import { formatScheduleTime, getWeekdayLabel } from "@/lib/tutors/schedule";
import { saveSessionAttendance } from "./actions";
import { SaveSessionAttendanceButton } from "./submit-button";

type SessionAttendancePageProps = {
  params: {
    sessionId: string;
  };
};

const statusOptions: SessionAttendanceStatus[] = ["present", "absent", "late", "justified"];

export default async function SessionAttendancePage({ params }: SessionAttendancePageProps) {
  const profile = await requireRole("tutor");
  const { context, errorMessage } = await getSessionAttendanceContext({
    teacherId: profile.id,
    sessionId: params.sessionId
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Pasar lista</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Registra la asistencia real de la sesion seleccionada.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard/tutor/schedule"
            className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
          >
            Ver horario completo
          </Link>
          <Link
            href="/dashboard/tutor"
            className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
          >
            Volver al dashboard
          </Link>
        </div>
      </div>

      {errorMessage || !context ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar la sesion de asistencia: {errorMessage ?? "Sesion no disponible."}
        </div>
      ) : (
        <>
          <section className="rounded-lg border border-border bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <CalendarCheck className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  {context.course.name} · {context.subject?.name ?? context.schedule.subject_name ?? "Materia"}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getWeekdayLabel(context.schedule.weekday)} · {formatScheduleTime(context.schedule.start_time)} -{" "}
                  {formatScheduleTime(context.schedule.end_time)} · {context.date}
                </p>
              </div>
            </div>
          </section>

          {context.rows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
              No hay alumnos activos en este curso.
            </div>
          ) : (
            <form action={saveSessionAttendance} className="space-y-4">
              <input type="hidden" name="session_id" value={context.schedule.id} />
              <input type="hidden" name="course_id" value={context.course.id} />
              <input type="hidden" name="subject_id" value={context.subject?.id ?? ""} />
              <input type="hidden" name="attendance_date" value={context.date} />

              <div className="overflow-hidden rounded-lg border border-border bg-white">
                <div className="divide-y divide-border">
                  {context.rows.map((row) => (
                    <div key={row.student.id} className="grid gap-4 p-4 xl:grid-cols-[1fr_420px_1fr] xl:items-center">
                      <input type="hidden" name="student_id" value={row.student.id} />
                      <div>
                        <p className="font-medium text-foreground">
                          {row.student.name} {row.student.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Estado actual: {getSessionAttendanceLabel(row.status)}
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
                            {getSessionAttendanceLabel(status)}
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

              <SaveSessionAttendanceButton />
            </form>
          )}
        </>
      )}
    </section>
  );
}

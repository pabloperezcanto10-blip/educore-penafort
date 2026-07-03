import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  formatScheduleTime,
  getTeacherScheduleForWeek,
  getWeekdayLabel,
  teacherScheduleWeekdays,
  type TeacherScheduleSlot
} from "@/lib/tutors/schedule";

export default async function TutorSchedulePage() {
  const profile = await requireRole("tutor");
  const { slots, errorMessage } = await getTeacherScheduleForWeek(profile.id);
  const slotsByWeekday = new Map<number, TeacherScheduleSlot[]>();

  slots.forEach((slot) => {
    const current = slotsByWeekday.get(slot.weekday) ?? [];
    slotsByWeekday.set(slot.weekday, [...current, slot]);
  });

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Horario docente</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta tu horario semanal y accede directamente a pasar lista por clase.
          </p>
        </div>
        <Link
          href="/dashboard/tutor"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al dashboard
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar el horario: {errorMessage}
        </div>
      ) : slots.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay horario asociado a este docente. Ejecuta la migración `031_teacher_schedule.sql`.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {teacherScheduleWeekdays.map((weekday) => (
            <section key={weekday} className="rounded-lg border border-border bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                  <CalendarDays className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 className="text-sm font-semibold text-foreground">{getWeekdayLabel(weekday)}</h2>
              </div>

              <div className="mt-4 space-y-3">
                {(slotsByWeekday.get(weekday) ?? []).length === 0 ? (
                  <p className="rounded-md border border-dashed border-border bg-[#f8fafc] p-3 text-sm text-muted-foreground">
                    No hay clases programadas.
                  </p>
                ) : (
                  (slotsByWeekday.get(weekday) ?? []).map((slot) => <ScheduleSlot key={slot.id} slot={slot} />)
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduleSlot({ slot }: { slot: TeacherScheduleSlot }) {
  const content = (
    <article
      className={`rounded-md border p-4 transition ${
        slot.is_break
          ? "border-dashed border-border bg-[#f8fafc]"
          : "border-border bg-white shadow-sm hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-primary">
            {formatScheduleTime(slot.start_time)} - {formatScheduleTime(slot.end_time)}
          </p>
          <h3 className="mt-1 text-sm font-semibold text-foreground">{slot.course_name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{slot.subject_name ?? "Sin materia"}</p>
        </div>
        <span className="rounded-full border border-border bg-[#f8fafc] px-2 py-1 text-[11px] font-semibold text-muted-foreground">
          {slot.is_break ? "Descanso" : "Pasar lista"}
        </span>
      </div>
    </article>
  );

  if (slot.is_break) {
    return content;
  }

  return (
    <Link
      href={`/dashboard/tutor/attendance?course_name=${encodeURIComponent(slot.course_name)}&subject_name=${encodeURIComponent(slot.subject_name ?? "")}&schedule_id=${encodeURIComponent(slot.id)}`}
    >
      {content}
    </Link>
  );
}

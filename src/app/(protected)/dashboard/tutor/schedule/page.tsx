import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarCheck2, CalendarDays, CheckCircle2, Clock3, Coffee, ListChecks } from "lucide-react";

import { GradebookBadge, GradebookCard, GradebookCardHeader } from "@/components/grades/gradebook-design";
import {
  getRegisteredScheduleIdsForDate,
  getRegisteredScheduleKeysForRange
} from "@/lib/attendance/session-attendance";
import { requireRole } from "@/lib/auth/session";
import { getMadridDate, getMadridWeek, type MadridWeekDay } from "@/lib/date-time/madrid";
import {
  formatScheduleTime,
  getMadridWeekday,
  getTeacherScheduleForWeek,
  getWeekdayLabel,
  type TeacherScheduleSlot
} from "@/lib/tutors/schedule";

type TutorSchedulePageProps = {
  searchParams?: {
    week?: string;
  };
};

export default async function TutorSchedulePage({ searchParams }: TutorSchedulePageProps) {
  const profile = await requireRole("tutor");
  const todayWeekday = getMadridWeekday();
  const todayDate = getMadridDate();
  const week = getMadridWeek(searchParams?.week);
  const { slots, errorMessage } = await getTeacherScheduleForWeek(profile.id);
  const scheduleIds = slots.filter((slot) => !slot.is_break).map((slot) => slot.id);
  const [todayRegistration, weekRegistration] = await Promise.all([
    getRegisteredScheduleIdsForDate({
      teacherId: profile.id,
      scheduleIds,
      date: todayDate
    }),
    getRegisteredScheduleKeysForRange({
      teacherId: profile.id,
      scheduleIds,
      startDate: week.startDate,
      endDate: week.endDate
    })
  ]);
  const slotsByWeekday = new Map<number, TeacherScheduleSlot[]>();

  slots.forEach((slot) => {
    const current = slotsByWeekday.get(slot.weekday) ?? [];
    slotsByWeekday.set(slot.weekday, [...current, slot]);
  });

  const teachingSlots = slots.filter((slot) => !slot.is_break);
  const todaySlots = todayWeekday ? slotsByWeekday.get(todayWeekday) ?? [] : [];
  const todayTeachingSlots = todaySlots.filter((slot) => !slot.is_break);
  const pendingToday = todayTeachingSlots.filter((slot) => !todayRegistration.registeredScheduleIds.has(slot.id)).length;
  const nextSlot = getNextScheduleSlot(todaySlots);
  const registrationError = todayRegistration.errorMessage ?? weekRegistration.errorMessage;

  return (
    <section className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Horario docente</h1>
          <p className="mt-1 text-sm text-slate-500">
            Vista semanal compacta para revisar clases, descansos y pasar lista sin perder contexto.
          </p>
        </div>
        <Link
          href="/dashboard/tutor"
          className="inline-flex h-10 w-fit items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Volver al dashboard
        </Link>
      </div>

      {errorMessage || registrationError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudo cargar el horario: {errorMessage ?? registrationError}
        </div>
      ) : slots.length === 0 ? (
        <GradebookCard className="p-5">
          <EmptyState message="No hay horario asociado a este docente." />
        </GradebookCard>
      ) : (
        <>
          <ScheduleSummary
            weeklyClasses={teachingSlots.length}
            todayClasses={todayTeachingSlots.length}
            pendingToday={pendingToday}
            nextSlot={nextSlot}
          />

          <GradebookCard>
            <GradebookCardHeader title={week.label}>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <Link
                  href={`/dashboard/tutor/schedule?week=${week.previousStartDate}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  Semana anterior
                </Link>
                <Link
                  href="/dashboard/tutor/schedule"
                  className="inline-flex h-8 items-center rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-sky-700 transition hover:bg-slate-50"
                >
                  Esta semana
                </Link>
                <Link
                  href={`/dashboard/tutor/schedule?week=${week.nextStartDate}`}
                  className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                >
                  Semana siguiente
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </GradebookCardHeader>
            <div className="grid gap-3 p-3 md:grid-cols-2 xl:grid-cols-5">
              {week.days.map((day) => (
                <DayColumn
                  key={day.date}
                  day={day}
                  slots={slotsByWeekday.get(day.weekday) ?? []}
                  registeredScheduleKeys={weekRegistration.registeredScheduleKeys}
                  todayDate={todayDate}
                />
              ))}
            </div>
          </GradebookCard>
        </>
      )}
    </section>
  );
}

function ScheduleSummary({
  weeklyClasses,
  todayClasses,
  pendingToday,
  nextSlot
}: {
  weeklyClasses: number;
  todayClasses: number;
  pendingToday: number;
  nextSlot: TeacherScheduleSlot | null;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <SummaryItem icon={CalendarDays} label="Clases de la semana" value={weeklyClasses} tone="blue" />
      <SummaryItem icon={CalendarCheck2} label="Clases de hoy" value={todayClasses} tone="green" />
      <SummaryItem icon={ListChecks} label="Asistencias pendientes" value={pendingToday} tone={pendingToday > 0 ? "amber" : "green"} />
      <SummaryItem
        icon={Clock3}
        label="Próximo tramo"
        value={nextSlot ? `${formatScheduleTime(nextSlot.start_time)} · ${nextSlot.is_break ? "Descanso" : nextSlot.course_name}` : "Sin tramos pendientes"}
        tone="slate"
      />
    </div>
  );
}

function SummaryItem({
  icon: Icon,
  label,
  value,
  tone
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string | number;
  tone: "blue" | "green" | "amber" | "slate";
}) {
  const toneClass = {
    blue: "bg-sky-50 text-sky-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600"
  }[tone];

  return (
    <GradebookCard className="p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-1 truncate text-base font-bold text-slate-950">{value}</p>
        </div>
      </div>
    </GradebookCard>
  );
}

function DayColumn({
  day,
  slots,
  registeredScheduleKeys,
  todayDate
}: {
  day: MadridWeekDay;
  slots: TeacherScheduleSlot[];
  registeredScheduleKeys: Set<string>;
  todayDate: string;
}) {
  return (
    <section
      className={`rounded-xl border p-3 ${
        day.isToday ? "border-sky-200 bg-sky-50/60 shadow-sm" : "border-slate-200 bg-slate-50/70"
      }`}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-bold text-slate-950">{day.label}</h2>
          <p className="text-xs text-slate-500">
            {slots.filter((slot) => !slot.is_break).length} clase{slots.filter((slot) => !slot.is_break).length === 1 ? "" : "s"}
          </p>
        </div>
        {day.isToday ? <GradebookBadge tone="blue">Hoy</GradebookBadge> : null}
      </div>

      <div className="space-y-2">
        {slots.length === 0 ? (
          <EmptyState message="Sin clases programadas." compact />
        ) : (
          slots.map((slot) => (
            <ScheduleSlot
              key={slot.id}
              slot={slot}
              date={day.date}
              registered={registeredScheduleKeys.has(`${slot.id}:${day.date}`)}
              todayDate={todayDate}
            />
          ))
        )}
      </div>
    </section>
  );
}

function ScheduleSlot({
  slot,
  date,
  registered,
  todayDate
}: {
  slot: TeacherScheduleSlot;
  date: string;
  registered: boolean;
  todayDate: string;
}) {
  if (slot.is_break) {
    return (
      <article className="rounded-lg border border-dashed border-slate-200 bg-white/70 px-3 py-2 text-slate-500">
        <div className="flex items-center gap-2">
          <Coffee className="h-4 w-4 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-[11px] font-semibold">{formatScheduleTime(slot.start_time)} - {formatScheduleTime(slot.end_time)}</p>
            <p className="truncate text-xs font-semibold">{slot.course_name}</p>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm transition hover:border-sky-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold text-sky-700">
            {formatScheduleTime(slot.start_time)} - {formatScheduleTime(slot.end_time)}
          </p>
          <h3 className="mt-0.5 truncate text-sm font-bold text-slate-950">{slot.course_name}</h3>
          <p className="truncate text-xs text-slate-500">{slot.subject_name ?? "Sin materia"}</p>
        </div>
        <GradebookBadge tone={registered ? "green" : date <= todayDate ? "amber" : "gray"}>
          {registered ? "Registrada" : date <= todayDate ? "Pendiente" : "Programada"}
        </GradebookBadge>
      </div>

      <Link
        href={`/dashboard/tutor/attendance/${slot.id}?date=${date}`}
        className="mt-2 inline-flex h-7 w-full items-center justify-center gap-1.5 rounded-lg bg-sky-700 px-2 text-xs font-semibold text-white transition hover:bg-sky-800"
      >
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Pasar lista
      </Link>
    </article>
  );
}

function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div className={`rounded-lg border border-dashed border-slate-200 bg-white text-sm text-slate-500 ${compact ? "px-3 py-2" : "p-4"}`}>
      {message}
    </div>
  );
}

function getNextScheduleSlot(slots: TeacherScheduleSlot[]) {
  if (slots.length === 0) {
    return null;
  }

  const now = new Date();
  const currentMinutes = Number(
    new Intl.DateTimeFormat("es-ES", {
      timeZone: "Europe/Madrid",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    })
      .format(now)
      .replace(":", "")
  );

  return slots.find((slot) => {
    const slotMinutes = Number(formatScheduleTime(slot.start_time).replace(":", ""));
    return slotMinutes >= currentMinutes;
  }) ?? null;
}

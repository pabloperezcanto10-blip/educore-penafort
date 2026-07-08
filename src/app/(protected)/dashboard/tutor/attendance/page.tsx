import { requireRole } from "@/lib/auth/session";
import { getAttendanceLabel, getTutorAttendanceForDate, type AttendanceStatus } from "@/lib/attendance/attendance";
import { getStudentsForCourseName, type TutorStudent } from "@/lib/tutors/students";
import {
  AttendanceEmptyState,
  AttendanceLinkButton,
  AttendanceNotice,
  AttendancePageHeader,
  AttendanceSessionCard,
  AttendanceStudentRow,
  AttendanceSummary,
  AttendanceTableCard,
  type AttendanceStatusKey,
  type AttendanceSummaryCounts
} from "@/components/attendance/attendance-design";
import { AttendanceBulkActions } from "@/components/attendance/attendance-form-actions";
import { GradebookBadge } from "@/components/grades/gradebook-design";
import { saveDailyAttendance } from "./actions";

type TutorAttendancePageProps = {
  searchParams?: {
    course_name?: string;
    subject_name?: string;
    schedule_id?: string;
    saved?: string;
  };
};

const statusOptions: AttendanceStatus[] = ["present", "absent", "late"];
const statusLabels: Record<AttendanceStatusKey, string> = {
  present: "Presente",
  absent: "Falta",
  late: "Retraso",
  justified: "Justificado"
};

export default async function TutorAttendancePage({ searchParams }: TutorAttendancePageProps) {
  const profile = await requireRole("tutor");
  const courseName = searchParams?.course_name ? decodeURIComponent(searchParams.course_name) : null;
  const subjectName = searchParams?.subject_name ? decodeURIComponent(searchParams.subject_name) : null;
  const isScheduleMode = Boolean(courseName);
  const scheduleStudentsResult = courseName ? await getStudentsForCourseName(courseName) : null;
  const attendanceResult = isScheduleMode ? null : await getTutorAttendanceForDate(profile.id);
  const rows = attendanceResult?.rows ?? [];
  const date = attendanceResult?.date ?? new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
  const errorMessage = attendanceResult?.errorMessage ?? scheduleStudentsResult?.errorMessage ?? null;
  const saved = searchParams?.saved === "1";
  const dailyCounts = getDailyCounts(rows);

  return (
    <section className="space-y-6">
      <AttendancePageHeader
        description={isScheduleMode
          ? "Revisión rápida de asistencia por clase desde el horario docente."
          : "Asistencia diaria de tus alumnos. Por defecto todos figuran como presente."}
        actions={<AttendanceLinkButton href="/dashboard/tutor">Volver al dashboard</AttendanceLinkButton>}
      />

      {saved ? <AttendanceNotice tone="success">Asistencia guardada correctamente.</AttendanceNotice> : null}

      {errorMessage ? (
        <AttendanceNotice tone="error">No se pudo cargar la asistencia: {errorMessage}</AttendanceNotice>
      ) : isScheduleMode ? (
        <ScheduleAttendancePlaceholder
          courseName={courseName ?? ""}
          subjectName={subjectName ?? ""}
          students={scheduleStudentsResult?.students ?? []}
          date={date}
        />
      ) : rows.length === 0 ? (
        <AttendanceEmptyState
          title="No hay alumnos asignados."
          description="Cuando tengas alumnos asignados, aparecerán aquí para registrar su asistencia."
        />
      ) : (
        <form action={saveDailyAttendance} className="space-y-4">
          <input type="hidden" name="date" value={date} />

          <AttendanceSessionCard
            course="Asistencia diaria"
            subject="Tutoría"
            day="Hoy"
            time="Jornada"
            date={date}
            statusLabel={dailyCounts.pending === 0 ? "Asistencia registrada" : "Pendiente"}
          />

          <AttendanceSummary counts={dailyCounts} />

          <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <AttendanceBulkActions />
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-xl bg-sky-700 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-800"
            >
              Guardar asistencia del día
            </button>
          </div>

          <AttendanceTableCard
            title="Alumnos"
            badge={<GradebookBadge tone={dailyCounts.pending > 0 ? "amber" : "green"}>{dailyCounts.pending > 0 ? "Cambios pendientes" : "Registrada"}</GradebookBadge>}
          >
            {rows.map((row) => {
              const studentName = `${row.student.name} ${row.student.last_name}`;

              return (
                <AttendanceStudentRow
                  key={row.student.id}
                  studentName={studentName}
                  currentLabel={getAttendanceLabel(row.status)}
                  status={row.status}
                  labels={statusLabels}
                  statuses={statusOptions}
                  statusInputName={`status_${row.student.id}`}
                  notesInputName={`notes_${row.student.id}`}
                  notes={row.notes}
                  hiddenStudentInput={<input type="hidden" name="student_id" value={row.student.id} />}
                />
              );
            })}
          </AttendanceTableCard>
        </form>
      )}
    </section>
  );
}

function ScheduleAttendancePlaceholder({
  courseName,
  subjectName,
  students,
  date
}: {
  courseName: string;
  subjectName: string;
  students: TutorStudent[];
  date: string;
}) {
  const counts: AttendanceSummaryCounts = {
    total: students.length,
    present: 0,
    absent: 0,
    late: 0,
    justified: 0,
    pending: students.length
  };

  return (
    <section className="space-y-4">
      <AttendanceNotice tone="warning">
        Esta vista rápida permite revisar el grupo. Para guardar asistencia real, entra desde una sesión concreta del horario.
      </AttendanceNotice>

      <AttendanceSessionCard
        course={courseName}
        subject={subjectName || "Materia"}
        day="Horario docente"
        time="Sesión"
        date={date}
        statusLabel="Pendiente"
      />

      <AttendanceSummary counts={counts} />

      {students.length === 0 ? (
        <AttendanceEmptyState
          title="No hay alumnos activos en este curso."
          description="No hay alumnos activos o no tienes permisos para verlos."
        />
      ) : (
        <AttendanceTableCard title="Alumnos" badge={<GradebookBadge tone="amber">Vista rápida</GradebookBadge>}>
          {students.map((student) => {
            const studentName = `${student.name} ${student.last_name}`;

            return (
              <AttendanceStudentRow
                key={student.id}
                studentName={studentName}
                currentLabel="Pendiente"
                status="present"
                labels={statusLabels}
                statuses={statusOptions}
                readOnly
              />
            );
          })}
        </AttendanceTableCard>
      )}
    </section>
  );
}

function getDailyCounts(rows: NonNullable<Awaited<ReturnType<typeof getTutorAttendanceForDate>>["rows"]>): AttendanceSummaryCounts {
  return {
    total: rows.length,
    present: rows.filter((row) => row.attendance && row.status === "present").length,
    absent: rows.filter((row) => row.status === "absent").length,
    late: rows.filter((row) => row.status === "late").length,
    justified: 0,
    pending: rows.filter((row) => !row.attendance).length
  };
}

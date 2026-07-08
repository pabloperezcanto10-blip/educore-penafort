import { requireRole } from "@/lib/auth/session";
import {
  getSessionAttendanceContext,
  getSessionAttendanceLabel,
  type SessionAttendanceStatus
} from "@/lib/attendance/session-attendance";
import { formatScheduleTime, getWeekdayLabel } from "@/lib/tutors/schedule";
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
import { saveSessionAttendance } from "./actions";
import { SaveSessionAttendanceButton } from "./submit-button";

type SessionAttendancePageProps = {
  params: {
    sessionId: string;
  };
};

const statusOptions: SessionAttendanceStatus[] = ["present", "absent", "late", "justified"];
const statusLabels: Record<AttendanceStatusKey, string> = {
  present: "Presente",
  absent: "Ausente",
  late: "Retraso",
  justified: "Justificado"
};

export default async function SessionAttendancePage({ params }: SessionAttendancePageProps) {
  const profile = await requireRole("tutor");
  const { context, errorMessage } = await getSessionAttendanceContext({
    teacherId: profile.id,
    sessionId: params.sessionId
  });

  return (
    <section className="space-y-6">
      <AttendancePageHeader
        description="Registra la asistencia real de la sesión seleccionada."
        actions={
          <>
            <AttendanceLinkButton href="/dashboard/tutor/schedule">Ver horario completo</AttendanceLinkButton>
            <AttendanceLinkButton href="/dashboard/tutor">Volver al dashboard</AttendanceLinkButton>
          </>
        }
      />

      {errorMessage || !context ? (
        <AttendanceNotice tone="error">
          No se pudo cargar la sesión de asistencia: {errorMessage ?? "Sesión no disponible."}
        </AttendanceNotice>
      ) : (
        <AttendanceSessionContent context={context} />
      )}
    </section>
  );
}

function AttendanceSessionContent({
  context
}: {
  context: NonNullable<Awaited<ReturnType<typeof getSessionAttendanceContext>>["context"]>;
}) {
  const counts = getSessionCounts(context.rows);
  const statusLabel = counts.pending === 0 ? "Asistencia registrada" : "Pendiente";

  return (
    <>
      <AttendanceSessionCard
        course={context.course.name}
        subject={context.subject?.name ?? context.schedule.subject_name ?? "Materia"}
        day={getWeekdayLabel(context.schedule.weekday)}
        time={`${formatScheduleTime(context.schedule.start_time)} - ${formatScheduleTime(context.schedule.end_time)}`}
        date={context.date}
        statusLabel={statusLabel}
      />

      <AttendanceSummary counts={counts} />

      {context.rows.length === 0 ? (
        <AttendanceEmptyState
          title="No hay alumnos activos en este curso."
          description="Cuando el curso tenga alumnos activos, podrás registrar la asistencia desde esta sesión."
        />
      ) : (
        <form action={saveSessionAttendance} className="space-y-4">
          <input type="hidden" name="session_id" value={context.schedule.id} />
          <input type="hidden" name="course_id" value={context.course.id} />
          <input type="hidden" name="subject_id" value={context.subject?.id ?? ""} />
          <input type="hidden" name="attendance_date" value={context.date} />

          <AttendanceTableCard
            title="Alumnos de la sesión"
            badge={
              <GradebookBadge tone={counts.pending > 0 ? "amber" : "green"}>
                {counts.pending > 0 ? "Cambios pendientes" : "Registrada"}
              </GradebookBadge>
            }
            footer={
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <AttendanceBulkActions />
                <SaveSessionAttendanceButton />
              </div>
            }
          >
            {context.rows.map((row) => {
              const studentName = `${row.student.name} ${row.student.last_name}`;

              return (
                <AttendanceStudentRow
                  key={row.student.id}
                  studentName={studentName}
                  currentLabel={getSessionAttendanceLabel(row.status)}
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
    </>
  );
}

function getSessionCounts(
  rows: NonNullable<Awaited<ReturnType<typeof getSessionAttendanceContext>>["context"]>["rows"]
): AttendanceSummaryCounts {
  return {
    total: rows.length,
    present: rows.filter((row) => row.record && row.status === "present").length,
    absent: rows.filter((row) => row.status === "absent").length,
    late: rows.filter((row) => row.status === "late").length,
    justified: rows.filter((row) => row.status === "justified").length,
    pending: rows.filter((row) => !row.record).length
  };
}

import { AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getAbsenceAlerts,
  getAttendanceLabel,
  getDirectorAttendance,
  type DirectorAttendanceRow
} from "@/lib/attendance/attendance";
import {
  AttendanceEmptyState,
  AttendanceNotice,
  AttendancePageHeader,
  AttendanceStudentRow,
  AttendanceSummary,
  AttendanceTableCard,
  type AttendanceStatusKey,
  type AttendanceSummaryCounts
} from "@/components/attendance/attendance-design";
import { GradebookBadge } from "@/components/grades/gradebook-design";

const statusLabels: Record<AttendanceStatusKey, string> = {
  present: "Presente",
  absent: "Falta",
  late: "Retraso",
  justified: "Justificado"
};
const readOnlyStatuses: AttendanceStatusKey[] = ["present", "absent", "late", "justified"];

export default async function DirectorAttendancePage() {
  await requireRole("director");
  const { rows, errorMessage } = await getDirectorAttendance();
  const alerts = getAbsenceAlerts(rows);

  return (
    <section className="space-y-6">
      <AttendancePageHeader
        title="Absentismo"
        description="Listado general de faltas, retrasos y alertas de seguimiento."
      />

      {alerts.length > 0 ? (
        <AttendanceNotice tone="warning">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Alertas de absentismo
          </div>
          <ul className="mt-3 space-y-1">
            {alerts.map((alert) => (
              <li key={alert.studentName}>
                {alert.studentName}: {alert.count} faltas acumuladas.
              </li>
            ))}
          </ul>
        </AttendanceNotice>
      ) : null}

      {errorMessage ? (
        <AttendanceNotice tone="error">No se pudo cargar la asistencia: {errorMessage}</AttendanceNotice>
      ) : rows.length === 0 ? (
        <AttendanceEmptyState
          title="No hay faltas ni retrasos registrados."
          description="La asistencia del centro no tiene incidencias pendientes de supervisión."
        />
      ) : (
        <>
          <AttendanceSummary counts={getDirectorCounts(rows)} />
          <AttendanceTableCard
            title="Registros de asistencia"
            badge={<GradebookBadge tone="amber">{rows.length} registros</GradebookBadge>}
          >
            {rows.map((row) => {
              const status = row.justified ? "justified" : row.status;

              return (
                <AttendanceStudentRow
                  key={row.id}
                  studentName={row.studentName}
                  studentHref={`/dashboard/director/students/${row.student_id}`}
                  currentLabel={row.justified ? "Justificado" : getAttendanceLabel(row.status)}
                  status={status}
                  labels={statusLabels}
                  statuses={readOnlyStatuses}
                  notes={formatDirectorRowNotes(row)}
                  readOnly
                />
              );
            })}
          </AttendanceTableCard>
        </>
      )}
    </section>
  );
}

function getDirectorCounts(rows: DirectorAttendanceRow[]): AttendanceSummaryCounts {
  return {
    total: rows.length,
    present: 0,
    absent: rows.filter((row) => row.status === "absent" && !row.justified).length,
    late: rows.filter((row) => row.status === "late" && !row.justified).length,
    justified: rows.filter((row) => row.justified).length,
    pending: rows.filter((row) => !row.justified).length
  };
}

function formatDirectorRowNotes(row: DirectorAttendanceRow) {
  const base = row.notes ?? "Sin notas";
  const justification = row.justified ? "Justificado" : "Pendiente de justificar";

  return `${row.date} · ${justification} · ${base}`;
}

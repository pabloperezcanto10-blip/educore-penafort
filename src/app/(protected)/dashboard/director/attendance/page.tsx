import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import {
  getAbsenceAlerts,
  getAttendanceLabel,
  getDirectorAttendance,
  type DirectorAttendanceRow
} from "@/lib/attendance/attendance";

export default async function DirectorAttendancePage() {
  await requireRole("director");
  const { rows, errorMessage } = await getDirectorAttendance();
  const alerts = getAbsenceAlerts(rows);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Absentismo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Listado general de faltas, retrasos y alertas de seguimiento.
        </p>
      </div>

      {alerts.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            Alertas de absentismo
          </div>
          <ul className="mt-3 space-y-2 text-sm text-amber-900">
            {alerts.map((alert) => (
              <li key={alert.studentName}>
                {alert.studentName}: {alert.count} faltas acumuladas.
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudo cargar la asistencia: {errorMessage}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
          No hay faltas ni retrasos registrados.
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-white">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Alumno</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-left font-medium">Estado</th>
                  <th className="px-4 py-3 text-left font-medium">Justificación</th>
                  <th className="px-4 py-3 text-left font-medium">Notas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <DirectorAttendanceTableRow key={row.id} row={row} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function DirectorAttendanceTableRow({ row }: { row: DirectorAttendanceRow }) {
  return (
    <tr>
      <td className="px-4 py-3 font-medium">
        <Link href={`/dashboard/director/students/${row.student_id}`} className="text-primary hover:underline">
          {row.studentName}
        </Link>
      </td>
      <td className="px-4 py-3">{row.date}</td>
      <td className="px-4 py-3">{getAttendanceLabel(row.status)}</td>
      <td className="px-4 py-3">{row.justified ? "Justificado" : "Pendiente"}</td>
      <td className="px-4 py-3">{row.notes ?? "-"}</td>
    </tr>
  );
}

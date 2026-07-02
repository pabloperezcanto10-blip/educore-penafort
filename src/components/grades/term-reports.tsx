import type { TermSubjectReportRow } from "@/lib/grades/grades";

export function TermReportsTable({ reports }: { reports: TermSubjectReportRow[] }) {
  if (reports.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        No hay cierres de evaluacion para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Curso</th>
              <th className="px-4 py-3 text-left font-medium">Trimestre</th>
              <th className="px-4 py-3 text-left font-medium">Alumno</th>
              <th className="px-4 py-3 text-left font-medium">Materia</th>
              <th className="px-4 py-3 text-left font-medium">Profesor</th>
              <th className="px-4 py-3 text-left font-medium">Estado</th>
              <th className="px-4 py-3 text-left font-medium">Nota final</th>
              <th className="px-4 py-3 text-left font-medium">Observacion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {reports.map((report) => (
              <tr key={report.key}>
                <td className="px-4 py-3">{report.courseName}</td>
                <td className="px-4 py-3">{report.term}</td>
                <td className="px-4 py-3 font-medium text-foreground">{report.studentName}</td>
                <td className="px-4 py-3">{report.subjectName}</td>
                <td className="px-4 py-3">{report.teacherName}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={report.status} />
                </td>
                <td className="px-4 py-3">{report.final_grade ?? "-"}</td>
                <td className="px-4 py-3">
                  <span className="block max-w-72 whitespace-normal text-muted-foreground">
                    {report.final_observation || "-"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: TermSubjectReportRow["status"] }) {
  const label = status === "closed" ? "Cerrada" : status === "draft" ? "Borrador" : "Pendiente";
  const className =
    status === "closed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : status === "draft"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-border bg-background text-muted-foreground";

  return <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-semibold ${className}`}>{label}</span>;
}

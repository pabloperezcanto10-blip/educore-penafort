import Link from "next/link";
import { Download } from "lucide-react";
import { FinalPublicationPanel } from "@/components/grades/final-publication-panel";
import type { FinalCourseRow, FinalPublication } from "@/lib/grades/annual";

export function FinalGradesSupervision({
  courseId,
  courseName,
  rows,
  publication,
  action
}: {
  courseId: string;
  courseName: string;
  rows: FinalCourseRow[];
  publication: FinalPublication | null;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const pendingCount = rows.filter((row) => row.status !== "closed").length;
  const studentPdfRows = Array.from(new Map(rows.map((row) => [row.student_id, row.studentName])).entries()).sort((a, b) =>
    a[1].localeCompare(b[1], "es")
  );

  return (
    <div className="space-y-6">
      <section className="grid gap-3 md:grid-cols-4">
        <Metric label="Cierres" value={rows.length} />
        <Metric label="Cerrados" value={rows.filter((row) => row.status === "closed").length} />
        <Metric label="Pendientes" value={pendingCount} />
        <Metric label="Publicacion" value={publication?.published ? 1 : 0} />
      </section>
      <FinalPublicationPanel courseId={courseId} courseName={courseName} publication={publication} pendingCount={pendingCount} action={action} />
      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-base font-semibold text-foreground">Boletines finales PDF</h2>
        <p className="mt-1 text-sm text-muted-foreground">Descarga el boletín final anual por alumno para revisión.</p>
        {studentPdfRows.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
            No hay alumnos con cierre final para generar PDF.
          </div>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {studentPdfRows.map(([studentId, studentName]) => (
              <Link
                key={studentId}
                href={`/dashboard/reports/final-pdf?student_id=${studentId}`}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:bg-muted"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                {studentName}
              </Link>
            ))}
          </div>
        )}
      </section>
      <section className="rounded-lg border border-border bg-white p-5">
        <h2 className="text-base font-semibold text-foreground">Cierres finales</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Alumno</th>
                <th className="px-3 py-2">Materia</th>
                <th className="px-3 py-2">T1</th>
                <th className="px-3 py-2">T2</th>
                <th className="px-3 py-2">T3</th>
                <th className="px-3 py-2">Pesos</th>
                <th className="px-3 py-2">Final</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Observacion</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.student_id}-${row.subject_id}`} className="border-t border-border">
                  <td className="px-3 py-3 font-medium">{row.studentName}</td>
                  <td className="px-3 py-3">{row.subjectName}</td>
                  <td className="px-3 py-3">{row.term1_grade ?? "-"}</td>
                  <td className="px-3 py-3">{row.term2_grade ?? "-"}</td>
                  <td className="px-3 py-3">{row.term3_grade ?? "-"}</td>
                  <td className="px-3 py-3">{row.term1_weight}% / {row.term2_weight}% / {row.term3_weight}%</td>
                  <td className="px-3 py-3 font-semibold">{row.final_grade ?? "-"}</td>
                  <td className="px-3 py-3">{row.status}</td>
                  <td className="px-3 py-3">{row.final_observation ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-white p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

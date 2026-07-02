import type { GradeWithLabels } from "@/lib/grades/grades";

export function GradesTable({
  grades,
  emptyMessage
}: {
  grades: GradeWithLabels[];
  emptyMessage: string;
}) {
  if (grades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Alumno</th>
              <th className="px-4 py-3 text-left font-medium">Materia</th>
              <th className="px-4 py-3 text-left font-medium">Trimestre</th>
              <th className="px-4 py-3 text-left font-medium">Prueba</th>
              <th className="px-4 py-3 text-left font-medium">Nota</th>
              <th className="px-4 py-3 text-left font-medium">Profesor</th>
              <th className="px-4 py-3 text-left font-medium">Familia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {grades.map((grade) => (
              <tr key={grade.id}>
                <td className="px-4 py-3 font-medium">{grade.studentName}</td>
                <td className="px-4 py-3">{grade.subjectName}</td>
                <td className="px-4 py-3">{grade.term}</td>
                <td className="px-4 py-3">
                  <span className="font-medium">{grade.assessment_name}</span>
                  <span className="block text-xs text-muted-foreground capitalize">{grade.assessment_type}</span>
                </td>
                <td className="px-4 py-3 font-semibold">{grade.grade}</td>
                <td className="px-4 py-3">{grade.teacherName}</td>
                <td className="px-4 py-3">{grade.visible_to_family ? "Visible" : "Privada"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

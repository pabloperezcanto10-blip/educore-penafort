import { requireRole } from "@/lib/auth/session";
import { getAllGradesForSupervision } from "@/lib/grades/grades";
import { GradesTable } from "@/components/grades/grades-table";

export default async function DirectorGradesPage() {
  await requireRole("director");
  const { grades, errorMessage } = await getAllGradesForSupervision();

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-normal text-foreground">Calificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Supervisión de calificaciones parciales por alumno, materia, trimestre y profesor.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar las calificaciones: {errorMessage}
        </div>
      ) : (
        <GradesTable grades={grades} emptyMessage="No hay calificaciones registradas." />
      )}
    </section>
  );
}

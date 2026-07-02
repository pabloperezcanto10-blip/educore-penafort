import type { ReactNode } from "react";
import type { EvaluationCriterionWithLabels, GradeWithLabels, QuarterFinalGradeWithLabels } from "@/lib/grades/grades";

export function GradebookReadonly({ grades }: { grades: GradeWithLabels[] }) {
  if (grades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        No hay calificaciones para los filtros seleccionados.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {grades.map((grade) => (
        <article key={grade.id} className="rounded-lg border border-border bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-md border border-border px-2 py-1 text-xs font-medium">{grade.studentName}</span>
                <span className="rounded-md border border-border px-2 py-1 text-xs font-medium">{grade.subjectName}</span>
                <span className="rounded-md border border-border px-2 py-1 text-xs font-medium">Trimestre {grade.term}</span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-foreground">
                {grade.assessment_name}: {grade.grade}
              </h3>
              {grade.comment ? <p className="mt-2 text-sm text-muted-foreground">Comentario: {grade.comment}</p> : null}
              {grade.recommendation ? (
                <p className="mt-1 text-sm text-muted-foreground">Recomendación: {grade.recommendation}</p>
              ) : null}
            </div>
            <span className="inline-flex w-fit rounded-md border border-border px-2 py-1 text-xs font-medium">
              {grade.teacherName}
            </span>
          </div>
        </article>
      ))}
    </div>
  );
}

export function EvaluationCriteriaReadonly({ criteria }: { criteria: EvaluationCriterionWithLabels[] }) {
  if (criteria.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        No hay criterios configurados para los filtros seleccionados.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Criterios configurados</h2>
      <div className="space-y-3">
        {criteria.map((criterion) => (
          <article key={criterion.id} className="rounded-lg border border-border bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{criterion.courseName}</Badge>
                  <Badge>{criterion.subjectName}</Badge>
                  <Badge>Trimestre {criterion.term}</Badge>
                  <Badge>{criterion.criterion_type}</Badge>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  {criterion.name}: {criterion.weight}%
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {criterion.active ? "Activo" : "Inactivo"} · {criterion.visible_to_family ? "Visible familia" : "Privado"}
                </p>
              </div>
              <span className="inline-flex w-fit rounded-md border border-border px-2 py-1 text-xs font-medium">
                {criterion.teacherName}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export function QuarterFinalGradesReadonly({ finalGrades }: { finalGrades: QuarterFinalGradeWithLabels[] }) {
  if (finalGrades.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
        No hay notas trimestrales cerradas para los filtros seleccionados.
      </div>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">Notas finales trimestrales</h2>
      <div className="space-y-3">
        {finalGrades.map((grade) => (
          <article key={grade.id} className="rounded-lg border border-border bg-white p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge>{grade.studentName}</Badge>
                  <Badge>{grade.courseName}</Badge>
                  <Badge>{grade.subjectName}</Badge>
                  <Badge>Trimestre {grade.term}</Badge>
                </div>
                <h3 className="mt-3 text-sm font-semibold text-foreground">
                  Calculada {grade.calculated_grade} · Final {grade.final_grade}
                </h3>
                {grade.teacher_observation ? (
                  <p className="mt-2 text-sm text-muted-foreground">Observacion: {grade.teacher_observation}</p>
                ) : null}
              </div>
              <span className="inline-flex w-fit rounded-md border border-border px-2 py-1 text-xs font-medium">
                {grade.teacherName}
              </span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-md border border-border px-2 py-1 text-xs font-medium">{children}</span>;
}

"use client";

import type { EvaluationPublication, GradeTerm } from "@/lib/grades/grades";

type PublicationSummary = {
  closedSubjects: number;
  pendingSubjects: number;
  completeStudents: number;
  incompleteStudents: number;
};

type EvaluationPublicationPanelProps = {
  courseId: string;
  term: GradeTerm;
  courseName: string;
  publication: EvaluationPublication | null;
  summary: PublicationSummary;
  action: (formData: FormData) => void | Promise<void>;
};

export function EvaluationPublicationPanel({
  courseId,
  term,
  courseName,
  publication,
  summary,
  action
}: EvaluationPublicationPanelProps) {
  const isPublished = publication?.published ?? false;
  const publishedAt = publication?.published_at
    ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(publication.published_at))
    : null;

  return (
    <section className="space-y-4 rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Publicacion de evaluacion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {courseName} · Trimestre {term}
          </p>
        </div>
        <span className={`w-fit rounded-md px-3 py-2 text-sm font-semibold ${isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {isPublished ? "Evaluacion publicada" : "Pendiente de publicar"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Materias cerradas" value={summary.closedSubjects} tone="success" />
        <Metric label="Materias pendientes" value={summary.pendingSubjects} tone={summary.pendingSubjects > 0 ? "warning" : "neutral"} />
        <Metric label="Alumnos completos" value={summary.completeStudents} tone="success" />
        <Metric label="Alumnos incompletos" value={summary.incompleteStudents} tone={summary.incompleteStudents > 0 ? "warning" : "neutral"} />
      </div>

      {isPublished ? (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Evaluacion publicada{publishedAt ? ` el ${publishedAt}` : ""}. Las familias podran consultar el boletin cuando exista la vista final.
        </p>
      ) : summary.pendingSubjects > 0 ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Hay materias pendientes. Puedes publicar si lo necesitas, pero conviene revisar los cierres antes.
        </p>
      ) : (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Todas las materias filtradas estan cerradas. La evaluacion esta lista para publicar.
        </p>
      )}

      <form
        action={action}
        onSubmit={(event) => {
          const message =
            summary.pendingSubjects > 0
              ? "Hay materias pendientes. ¿Quieres publicar igualmente esta evaluacion?"
              : "¿Quieres publicar oficialmente esta evaluacion?";

          if (!window.confirm(message)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="term" value={term} />
        <button className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
          {isPublished ? "Republicar evaluacion" : "Publicar evaluacion"}
        </button>
      </form>
    </section>
  );
}

function Metric({
  label,
  value,
  tone
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "neutral";
}) {
  const className =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-border bg-background text-muted-foreground";

  return (
    <div className={`rounded-md border p-3 ${className}`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

"use client";

import type { EvaluationPublication, GradeTerm, TermPublicationSummary } from "@/lib/grades/grades";

type AdminPublicationPanelProps = {
  courseId: string;
  courseName: string;
  term: GradeTerm;
  publication: EvaluationPublication | null;
  summary: TermPublicationSummary;
  action: (formData: FormData) => void | Promise<void>;
};

export function AdminPublicationPanel({
  courseId,
  courseName,
  term,
  publication,
  summary,
  action
}: AdminPublicationPanelProps) {
  const isPublished = publication?.published ?? false;
  const publishedAt = publication?.published_at
    ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(publication.published_at))
    : null;

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">4. Publicacion de boletines</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {courseName} · Trimestre {term}
          </p>
        </div>
        <span className={`w-fit rounded-md px-3 py-2 text-sm font-semibold ${isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {isPublished ? "Boletines publicados" : "Pendiente de publicar"}
        </span>
      </div>

      {isPublished ? (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Boletines publicados{publishedAt ? ` el ${publishedAt}` : ""}.
        </p>
      ) : summary.pendingSubjects > 0 || summary.incompleteStudents > 0 ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700">
          Hay materias o alumnos pendientes. Puedes publicar, pero conviene revisar antes el cierre.
        </p>
      ) : (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Todo el curso filtrado esta cerrado. Los boletines estan listos para publicar.
        </p>
      )}

      <form
        action={action}
        className="mt-4"
        onSubmit={(event) => {
          const message =
            summary.pendingSubjects > 0 || summary.incompleteStudents > 0
              ? "Hay materias o alumnos pendientes. ¿Quieres publicar igualmente los boletines?"
              : "¿Quieres publicar oficialmente los boletines?";

          if (!window.confirm(message)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="term" value={term} />
        <button className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-95">
          {isPublished ? "Republicar boletines" : "Publicar boletines"}
        </button>
      </form>
    </section>
  );
}

"use client";

import type { EvaluationPublication, GradeTerm } from "@/lib/grades/grades";

type PublicationSummary = {
  closedSubjects: number;
  pendingSubjects: number;
  completeStudents: number;
  incompleteStudents: number;
};

type DirectorPublicationPanelProps = {
  courseId: string;
  term: GradeTerm;
  courseName: string;
  publication: EvaluationPublication | null;
  summary: PublicationSummary;
  action: (formData: FormData) => void | Promise<void>;
};

export function DirectorPublicationPanel({
  courseId,
  term,
  courseName,
  publication,
  summary,
  action
}: DirectorPublicationPanelProps) {
  const isPublished = publication?.published ?? false;
  const publishedAt = publication?.published_at
    ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(publication.published_at))
    : null;

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-primary">Publicacion oficial</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">Boletines de {courseName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Trimestre {term}. Esta accion habilita la consulta familiar cuando el boletin este disponible.</p>
        </div>
        <span className={`w-fit rounded-md px-3 py-2 text-sm font-semibold ${isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {isPublished ? "Boletines publicados" : "Pendiente de publicacion"}
        </span>
      </div>

      <div className="mt-4 space-y-2 text-sm">
        {summary.pendingSubjects > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
            Aviso: hay {summary.pendingSubjects} materia(s) pendiente(s) de cierre.
          </p>
        ) : (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            Todas las materias revisadas estan cerradas.
          </p>
        )}
        {summary.incompleteStudents > 0 ? (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
            Aviso: hay {summary.incompleteStudents} alumno(s) con evaluacion incompleta.
          </p>
        ) : (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            Los alumnos revisados constan como completos.
          </p>
        )}
        {isPublished ? (
          <p className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-700">
            Boletines publicados{publishedAt ? ` el ${publishedAt}` : ""}.
          </p>
        ) : null}
      </div>

      <form
        action={action}
        className="mt-5"
        onSubmit={(event) => {
          const warnings = [];

          if (summary.pendingSubjects > 0) {
            warnings.push(`Hay ${summary.pendingSubjects} materia(s) pendiente(s).`);
          }

          if (summary.incompleteStudents > 0) {
            warnings.push(`Hay ${summary.incompleteStudents} alumno(s) incompleto(s).`);
          }

          const message =
            warnings.length > 0
              ? `${warnings.join(" ")} ¿Quieres publicar igualmente los boletines?`
              : "¿Quieres publicar oficialmente los boletines de esta evaluacion?";

          if (!window.confirm(message)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="course_id" value={courseId} />
        <input type="hidden" name="term" value={term} />
        <button className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90">
          {isPublished ? "Republicar boletines" : "Publicar boletines"}
        </button>
      </form>
    </section>
  );
}

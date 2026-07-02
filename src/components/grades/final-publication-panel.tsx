"use client";

import type { FinalPublication } from "@/lib/grades/annual";

export function FinalPublicationPanel({
  courseId,
  courseName,
  publication,
  pendingCount,
  action
}: {
  courseId: string;
  courseName: string;
  publication: FinalPublication | null;
  pendingCount: number;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const isPublished = publication?.published ?? false;

  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Publicacion del boletin final</h2>
          <p className="mt-1 text-sm text-muted-foreground">{courseName}</p>
        </div>
        <span className={`w-fit rounded-md px-3 py-2 text-sm font-semibold ${isPublished ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
          {isPublished ? "Boletin final publicado" : "Pendiente de publicacion"}
        </span>
      </div>
      {pendingCount > 0 ? (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Hay {pendingCount} cierre(s) final(es) pendientes. Puedes publicar, pero conviene revisar antes.
        </p>
      ) : (
        <p className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          Todos los cierres finales revisados estan cerrados.
        </p>
      )}
      <form
        action={action}
        className="mt-4"
        onSubmit={(event) => {
          const message = pendingCount > 0
            ? `Hay ${pendingCount} cierre(s) pendiente(s). ¿Quieres publicar igualmente el boletin final?`
            : "¿Quieres publicar oficialmente el boletin final?";
          if (!window.confirm(message)) event.preventDefault();
        }}
      >
        <input type="hidden" name="course_id" value={courseId} />
        <button className="h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground">
          {isPublished ? "Republicar boletin final" : "Publicar boletin final"}
        </button>
      </form>
    </section>
  );
}

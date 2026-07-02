import { MessageSquarePlus } from "lucide-react";
import type { StudentObservation } from "@/lib/tutors/students";

export function ReadonlyStudentObservations({
  observations,
  errorMessage
}: {
  observations: StudentObservation[];
  errorMessage: string | null;
}) {
  return (
    <section className="rounded-lg border border-border bg-white p-5">
      <div className="flex items-center gap-3">
        <MessageSquarePlus className="h-5 w-5 text-primary" aria-hidden="true" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Observaciones internas</h2>
          <p className="mt-1 text-sm text-muted-foreground">Seguimiento pedagógico privado del alumno.</p>
        </div>
      </div>

      {errorMessage ? (
        <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          No se pudieron cargar las observaciones: {errorMessage}
        </div>
      ) : observations.length === 0 ? (
        <div className="mt-5 rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
          No hay observaciones internas registradas.
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {observations.map((observation) => (
            <article key={observation.id} className="rounded-md border border-border p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{observation.title}</h3>
                    <span className="rounded-md border border-border px-2 py-1 text-xs font-medium capitalize">
                      {observation.type}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{observation.content}</p>
                </div>
                <span className="inline-flex w-fit rounded-md border border-border px-2 py-1 text-xs font-medium capitalize">
                  {observation.priority}
                </span>
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {new Intl.DateTimeFormat("es-ES", {
                  dateStyle: "medium",
                  timeStyle: "short"
                }).format(new Date(observation.created_at))}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

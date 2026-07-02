import Link from "next/link";
import { CalendarCheck, CalendarPlus, RotateCcw } from "lucide-react";
import { requireRole } from "@/lib/auth/session";
import { getAcademicYears } from "@/lib/academic-years";
import { activateAcademicYear, createAcademicYear } from "../actions";

export default async function AdminAcademicYearsPage() {
  await requireRole("superadmin");
  const { academicYears, errorMessage } = await getAcademicYears();
  const activeYear = academicYears.find((year) => year.active) ?? null;

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Curso escolar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gestiona el curso escolar activo y prepara el historico de la plataforma.
          </p>
        </div>
        <Link
          href="/dashboard/admin"
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </div>

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          No se pudieron cargar los cursos escolares: {errorMessage}
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <CalendarCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Curso activo</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeYear ? `${activeYear.name} (${formatDate(activeYear.start_date)} - ${formatDate(activeYear.end_date)})` : "No hay curso escolar activo."}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
            <CalendarPlus className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Crear curso escolar</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea el siguiente curso. La promocion automatica se implementara en una fase posterior.
            </p>
          </div>
        </div>

        <form action={createAcademicYear} className="mt-5 grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <input
            name="name"
            placeholder="2027-2028"
            required
            className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <input
            name="start_date"
            type="date"
            className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <input
            name="end_date"
            type="date"
            className="h-11 rounded-md border border-border bg-white px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
          <button
            type="submit"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90"
          >
            Crear
          </button>
        </form>
      </section>

      <section className="space-y-3">
        {academicYears.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-white p-6 text-sm text-muted-foreground">
            No hay cursos escolares creados.
          </div>
        ) : (
          academicYears.map((year) => (
            <article key={year.id} className="rounded-lg border border-border bg-white p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-foreground">{year.name}</h3>
                    {year.active ? (
                      <span className="rounded-md bg-green-50 px-2 py-1 text-xs font-semibold text-green-700">
                        Activo
                      </span>
                    ) : (
                      <span className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-muted-foreground">
                        Historico / preparado
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatDate(year.start_date)} - {formatDate(year.end_date)}
                  </p>
                </div>

                {year.active ? null : (
                  <form action={activateAcademicYear}>
                    <input type="hidden" name="id" value={year.id} />
                    <button
                      type="submit"
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
                    >
                      <RotateCcw className="h-4 w-4" aria-hidden="true" />
                      Activar
                    </button>
                  </form>
                )}
              </div>
            </article>
          ))
        )}
      </section>

      <section className="rounded-lg border border-dashed border-border bg-white p-5">
        <h2 className="text-sm font-semibold text-foreground">Promocion futura</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Esta base deja preparado el historico anual. La promocion automatica de alumnos se anadira mas adelante.
        </p>
      </section>
    </section>
  );
}

function formatDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(value));
}

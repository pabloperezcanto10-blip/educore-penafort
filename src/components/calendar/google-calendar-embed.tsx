import Link from "next/link";

const calendarEmbedUrl =
  "https://calendar.google.com/calendar/embed?src=fo7mnf4nmdge5cib93bfq77414%40group.calendar.google.com&ctz=Africa%2FCeuta";

export function GoogleCalendarEmbed({ backHref }: { backHref: string }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal text-foreground">Calendario / Fechas de interes</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Consulta examenes, reuniones, salidas, evaluaciones y avisos importantes del centro.
          </p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-10 w-fit items-center justify-center rounded-md border border-border bg-white px-3 text-sm font-medium transition hover:bg-muted"
        >
          Volver al panel
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-white p-3 shadow-sm">
        <div className="overflow-hidden rounded-md border border-border bg-background">
          {/* TODO(superadmin): permitir configurar esta URL desde ajustes del centro cuando exista modulo de configuracion. */}
          <iframe
            title="Calendario de fechas de interes del Colegio Penafort"
            src={calendarEmbedUrl}
            className="h-[680px] w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Si el calendario no carga, abre el calendario en una nueva pestana desde Google Calendar o revisa la conexion.
        </p>
        <noscript>
          <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Activa JavaScript para visualizar el calendario integrado.
          </p>
        </noscript>
      </div>
    </section>
  );
}
